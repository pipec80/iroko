-- Persist bounded, normalized financial anomaly evidence without changing access.
BEGIN;

ALTER TABLE billing.financial_anomalies
  ADD COLUMN original_amount integer CHECK (original_amount IS NULL OR original_amount >= 0),
  ADD COLUMN affected_amount integer CHECK (affected_amount IS NULL OR affected_amount >= 0),
  ADD COLUMN currency text CHECK (currency IS NULL OR currency ~ '^[A-Z]{3}$'),
  ADD CONSTRAINT financial_anomaly_amount_bounds CHECK (
    original_amount IS NULL OR affected_amount IS NULL OR affected_amount <= original_amount
  );

ALTER TABLE billing.financial_anomalies
  DROP CONSTRAINT financial_anomalies_anomaly_type_check,
  ADD CONSTRAINT financial_anomalies_anomaly_type_check CHECK (
    anomaly_type IN (
      'refund', 'partial_refund', 'chargeback', 'mediation',
      'status_divergence', 'unresolved_payment'
    )
  );

DROP FUNCTION IF EXISTS public.upsert_billing_financial_anomaly(
  text, text, text, text, uuid, uuid
);

CREATE FUNCTION public.upsert_billing_financial_anomaly(
  p_provider text,
  p_anomaly_type text,
  p_external_resource_id text,
  p_observed_status text DEFAULT NULL,
  p_account_id uuid DEFAULT NULL,
  p_subscription_id uuid DEFAULT NULL,
  p_original_amount integer DEFAULT NULL,
  p_affected_amount integer DEFAULT NULL,
  p_currency text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_anomaly_type NOT IN (
      'refund', 'partial_refund', 'chargeback', 'mediation',
      'status_divergence', 'unresolved_payment'
    )
    OR NULLIF(btrim(p_provider), '') IS NULL
    OR NULLIF(btrim(p_external_resource_id), '') IS NULL
    OR p_original_amount < 0
    OR p_affected_amount < 0
    OR (
      p_original_amount IS NOT NULL
      AND p_affected_amount IS NOT NULL
      AND p_affected_amount > p_original_amount
    )
    OR (p_currency IS NOT NULL AND p_currency !~ '^[A-Z]{3}$') THEN
    RAISE EXCEPTION 'billing_financial_anomaly_invalid';
  END IF;

  INSERT INTO billing.financial_anomalies (
    provider,
    anomaly_type,
    external_resource_id,
    observed_status,
    account_id,
    subscription_id,
    original_amount,
    affected_amount,
    currency
  ) VALUES (
    btrim(p_provider),
    p_anomaly_type,
    btrim(p_external_resource_id),
    left(p_observed_status, 100),
    p_account_id,
    p_subscription_id,
    p_original_amount,
    p_affected_amount,
    p_currency
  )
  ON CONFLICT (provider, anomaly_type, external_resource_id) WHERE status = 'open'
  DO UPDATE SET
    last_seen_at = now(),
    occurrence_count = billing.financial_anomalies.occurrence_count + 1,
    observed_status = COALESCE(
      EXCLUDED.observed_status,
      billing.financial_anomalies.observed_status
    ),
    account_id = COALESCE(EXCLUDED.account_id, billing.financial_anomalies.account_id),
    subscription_id = COALESCE(
      EXCLUDED.subscription_id,
      billing.financial_anomalies.subscription_id
    ),
    original_amount = COALESCE(
      EXCLUDED.original_amount,
      billing.financial_anomalies.original_amount
    ),
    affected_amount = COALESCE(
      EXCLUDED.affected_amount,
      billing.financial_anomalies.affected_amount
    ),
    currency = COALESCE(EXCLUDED.currency, billing.financial_anomalies.currency)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_billing_financial_anomaly(
  text, text, text, text, uuid, uuid, integer, integer, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_billing_financial_anomaly(
  text, text, text, text, uuid, uuid, integer, integer, text
) TO service_role;

COMMIT;
