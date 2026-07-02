-- ============================================================================
-- Migration: restrict profiles SELECT to the owner (self-read)
-- ============================================================================
-- Security fix (cross-tenant PII disclosure):
--   The original policy (migration 013) was:
--       FOR SELECT TO anon, authenticated USING (deleted_at IS NULL)
--   Migration 20250506040000 revoked the anon grant, but `authenticated` kept
--   an unrestricted read: any signed-up user could call
--       GET /rest/v1/profiles?select=*
--   and pull EVERY user's phone_number, birth_date, bio, company, website_url,
--   locale, timezone and metadata — across every tenant. A GDPR problem and a
--   direct contradiction of the account-scoped model.
--
--   Fix: profiles are readable only by their owner. Cross-user data that the
--   product legitimately needs (a teammate's display_name + avatar_url) is
--   already served by the SECURITY DEFINER RPC public.list_team_members, which
--   enforces shared-account membership and returns only those two fields.
-- ============================================================================

DROP POLICY IF EXISTS "Profiles: lectura pública" ON public.profiles;

CREATE POLICY "Profiles: lectura propia"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    id = (SELECT auth.uid())
    AND deleted_at IS NULL
  );

COMMENT ON POLICY "Profiles: lectura propia" ON public.profiles IS
  'Self-read only. Teammate display_name/avatar_url is exposed via the '
  'SECURITY DEFINER RPC public.list_team_members (membership-checked), never '
  'by a direct REST read. Prevents cross-tenant PII enumeration.';
