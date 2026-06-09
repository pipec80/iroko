-- ---------------------------------------------------------------------------
-- Fix F2-03: get_account_subscription() now validates that the caller is
-- a member of the requested account before returning billing data.
-- Previously any authenticated user could query any account's subscription
-- if they knew the account UUID.
-- ---------------------------------------------------------------------------

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
    SELECT p.name, p.slug, s.status, s.current_period_end, s.cancel_at_period_end, p.features
    FROM billing.subscriptions s
    JOIN billing.customers c ON c.id = s.customer_id
    JOIN billing.plans p ON p.id = s.plan_id
    WHERE c.account_id = p_account_id
      AND s.status IN ('active', 'trialing')
    ORDER BY s.created_at DESC
    LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_account_subscription TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_account_subscription FROM PUBLIC;
