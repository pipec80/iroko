CREATE OR REPLACE FUNCTION private.organization_limit(p_user_id uuid) RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  WITH tier_limits (capacity) AS (
    SELECT (p.limits ->> 'teams_max')::integer FROM billing.plans p WHERE p.slug = 'free'
    UNION ALL
    SELECT (limits ->> 'teams_max')::integer FROM private.get_account_plan_row(p_user_id)
    UNION ALL
    SELECT (plan.limits ->> 'teams_max')::integer
    FROM public.accounts_memberships m
    JOIN public.accounts a ON a.id = m.account_id
    CROSS JOIN LATERAL private.get_account_plan_row(a.id) plan
    WHERE m.user_id = p_user_id AND m.role = 'owner' AND a.type = 'team'
      AND a.deleted_at IS NULL
  )
  SELECT CASE WHEN bool_or(capacity = -1) THEN -1 ELSE GREATEST(MAX(capacity), 0) END
  FROM tier_limits;
$$;

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

  -- Serialize admission on the caller's Personal account.
  PERFORM 1 FROM public.accounts WHERE id = v_uid FOR UPDATE;

  SELECT count(*) INTO v_team_count
  FROM public.accounts_memberships m
  JOIN public.accounts a ON a.id = m.account_id
  WHERE m.user_id = v_uid AND m.role = 'owner' AND a.type = 'team' AND a.deleted_at IS NULL;

  IF v_team_count >= NULLIF(private.organization_limit(v_uid), -1) THEN
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
