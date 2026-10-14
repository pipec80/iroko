-- Plan 012.3: strict rolling windows; admissions commit before later API reads.
CREATE TABLE private.account_api_ip_admissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_ip inet NOT NULL,
  admitted_at timestamptz NOT NULL
);
CREATE TABLE private.account_api_account_admissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  admitted_at timestamptz NOT NULL
);
CREATE INDEX account_api_ip_admissions_identity_time
  ON private.account_api_ip_admissions(client_ip, admitted_at);
CREATE INDEX account_api_account_admissions_identity_time
  ON private.account_api_account_admissions(account_id, admitted_at);
CREATE INDEX account_api_ip_admissions_expiry ON private.account_api_ip_admissions(admitted_at);
CREATE INDEX account_api_account_admissions_expiry ON private.account_api_account_admissions(admitted_at);
ALTER TABLE private.account_api_ip_admissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.account_api_account_admissions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.account_api_ip_admissions, private.account_api_account_admissions
  FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION public.admit_account_api_request(p_client_ip inet, p_key_hash text DEFAULT NULL)
RETURNS TABLE(decision text, account_id uuid, retry_after_seconds integer)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_ip inet;
  v_now timestamptz;
  v_count integer;
  v_oldest timestamptz;
  v_account_id uuid;
BEGIN
  IF p_client_ip IS NULL OR masklen(p_client_ip) <> (CASE family(p_client_ip) WHEN 4 THEN 32 ELSE 128 END) THEN
    RAISE EXCEPTION 'invalid_client_ip' USING ERRCODE = '22023';
  END IF;
  v_ip := host(p_client_ip)::inet;
  -- All callers lock IP before account. Read wall time only after each lock:
  -- a queued transaction must not evaluate the window using its start time.
  PERFORM pg_advisory_xact_lock(12012302, hashtext(host(v_ip)));
  v_now := clock_timestamp();
  DELETE FROM private.account_api_ip_admissions e
  WHERE e.client_ip = v_ip AND e.admitted_at <= v_now - interval '300 seconds';
  SELECT count(*)::integer, min(e.admitted_at) INTO v_count,v_oldest
  FROM private.account_api_ip_admissions e WHERE e.client_ip = v_ip;
  IF v_count >= 300 THEN
    RETURN QUERY SELECT 'ip_limited'::text,NULL::uuid,
      greatest(1,ceil(extract(epoch FROM v_oldest + interval '300 seconds' - v_now))::integer);
    RETURN;
  END IF;
  INSERT INTO private.account_api_ip_admissions(client_ip,admitted_at) VALUES (v_ip,v_now);
  IF p_key_hash IS NULL THEN
    RETURN QUERY SELECT 'missing_key'::text,NULL::uuid,0;
    RETURN;
  END IF;
  SELECT k.account_id INTO v_account_id FROM public.api_keys k
  WHERE k.key_hash=p_key_hash AND k.revoked_at IS NULL
    AND (k.expires_at IS NULL OR k.expires_at > v_now);
  IF v_account_id IS NULL THEN
    RETURN QUERY SELECT 'invalid_key'::text,NULL::uuid,0;
    RETURN;
  END IF;
  PERFORM pg_advisory_xact_lock(12012303,hashtext(v_account_id::text));
  v_now := clock_timestamp();
  -- Recheck expiry/revocation after waiting for the account lock.
  IF NOT EXISTS (SELECT 1 FROM public.api_keys k WHERE k.key_hash=p_key_hash
    AND k.account_id=v_account_id AND k.revoked_at IS NULL
    AND (k.expires_at IS NULL OR k.expires_at > v_now)) THEN
    RETURN QUERY SELECT 'invalid_key'::text,NULL::uuid,0;
    RETURN;
  END IF;
  DELETE FROM private.account_api_account_admissions e
  WHERE e.account_id=v_account_id AND e.admitted_at <= v_now - interval '300 seconds';
  SELECT count(*)::integer,min(e.admitted_at) INTO v_count,v_oldest
  FROM private.account_api_account_admissions e WHERE e.account_id=v_account_id;
  IF v_count >= 100 THEN
    RETURN QUERY SELECT 'account_limited'::text,NULL::uuid,
      greatest(1,ceil(extract(epoch FROM v_oldest + interval '300 seconds' - v_now))::integer);
    RETURN;
  END IF;
  UPDATE public.api_keys k SET last_used_at=v_now
  WHERE k.key_hash=p_key_hash AND k.revoked_at IS NULL
    AND (k.expires_at IS NULL OR k.expires_at > v_now)
  RETURNING k.account_id INTO v_account_id;
  IF v_account_id IS NULL THEN
    RETURN QUERY SELECT 'invalid_key'::text,NULL::uuid,0;
    RETURN;
  END IF;
  INSERT INTO private.account_api_account_admissions(account_id,admitted_at)
  VALUES (v_account_id,v_now);
  RETURN QUERY SELECT 'allowed'::text,v_account_id,0;
END;
$$;
REVOKE ALL ON FUNCTION public.admit_account_api_request(inet,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admit_account_api_request(inet,text) TO service_role;
COMMENT ON FUNCTION public.admit_account_api_request(inet,text) IS
  'Backend-only durable admission: rolling 300s windows, 300/IP before verification and 100/account shared by keys. Decisions commit reservations; caller must not combine admission with its later read transaction.';

CREATE FUNCTION private.cleanup_account_api_admissions() RETURNS void
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
DECLARE v_expiry timestamptz := clock_timestamp()-interval '300 seconds';
BEGIN
  DELETE FROM private.account_api_ip_admissions e WHERE e.ctid IN
    (SELECT old.ctid FROM private.account_api_ip_admissions old
     WHERE old.admitted_at<=v_expiry ORDER BY old.admitted_at LIMIT 5000);
  DELETE FROM private.account_api_account_admissions e WHERE e.ctid IN
    (SELECT old.ctid FROM private.account_api_account_admissions old
     WHERE old.admitted_at<=v_expiry ORDER BY old.admitted_at LIMIT 5000);
END;
$$;
REVOKE ALL ON FUNCTION private.cleanup_account_api_admissions() FROM PUBLIC,anon,authenticated,service_role;

-- Keep the established cron identity, schedule and both existing cleanups.
DO $$
DECLARE v_job record;
BEGIN
  SELECT jobid,command INTO STRICT v_job FROM cron.job WHERE jobname='cleanup-rate-limits';
  IF strpos(v_job.command,'private.cleanup_account_api_admissions()')=0 THEN
    PERFORM cron.alter_job(job_id:=v_job.jobid,
      command:=v_job.command || E'\nSELECT private.cleanup_account_api_admissions();');
  END IF;
END;
$$;
NOTIFY pgrst, 'reload schema';
