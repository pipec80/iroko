-- ============================================================================
-- ESPEJO de supabase/migrations/20260708100000_api_keys.sql (F2-2D)
-- El diff declarativo está deshabilitado en Windows: este archivo documenta el
-- estado final; la fuente de verdad ejecutable es la migración versionada.
-- ============================================================================
-- ============================================================================
-- API Keys (F2-2D)
-- ============================================================================
-- Claves de API por cuenta, almacenadas SOLO como hash SHA-256. La clave en
-- claro se devuelve una única vez desde create_api_key. Sin acceso directo
-- del cliente: RLS deny-all + REVOKE; todo pasa por RPCs SECURITY DEFINER.
-- verify_api_key es solo para service_role (el caller externo no tiene JWT).
--
-- NOTE: migración escrita a mano (db diff deshabilitado en Windows, ver
-- supabase/config.toml); supabase/schemas/api-keys.sql se actualiza como
-- espejo en el mismo commit.
-- ============================================================================

CREATE TABLE public.api_keys (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id   uuid        NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  name         text        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  key_prefix   text        NOT NULL,
  key_hash     text        NOT NULL UNIQUE,
  created_by   uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  last_used_at timestamptz,
  expires_at   timestamptz,
  revoked_at   timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.api_keys IS
  'Claves de API por cuenta (F2-2D). Solo se persiste el hash SHA-256; la clave en claro se muestra una única vez al crearla. Gestionada exclusivamente vía RPCs.';
COMMENT ON COLUMN public.api_keys.name IS
  'Etiqueta elegida por el usuario para identificar la clave (ej: "CI deploy").';
COMMENT ON COLUMN public.api_keys.key_prefix IS
  'Primeros 12 caracteres de la clave (irk_xxxxxxxx) para identificarla en la UI.';
COMMENT ON COLUMN public.api_keys.key_hash IS
  'SHA-256 hex de la clave completa. El índice UNIQUE da lookup O(1) en verify_api_key.';
COMMENT ON COLUMN public.api_keys.last_used_at IS
  'Actualizado por verify_api_key en cada uso válido.';
COMMENT ON COLUMN public.api_keys.expires_at IS
  'NULL = sin expiración.';
COMMENT ON COLUMN public.api_keys.revoked_at IS
  'NULL = activa. Revocación soft vía revoke_api_key (idempotente).';

CREATE INDEX idx_api_keys_account_created ON public.api_keys (account_id, created_at DESC);
-- FK de soporte (regla del repo: todo FK con índice — ver 06_indexes.test.sql)
CREATE INDEX idx_api_keys_created_by ON public.api_keys (created_by);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
-- Sin políticas: deny-all incluso si algún grant se filtrara.
REVOKE ALL ON public.api_keys FROM authenticated, anon;

-- ============================================================================
-- Helper compartido de autorización (lo reusa la migración de webhooks)
-- ============================================================================

CREATE OR REPLACE FUNCTION private.assert_account_admin(p_account_id uuid)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid  uuid := (SELECT auth.uid());
  v_role public.membership_role;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;
  v_role := private.get_user_role(p_account_id, v_uid);
  -- v_role NULL (sin membership) debe chequearse explícito: NOT IN con NULL
  -- evalúa a NULL y el IF sería falso (mismo bug evitado en F2-2G).
  IF v_role IS NULL OR v_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
END;
$$;

COMMENT ON FUNCTION private.assert_account_admin(uuid) IS
  'Aborta con not_authenticated/not_authorized salvo que el caller sea owner o admin de la cuenta. Reusado por RPCs de api_keys y webhooks (F2-2D).';
REVOKE EXECUTE ON FUNCTION private.assert_account_admin(uuid) FROM PUBLIC;

-- ============================================================================
-- create_api_key
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_api_key(
  p_account_id uuid,
  p_name       text,
  p_expires_at timestamptz DEFAULT NULL
)
RETURNS TABLE (id uuid, key text)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_key text;
BEGIN
  -- Serialize quota reads and admission; recheck authorization after waiting.
  PERFORM pg_advisory_xact_lock(hashtextextended('api-key-account:' || p_account_id::text, 0));
  PERFORM private.assert_account_admin(p_account_id);

  IF p_name IS NULL OR char_length(btrim(p_name)) < 1 OR char_length(btrim(p_name)) > 100 THEN
    RAISE EXCEPTION 'invalid_name';
  END IF;
  IF p_expires_at IS NOT NULL AND p_expires_at <= now() THEN
    RAISE EXCEPTION 'invalid_expiry';
  END IF;
  IF NOT private.within_plan_limit(p_account_id, 'api_keys_max',
      (SELECT count(*) FROM public.api_keys k
       WHERE k.account_id = p_account_id AND k.revoked_at IS NULL)) THEN
    RAISE EXCEPTION 'key_limit_reached';
  END IF;

  -- base64url sin padding: '+'→'-', '/'→'_', '=' eliminado por translate.
  v_key := 'irk_' || translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/=', '-_');

  RETURN QUERY
  INSERT INTO public.api_keys (account_id, name, key_prefix, key_hash, created_by, expires_at)
  VALUES (
    p_account_id,
    btrim(p_name),
    left(v_key, 12),
    encode(extensions.digest(v_key, 'sha256'), 'hex'),
    (SELECT auth.uid()),
    p_expires_at
  )
  RETURNING api_keys.id, v_key;
END;
$$;

COMMENT ON FUNCTION public.create_api_key(uuid, text, timestamptz) IS
  'Crea una API key para la cuenta (owner/admin). Devuelve la clave en claro UNA única vez; solo el hash queda persistido. Límite de keys activas según api_keys_max del plan (F3-3H-1, límite vía private.within_plan_limit desde 3H-1.5).';

-- ============================================================================
-- list_api_keys
-- ============================================================================

CREATE OR REPLACE FUNCTION public.list_api_keys(p_account_id uuid)
RETURNS TABLE (
  id           uuid,
  name         text,
  key_prefix   text,
  last_used_at timestamptz,
  expires_at   timestamptz,
  revoked_at   timestamptz,
  created_at   timestamptz
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM private.assert_account_admin(p_account_id);
  RETURN QUERY
  SELECT k.id, k.name, k.key_prefix, k.last_used_at, k.expires_at, k.revoked_at, k.created_at
  FROM public.api_keys k
  WHERE k.account_id = p_account_id
  ORDER BY k.created_at DESC;
END;
$$;

COMMENT ON FUNCTION public.list_api_keys(uuid) IS
  'Lista las API keys de la cuenta (owner/admin). Nunca expone key_hash.';

-- ============================================================================
-- revoke_api_key
-- ============================================================================

CREATE OR REPLACE FUNCTION public.revoke_api_key(p_key_id uuid)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_account_id uuid;
BEGIN
  SELECT k.account_id INTO v_account_id FROM public.api_keys k WHERE k.id = p_key_id;
  IF v_account_id IS NULL THEN
    RAISE EXCEPTION 'not_found';
  END IF;
  PERFORM private.assert_account_admin(v_account_id);
  UPDATE public.api_keys SET revoked_at = now()
  WHERE id = p_key_id AND revoked_at IS NULL;
END;
$$;

COMMENT ON FUNCTION public.revoke_api_key(uuid) IS
  'Revoca (soft) una API key. Idempotente: revocar dos veces no cambia revoked_at.';

-- ============================================================================
-- verify_api_key (solo service_role)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.verify_api_key(p_key_hash text)
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_account_id uuid;
BEGIN
  UPDATE public.api_keys
  SET last_used_at = now()
  WHERE key_hash = p_key_hash
    AND revoked_at IS NULL
    AND (expires_at IS NULL OR expires_at > now())
  RETURNING account_id INTO v_account_id;
  RETURN v_account_id;  -- NULL si no existe / revocada / expirada
END;
$$;

COMMENT ON FUNCTION public.verify_api_key(text) IS
  'Valida un hash de API key y actualiza last_used_at. NULL = inválida. Ejecutable SOLO por service_role: el caller externo autentica por header, no por JWT.';

-- ============================================================================
-- Grants
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.create_api_key(uuid, text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_api_keys(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_api_key(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_api_key(text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.create_api_key(uuid, text, timestamptz) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.list_api_keys(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.revoke_api_key(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.verify_api_key(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.verify_api_key(text) FROM authenticated, anon;

-- Plan 012.3 durable account API admission (20261013210436).
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

-- Plan 012.3 account summary consumer (20261014012941). The API handler
-- filters by the admitted account id and reads exactly these four columns.
GRANT SELECT (id, name, slug, type) ON TABLE public.accounts TO service_role;
