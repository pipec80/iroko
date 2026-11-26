ALTER TABLE public.profiles ADD COLUMN organization_entry_state text NOT NULL DEFAULT 'legacy'
  CHECK (organization_entry_state IN ('legacy', 'pending', 'ready'));
ALTER TABLE public.profiles ALTER COLUMN organization_entry_state SET DEFAULT 'pending';

-- Preserve existing column grants while restricting the added server state.
DO $$
DECLARE v_columns text;
BEGIN
  SELECT string_agg(quote_ident(attname), ', ' ORDER BY attnum) INTO v_columns
  FROM pg_catalog.pg_attribute
  WHERE attrelid = 'public.profiles'::regclass AND attnum > 0 AND NOT attisdropped
    AND attname <> 'organization_entry_state';
  REVOKE UPDATE ON public.profiles FROM authenticated;
  EXECUTE format('GRANT UPDATE (%s) ON public.profiles TO authenticated', v_columns);
END;
$$;

CREATE OR REPLACE FUNCTION private.organization_limit(p_user_id uuid) RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT GREATEST(
    COALESCE((SELECT (p.limits ->> 'teams_max')::integer FROM billing.plans p
      WHERE p.slug = 'free' ORDER BY p."interval" LIMIT 1), 0),
    (SELECT (limits ->> 'teams_max')::integer FROM private.get_account_plan_row(p_user_id)),
    (SELECT max((plan.limits ->> 'teams_max')::integer)
      FROM public.accounts_memberships m
      JOIN public.accounts a ON a.id = m.account_id
      CROSS JOIN LATERAL private.get_account_plan_row(a.id) plan
      WHERE m.user_id = p_user_id AND m.role = 'owner' AND a.type = 'team'
        AND a.deleted_at IS NULL)
  );
$$;
ALTER FUNCTION private.organization_limit(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION private.organization_limit(uuid) FROM PUBLIC, anon, authenticated;

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

  IF v_team_count >= private.organization_limit(v_uid) THEN
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

COMMENT ON FUNCTION public.create_team(text) IS 'Creates and activates a team within the caller''s organization ownership quota.';

CREATE OR REPLACE FUNCTION public.ensure_initial_organization() RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_uid uuid := (SELECT auth.uid());
  v_state text;
  v_active uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_uid AND email_confirmed_at IS NOT NULL) THEN
    RAISE EXCEPTION 'email_not_confirmed';
  END IF;

  -- Match create_team's lock order. Invitation acceptance also serializes on the profile.
  PERFORM 1 FROM public.accounts WHERE id = v_uid AND type = 'personal' AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'personal_account_missing'; END IF;

  SELECT organization_entry_state, active_account_id INTO STRICT v_state, v_active
  FROM public.profiles WHERE id = v_uid AND deleted_at IS NULL FOR UPDATE;
  IF v_state <> 'pending' THEN RETURN v_active; END IF;

  SELECT a.id INTO v_active
  FROM public.accounts_memberships m JOIN public.accounts a ON a.id = m.account_id
  WHERE m.user_id = v_uid AND a.type = 'team' AND a.deleted_at IS NULL
  ORDER BY (a.id = v_active) DESC NULLS LAST, m.created_at DESC, a.id DESC LIMIT 1;

  IF v_active IS NULL THEN v_active := public.create_team('Mi organización'); END IF;
  UPDATE public.profiles SET active_account_id = v_active, organization_entry_state = 'ready'
  WHERE id = v_uid;
  RETURN v_active;
END;
$$;
ALTER FUNCTION public.ensure_initial_organization() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.ensure_initial_organization() FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.ensure_initial_organization() TO authenticated;

CREATE OR REPLACE FUNCTION "public"."accept_invitation"("p_token" "text") RETURNS TABLE("account_id" "uuid", "invited_by" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_invitation public.invitations%ROWTYPE;
  v_user_id    uuid := (SELECT auth.uid());
  v_token_hash text;
  v_account_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Hashear el token recibido antes de buscar (nunca comparar plaintext)
  v_token_hash := encode(extensions.digest(p_token, 'sha256'), 'hex');

  -- Preliminary lookup locates the account; it grants no authorization.
  SELECT i.account_id INTO v_account_id FROM public.invitations i WHERE i.token_hash=v_token_hash;
  PERFORM 1 FROM public.accounts WHERE id=v_account_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invalid or expired invitation'; END IF;
  SELECT * INTO v_invitation FROM public.invitations
  WHERE token_hash=v_token_hash AND status='pending' AND expires_at>clock_timestamp()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;

  IF lower(btrim((SELECT email FROM auth.users WHERE id = v_user_id)))
     IS DISTINCT FROM lower(btrim(v_invitation.email)) THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;

  IF NOT EXISTS(SELECT 1 FROM public.accounts_memberships m WHERE m.account_id=v_account_id AND m.user_id=v_user_id)
     AND NOT private.within_plan_limit(v_account_id,'seats_max',
       (SELECT count(*) FROM public.accounts_memberships m WHERE m.account_id=v_account_id)) THEN
    RAISE EXCEPTION 'seat_limit_reached';
  END IF;

  INSERT INTO public.accounts_memberships (account_id, user_id, role, invited_by)
  VALUES (v_invitation.account_id, v_user_id, v_invitation.role, v_invitation.invited_by)
  ON CONFLICT DO NOTHING;

  UPDATE public.invitations
  SET status = 'accepted', updated_at = now()
  WHERE id = v_invitation.id;

  -- Plan 009: entrar al team al que te invitaron es el resultado esperado del
  -- flujo. Antes dependía del fallback del hook JWT, así que ocurría o no
  -- según si el usuario había hecho switch_account() alguna vez.
  UPDATE public.profiles
  SET active_account_id = v_invitation.account_id,
      organization_entry_state = CASE organization_entry_state WHEN 'pending' THEN 'ready' ELSE organization_entry_state END
  WHERE id = v_user_id;

  RETURN QUERY SELECT v_invitation.account_id, v_invitation.invited_by;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."custom_access_token_hook"("event" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_user_id    uuid := (event ->> 'user_id')::uuid;
  v_account_id uuid;
  v_role       text;
  v_has_mfa    boolean;
  v_onboarding_completed boolean;
  v_entry_state text;
  v_imp_admin  uuid;
  v_imp_exp    timestamptz;
  v_claims     jsonb := event -> 'claims';
  v_app_meta   jsonb := COALESCE(v_claims -> 'app_metadata', '{}'::jsonb);
BEGIN
  -- Bloque 1: preferir la preferencia persistida del usuario (switch_account),
  -- solo si sigue siendo una membership válida (no la dejó, no se borró).
  SELECT m.account_id, m.role::text
  INTO v_account_id, v_role
  FROM public.profiles p
  JOIN public.accounts_memberships m
    ON m.account_id = p.active_account_id AND m.user_id = p.id
  WHERE p.id = v_user_id;

  -- Fallback: comportamiento original (membership más reciente).
  IF v_account_id IS NULL THEN
    SELECT m.account_id, m.role::text
    INTO v_account_id, v_role
    FROM public.accounts_memberships m
    WHERE m.user_id = v_user_id
    -- Secondary sort by account_id DESC ensures deterministic results when timestamps are identical (e.g. in same-transaction pgTAP tests)
    ORDER BY m.created_at DESC, m.account_id DESC
    LIMIT 1;
  END IF;

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

  -- F3-C4: onboarding gate — el edge guard fuerza el wizard mientras esté en false.
  -- COALESCE fail-open: si no hay fila de profile, nunca trabar a nadie fuera de /dashboard.
  SELECT p.onboarding_completed, p.organization_entry_state INTO v_onboarding_completed, v_entry_state
  FROM public.profiles p WHERE p.id = v_user_id;

  v_app_meta := v_app_meta || jsonb_build_object(
    'onboarding_completed', COALESCE(v_onboarding_completed, true),
    'organization_entry_state', COALESCE(v_entry_state, 'legacy')
  );

  -- F3-C1: mirror platform_admins membership into the JWT so the edge proxy
  -- can gate /dashboard/admin without a DB round trip. Every RPC still
  -- re-checks private.is_platform_admin() against the table directly.
  v_app_meta := v_app_meta || jsonb_build_object(
    'is_platform_admin', private.is_platform_admin(v_user_id)
  );

  -- F3-C2: si hay una sesión de impersonation activa DONDE este usuario es
  -- el target, mintear quién lo está impersonando y hasta cuándo. El edge
  -- (middleware.ts) usa esto para el banner y el cap de 30 min; ningún RPC
  -- confía en esto para autorización (RLS ve auth.uid() real, siempre).
  SELECT admin_id, expires_at
  INTO v_imp_admin, v_imp_exp
  FROM public.impersonation_sessions
  WHERE target_user_id = v_user_id AND ended_at IS NULL
  LIMIT 1;

  IF v_imp_admin IS NOT NULL THEN
    v_app_meta := v_app_meta
      || jsonb_build_object('impersonated_by', v_imp_admin)
      || jsonb_build_object('impersonation_expires_at', v_imp_exp);
  END IF;

  v_claims := jsonb_set(v_claims, '{app_metadata}', v_app_meta, true);
  RETURN jsonb_set(event, '{claims}', v_claims, true);
END;
$$;
