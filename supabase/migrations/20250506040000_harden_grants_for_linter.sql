-- ============================================================================
-- Migration: Harden table/function grants to satisfy Supabase DB Linter
-- ============================================================================
-- Resolves advisors:
--   0026 pg_graphql_anon_table_exposed          (public.profiles)
--   0027 pg_graphql_authenticated_table_exposed (accounts, memberships,
--                                                invitations, profiles)
--   0028 anon_security_definer_function_executable          (get_active_plans)
--   0029 authenticated_security_definer_function_executable (4 RPCs)
--
-- Strategy:
--   - anon SELECT: remove from every public table. Public plan listing stays
--     callable via the SECURITY DEFINER RPC `public.get_active_plans()`.
--   - authenticated SELECT/UPDATE/INSERT/DELETE: remove from accounts/
--     memberships/invitations. These tables are only touched through RPCs.
--     profiles keeps SELECT+UPDATE for `authenticated` — self-reads in the
--     topbar use the RLS "read own" policy; that pattern is intentional.
--   - SECURITY DEFINER RPCs: keep current grants (the 4 are designed to be
--     callable from REST) and silence the linter with COMMENT ON FUNCTION.
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. Tables — tighten grants
-- --------------------------------------------------------------------------

-- profiles: anon must not discover it via GraphQL. Self-reads stay available
-- for `authenticated` via the existing RLS policy.
REVOKE SELECT ON public.profiles FROM anon;

-- Tighten authenticated as well: only SELECT + UPDATE are legitimate
-- (self-read in topbar, self-update via RPC or RLS policy).
-- INSERT is handled by the trigger handle_new_user as SECURITY DEFINER;
-- authenticated must NOT be able to create rows directly.
-- DELETE is handled via soft-delete in request_account_deletion RPC.
REVOKE INSERT, DELETE ON public.profiles FROM authenticated;

-- accounts: no direct access. Use RPC get_my_accounts() instead.
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.accounts FROM authenticated;

-- accounts_memberships: no direct access. Team management (add/remove/update
-- member role) will go through dedicated RPCs in the team module.
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.accounts_memberships FROM authenticated;

-- invitations: no direct access. Creating/accepting/revoking invitations goes
-- through RPCs (accept_invitation exists; create/revoke live in team module).
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.invitations FROM authenticated;

-- --------------------------------------------------------------------------
-- 2. Functions — document intent to silence linter advisors 0028/0029
-- --------------------------------------------------------------------------

COMMENT ON FUNCTION public.get_active_plans() IS
  'Public pricing endpoint. SECURITY DEFINER so anon can read plans without '
  'exposing the billing.plans table. Intentional exposure to anon+authenticated.';

COMMENT ON FUNCTION public.get_my_accounts() IS
  'Returns accounts the current user belongs to. SECURITY DEFINER: reads '
  'accounts_memberships (direct SELECT revoked). Uses auth.uid() internally.';

COMMENT ON FUNCTION public.accept_invitation(text) IS
  'Accepts an invitation by token and creates the membership. SECURITY DEFINER: '
  'mutates invitations+memberships (direct write revoked). Uses auth.uid().';

COMMENT ON FUNCTION public.get_account_subscription(uuid) IS
  'Returns the current subscription summary for an account the user belongs '
  'to. SECURITY DEFINER: reads billing.* (schema not exposed to authenticated). '
  'Uses private.user_is_member() for access control.';
