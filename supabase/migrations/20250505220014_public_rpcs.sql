-- ============================================================================
-- Migration 014: Public RPCs & Function Grants
-- ============================================================================
-- SECURITY DEFINER functions that bridge public schema to billing schema.
-- Each function has explicit GRANT to the appropriate role.
--
-- Includes get_active_plans() (ajuste #12) for the public pricing page.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. get_my_accounts() — Dashboard: list user's accounts with roles
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_accounts()
RETURNS TABLE(
  account_id uuid,
  name text,
  slug text,
  type public.account_type,
  logo_url text,
  role public.membership_role
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT a.id, a.name, a.slug, a.type, a.logo_url, m.role
  FROM public.accounts a
  JOIN public.accounts_memberships m ON m.account_id = a.id
  WHERE m.user_id = (SELECT auth.uid())
    AND a.deleted_at IS NULL;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_accounts TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. accept_invitation() — Accept a pending invitation by token
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.accept_invitation(p_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_invitation public.invitations%ROWTYPE;
  v_user_id uuid := (SELECT auth.uid());
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_invitation
  FROM public.invitations
  WHERE token = p_token
    AND status = 'pending'
    AND expires_at > now();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;

  INSERT INTO public.accounts_memberships (account_id, user_id, role, invited_by)
  VALUES (v_invitation.account_id, v_user_id, v_invitation.role, v_invitation.invited_by)
  ON CONFLICT DO NOTHING;

  UPDATE public.invitations
  SET status = 'accepted', updated_at = now()
  WHERE id = v_invitation.id;

  RETURN v_invitation.account_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_invitation TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. get_account_subscription() — Get active subscription for an account
--    Validates membership before returning billing data.
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
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p.name, p.slug, s.status, s.current_period_end, s.cancel_at_period_end, p.features
  FROM billing.subscriptions s
  JOIN billing.customers c ON c.id = s.customer_id
  JOIN billing.plans p ON p.id = s.plan_id
  WHERE c.account_id = p_account_id
    AND s.status IN ('active', 'trialing')
  ORDER BY s.created_at DESC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_account_subscription TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. get_active_plans() — Public pricing page (ajuste #12)
--    Accessible to anon AND authenticated (no auth required).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_active_plans()
RETURNS TABLE(
  slug text,
  name text,
  description text,
  "interval" billing.plan_interval,
  price integer,
  currency char(3),
  trial_days integer,
  features jsonb,
  limits jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT slug, name, description, "interval", price, currency, trial_days, features, limits
  FROM billing.plans
  WHERE is_active = true
  ORDER BY sort_order ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_active_plans TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- Explicit REVOKE from PUBLIC on authenticated-only functions.
-- ALTER DEFAULT PRIVILEGES in migration 013 doesn't affect functions created
-- in later migrations because Postgres re-grants EXECUTE to PUBLIC on creation.
-- REVOKE FROM PUBLIC (not anon) because anon inherits access via PUBLIC.
-- ---------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.get_my_accounts            FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.accept_invitation          FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_account_subscription   FROM PUBLIC;
-- get_active_plans intentionally keeps PUBLIC/anon access (public pricing page)
