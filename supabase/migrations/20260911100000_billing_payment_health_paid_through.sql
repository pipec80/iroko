-- ============================================================================
-- Billing payment health and verified paid-through access
-- ============================================================================
-- Payment-attempt status is an operator/customer signal, not a subscription
-- lifecycle transition. Canceled subscriptions remain effective only while a
-- persisted provider-neutral current_period_end is still in the future.
-- Written manually: supabase db diff is unsupported on Windows.
-- ============================================================================

-- Invoice-backed periods are the evidence consumed by the read helpers below.
-- These reducer redefinitions keep their existing signatures and lifecycle
-- mutations, while preventing later absent or older provider evidence from
-- erasing a stronger period already stored on the subscription.

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
      current_period_start = CASE
        WHEN EXCLUDED.current_period_start IS NOT NULL
          AND EXCLUDED.current_period_end IS NOT NULL
          AND EXCLUDED.current_period_end > EXCLUDED.current_period_start
          AND (
            billing.subscriptions.current_period_end IS NULL
            OR EXCLUDED.current_period_end > billing.subscriptions.current_period_end
          )
          THEN EXCLUDED.current_period_start
        ELSE billing.subscriptions.current_period_start
      END,
      current_period_end = CASE
        WHEN EXCLUDED.current_period_start IS NOT NULL
          AND EXCLUDED.current_period_end IS NOT NULL
          AND EXCLUDED.current_period_end > EXCLUDED.current_period_start
          AND (
            billing.subscriptions.current_period_end IS NULL
            OR EXCLUDED.current_period_end > billing.subscriptions.current_period_end
          )
          THEN EXCLUDED.current_period_end
        ELSE billing.subscriptions.current_period_end
      END,
      cancel_at_period_end = EXCLUDED.cancel_at_period_end;

  RETURN 'applied';
END;
$$;

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

  UPDATE billing.subscriptions AS subscription
  SET current_period_start = CASE
        WHEN p_period_start IS NOT NULL
          AND p_period_end IS NOT NULL
          AND p_period_end > p_period_start
          AND (
            subscription.current_period_end IS NULL
            OR p_period_end > subscription.current_period_end
          )
          THEN p_period_start
        ELSE subscription.current_period_start
      END,
      current_period_end = CASE
        WHEN p_period_start IS NOT NULL
          AND p_period_end IS NOT NULL
          AND p_period_end > p_period_start
          AND (
            subscription.current_period_end IS NULL
            OR p_period_end > subscription.current_period_end
          )
          THEN p_period_end
        ELSE subscription.current_period_end
      END
  WHERE subscription.id = v_subscription_id;

  RETURN 'applied';
END;
$$;

COMMENT ON FUNCTION public.apply_invoice_paid(
  text, text, uuid, text, text, text, integer, char(3), timestamptz,
  timestamptz, timestamptz, text, text, jsonb
) IS
  'Billing Core v2 narrow reducer: records one paid invoice and payment attempt, and monotonically advances verified subscription period evidence without changing lifecycle status.';

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

  IF v_subscription_id IS NULL THEN
    RAISE EXCEPTION 'billing_subscription_not_found';
  END IF;

  IF NOT billing.reserve_provider_event(
    v_customer_id,
    'subscription_updated',
    p_provider,
    p_external_event_id,
    p_payload
  ) THEN
    RETURN 'duplicate';
  END IF;

  UPDATE billing.subscriptions AS subscription
  SET plan_id = COALESCE(p_plan_id, plan_id),
      status = p_status,
      current_period_start = CASE
        WHEN p_current_period_start IS NOT NULL
          AND p_current_period_end IS NOT NULL
          AND p_current_period_end > p_current_period_start
          AND (
            subscription.current_period_end IS NULL
            OR p_current_period_end > subscription.current_period_end
          )
          THEN p_current_period_start
        ELSE subscription.current_period_start
      END,
      current_period_end = CASE
        WHEN p_current_period_start IS NOT NULL
          AND p_current_period_end IS NOT NULL
          AND p_current_period_end > p_current_period_start
          AND (
            subscription.current_period_end IS NULL
            OR p_current_period_end > subscription.current_period_end
          )
          THEN p_current_period_end
        ELSE subscription.current_period_end
      END,
      cancel_at_period_end = p_cancel_at_period_end
  WHERE subscription.id = v_subscription_id;

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

  IF v_subscription_id IS NULL THEN
    RAISE EXCEPTION 'billing_subscription_not_found';
  END IF;

  IF NOT billing.reserve_provider_event(
    v_customer_id,
    'subscription_canceled',
    p_provider,
    p_external_event_id,
    p_payload
  ) THEN
    RETURN 'duplicate';
  END IF;

  UPDATE billing.subscriptions AS subscription
  SET status = 'canceled',
      canceled_at = COALESCE(p_canceled_at, now()),
      current_period_end = CASE
        WHEN p_access_until IS NOT NULL
          AND (
            subscription.current_period_end IS NULL
            OR p_access_until > subscription.current_period_end
          )
          THEN p_access_until
        ELSE subscription.current_period_end
      END,
      cancel_at_period_end = false
  WHERE subscription.id = v_subscription_id;

  RETURN 'applied';
END;
$$;

CREATE OR REPLACE FUNCTION public.get_account_subscription(p_account_id uuid)
RETURNS TABLE(
  plan_name text,
  plan_slug text,
  status billing.subscription_status,
  current_period_end timestamptz,
  cancel_at_period_end boolean,
  features jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT private.user_is_member(p_account_id, (SELECT auth.uid())) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  RETURN QUERY
  SELECT plan.name, plan.slug, subscription.status,
         subscription.current_period_end, subscription.cancel_at_period_end,
         plan.features
  FROM billing.subscriptions AS subscription
  INNER JOIN billing.customers AS customer ON customer.id = subscription.customer_id
  INNER JOIN billing.plans AS plan ON plan.id = subscription.plan_id
  WHERE customer.account_id = p_account_id
    AND (
      subscription.status IN ('active', 'trialing')
      OR (
        subscription.status = 'canceled'
        AND subscription.current_period_end IS NOT NULL
        AND subscription.current_period_end > now()
      )
    )
  ORDER BY subscription.created_at DESC
  LIMIT 1;
END;
$$;

COMMENT ON FUNCTION public.get_account_subscription(uuid) IS
  'Returns the current subscription summary for an account the user belongs to, including canceled access through a verified future period end.';

GRANT EXECUTE ON FUNCTION public.get_account_subscription(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_account_subscription(uuid) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.get_billing_overview(p_account_id uuid)
RETURNS TABLE (
  plan_slug text,
  plan_name text,
  plan_interval billing.plan_interval,
  status billing.subscription_status,
  current_period_end timestamptz,
  cancel_at_period_end boolean,
  trial_end timestamptz,
  provider text,
  external_subscription_id text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM private.assert_account_admin(p_account_id);

  RETURN QUERY
  SELECT plan.slug, plan.name, plan."interval", subscription.status,
         subscription.current_period_end, subscription.cancel_at_period_end,
         subscription.trial_end, subscription.provider,
         subscription.external_subscription_id
  FROM billing.subscriptions AS subscription
  INNER JOIN billing.customers AS customer ON customer.id = subscription.customer_id
  INNER JOIN billing.plans AS plan ON plan.id = subscription.plan_id
  WHERE customer.account_id = p_account_id
    AND (
      subscription.status IN ('active', 'trialing')
      OR (
        subscription.status = 'canceled'
        AND subscription.current_period_end IS NOT NULL
        AND subscription.current_period_end > now()
      )
    )
  ORDER BY subscription.created_at DESC
  LIMIT 1;
END;
$$;

COMMENT ON FUNCTION public.get_billing_overview(uuid) IS
  'Owner/admin billing summary, including provider identity and canceled access through a verified future period end.';

GRANT EXECUTE ON FUNCTION public.get_billing_overview(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_billing_overview(uuid) FROM PUBLIC;

CREATE OR REPLACE FUNCTION private.get_account_plan_row(p_account_id uuid)
RETURNS TABLE (features jsonb, limits jsonb, slug text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT COALESCE(plan.features, '{}'::jsonb),
         COALESCE(plan.limits, '{}'::jsonb),
         plan.slug
  FROM billing.subscriptions AS subscription
  INNER JOIN billing.customers AS customer ON customer.id = subscription.customer_id
  INNER JOIN billing.plans AS plan ON plan.id = subscription.plan_id
  WHERE customer.account_id = p_account_id
    AND (
      subscription.status IN ('active', 'trialing')
      OR (
        subscription.status = 'canceled'
        AND subscription.current_period_end IS NOT NULL
        AND subscription.current_period_end > now()
      )
    )
  ORDER BY subscription.created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY
    SELECT COALESCE(plan.features, '{}'::jsonb),
           COALESCE(plan.limits, '{}'::jsonb),
           plan.slug
    FROM billing.plans AS plan
    WHERE plan.slug = 'free'
    ORDER BY plan."interval"
    LIMIT 1;
  END IF;
END;
$$;

COMMENT ON FUNCTION private.get_account_plan_row(uuid) IS
  'Effective plan row, including canceled access through a verified future period end, otherwise falling back to Free.';

REVOKE EXECUTE ON FUNCTION private.get_account_plan_row(uuid) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.get_billing_payment_health(p_account_id uuid)
RETURNS TABLE(
  state text,
  last_attempt_at timestamptz,
  last_failure_code text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM private.assert_account_admin(p_account_id);

  RETURN QUERY
  WITH current_subscription AS (
    SELECT subscription.id, subscription.provider
    FROM billing.subscriptions AS subscription
    INNER JOIN billing.customers AS customer ON customer.id = subscription.customer_id
    WHERE customer.account_id = p_account_id
      AND customer.provider = 'mercadopago'
      AND subscription.provider = 'mercadopago'
    ORDER BY subscription.created_at DESC,
             subscription.updated_at DESC,
             subscription.id DESC
    LIMIT 1
  ),
  latest_attempt AS (
    SELECT attempt.status, attempt.attempted_at, attempt.failure_code
    FROM billing.payment_attempts AS attempt
    INNER JOIN current_subscription AS subscription
      ON subscription.id = attempt.subscription_id
     AND subscription.provider = attempt.provider
    ORDER BY attempt.attempted_at DESC,
             attempt.created_at DESC,
             attempt.id DESC
    LIMIT 1
  )
  SELECT
    CASE latest_attempt.status
      WHEN 'failed' THEN 'attention_required'::text
      WHEN 'paid' THEN 'healthy'::text
      WHEN 'recovered' THEN 'healthy'::text
      ELSE 'unknown'::text
    END,
    latest_attempt.attempted_at,
    CASE
      WHEN latest_attempt.status = 'failed'
        THEN left(NULLIF(btrim(latest_attempt.failure_code), ''), 100)
      ELSE NULL::text
    END
  FROM (VALUES (true)) AS singleton(present)
  LEFT JOIN latest_attempt ON singleton.present;
END;
$$;

COMMENT ON FUNCTION public.get_billing_payment_health(uuid) IS
  'Owner/admin payment-health signal derived from the latest Mercado Pago attempt. Returns exactly one bounded row and never exposes provider metadata or messages.';

GRANT EXECUTE ON FUNCTION public.get_billing_payment_health(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_billing_payment_health(uuid) FROM PUBLIC;
