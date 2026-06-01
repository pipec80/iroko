-- ============================================================================
-- Migration: Fix list_team_members ambiguous column (42702)
-- ============================================================================
-- The RETURNS TABLE column names (role, status, user_id, email) conflict with
-- table column names in the function body. Fix: wrap in a subquery with alias
-- so all column references are unambiguous.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.list_team_members(p_account_id uuid)
RETURNS TABLE(
  user_id      uuid,
  email        text,
  display_name text,
  given_name   text,
  family_name  text,
  avatar_url   text,
  role         text,
  status       text,
  joined_at    timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Verify caller is a member of this account
  IF NOT EXISTS (
    SELECT 1 FROM public.accounts_memberships am
    WHERE am.account_id = p_account_id AND am.user_id = (SELECT auth.uid())
  ) THEN
    RAISE EXCEPTION 'Not a member of this account';
  END IF;

  -- Wrap in subquery to avoid PL/pgSQL variable name collision
  -- between RETURNS TABLE columns and table columns
  RETURN QUERY
  SELECT
    sub.user_id,
    sub.email,
    sub.display_name,
    sub.given_name,
    sub.family_name,
    sub.avatar_url,
    sub.role,
    sub.status,
    sub.joined_at
  FROM (
    -- Active members
    SELECT
      m.user_id,
      u.email::text,
      p.display_name,
      p.given_name,
      p.family_name,
      p.avatar_url,
      m.role::text AS role,
      'active'::text AS status,
      m.created_at AS joined_at
    FROM public.accounts_memberships m
    JOIN public.profiles p ON p.id = m.user_id
    JOIN auth.users u ON u.id = m.user_id
    WHERE m.account_id = p_account_id

    UNION ALL

    -- Pending invitations
    SELECT
      NULL::uuid AS user_id,
      i.email,
      NULL::text AS display_name,
      NULL::text AS given_name,
      NULL::text AS family_name,
      NULL::text AS avatar_url,
      i.role::text AS role,
      'pending'::text AS status,
      i.created_at AS joined_at
    FROM public.invitations i
    WHERE i.account_id = p_account_id
      AND i.status = 'pending'
      AND i.expires_at > now()
  ) sub
  ORDER BY sub.joined_at ASC;
END;
$$;
