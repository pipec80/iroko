-- ============================================================================
-- Billing Core v2: remaining narrow reducer RPCs
-- ============================================================================
-- Each public RPC reserves its provider-scoped event before changing exactly
-- one domain surface. No invoice/payment event updates subscription state.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION billing.reserve_provider_event(
  p_customer_id uuid,
  p_event_type text,
  p_provider text,
  p_external_event_id text,
  p_payload jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  INSERT INTO billing.events (
    customer_id, event_type, provider, external_event_id, payload, processed_at
  )
  VALUES (
    p_customer_id, p_event_type, p_provider, p_external_event_id,
    COALESCE(p_payload, '{}'::jsonb), now()
  )
  ON CONFLICT (provider, external_event_id) DO NOTHING;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_subscription_updated(
  p_provider text,
  p_external_event_id text,
  p_account_id uuid,
  p_external_subscription_id text,
  p_plan_id uuid,
  p_status billing.subscription_status,
  p_current_period_start timestamptz,
  p_current_period_end timestamptz,
  p_cancel_at_period_end boolean,
  p_external_customer_id text,
  p_payload jsonb
)
RETURNS text
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_customer_id uuid;
  v_subscription_id uuid;
BEGIN
  SELECT subscription.id, subscription.customer_id
  INTO v_subscription_id, v_customer_id
  FROM billing.subscriptions AS subscription
  INNER JOIN billing.customers AS customer ON customer.id = subscription.customer_id
  WHERE subscription.provider = p_provider
    AND subscription.external_subscription_id = p_external_subscription_id
    AND customer.account_id = p_account_id;
  IF v_subscription_id IS NULL THEN RAISE EXCEPTION 'billing_subscription_not_found'; END IF;

  IF NOT billing.reserve_provider_event(
    v_customer_id, 'subscription_updated', p_provider, p_external_event_id, p_payload
  ) THEN RETURN 'duplicate'; END IF;

  UPDATE billing.subscriptions
  SET plan_id = COALESCE(p_plan_id, plan_id),
      status = p_status,
      current_period_start = COALESCE(p_current_period_start, current_period_start),
      current_period_end = COALESCE(p_current_period_end, current_period_end),
      cancel_at_period_end = p_cancel_at_period_end
  WHERE id = v_subscription_id;

  UPDATE billing.customers
  SET external_id = COALESCE(NULLIF(btrim(p_external_customer_id), ''), external_id)
  WHERE id = v_customer_id;
  RETURN 'applied';
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_subscription_canceled(
  p_provider text,
  p_external_event_id text,
  p_account_id uuid,
  p_external_subscription_id text,
  p_canceled_at timestamptz,
  p_access_until timestamptz,
  p_payload jsonb
)
RETURNS text
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_customer_id uuid;
  v_subscription_id uuid;
BEGIN
  SELECT subscription.id, subscription.customer_id
  INTO v_subscription_id, v_customer_id
  FROM billing.subscriptions AS subscription
  INNER JOIN billing.customers AS customer ON customer.id = subscription.customer_id
  WHERE subscription.provider = p_provider
    AND subscription.external_subscription_id = p_external_subscription_id
    AND customer.account_id = p_account_id;
  IF v_subscription_id IS NULL THEN RAISE EXCEPTION 'billing_subscription_not_found'; END IF;

  IF NOT billing.reserve_provider_event(
    v_customer_id, 'subscription_canceled', p_provider, p_external_event_id, p_payload
  ) THEN RETURN 'duplicate'; END IF;

  UPDATE billing.subscriptions
  SET status = 'canceled',
      canceled_at = COALESCE(p_canceled_at, now()),
      current_period_end = COALESCE(p_access_until, current_period_end),
      cancel_at_period_end = false
  WHERE id = v_subscription_id;
  RETURN 'applied';
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_invoice_payment_failed(
  p_provider text,
  p_external_event_id text,
  p_account_id uuid,
  p_external_subscription_id text,
  p_external_invoice_id text,
  p_external_payment_id text,
  p_status text,
  p_amount integer,
  p_currency char(3),
  p_attempted_at timestamptz,
  p_failure_code text,
  p_failure_message text,
  p_payload jsonb
)
RETURNS text
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_customer_id uuid;
  v_subscription_id uuid;
  v_invoice_id uuid;
BEGIN
  IF p_status <> 'failed' THEN RAISE EXCEPTION 'billing_invalid_payment_attempt_status'; END IF;
  SELECT subscription.id, subscription.customer_id
  INTO v_subscription_id, v_customer_id
  FROM billing.subscriptions AS subscription
  INNER JOIN billing.customers AS customer ON customer.id = subscription.customer_id
  WHERE subscription.provider = p_provider
    AND subscription.external_subscription_id = p_external_subscription_id
    AND customer.account_id = p_account_id;
  IF v_subscription_id IS NULL THEN RAISE EXCEPTION 'billing_subscription_not_found'; END IF;

  IF NOT billing.reserve_provider_event(
    v_customer_id, 'invoice_payment_failed', p_provider, p_external_event_id, p_payload
  ) THEN RETURN 'duplicate'; END IF;

  SELECT id INTO v_invoice_id
  FROM billing.invoices
  WHERE provider = p_provider AND external_invoice_id = p_external_invoice_id;

  INSERT INTO billing.payment_attempts (
    provider, subscription_id, invoice_id, external_payment_id, external_invoice_id,
    status, amount, currency, failure_code, failure_message, attempted_at, metadata
  ) VALUES (
    p_provider, v_subscription_id, v_invoice_id, NULLIF(btrim(p_external_payment_id), ''),
    p_external_invoice_id, 'failed', p_amount, p_currency, p_failure_code,
    p_failure_message, p_attempted_at, COALESCE(p_payload, '{}'::jsonb)
  ) ON CONFLICT (provider, external_payment_id)
    WHERE external_payment_id IS NOT NULL
  DO UPDATE SET status = EXCLUDED.status, amount = EXCLUDED.amount,
    currency = EXCLUDED.currency, failure_code = EXCLUDED.failure_code,
    failure_message = EXCLUDED.failure_message, attempted_at = EXCLUDED.attempted_at,
    metadata = EXCLUDED.metadata;
  RETURN 'applied';
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_payment_recovered(
  p_provider text,
  p_external_event_id text,
  p_account_id uuid,
  p_external_subscription_id text,
  p_external_invoice_id text,
  p_external_payment_id text,
  p_status text,
  p_amount integer,
  p_currency char(3),
  p_recovered_at timestamptz,
  p_payload jsonb
)
RETURNS text
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_customer_id uuid;
  v_subscription_id uuid;
  v_invoice_id uuid;
BEGIN
  IF p_status <> 'recovered' THEN RAISE EXCEPTION 'billing_invalid_payment_attempt_status'; END IF;
  SELECT subscription.id, subscription.customer_id
  INTO v_subscription_id, v_customer_id
  FROM billing.subscriptions AS subscription
  INNER JOIN billing.customers AS customer ON customer.id = subscription.customer_id
  WHERE subscription.provider = p_provider
    AND subscription.external_subscription_id = p_external_subscription_id
    AND customer.account_id = p_account_id;
  IF v_subscription_id IS NULL THEN RAISE EXCEPTION 'billing_subscription_not_found'; END IF;

  IF NOT billing.reserve_provider_event(
    v_customer_id, 'payment_recovered', p_provider, p_external_event_id, p_payload
  ) THEN RETURN 'duplicate'; END IF;

  SELECT id INTO v_invoice_id
  FROM billing.invoices
  WHERE provider = p_provider AND external_invoice_id = p_external_invoice_id;

  INSERT INTO billing.payment_attempts (
    provider, subscription_id, invoice_id, external_payment_id, external_invoice_id,
    status, amount, currency, attempted_at, metadata
  ) VALUES (
    p_provider, v_subscription_id, v_invoice_id, NULLIF(btrim(p_external_payment_id), ''),
    p_external_invoice_id, 'recovered', p_amount, p_currency, p_recovered_at,
    COALESCE(p_payload, '{}'::jsonb)
  ) ON CONFLICT (provider, external_payment_id)
    WHERE external_payment_id IS NOT NULL
  DO UPDATE SET status = EXCLUDED.status, amount = EXCLUDED.amount,
    currency = EXCLUDED.currency, attempted_at = EXCLUDED.attempted_at,
    metadata = EXCLUDED.metadata;
  RETURN 'applied';
END;
$$;

REVOKE ALL ON FUNCTION billing.reserve_provider_event(uuid, text, text, text, jsonb)
  FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.apply_subscription_updated(
  text, text, uuid, text, uuid, billing.subscription_status, timestamptz,
  timestamptz, boolean, text, jsonb
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_subscription_updated(
  text, text, uuid, text, uuid, billing.subscription_status, timestamptz,
  timestamptz, boolean, text, jsonb
) TO service_role;

REVOKE ALL ON FUNCTION public.apply_subscription_canceled(
  text, text, uuid, text, timestamptz, timestamptz, jsonb
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_subscription_canceled(
  text, text, uuid, text, timestamptz, timestamptz, jsonb
) TO service_role;

REVOKE ALL ON FUNCTION public.apply_invoice_payment_failed(
  text, text, uuid, text, text, text, text, integer, char(3), timestamptz,
  text, text, jsonb
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_invoice_payment_failed(
  text, text, uuid, text, text, text, text, integer, char(3), timestamptz,
  text, text, jsonb
) TO service_role;

REVOKE ALL ON FUNCTION public.apply_payment_recovered(
  text, text, uuid, text, text, text, text, integer, char(3), timestamptz, jsonb
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_payment_recovered(
  text, text, uuid, text, text, text, text, integer, char(3), timestamptz, jsonb
) TO service_role;

COMMIT;
