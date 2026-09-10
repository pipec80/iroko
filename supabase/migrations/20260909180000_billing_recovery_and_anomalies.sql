-- Durable Mercado Pago payment recovery and deduplicated financial anomalies.
BEGIN;

CREATE TABLE billing.recovery_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL CHECK (NULLIF(btrim(provider), '') IS NOT NULL),
  resource_type text NOT NULL CHECK (resource_type = 'payment'),
  resource_id text NOT NULL CHECK (NULLIF(btrim(resource_id), '') IS NOT NULL AND char_length(resource_id) <= 255),
  reason text NOT NULL CHECK (reason IN ('unlinked_payment', 'payment_pending')),
  external_event_id text NOT NULL CHECK (NULLIF(btrim(external_event_id), '') IS NOT NULL AND char_length(external_event_id) <= 255),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'resolved', 'exhausted')),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count BETWEEN 0 AND 5),
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  last_error_code text CHECK (last_error_code IS NULL OR char_length(last_error_code) <= 100),
  resolution text CHECK (resolution IS NULL OR resolution IN ('event', 'unrelated', 'anomaly')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, resource_type, resource_id, reason)
);

CREATE INDEX recovery_jobs_due_idx
  ON billing.recovery_jobs (next_attempt_at, created_at)
  WHERE status IN ('pending', 'processing');

CREATE TABLE billing.financial_anomalies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL CHECK (NULLIF(btrim(provider), '') IS NOT NULL),
  anomaly_type text NOT NULL CHECK (anomaly_type IN (
    'refund', 'chargeback', 'mediation', 'status_divergence', 'unresolved_payment'
  )),
  external_resource_id text NOT NULL CHECK (
    NULLIF(btrim(external_resource_id), '') IS NOT NULL AND char_length(external_resource_id) <= 255
  ),
  account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  subscription_id uuid REFERENCES billing.subscriptions(id) ON DELETE SET NULL,
  invoice_id uuid REFERENCES billing.invoices(id) ON DELETE SET NULL,
  payment_id uuid REFERENCES billing.payment_attempts(id) ON DELETE SET NULL,
  observed_status text CHECK (observed_status IS NULL OR char_length(observed_status) <= 100),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  occurrence_count integer NOT NULL DEFAULT 1 CHECK (occurrence_count > 0),
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolution_code text CHECK (resolution_code IS NULL OR char_length(resolution_code) <= 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX financial_anomalies_open_unique
  ON billing.financial_anomalies (provider, anomaly_type, external_resource_id)
  WHERE status = 'open';
CREATE INDEX financial_anomalies_account_idx
  ON billing.financial_anomalies (account_id, last_seen_at DESC);
CREATE INDEX financial_anomalies_subscription_idx
  ON billing.financial_anomalies (subscription_id) WHERE subscription_id IS NOT NULL;
CREATE INDEX financial_anomalies_invoice_idx
  ON billing.financial_anomalies (invoice_id) WHERE invoice_id IS NOT NULL;
CREATE INDEX financial_anomalies_payment_idx
  ON billing.financial_anomalies (payment_id) WHERE payment_id IS NOT NULL;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON billing.recovery_jobs
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON billing.financial_anomalies
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

ALTER TABLE billing.recovery_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing.financial_anomalies ENABLE ROW LEVEL SECURITY;
CREATE POLICY billing_recovery_jobs_deny_all ON billing.recovery_jobs
  AS RESTRICTIVE USING (false) WITH CHECK (false);
CREATE POLICY billing_financial_anomalies_deny_all ON billing.financial_anomalies
  AS RESTRICTIVE USING (false) WITH CHECK (false);
REVOKE ALL ON billing.recovery_jobs, billing.financial_anomalies FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON billing.recovery_jobs, billing.financial_anomalies TO service_role;

CREATE OR REPLACE FUNCTION public.enqueue_billing_recovery_job(
  p_provider text, p_resource_type text, p_resource_id text, p_reason text,
  p_external_event_id text
) RETURNS uuid LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_id uuid;
BEGIN
  IF p_resource_type <> 'payment' OR p_reason NOT IN ('unlinked_payment', 'payment_pending')
    OR NULLIF(btrim(p_provider), '') IS NULL OR NULLIF(btrim(p_resource_id), '') IS NULL
    OR NULLIF(btrim(p_external_event_id), '') IS NULL THEN
    RAISE EXCEPTION 'billing_recovery_job_invalid';
  END IF;
  INSERT INTO billing.recovery_jobs(provider, resource_type, resource_id, reason, external_event_id)
  VALUES (btrim(p_provider), p_resource_type, btrim(p_resource_id), p_reason, btrim(p_external_event_id))
  ON CONFLICT (provider, resource_type, resource_id, reason) DO UPDATE
    SET external_event_id = billing.recovery_jobs.external_event_id
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_billing_financial_anomaly(
  p_provider text, p_anomaly_type text, p_external_resource_id text,
  p_observed_status text DEFAULT NULL, p_account_id uuid DEFAULT NULL,
  p_subscription_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_id uuid;
BEGIN
  IF p_anomaly_type NOT IN ('refund','chargeback','mediation','status_divergence','unresolved_payment')
    OR NULLIF(btrim(p_provider), '') IS NULL OR NULLIF(btrim(p_external_resource_id), '') IS NULL THEN
    RAISE EXCEPTION 'billing_financial_anomaly_invalid';
  END IF;
  INSERT INTO billing.financial_anomalies(
    provider, anomaly_type, external_resource_id, observed_status, account_id, subscription_id
  ) VALUES (
    btrim(p_provider), p_anomaly_type, btrim(p_external_resource_id),
    left(p_observed_status, 100), p_account_id, p_subscription_id
  )
  ON CONFLICT (provider, anomaly_type, external_resource_id) WHERE status = 'open'
  DO UPDATE SET last_seen_at = now(), occurrence_count = billing.financial_anomalies.occurrence_count + 1,
    observed_status = COALESCE(EXCLUDED.observed_status, billing.financial_anomalies.observed_status),
    account_id = COALESCE(EXCLUDED.account_id, billing.financial_anomalies.account_id),
    subscription_id = COALESCE(EXCLUDED.subscription_id, billing.financial_anomalies.subscription_id)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_billing_recovery_jobs(
  p_batch_size integer, p_visibility_seconds integer
) RETURNS TABLE(
  id uuid, provider text, resource_type text, resource_id text, reason text,
  attempt_count integer
) LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF p_batch_size < 1 OR p_batch_size > 20 OR p_visibility_seconds < 30 OR p_visibility_seconds > 3600 THEN
    RAISE EXCEPTION 'billing_recovery_claim_invalid';
  END IF;
  RETURN QUERY
  WITH candidates AS (
    SELECT job.id FROM billing.recovery_jobs AS job
    WHERE (job.status = 'pending' AND job.next_attempt_at <= now())
       OR (job.status = 'processing' AND job.locked_at <= now() - make_interval(secs => p_visibility_seconds))
    ORDER BY job.next_attempt_at, job.created_at
    LIMIT p_batch_size FOR UPDATE SKIP LOCKED
  ), claimed AS (
    UPDATE billing.recovery_jobs AS job SET status='processing', locked_at=now(),
      attempt_count=LEAST(job.attempt_count + 1, 5)
    FROM candidates WHERE job.id=candidates.id
    RETURNING job.id, job.provider, job.resource_type, job.resource_id, job.reason, job.attempt_count
  ) SELECT * FROM claimed;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_billing_recovery_job(
  p_job_id uuid, p_outcome text, p_last_error_code text DEFAULT NULL
) RETURNS TABLE(status text, anomaly_created boolean)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_job billing.recovery_jobs%ROWTYPE; v_anomaly_id uuid; v_delay_minutes integer;
BEGIN
  IF p_outcome NOT IN ('event','unrelated','anomaly','pending','error') THEN
    RAISE EXCEPTION 'billing_recovery_outcome_invalid';
  END IF;
  SELECT * INTO v_job FROM billing.recovery_jobs WHERE id=p_job_id FOR UPDATE;
  IF NOT FOUND OR v_job.status <> 'processing' THEN RAISE EXCEPTION 'billing_recovery_job_not_processing'; END IF;
  IF p_outcome IN ('event','unrelated','anomaly') THEN
    UPDATE billing.recovery_jobs SET status='resolved', resolution=p_outcome, locked_at=NULL,
      last_error_code=left(p_last_error_code,100) WHERE id=p_job_id;
    RETURN QUERY SELECT 'resolved'::text, false; RETURN;
  END IF;
  IF v_job.attempt_count >= 5 THEN
    UPDATE billing.recovery_jobs SET status='exhausted', locked_at=NULL,
      last_error_code=left(COALESCE(p_last_error_code,p_outcome),100) WHERE id=p_job_id;
    INSERT INTO billing.financial_anomalies(provider, anomaly_type, external_resource_id, observed_status)
    VALUES(v_job.provider, 'unresolved_payment', v_job.resource_id, left(p_last_error_code,100))
    ON CONFLICT (provider, anomaly_type, external_resource_id)
      WHERE billing.financial_anomalies.status='open' DO NOTHING
    RETURNING id INTO v_anomaly_id;
    RETURN QUERY SELECT 'exhausted'::text, v_anomaly_id IS NOT NULL; RETURN;
  END IF;
  v_delay_minutes := (ARRAY[1,5,15,60,360])[GREATEST(v_job.attempt_count,1)];
  UPDATE billing.recovery_jobs SET status='pending', locked_at=NULL,
    next_attempt_at=now()+make_interval(mins=>v_delay_minutes),
    last_error_code=left(COALESCE(p_last_error_code,p_outcome),100) WHERE id=p_job_id;
  RETURN QUERY SELECT 'pending'::text, false;
END;
$$;

CREATE OR REPLACE FUNCTION private.resolve_billing_financial_anomaly(
  p_anomaly_id uuid, p_resolution_code text
) RETURNS text LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NULLIF(btrim(p_resolution_code),'') IS NULL OR char_length(p_resolution_code)>100 THEN
    RAISE EXCEPTION 'billing_anomaly_resolution_invalid';
  END IF;
  UPDATE billing.financial_anomalies SET status='resolved', resolved_at=now(),
    resolution_code=btrim(p_resolution_code) WHERE id=p_anomaly_id AND status='open';
  IF NOT FOUND THEN RAISE EXCEPTION 'billing_anomaly_not_open'; END IF;
  RETURN 'resolved';
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_billing_recovery_job(text,text,text,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.upsert_billing_financial_anomaly(text,text,text,text,uuid,uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_billing_recovery_jobs(integer,integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_billing_recovery_job(uuid,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.resolve_billing_financial_anomaly(uuid,text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.enqueue_billing_recovery_job(text,text,text,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.upsert_billing_financial_anomaly(text,text,text,text,uuid,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_billing_recovery_jobs(integer,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_billing_recovery_job(uuid,text,text) TO service_role;

COMMENT ON TABLE billing.recovery_jobs IS 'Payload-free durable work for deferred provider payment correlation.';
COMMENT ON TABLE billing.financial_anomalies IS 'Deduplicated adverse financial observations; never changes subscription access automatically.';

COMMIT;
