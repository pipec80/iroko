-- ============================================================================
-- Task 2: RPCs switch_account + create_team
-- Bloque 1 (Account Model & Active Account)
--
-- - switch_account(p_account_id uuid): Sets caller's active_account_id after
--   validating membership. JWT hook picks this up on next token refresh.
--
-- - create_team(p_name text): Creates a Team account (caller = owner), gated
--   by teams_max entitlement from Personal account plan. Sets new team as
--   active account.
--
-- Both functions are SECURITY DEFINER and require the caller to be
-- authenticated. Audit triggers on accounts/accounts_memberships/profiles
-- tables handle logging automatically.
-- ============================================================================

CREATE OR REPLACE FUNCTION "public"."switch_account"("p_account_id" "uuid")
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT private.user_is_member(p_account_id, (SELECT auth.uid())) THEN
    RAISE EXCEPTION 'not_a_member';
  END IF;

  UPDATE public.profiles
  SET active_account_id = p_account_id
  WHERE id = (SELECT auth.uid());
END;
$$;

ALTER FUNCTION "public"."switch_account"("p_account_id" "uuid") OWNER TO "postgres";

GRANT EXECUTE ON FUNCTION public.switch_account(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.switch_account(uuid) FROM PUBLIC, anon;

COMMENT ON FUNCTION public.switch_account(uuid) IS
  'Sets the caller''s active_account_id after validating membership. The JWT '
  'hook picks this up on the next token refresh — callers must call '
  'supabase.auth.refreshSession() afterward (Bloque 1).';


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
  v_attempt     int := 0;
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
  v_slug := v_base_slug;
  WHILE EXISTS (SELECT 1 FROM public.accounts WHERE slug = v_slug) LOOP
    v_attempt := v_attempt + 1;
    IF v_attempt > 5 THEN
      v_slug := v_base_slug || '-' || replace(gen_random_uuid()::text, '-', '');
      EXIT;
    END IF;
    v_slug := v_base_slug || '-' || substring(replace(gen_random_uuid()::text, '-', '') FROM 1 FOR 6);
  END LOOP;

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
