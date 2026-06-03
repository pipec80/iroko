-- ============================================================================
-- Fix: projects RLS policies + get_my_account_id RPC
-- ============================================================================
-- Problem: projects migration used direct EXISTS on accounts_memberships in
-- RLS policies. But 20250506040000_harden_grants_for_linter.sql revokes SELECT
-- on accounts_memberships from authenticated — all team management must go
-- through SECURITY DEFINER RPCs.
--
-- Fix 1: Rewrite projects RLS policies using private.user_is_member() and
--        private.get_user_role() (both SECURITY DEFINER) so the subquery runs
--        as postgres and can read accounts_memberships without the grant.
--
-- Fix 2: Add get_my_account_id() RPC so server actions can retrieve the
--        current user's account without querying the table directly.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Fix 1: Rewrite projects RLS policies
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "members_can_view_projects"    ON public.projects;
DROP POLICY IF EXISTS "admins_can_create_projects"   ON public.projects;
DROP POLICY IF EXISTS "admins_can_update_projects"   ON public.projects;
DROP POLICY IF EXISTS "owners_can_delete_projects"   ON public.projects;

CREATE POLICY "members_can_view_projects" ON public.projects
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND private.user_is_member(account_id, (SELECT auth.uid()))
  );

CREATE POLICY "admins_can_create_projects" ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT private.get_user_role(account_id, (SELECT auth.uid())))
    IN ('owner', 'admin')
  );

CREATE POLICY "admins_can_update_projects" ON public.projects
  FOR UPDATE TO authenticated
  USING (
    (SELECT private.get_user_role(account_id, (SELECT auth.uid())))
    IN ('owner', 'admin')
  );

CREATE POLICY "owners_can_delete_projects" ON public.projects
  FOR DELETE TO authenticated
  USING (
    (SELECT private.get_user_role(account_id, (SELECT auth.uid())))
    = 'owner'
  );

-- ---------------------------------------------------------------------------
-- Fix 2: RPC to get the current user's default account_id
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_my_account_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT account_id
  FROM public.accounts_memberships
  WHERE user_id = auth.uid()
  ORDER BY created_at DESC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_account_id() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_my_account_id() FROM anon, public;
