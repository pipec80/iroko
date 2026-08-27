-- ============================================================================
-- Billing Core v2: narrow, idempotent reducer RPCs
-- ============================================================================
-- Each reducer operation reserves its provider-scoped event identifier before
-- changing billing state. The functions deliberately own disjoint mutation
-- surfaces: invoice payment ingestion never changes subscription fields.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.apply_subscription_created(
  p_provider                 text,
  p_external_event_id        text,
  p_account_id               uuid,
  p_plan_id                  uuid,
  p_external_subscription_id text,
  p_status                   billing.subscription_status,
  p_current_period_start     timestamptz,
  p_current_period_end       timestamptz,
  p_cancel_at_period_end     boolean,
  p_external_customer_id     text,
  p_payload                  jsonb
)
RETURNS text
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_customer_id uuid;
BEGIN
  IF NULLIF(btrim(p_provider), '') IS NULL
    OR NULLIF(btrim(p_external_event_id), '') IS NULL
    OR NULLIF(btrim(p_external_subscription_id), '') IS NULL THEN
    RAISE EXCEPTION 'billing_required_provider_event_or_subscription_id_missing';
  END IF;

  INSERT INTO billing.events (
    event_type,
    provider,
    external_event_id,
    payload,
    processed_at
  )
  VALUES (
    'subscription_created',
    p_provider,
    p_external_event_id,
    COALESCE(p_payload, '{}'::jsonb),
    now()
  )
  ON CONFLICT (provider, external_event_id) DO NOTHING;

  IF NOT FOUND THEN
    RETURN 'duplicate';
  END IF;

  INSERT INTO billing.customers (account_id, provider, external_id)
  VALUES (
    p_account_id,
    p_provider,
    NULLIF(btrim(p_external_customer_id), '')
  )
  ON CONFLICT (account_id, provider) DO UPDATE
  SET external_id = COALESCE(EXCLUDED.external_id, billing.customers.external_id),
      updated_at = now()
  RETURNING id INTO v_customer_id;

  INSERT INTO billing.subscriptions (
    customer_id,
    plan_id,
    status,
    current_period_start,
    current_period_end,
    cancel_at_period_end,
    provider,
    external_subscription_id
  )
  VALUES (
    v_customer_id,
    p_plan_id,
    p_status,
    p_current_period_start,
    p_current_period_end,
    p_cancel_at_period_end,
    p_provider,
    p_external_subscription_id
  )
  ON CONFLICT (provider, external_subscription_id)
    WHERE external_subscription_id IS NOT NULL
  DO UPDATE
  SET customer_id = EXCLUDED.customer_id,
      plan_id = EXCLUDED.plan_id,
      status = EXCLUDED.status,
      current_period_start = EXCLUDED.current_period_start,
      current_period_end = EXCLUDED.current_period_end,
      cancel_at_period_end = EXCLUDED.cancel_at_period_end;

  RETURN 'applied';
END;
$$;

COMMENT ON FUNCTION public.apply_subscription_created(
  text, text, uuid, uuid, text, billing.subscription_status, timestamptz,
  timestamptz, boolean, text, jsonb
) IS
  'Billing Core v2 narrow reducer: applies one resolved subscription-created event atomically and idempotently.';

CREATE OR REPLACE FUNCTION public.apply_invoice_paid(
  p_provider                 text,
  p_external_event_id        text,
  p_account_id               uuid,
  p_external_subscription_id text,
  p_external_invoice_id      text,
  p_external_payment_id      text,
  p_amount_paid              integer,
  p_currency                 char(3),
  p_period_start             timestamptz,
  p_period_end               timestamptz,
  p_paid_at                  timestamptz,
  p_hosted_url               text,
  p_pdf_url                  text,
  p_payload                  jsonb
)
RETURNS text
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_customer_id     uuid;
  v_subscription_id uuid;
  v_invoice_id      uuid;
BEGIN
  IF NULLIF(btrim(p_provider), '') IS NULL
    OR NULLIF(btrim(p_external_event_id), '') IS NULL
    OR NULLIF(btrim(p_external_subscription_id), '') IS NULL
    OR NULLIF(btrim(p_external_invoice_id), '') IS NULL THEN
    RAISE EXCEPTION 'billing_required_provider_event_subscription_or_invoice_id_missing';
  END IF;

  IF p_amount_paid < 0 THEN
    RAISE EXCEPTION 'billing_invoice_amount_must_be_nonnegative';
  END IF;

  SELECT subscription.id, subscription.customer_id
  INTO v_subscription_id, v_customer_id
  FROM billing.subscriptions AS subscription
  INNER JOIN billing.customers AS customer
    ON customer.id = subscription.customer_id
  WHERE subscription.provider = p_provider
    AND subscription.external_subscription_id = p_external_subscription_id
    AND customer.account_id = p_account_id;

  IF v_subscription_id IS NULL THEN
    RAISE EXCEPTION 'billing_subscription_not_found';
  END IF;

  INSERT INTO billing.events (
    customer_id,
    event_type,
    provider,
    external_event_id,
    payload,
    processed_at
  )
  VALUES (
    v_customer_id,
    'invoice_paid',
    p_provider,
    p_external_event_id,
    COALESCE(p_payload, '{}'::jsonb),
    now()
  )
  ON CONFLICT (provider, external_event_id) DO NOTHING;

  IF NOT FOUND THEN
    RETURN 'duplicate';
  END IF;

  INSERT INTO billing.invoices (
    customer_id,
    subscription_id,
    provider,
    status,
    currency,
    total,
    amount_paid,
    period_start,
    period_end,
    paid_at,
    external_invoice_id,
    hosted_url,
    pdf_url
  )
  VALUES (
    v_customer_id,
    v_subscription_id,
    p_provider,
    'paid',
    p_currency,
    p_amount_paid,
    p_amount_paid,
    p_period_start,
    p_period_end,
    p_paid_at,
    p_external_invoice_id,
    p_hosted_url,
    p_pdf_url
  )
  ON CONFLICT (provider, external_invoice_id)
    WHERE external_invoice_id IS NOT NULL
  DO UPDATE
  SET status = EXCLUDED.status,
      currency = EXCLUDED.currency,
      total = EXCLUDED.total,
      amount_paid = EXCLUDED.amount_paid,
      period_start = EXCLUDED.period_start,
      period_end = EXCLUDED.period_end,
      paid_at = EXCLUDED.paid_at,
      hosted_url = EXCLUDED.hosted_url,
      pdf_url = EXCLUDED.pdf_url
  RETURNING id INTO v_invoice_id;

  INSERT INTO billing.payment_attempts (
    provider,
    subscription_id,
    invoice_id,
    external_payment_id,
    external_invoice_id,
    status,
    amount,
    currency,
    attempted_at,
    metadata
  )
  VALUES (
    p_provider,
    v_subscription_id,
    v_invoice_id,
    NULLIF(btrim(p_external_payment_id), ''),
    p_external_invoice_id,
    'paid',
    p_amount_paid,
    p_currency,
    p_paid_at,
    COALESCE(p_payload, '{}'::jsonb)
  )
  ON CONFLICT (provider, external_payment_id)
    WHERE external_payment_id IS NOT NULL
  DO UPDATE
  SET subscription_id = EXCLUDED.subscription_id,
      invoice_id = EXCLUDED.invoice_id,
      external_invoice_id = EXCLUDED.external_invoice_id,
      status = EXCLUDED.status,
      amount = EXCLUDED.amount,
      currency = EXCLUDED.currency,
      attempted_at = EXCLUDED.attempted_at,
      metadata = EXCLUDED.metadata;

  RETURN 'applied';
END;
$$;

COMMENT ON FUNCTION public.apply_invoice_paid(
  text, text, uuid, text, text, text, integer, char(3), timestamptz,
  timestamptz, timestamptz, text, text, jsonb
) IS
  'Billing Core v2 narrow reducer: records one paid invoice and payment attempt without mutating subscription state.';

REVOKE ALL ON FUNCTION public.apply_subscription_created(
  text, text, uuid, uuid, text, billing.subscription_status, timestamptz,
  timestamptz, boolean, text, jsonb
) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.apply_subscription_created(
  text, text, uuid, uuid, text, billing.subscription_status, timestamptz,
  timestamptz, boolean, text, jsonb
) TO service_role;

REVOKE ALL ON FUNCTION public.apply_invoice_paid(
  text, text, uuid, text, text, text, integer, char(3), timestamptz,
  timestamptz, timestamptz, text, text, jsonb
) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.apply_invoice_paid(
  text, text, uuid, text, text, text, integer, char(3), timestamptz,
  timestamptz, timestamptz, text, text, jsonb
) TO service_role;

COMMIT;
