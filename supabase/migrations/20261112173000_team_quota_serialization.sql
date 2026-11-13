-- Plan016 DB-05 / D-03.TEAMS: serialize final-slot team admission.
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
  -- Serializar la admisión antes del conteo; el UPDATE de profile al final
  -- llega demasiado tarde para impedir dos creaciones sobre el último cupo.
  PERFORM 1 FROM public.accounts WHERE id = v_uid FOR UPDATE;

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


