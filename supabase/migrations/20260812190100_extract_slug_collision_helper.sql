-- ============================================================================
-- DRY Fix: Extract slug-collision-retry logic into shared helper
--
-- Addresses duplication between private.handle_new_profile() and
-- public.create_team(). Both had identical WHILE loops for slug collision
-- detection and fallback UUID generation.
--
-- This migration:
-- 1. Creates private.generate_unique_slug(p_base_slug text) RETURNS text
-- 2. Updates handle_new_profile to call the helper instead of inline logic
-- 3. Updates create_team to call the helper instead of inline logic
-- ============================================================================

-- Create the new shared helper for slug uniqueness
CREATE OR REPLACE FUNCTION "private"."generate_unique_slug"("p_base_slug" "text")
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_slug text;
  v_attempt int := 0;
BEGIN
  v_slug := p_base_slug;

  -- Retry up to 5 times with a short random suffix if the slug is taken.
  WHILE EXISTS (SELECT 1 FROM public.accounts WHERE slug = v_slug) LOOP
    v_attempt := v_attempt + 1;
    IF v_attempt > 5 THEN
      -- Final fallback: fully qualify with a random UUID.
      v_slug := p_base_slug || '-' || replace(gen_random_uuid()::text, '-', '');
      EXIT;
    END IF;
    v_slug := p_base_slug || '-' || substring(replace(gen_random_uuid()::text, '-', '') FROM 1 FOR 6);
  END LOOP;

  RETURN v_slug;
END;
$$;

ALTER FUNCTION "private"."generate_unique_slug"("p_base_slug" "text") OWNER TO "postgres";

REVOKE ALL ON FUNCTION private.generate_unique_slug(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.generate_unique_slug(text) TO postgres;

COMMENT ON FUNCTION private.generate_unique_slug(text) IS
  'Generates a unique slug by checking for collisions and appending random suffixes. '
  'Shared by handle_new_profile (Personal accounts) and create_team (Team accounts).';


-- Update handle_new_profile to use the new helper
CREATE OR REPLACE FUNCTION "private"."handle_new_profile"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_account_id uuid;
  v_base_slug text;
  v_slug text;
BEGIN
  RAISE LOG 'handle_new_profile: creating personal account for user_id=%', NEW.id;

  v_base_slug := private.slugify(COALESCE(NEW.display_name, NEW.id::text));
  v_slug := private.generate_unique_slug(v_base_slug);

  INSERT INTO public.accounts (id, type, name, slug, created_by)
  VALUES (
    NEW.id,
    'personal',
    COALESCE(NEW.display_name, 'Personal'),
    v_slug,
    NEW.id
  )
  RETURNING id INTO v_account_id;

  INSERT INTO public.accounts_memberships (account_id, user_id, role)
  VALUES (v_account_id, NEW.id, 'owner');

  RETURN NEW;
END;
$$;

ALTER FUNCTION "private"."handle_new_profile"() OWNER TO "postgres";


-- Update create_team to use the new helper
CREATE OR REPLACE FUNCTION "public"."create_team"("p_name" "text")
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid         uuid := (SELECT auth.uid());
  v_team_count  integer;
  v_base_slug   text;
  v_slug        text;
  v_account_id  uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF btrim(p_name) = '' OR char_length(p_name) > 100 THEN
    RAISE EXCEPTION 'invalid_name';
  END IF;

  -- La Personal account tiene id = user id (invariante de handle_new_profile);
  -- el límite de Teams se mide contra el plan de esa cuenta.
  SELECT count(*) INTO v_team_count
  FROM public.accounts_memberships m
  JOIN public.accounts a ON a.id = m.account_id
  WHERE m.user_id = v_uid AND m.role = 'owner' AND a.type = 'team' AND a.deleted_at IS NULL;

  IF NOT private.within_plan_limit(v_uid, 'teams_max', v_team_count, 1) THEN
    RAISE EXCEPTION 'team_limit_reached';
  END IF;

  v_base_slug := private.slugify(p_name);
  v_slug := private.generate_unique_slug(v_base_slug);

  INSERT INTO public.accounts (type, name, slug, created_by)
  VALUES ('team', p_name, v_slug, v_uid)
  RETURNING id INTO v_account_id;

  INSERT INTO public.accounts_memberships (account_id, user_id, role)
  VALUES (v_account_id, v_uid, 'owner');

  UPDATE public.profiles SET active_account_id = v_account_id WHERE id = v_uid;

  RETURN v_account_id;
END;
$$;

ALTER FUNCTION "public"."create_team"("p_name" "text") OWNER TO "postgres";

GRANT EXECUTE ON FUNCTION public.create_team(text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.create_team(text) FROM PUBLIC, anon;

COMMENT ON FUNCTION public.create_team(text) IS
  'Creates a Team account (caller = owner), gated by the teams_max entitlement '
  'evaluated against the caller''s Personal account plan. Sets the new team as '
  'active — callers must call supabase.auth.refreshSession() afterward (Bloque 1).';
