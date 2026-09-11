-- ============================================================================
-- Billing payment health and verified paid-through access
-- ============================================================================
-- Payment-attempt status is an operator/customer signal, not a subscription
-- lifecycle transition. Canceled subscriptions remain effective only while a
-- persisted provider-neutral current_period_end is still in the future.
-- Written manually: supabase db diff is unsupported on Windows.
-- ============================================================================

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
      WHEN latest_attempt.status = 'failed' THEN latest_attempt.failure_code
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
