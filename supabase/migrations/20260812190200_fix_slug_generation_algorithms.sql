-- ============================================================================
-- DRY Refactor Fix Round 2: Parameterize slug generation to preserve
-- byte-for-byte algorithm differences between handle_new_profile and create_team
--
-- The previous refactor (20260812190100) collapsed two distinct algorithms:
-- - handle_new_profile: deterministic (user ID based), growing-width suffix
-- - create_team: random UUIDs, fixed-width suffix
--
-- This fix adds p_seed parameter to generate_unique_slug to support both:
-- - With seed: matches handle_new_profile's original behavior
-- - Without seed: matches create_team's original behavior
-- ============================================================================

-- Drop old signatures first (both signatures)
DROP FUNCTION IF EXISTS private.generate_unique_slug(text);
DROP FUNCTION IF EXISTS private.generate_unique_slug(text, uuid);

-- Recreate with parameterized design
CREATE OR REPLACE FUNCTION "private"."generate_unique_slug"("p_base_slug" "text", "p_seed" "uuid" DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_slug    text := p_base_slug;
  v_attempt int := 0;
BEGIN
  WHILE EXISTS (SELECT 1 FROM public.accounts WHERE slug = v_slug) LOOP
    v_attempt := v_attempt + 1;
    IF v_attempt > 5 THEN
      v_slug := p_base_slug || '-' ||
        replace(COALESCE(p_seed, gen_random_uuid())::text, '-', '');
      EXIT;
    END IF;
    IF p_seed IS NOT NULL THEN
      -- handle_new_profile's original behavior: deterministic, growing width per attempt
      v_slug := p_base_slug || '-' || substring(replace(p_seed::text, '-', '') FROM 1 FOR 6 + v_attempt);
    ELSE
      -- create_team's original behavior: fresh random suffix, fixed width, per attempt
      v_slug := p_base_slug || '-' || substring(replace(gen_random_uuid()::text, '-', '') FROM 1 FOR 6);
    END IF;
  END LOOP;
  RETURN v_slug;
END;
$$;

ALTER FUNCTION "private"."generate_unique_slug"("p_base_slug" "text", "p_seed" "uuid") OWNER TO "postgres";

REVOKE ALL ON FUNCTION private.generate_unique_slug(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.generate_unique_slug(text, uuid) TO postgres;

COMMENT ON FUNCTION private.generate_unique_slug(text, uuid) IS
  'Generates a unique slug by checking for collisions and appending suffixes. '
  'When p_seed is provided: uses deterministic approach with growing suffix width (handle_new_profile). '
  'When p_seed is NULL: uses random UUIDs with fixed suffix width (create_team). '
  'Preserves byte-for-byte behavior of both original implementations.';


-- Update handle_new_profile to pass NEW.id as seed (preserves original algorithm)
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
  v_slug := private.generate_unique_slug(v_base_slug, NEW.id);

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


-- create_team remains unchanged: calls helper without seed (random path)
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
