-- ============================================================================
-- Migration: Team Management RPCs
-- ============================================================================
-- Three SECURITY DEFINER RPCs for the team management module.
-- All grants on accounts_memberships and invitations are revoked for
-- authenticated users — access is exclusively through these RPCs.
--
-- RPCs:
--   1. list_team_members(account_id) — list members + pending invitations
--   2. invite_members(account_id, emails[], role) — create invitations
--   3. remove_member(account_id, user_id) — remove a membership
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. list_team_members — Returns active members + pending invitations
--    Validates caller membership before returning data.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_team_members(p_account_id uuid)
RETURNS TABLE(
  user_id     uuid,
  email       text,
  display_name text,
  given_name  text,
  family_name text,
  avatar_url  text,
  role        text,
  status      text,
  joined_at   timestamptz
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

  -- Wrap in subquery to avoid PL/pgSQL RETURNS TABLE name collision
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

    -- Pending invitations (not yet accepted)
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

GRANT EXECUTE ON FUNCTION public.list_team_members(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.list_team_members(uuid) FROM public, anon;

COMMENT ON FUNCTION public.list_team_members(uuid) IS
  'Lists all active members and pending invitations for an account. '
  'SECURITY DEFINER: reads memberships + profiles + auth.users + invitations. '
  'Validates caller membership. Used by the team management page.';

-- ---------------------------------------------------------------------------
-- 2. invite_members — Create invitations for multiple emails
--    Only owner/admin can invite. Cannot invite as owner.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.invite_members(
  p_account_id uuid,
  p_emails     text[],
  p_role       public.membership_role DEFAULT 'member'
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller_role public.membership_role;
  v_inserted    integer := 0;
  v_email       text;
BEGIN
  -- Check caller role
  SELECT role INTO v_caller_role
  FROM public.accounts_memberships
  WHERE account_id = p_account_id AND user_id = (SELECT auth.uid());

  IF v_caller_role IS NULL OR v_caller_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'Only owner or admin can invite members';
  END IF;

  -- Cannot invite as owner
  IF p_role = 'owner' THEN
    RAISE EXCEPTION 'Cannot invite as owner';
  END IF;

  -- Limit batch size to prevent abuse
  IF array_length(p_emails, 1) > 20 THEN
    RAISE EXCEPTION 'Maximum 20 emails per batch';
  END IF;

  -- Insert invitations, skip duplicates
  FOREACH v_email IN ARRAY p_emails LOOP
    INSERT INTO public.invitations (account_id, email, role, invited_by)
    VALUES (p_account_id, lower(trim(v_email)), p_role, (SELECT auth.uid()))
    ON CONFLICT (account_id, email) DO NOTHING;

    IF FOUND THEN
      v_inserted := v_inserted + 1;
    END IF;
  END LOOP;

  RETURN v_inserted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.invite_members(uuid, text[], public.membership_role) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.invite_members(uuid, text[], public.membership_role) FROM public, anon;

COMMENT ON FUNCTION public.invite_members(uuid, text[], public.membership_role) IS
  'Creates invitations for multiple emails. Only owner/admin. Cannot invite as owner. '
  'ON CONFLICT DO NOTHING for already-invited emails. Returns count of new invitations.';

-- ---------------------------------------------------------------------------
-- 3. remove_member — Remove a membership from an account
--    Owner cannot be removed. Cannot remove yourself.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.remove_member(
  p_account_id uuid,
  p_user_id    uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller_role public.membership_role;
  v_target_role public.membership_role;
BEGIN
  -- Check caller role
  SELECT role INTO v_caller_role
  FROM public.accounts_memberships
  WHERE account_id = p_account_id AND user_id = (SELECT auth.uid());

  IF v_caller_role IS NULL OR v_caller_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'Only owner or admin can remove members';
  END IF;

  -- Cannot remove yourself
  IF p_user_id = (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Cannot remove yourself. Use leave team instead.';
  END IF;

  -- Check target role — cannot remove owner
  SELECT role INTO v_target_role
  FROM public.accounts_memberships
  WHERE account_id = p_account_id AND user_id = p_user_id;

  IF v_target_role IS NULL THEN
    RAISE EXCEPTION 'User is not a member of this account';
  END IF;

  IF v_target_role = 'owner' THEN
    RAISE EXCEPTION 'Cannot remove the account owner';
  END IF;

  -- Admin cannot remove another admin (only owner can)
  IF v_caller_role = 'admin' AND v_target_role = 'admin' THEN
    RAISE EXCEPTION 'Only the owner can remove an admin';
  END IF;

  DELETE FROM public.accounts_memberships
  WHERE account_id = p_account_id AND user_id = p_user_id;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.remove_member(uuid, uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.remove_member(uuid, uuid) FROM public, anon;

COMMENT ON FUNCTION public.remove_member(uuid, uuid) IS
  'Removes a member from an account. Only owner/admin can remove. '
  'Owner cannot be removed. Admin cannot remove another admin. '
  'Cannot remove yourself (use leave team flow).';
