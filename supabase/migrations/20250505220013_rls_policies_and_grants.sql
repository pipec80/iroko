-- ============================================================================
-- Migration 013: RLS Policies, Table GRANTs & Function Privileges
-- ============================================================================
-- This migration applies ALL security layers:
--   1. SECURITY DEFINER helper functions (private schema)
--   2. RLS policies with TO clause on EVERY policy (ajuste #1)
--   3. Explicit table GRANTs per role (ajuste #7)
--   4. REVOKE EXECUTE on functions from anon/public (ajuste #4)
--   5. WITH CHECK on FOR ALL policies (ajuste #9)
--
-- Performance: all policies use (SELECT auth.uid()) wrapper for caching
-- and (SELECT private.helper()) for SECURITY DEFINER function caching.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. SECURITY DEFINER helper functions
--    These bypass RLS on memberships to avoid infinite recursion.
--    Stored in `private` schema — never exposed via API.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.get_user_role(p_account_id uuid, p_user_id uuid)
RETURNS public.membership_role
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT role FROM public.accounts_memberships
  WHERE account_id = p_account_id AND user_id = p_user_id;
$$;

CREATE OR REPLACE FUNCTION private.user_is_member(p_account_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.accounts_memberships
    WHERE account_id = p_account_id AND user_id = p_user_id
  );
$$;

-- ---------------------------------------------------------------------------
-- 2. RLS Policies
--    EVERY policy includes TO clause (ajuste #1) for 99.94% perf improvement.
--    Note: RLS is auto-enabled by event trigger, but we explicitly enable
--    it here for clarity and in case the trigger wasn't active during creation.
-- ---------------------------------------------------------------------------

-- == PROFILES ==
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles: lectura pública"
  ON public.profiles FOR SELECT
  TO anon, authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "Profiles: update propio"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    (SELECT auth.uid()) IS NOT NULL
    AND id = (SELECT auth.uid())
  );

-- == ACCOUNTS ==
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Accounts: lectura para miembros"
  ON public.accounts FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (SELECT private.user_is_member(id, (SELECT auth.uid())))
  );

CREATE POLICY "Accounts: update por owner/admin"
  ON public.accounts FOR UPDATE
  TO authenticated
  USING (
    (SELECT private.get_user_role(id, (SELECT auth.uid()))) IN ('owner', 'admin')
  );

-- == MEMBERSHIPS ==
ALTER TABLE public.accounts_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Memberships: lectura miembros"
  ON public.accounts_memberships FOR SELECT
  TO authenticated
  USING (
    (SELECT private.user_is_member(account_id, (SELECT auth.uid())))
  );

-- Ajuste #9: explicit WITH CHECK on management policies
-- Split into separate INSERT/UPDATE/DELETE to avoid multiple permissive policies
-- overlapping with the SELECT policy above (advisor check #0006).
CREATE POLICY "Memberships: insertar owner/admin"
  ON public.accounts_memberships FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT private.get_user_role(account_id, (SELECT auth.uid()))) IN ('owner', 'admin')
  );

CREATE POLICY "Memberships: actualizar owner/admin"
  ON public.accounts_memberships FOR UPDATE
  TO authenticated
  USING (
    (SELECT private.get_user_role(account_id, (SELECT auth.uid()))) IN ('owner', 'admin')
  )
  WITH CHECK (
    (SELECT private.get_user_role(account_id, (SELECT auth.uid()))) IN ('owner', 'admin')
  );

CREATE POLICY "Memberships: eliminar owner/admin"
  ON public.accounts_memberships FOR DELETE
  TO authenticated
  USING (
    (SELECT private.get_user_role(account_id, (SELECT auth.uid()))) IN ('owner', 'admin')
  );

-- == INVITATIONS ==
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Invitations: lectura miembros"
  ON public.invitations FOR SELECT
  TO authenticated
  USING (
    (SELECT private.user_is_member(account_id, (SELECT auth.uid())))
  );

CREATE POLICY "Invitations: crear owner/admin"
  ON public.invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT private.get_user_role(account_id, (SELECT auth.uid()))) IN ('owner', 'admin')
  );

-- ---------------------------------------------------------------------------
-- 3. Table GRANTs (ajuste #7)
--    Explicit permissions per role. No DELETE on accounts/profiles (soft delete).
--    anon: only profiles (public avatars/display names for shared links).
--    accounts, memberships, invitations: authenticated only.
-- ---------------------------------------------------------------------------

-- profiles: public read (anon sees display names/avatars), authenticated write
GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT UPDATE ON public.profiles TO authenticated;
-- Supabase initializes tables with ALL privileges; keep only what's needed
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.profiles FROM anon;

-- accounts: authenticated only — revoke everything from anon
GRANT SELECT, UPDATE ON public.accounts TO authenticated;
REVOKE ALL ON public.accounts FROM anon;

-- memberships: authenticated with full CRUD (controlled by RLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounts_memberships TO authenticated;
REVOKE ALL ON public.accounts_memberships FROM anon;

-- invitations: authenticated, no DELETE (status transitions instead)
GRANT SELECT, INSERT, UPDATE ON public.invitations TO authenticated;
REVOKE ALL ON public.invitations FROM anon;

-- ---------------------------------------------------------------------------
-- 4. Function privilege lockdown (ajuste #4)
--    By default, ALL roles can execute ALL functions. This is dangerous.
--    We REVOKE from public/anon and grant explicitly per function.
-- ---------------------------------------------------------------------------

-- Revoke execution from all current public functions
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM public;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;

-- Prevent future functions from being executable by anon by default
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM public;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM anon;
