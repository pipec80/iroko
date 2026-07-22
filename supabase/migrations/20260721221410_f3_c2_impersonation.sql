-- F3-C2: impersonation — tabla de sesiones, validación de target, claims JWT,
-- population de audit.logs.impersonator_id, y las 2 RPCs de inicio/fin.

-- ============================================================================
-- 1. public.impersonation_sessions
-- ============================================================================
CREATE TABLE public.impersonation_sessions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason         text NOT NULL,
  started_at     timestamptz NOT NULL DEFAULT now(),
  expires_at     timestamptz NOT NULL,
  ended_at       timestamptz,
  ended_reason   text,
  ip_address     inet,
  user_agent     text,
  CONSTRAINT impersonation_target_not_admin CHECK (admin_id <> target_user_id)
);

COMMENT ON TABLE public.impersonation_sessions IS
  'Registro de sesiones "ver como" de super-admin (F3-C2). Cap duro de 30 min via expires_at. RLS deny-all — el acceso pasa por los RPCs begin_/end_impersonation_session.';

CREATE UNIQUE INDEX idx_impersonation_one_active_per_admin
  ON public.impersonation_sessions (admin_id) WHERE ended_at IS NULL;

CREATE INDEX idx_impersonation_active_target
  ON public.impersonation_sessions (target_user_id) WHERE ended_at IS NULL;

ALTER TABLE public.impersonation_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "impersonation_sessions_deny_all" ON public.impersonation_sessions
  FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);

REVOKE ALL ON public.impersonation_sessions FROM anon, authenticated;

CREATE TRIGGER impersonation_sessions_immutable_core
  BEFORE UPDATE OF admin_id, target_user_id, reason, started_at
  ON public.impersonation_sessions
  FOR EACH ROW EXECUTE FUNCTION private.deny_mutation();

-- ============================================================================
-- 2. private.assert_impersonation_target_valid
-- ============================================================================
CREATE OR REPLACE FUNCTION private.assert_impersonation_target_valid(p_target_user_id uuid)
RETURNS void
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_target_user_id = (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'cannot_impersonate_self' USING ERRCODE = '42501';
  END IF;
  IF private.is_platform_admin(p_target_user_id) THEN
    RAISE EXCEPTION 'cannot_impersonate_admin' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_target_user_id) THEN
    RAISE EXCEPTION 'target_not_found' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

COMMENT ON FUNCTION private.assert_impersonation_target_valid(uuid) IS
  'Bloquea auto-impersonación y target=admin, valida que el target exista (F3-C2). Llamar desde begin_impersonation_session.';

REVOKE ALL ON FUNCTION private.assert_impersonation_target_valid(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.assert_impersonation_target_valid(uuid) TO authenticated;

-- ============================================================================
-- 3. custom_access_token_hook — nuevos claims impersonated_by / expires_at
-- ============================================================================
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id    uuid := (event ->> 'user_id')::uuid;
  v_account_id uuid;
  v_role       text;
  v_has_mfa    boolean;
  v_imp_admin  uuid;
  v_imp_exp    timestamptz;
  v_claims     jsonb := event -> 'claims';
  v_app_meta   jsonb := COALESCE(v_claims -> 'app_metadata', '{}'::jsonb);
BEGIN
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

  SELECT EXISTS (
    SELECT 1
    FROM auth.mfa_factors f
    WHERE f.user_id = v_user_id
      AND f.status = 'verified'
  ) INTO v_has_mfa;

  v_app_meta := v_app_meta || jsonb_build_object('mfa_enrolled', v_has_mfa);

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

COMMENT ON FUNCTION public.custom_access_token_hook(event jsonb) IS
  'Supabase Auth custom_access_token hook. Writes app_metadata.account_id + app_metadata.role from the user''s default membership, app_metadata.mfa_enrolled, app_metadata.is_platform_admin (F3-C1), and app_metadata.impersonated_by/impersonation_expires_at when the user is currently being impersonated (F3-C2). SECURITY DEFINER.';

-- ============================================================================
-- 4. private.audit_log() — puebla impersonator_id
-- ============================================================================
CREATE OR REPLACE FUNCTION private.audit_log() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_action      audit.action_type;
  v_account_id  uuid;
  v_resource_id text;
  v_row         jsonb;
  v_impersonator_id uuid;
BEGIN
  v_action := CASE TG_OP
    WHEN 'INSERT' THEN 'create'
    WHEN 'UPDATE' THEN 'update'
    WHEN 'DELETE' THEN 'delete'
  END::audit.action_type;

  v_row := to_jsonb(COALESCE(NEW, OLD));

  BEGIN
    v_account_id := (v_row ->> 'account_id')::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_account_id := NULL;
  END;

  IF v_account_id IS NULL AND TG_TABLE_NAME = 'profiles' THEN
    v_account_id := (v_row ->> 'id')::uuid;
  END IF;

  v_resource_id := COALESCE(v_row ->> 'id', v_row ->> 'account_id', '');

  -- F3-C2: si la sesión actual está impersonando a alguien, el claim
  -- impersonated_by trae el id del admin real — se guarda acá sin tocar
  -- actor_id (que sigue siendo auth.uid(), el target, para que RLS y el
  -- visor por cuenta se comporten exactamente igual que sin impersonation).
  v_impersonator_id := NULLIF(
    ((SELECT auth.jwt()) -> 'app_metadata' ->> 'impersonated_by'), ''
  )::uuid;

  INSERT INTO audit.logs (
    actor_id,
    action,
    resource_type,
    resource_id,
    account_id,
    old_data,
    new_data,
    ip_address,
    user_agent,
    impersonator_id
  ) VALUES (
    auth.uid(),
    v_action,
    TG_TABLE_NAME,
    v_resource_id,
    v_account_id,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    NULLIF(
      trim(split_part(
        COALESCE(current_setting('request.headers', true)::json->>'x-forwarded-for', ''),
        ',', 1
      )),
      ''
    )::inet,
    current_setting('request.headers', true)::json->>'user-agent',
    v_impersonator_id
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

REVOKE ALL ON FUNCTION private.audit_log() FROM PUBLIC;

-- ============================================================================
-- 5. admin_list_accounts — agrega owner_id
-- ============================================================================
-- Postgres no permite CREATE OR REPLACE cuando la columna nueva no queda al
-- final del RETURNS TABLE (42P13) — hay que dropear la firma vieja primero.
DROP FUNCTION IF EXISTS public.admin_list_accounts(text, integer, timestamptz, uuid);

CREATE OR REPLACE FUNCTION public.admin_list_accounts(
  p_search              text DEFAULT NULL,
  p_limit               integer DEFAULT 20,
  p_cursor_created_at   timestamptz DEFAULT NULL,
  p_cursor_id           uuid DEFAULT NULL
)
RETURNS TABLE (
  account_id           uuid,
  name                 text,
  slug                 text,
  type                 public.account_type,
  owner_id             uuid,
  owner_email          text,
  plan_slug            text,
  subscription_status  billing.subscription_status,
  member_count         integer,
  created_at           timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM private.assert_platform_admin();

  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 100 THEN
    RAISE EXCEPTION 'invalid_limit';
  END IF;

  RETURN QUERY
  SELECT a.id, a.name, a.slug, a.type, u.id, u.email::text,
         p.slug, s.status,
         (SELECT count(*)::int FROM public.accounts_memberships m WHERE m.account_id = a.id),
         a.created_at
  FROM public.accounts a
  LEFT JOIN public.accounts_memberships om ON om.account_id = a.id AND om.role = 'owner'
  LEFT JOIN auth.users u ON u.id = om.user_id
  LEFT JOIN billing.customers c ON c.account_id = a.id
  LEFT JOIN billing.subscriptions s ON s.customer_id = c.id
    AND s.status IN ('active', 'trialing', 'past_due', 'paused')
  LEFT JOIN billing.plans p ON p.id = s.plan_id
  WHERE a.deleted_at IS NULL
    AND (p_search IS NULL OR a.name ILIKE '%' || p_search || '%' OR a.slug ILIKE '%' || p_search || '%')
    AND (
      p_cursor_created_at IS NULL
      OR a.created_at < p_cursor_created_at
      OR (a.created_at = p_cursor_created_at AND a.id < p_cursor_id)
    )
  ORDER BY a.created_at DESC, a.id DESC
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION public.admin_list_accounts IS
  'Lista de cuentas con owner + estado de suscripción para el back-office de super-admin (F3-C1, "caso call-center"). owner_id agregado en F3-C2 (necesario para impersonation). Restringido a platform_admins.';

GRANT EXECUTE ON FUNCTION public.admin_list_accounts(
  text, integer, timestamptz, uuid
) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_list_accounts(
  text, integer, timestamptz, uuid
) FROM PUBLIC;

-- ============================================================================
-- 6. RPCs begin_/end_impersonation_session
-- ============================================================================
CREATE OR REPLACE FUNCTION public.begin_impersonation_session(
  p_target_user_id uuid, p_reason text
)
RETURNS public.impersonation_sessions
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_row public.impersonation_sessions;
BEGIN
  PERFORM private.assert_platform_admin();

  IF p_reason IS NULL OR length(trim(p_reason)) < 3 THEN
    RAISE EXCEPTION 'reason_required';
  END IF;

  PERFORM private.assert_impersonation_target_valid(p_target_user_id);

  INSERT INTO public.impersonation_sessions (admin_id, target_user_id, reason, expires_at)
  VALUES ((SELECT auth.uid()), p_target_user_id, p_reason, now() + interval '30 minutes')
  RETURNING * INTO v_row;

  INSERT INTO audit.logs (actor_id, action, resource_type, resource_id, new_data)
  VALUES (
    (SELECT auth.uid()), 'impersonate_start', 'impersonation_sessions', v_row.id::text,
    jsonb_build_object('target_user_id', p_target_user_id, 'reason', p_reason)
  );

  RETURN v_row;
END;
$$;

COMMENT ON FUNCTION public.begin_impersonation_session(uuid, text) IS
  'Abre una sesión de "ver como" (F3-C2). Solo platform_admin, aal2. Falla si ya hay una sesión activa para este admin (índice único) o si el target no es válido.';

GRANT EXECUTE ON FUNCTION public.begin_impersonation_session(uuid, text) TO authenticated;
REVOKE ALL ON FUNCTION public.begin_impersonation_session(uuid, text) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.end_impersonation_session(
  p_session_id uuid, p_reason text DEFAULT 'manual'
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_admin_id uuid;
BEGIN
  -- Invocable por el propio admin (con su sesión ya restaurada) o por un
  -- contexto sin auth.uid() (service_role, para el cierre automático por
  -- expiración vía el route handler dedicado) — nunca por un tercer admin.
  SELECT admin_id INTO v_admin_id FROM public.impersonation_sessions WHERE id = p_session_id;

  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'session_not_found';
  END IF;

  IF (SELECT auth.uid()) IS NOT NULL AND (SELECT auth.uid()) <> v_admin_id THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  UPDATE public.impersonation_sessions
  SET ended_at = now(), ended_reason = p_reason
  WHERE id = p_session_id AND ended_at IS NULL;

  INSERT INTO audit.logs (actor_id, action, resource_type, resource_id, new_data)
  VALUES (
    v_admin_id, 'impersonate_end', 'impersonation_sessions', p_session_id::text,
    jsonb_build_object('reason', p_reason)
  );
END;
$$;

COMMENT ON FUNCTION public.end_impersonation_session(uuid, text) IS
  'Cierra una sesión de "ver como" (F3-C2). Solo el admin dueño, o sin auth.uid() (cierre automático por expiración). Idempotente: la segunda llamada no encuentra filas ended_at IS NULL para actualizar y no falla.';

GRANT EXECUTE ON FUNCTION public.end_impersonation_session(uuid, text) TO authenticated;
REVOKE ALL ON FUNCTION public.end_impersonation_session(uuid, text) FROM PUBLIC;
