-- ============================================================================
-- Migration: RPCs for profile/account CRUD from the Settings page
-- ============================================================================
-- All RPCs use auth.uid() internally. UPDATE RPC is SECURITY INVOKER so the
-- existing "update own profile" RLS policy applies. Session RPCs touch the
-- auth schema and therefore need SECURITY DEFINER.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- update_my_profile: self-update of editable profile fields.
-- Fields out of scope: display_name (GENERATED), metadata, deleted_at,
-- onboarding_completed, id, created_at, updated_at.
-- Returns the updated row so the client can refresh state without a re-fetch.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_my_profile(
  p_given_name   text DEFAULT NULL,
  p_family_name  text DEFAULT NULL,
  p_locale       text DEFAULT NULL,
  p_timezone     text DEFAULT NULL,
  p_phone_number text DEFAULT NULL,
  p_avatar_url   text DEFAULT NULL
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := (SELECT auth.uid());
  v_row public.profiles;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  UPDATE public.profiles
  SET
    given_name   = COALESCE(p_given_name,   given_name),
    family_name  = COALESCE(p_family_name,  family_name),
    locale       = COALESCE(p_locale,       locale),
    timezone     = COALESCE(p_timezone,     timezone),
    phone_number = COALESCE(p_phone_number, phone_number),
    avatar_url   = COALESCE(p_avatar_url,   avatar_url),
    updated_at   = now()
  WHERE id = v_uid AND deleted_at IS NULL
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile_not_found' USING ERRCODE = 'P0002';
  END IF;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_my_profile(text, text, text, text, text, text)
  TO authenticated;

COMMENT ON FUNCTION public.update_my_profile(text, text, text, text, text, text) IS
  'Self-update editable profile fields. SECURITY INVOKER so the RLS policy '
  '"Profiles: update propio" enforces auth.uid()=id. Pass NULL to keep a '
  'field unchanged.';

-- ---------------------------------------------------------------------------
-- request_account_deletion: soft-deletes the profile + marks pending deletion.
-- pg_cron (migration 20250506040300) hard-deletes accounts after 90 days via
-- cascading FKs from public.accounts.deleted_at. The profile soft-delete
-- here blocks further reads/updates (RLS policies filter deleted_at IS NULL).
-- The Next.js action should call this then sign the user out.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.request_account_deletion()
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := (SELECT auth.uid());
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  UPDATE public.profiles
  SET
    deleted_at = now(),
    metadata   = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('pending_deletion', true),
    updated_at = now()
  WHERE id = v_uid;

  UPDATE public.accounts
  SET deleted_at = now(), updated_at = now()
  WHERE created_by = v_uid AND type = 'personal' AND deleted_at IS NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_account_deletion() TO authenticated;

COMMENT ON FUNCTION public.request_account_deletion() IS
  'Marks the caller''s profile + personal account as soft-deleted. The '
  'pg_cron job hard-delete-old-accounts hard-deletes after 90 days. Next.js '
  'must call supabase.auth.signOut() after this succeeds.';

-- ---------------------------------------------------------------------------
-- list_my_sessions: read-only list of the caller's active sessions.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_my_sessions()
RETURNS TABLE(
  id         uuid,
  created_at timestamptz,
  updated_at timestamptz,
  not_after  timestamptz,
  user_agent text,
  ip         text,
  aal        text
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := (SELECT auth.uid());
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    s.id,
    s.created_at,
    s.updated_at,
    s.not_after,
    s.user_agent,
    s.ip::text,
    s.aal::text
  FROM auth.sessions s
  WHERE s.user_id = v_uid
  ORDER BY s.updated_at DESC NULLS LAST;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_my_sessions() TO authenticated;

COMMENT ON FUNCTION public.list_my_sessions() IS
  'Returns the caller''s active sessions from auth.sessions. SECURITY '
  'DEFINER because auth schema is not granted to authenticated; the function '
  'filters by auth.uid() so leaking other users is impossible.';

-- ---------------------------------------------------------------------------
-- revoke_my_session: deletes one session that belongs to the caller.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.revoke_my_session(p_session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := (SELECT auth.uid());
  v_deleted int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  DELETE FROM auth.sessions WHERE id = p_session_id AND user_id = v_uid;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  IF v_deleted = 0 THEN
    RAISE EXCEPTION 'session_not_found' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.revoke_my_session(uuid) TO authenticated;

COMMENT ON FUNCTION public.revoke_my_session(uuid) IS
  'Deletes one auth.sessions row if it belongs to the caller. SECURITY '
  'DEFINER because auth schema is not granted to authenticated; ownership '
  'is enforced by the WHERE clause.';
