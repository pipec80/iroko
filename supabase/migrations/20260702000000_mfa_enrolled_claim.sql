-- ============================================================================
-- Migration: add `mfa_enrolled` to the custom access token JWT claim
-- ============================================================================
-- Security fix (AAL2 enforcement):
--   When a user with a verified MFA factor signs in with password only, GoTrue
--   issues a valid session at Assurance Level 1 (aal1). The proxy guard
--   (src/lib/supabase/middleware.ts) only checked that claims exist — it never
--   inspected `aal`. A stolen password therefore bypassed MFA entirely: the
--   attacker ignored the TOTP screen and navigated straight to /dashboard.
--
--   To let the edge guard enforce "MFA enrolled ⇒ must reach aal2" as a pure
--   JWT inspection (zero extra network calls per request), we surface whether
--   the user has any verified factor as `app_metadata.mfa_enrolled`. The proxy
--   compares it against the standard `aal` claim.
--
--   The hook already runs on every token issuance; the EXISTS lookup on
--   auth.mfa_factors is a single indexed probe and cannot fail the token
--   (defaults to false).
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
  v_has_mfa    boolean;
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
  END IF;

  -- Does the user have at least one verified MFA factor? The edge guard uses
  -- this to force aal2 before granting access to protected routes.
  SELECT EXISTS (
    SELECT 1
    FROM auth.mfa_factors f
    WHERE f.user_id = v_user_id
      AND f.status = 'verified'
  ) INTO v_has_mfa;

  v_app_meta := v_app_meta || jsonb_build_object('mfa_enrolled', v_has_mfa);

  v_claims := jsonb_set(v_claims, '{app_metadata}', v_app_meta, true);
  RETURN jsonb_set(event, '{claims}', v_claims, true);
END;
$$;

-- Preserve the grants from 20250506040500 (CREATE OR REPLACE keeps them, but
-- re-assert for clarity and idempotency on fresh databases).
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) FROM public, anon, authenticated;

-- The hook runs as its owner (postgres) via SECURITY DEFINER and must read the
-- verified-factor status from the auth schema.
GRANT SELECT ON auth.mfa_factors TO supabase_auth_admin;

COMMENT ON FUNCTION public.custom_access_token_hook(jsonb) IS
  'Supabase Auth custom_access_token hook. Writes app_metadata.account_id + '
  'app_metadata.role from the user''s default membership, and '
  'app_metadata.mfa_enrolled (true when a verified MFA factor exists) so the '
  'edge proxy can enforce aal2 for MFA users. SECURITY DEFINER.';
