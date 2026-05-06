-- ============================================================================
-- Migration: custom_access_token auth hook
-- ============================================================================
-- Injects `app_metadata.account_id` and `app_metadata.role` into every JWT
-- issued by Supabase Auth.
--
-- Why: RLS policies that today would JOIN accounts_memberships on every query
-- can instead read `(auth.jwt() -> 'app_metadata' ->> 'account_id')`. That's
-- a constant-time lookup vs. an index scan per row — critical once the team/
-- billing module carries real load.
--
-- Source of truth: the user's most-recent membership (`created_at DESC`).
-- For users with multiple accounts, a future "account switcher" UI can call
-- a dedicated RPC to update app_metadata before refreshing the session; the
-- hook seeds the default.
--
-- Reference:
--   https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook
-- ============================================================================

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  STABLE
  SET search_path = ''
AS $$
DECLARE
  v_user_id    uuid := (event ->> 'user_id')::uuid;
  v_account_id uuid;
  v_role       text;
  v_claims     jsonb := event -> 'claims';
  v_app_meta   jsonb := COALESCE(v_claims -> 'app_metadata', '{}'::jsonb);
BEGIN
  -- Pick the user's default membership (most recently created).
  SELECT m.account_id, m.role::text
  INTO v_account_id, v_role
  FROM public.accounts_memberships m
  WHERE m.user_id = v_user_id
  ORDER BY m.created_at DESC
  LIMIT 1;

  IF v_account_id IS NOT NULL THEN
    v_app_meta := v_app_meta
      || jsonb_build_object('account_id', v_account_id)
      || jsonb_build_object('role', v_role);

    v_claims := jsonb_set(v_claims, '{app_metadata}', v_app_meta, true);
  END IF;

  RETURN jsonb_set(event, '{claims}', v_claims, true);
END;
$$;

-- Only supabase_auth_admin should call this; revoke from everyone else.
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) FROM public, anon, authenticated;

-- The hook runs as supabase_auth_admin; it must be able to read memberships.
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT SELECT ON public.accounts_memberships TO supabase_auth_admin;

-- Note: supabase_auth_admin has BYPASSRLS by default in Supabase, so the
-- SELECT above works without a dedicated RLS policy. No FORCE RLS needed.

COMMENT ON FUNCTION public.custom_access_token_hook(jsonb) IS
  'Supabase Auth custom_access_token hook. Reads the user''s default '
  'membership from public.accounts_memberships and writes app_metadata.'
  'account_id + app_metadata.role into the JWT. SECURITY DEFINER because it '
  'must read accounts_memberships on behalf of supabase_auth_admin.';
