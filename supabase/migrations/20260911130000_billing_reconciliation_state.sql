-- Durable, provider-neutral reconciliation progress with service-only leases.
BEGIN;

CREATE TABLE billing.reconciliation_state (
  subscription_id uuid PRIMARY KEY REFERENCES billing.subscriptions(id),
  next_scan_at timestamptz NOT NULL DEFAULT now(),
  lease_owner text,
  lease_expires_at timestamptz,
  invoice_watermark timestamptz,
  scan_cursor text,
  failure_count integer NOT NULL DEFAULT 0,
  scan_watermark timestamptz,
  last_error_code text,
  last_completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reconciliation_state_lease_pair CHECK (
    (lease_owner IS NULL) = (lease_expires_at IS NULL)
  ),
  CONSTRAINT reconciliation_state_lease_owner_bounds CHECK (
    lease_owner IS NULL
    OR (NULLIF(btrim(lease_owner), '') IS NOT NULL AND char_length(lease_owner) <= 100)
  ),
  CONSTRAINT reconciliation_state_failure_count_bounds CHECK (
    failure_count BETWEEN 0 AND 10
  ),
  CONSTRAINT reconciliation_state_error_code_bounds CHECK (
    last_error_code IS NULL OR char_length(last_error_code) <= 100
  )
);

CREATE INDEX reconciliation_state_next_scan_idx
  ON billing.reconciliation_state (next_scan_at, subscription_id);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON billing.reconciliation_state
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

ALTER TABLE billing.reconciliation_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY billing_reconciliation_state_deny_all
  ON billing.reconciliation_state
  AS RESTRICTIVE
  USING (false)
  WITH CHECK (false);
REVOKE ALL ON billing.reconciliation_state FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON billing.reconciliation_state TO service_role;

COMMENT ON TABLE billing.reconciliation_state IS
  'Provider-neutral lease, cursor, watermark, and retry state for one billing subscription.';

CREATE OR REPLACE FUNCTION private.ensure_billing_reconciliation_state()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NULLIF(btrim(NEW.external_subscription_id), '') IS NOT NULL THEN
    INSERT INTO billing.reconciliation_state (subscription_id)
    VALUES (NEW.id)
    ON CONFLICT (subscription_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.ensure_billing_reconciliation_state()
  FROM PUBLIC, anon, authenticated, service_role;

CREATE TRIGGER ensure_billing_reconciliation_state
  AFTER INSERT OR UPDATE OF external_subscription_id ON billing.subscriptions
  FOR EACH ROW EXECUTE FUNCTION private.ensure_billing_reconciliation_state();

INSERT INTO billing.reconciliation_state (subscription_id)
SELECT subscription.id
FROM billing.subscriptions AS subscription
WHERE NULLIF(btrim(subscription.external_subscription_id), '') IS NOT NULL
ON CONFLICT (subscription_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.claim_billing_reconciliation_candidates(
  p_batch_size integer,
  p_visibility_seconds integer,
  p_worker_id text
)
RETURNS TABLE (
  subscription_id uuid,
  account_id uuid,
  provider text,
  external_subscription_id text,
  subscription_updated_at timestamptz,
  invoice_watermark timestamptz,
  scan_cursor text,
  scan_watermark timestamptz
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_worker_id text := btrim(p_worker_id);
BEGIN
  IF p_batch_size IS NULL OR p_batch_size < 1 OR p_batch_size > 20 THEN
    RAISE EXCEPTION 'billing_reconciliation_batch_invalid';
  END IF;
  IF p_visibility_seconds IS NULL
    OR p_visibility_seconds < 30
    OR p_visibility_seconds > 1800 THEN
    RAISE EXCEPTION 'billing_reconciliation_visibility_invalid';
  END IF;
  IF NULLIF(v_worker_id, '') IS NULL OR char_length(v_worker_id) > 100 THEN
    RAISE EXCEPTION 'billing_reconciliation_worker_invalid';
  END IF;

  RETURN QUERY
  WITH candidates AS MATERIALIZED (
    SELECT state.subscription_id
    FROM billing.reconciliation_state AS state
    INNER JOIN billing.subscriptions AS subscription
      ON subscription.id = state.subscription_id
    WHERE state.next_scan_at <= now()
      AND (state.lease_owner IS NULL OR state.lease_expires_at <= now())
      AND subscription.status IN (
        'incomplete',
        'trialing',
        'active',
        'past_due',
        'paused'
      )
      AND NULLIF(btrim(subscription.external_subscription_id), '') IS NOT NULL
    ORDER BY state.next_scan_at, state.subscription_id
    FOR UPDATE OF state SKIP LOCKED
    LIMIT p_batch_size
  ),
  claimed AS (
    UPDATE billing.reconciliation_state AS state
    SET lease_owner = v_worker_id,
      lease_expires_at = now() + make_interval(secs => p_visibility_seconds)
    FROM candidates
    WHERE state.subscription_id = candidates.subscription_id
    RETURNING state.subscription_id
  )
  SELECT
    subscription.id,
    customer.account_id,
    subscription.provider,
    subscription.external_subscription_id,
    subscription.updated_at,
    state.invoice_watermark,
    state.scan_cursor,
    state.scan_watermark
  FROM claimed
  INNER JOIN billing.reconciliation_state AS state
    ON state.subscription_id = claimed.subscription_id
  INNER JOIN billing.subscriptions AS subscription
    ON subscription.id = claimed.subscription_id
  INNER JOIN billing.customers AS customer
    ON customer.id = subscription.customer_id
  ORDER BY state.next_scan_at, state.subscription_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_billing_reconciliation_candidate(
  p_subscription_id uuid,
  p_worker_id text,
  p_outcome text,
  p_provider_watermark timestamptz,
  p_next_cursor text,
  p_error_code text
)
RETURNS text
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_state billing.reconciliation_state%ROWTYPE;
  v_worker_id text := btrim(p_worker_id);
  v_error_code text := left(NULLIF(btrim(p_error_code), ''), 100);
  v_failure_delay_minutes integer;
BEGIN
  IF p_outcome IS NULL
    OR p_outcome NOT IN ('completed', 'deferred', 'failed', 'skipped') THEN
    RAISE EXCEPTION 'billing_reconciliation_outcome_invalid';
  END IF;
  IF NULLIF(v_worker_id, '') IS NULL OR char_length(v_worker_id) > 100 THEN
    RAISE EXCEPTION 'billing_reconciliation_worker_invalid';
  END IF;

  SELECT state.*
  INTO v_state
  FROM billing.reconciliation_state AS state
  WHERE state.subscription_id = p_subscription_id
  FOR UPDATE;

  IF NOT FOUND
    OR v_state.lease_owner IS DISTINCT FROM v_worker_id
    OR v_state.lease_expires_at IS NULL
    OR v_state.lease_expires_at <= now() THEN
    RAISE EXCEPTION 'billing_reconciliation_lease_not_owned';
  END IF;

  IF p_outcome = 'completed' AND p_next_cursor IS NULL THEN
    UPDATE billing.reconciliation_state
    SET next_scan_at = now() + interval '1 hour',
      lease_owner = NULL,
      lease_expires_at = NULL,
      invoice_watermark = GREATEST(
        v_state.invoice_watermark,
        v_state.scan_watermark,
        p_provider_watermark
      ),
      scan_cursor = NULL,
      failure_count = 0,
      scan_watermark = NULL,
      last_error_code = NULL,
      last_completed_at = now()
    WHERE subscription_id = p_subscription_id;
  ELSIF p_outcome = 'completed' THEN
    UPDATE billing.reconciliation_state
    SET next_scan_at = now() + interval '1 hour',
      lease_owner = NULL,
      lease_expires_at = NULL,
      scan_cursor = p_next_cursor,
      scan_watermark = GREATEST(v_state.scan_watermark, p_provider_watermark),
      last_error_code = v_error_code
    WHERE subscription_id = p_subscription_id;
  ELSIF p_outcome = 'deferred' THEN
    UPDATE billing.reconciliation_state
    SET next_scan_at = now() + interval '1 minute',
      lease_owner = NULL,
      lease_expires_at = NULL,
      scan_cursor = COALESCE(p_next_cursor, v_state.scan_cursor),
      scan_watermark = GREATEST(v_state.scan_watermark, p_provider_watermark),
      last_error_code = v_error_code
    WHERE subscription_id = p_subscription_id;
  ELSIF p_outcome = 'failed' THEN
    v_failure_delay_minutes := LEAST(
      60,
      power(2, v_state.failure_count + 1)::integer
    );
    UPDATE billing.reconciliation_state
    SET next_scan_at = now() + make_interval(mins => v_failure_delay_minutes),
      lease_owner = NULL,
      lease_expires_at = NULL,
      failure_count = LEAST(10, v_state.failure_count + 1),
      last_error_code = v_error_code
    WHERE subscription_id = p_subscription_id;
  ELSE
    UPDATE billing.reconciliation_state
    SET next_scan_at = now() + interval '6 hours',
      lease_owner = NULL,
      lease_expires_at = NULL,
      last_error_code = v_error_code
    WHERE subscription_id = p_subscription_id;
  END IF;

  RETURN p_outcome;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_billing_reconciliation_candidates(integer, integer, text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_billing_reconciliation_candidate(
  uuid,
  text,
  text,
  timestamptz,
  text,
  text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_billing_reconciliation_candidates(integer, integer, text)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_billing_reconciliation_candidate(
  uuid,
  text,
  text,
  timestamptz,
  text,
  text
) TO service_role;

COMMIT;
