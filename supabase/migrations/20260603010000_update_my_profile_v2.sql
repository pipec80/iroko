-- ============================================================================
-- Migration: update_my_profile v2
-- Extends the RPC from 20250506040400_profile_update_rpcs.sql with
-- birth_date, bio, website_url, company.
--
-- Nullable clearable fields (bio, website_url, company, birth_date) use:
--   CASE WHEN p_x IS NULL THEN existing ELSE NULLIF(p_x_cast, '') END
-- so that:
--   NULL   = "don't change" (caller omitted the param)
--   ''     = "clear to NULL" (user emptied the field in the form)
--   'text' = "set to this value"
--
-- avatar_url and phone_number keep COALESCE because they are set by
-- separate actions that only pass that single field.
-- Grants re-applied because CREATE OR REPLACE re-grants EXECUTE to PUBLIC.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_my_profile(
  p_given_name   text DEFAULT NULL,
  p_family_name  text DEFAULT NULL,
  p_locale       text DEFAULT NULL,
  p_timezone     text DEFAULT NULL,
  p_phone_number text DEFAULT NULL,
  p_avatar_url   text DEFAULT NULL,
  p_birth_date   text DEFAULT NULL,
  p_bio          text DEFAULT NULL,
  p_website_url  text DEFAULT NULL,
  p_company      text DEFAULT NULL
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_uid  uuid := (SELECT auth.uid());
  v_row  public.profiles;
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
    -- Clearable fields: NULL = keep, '' = set NULL, 'value' = update
    birth_date   = CASE WHEN p_birth_date  IS NULL THEN birth_date  ELSE NULLIF(p_birth_date,  '')::date END,
    bio          = CASE WHEN p_bio         IS NULL THEN bio          ELSE NULLIF(p_bio,         '')       END,
    website_url  = CASE WHEN p_website_url IS NULL THEN website_url  ELSE NULLIF(p_website_url, '')       END,
    company      = CASE WHEN p_company     IS NULL THEN company      ELSE NULLIF(p_company,     '')       END,
    updated_at   = now()
  WHERE id = v_uid AND deleted_at IS NULL
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile_not_found' USING ERRCODE = 'P0002';
  END IF;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_my_profile(text, text, text, text, text, text, text, text, text, text)
  TO authenticated;
REVOKE EXECUTE ON FUNCTION public.update_my_profile(text, text, text, text, text, text, text, text, text, text)
  FROM PUBLIC;

COMMENT ON FUNCTION public.update_my_profile(text, text, text, text, text, text, text, text, text, text) IS
  'Self-update editable profile fields. SECURITY INVOKER — RLS enforces auth.uid()=id. '
  'Pass NULL to keep a field unchanged. Pass empty string to clear a nullable field.';
