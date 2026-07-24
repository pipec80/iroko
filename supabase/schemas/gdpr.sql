-- ============================================================================
-- GDPR: exportar y borrar los propios datos (F3-C3)
-- ============================================================================
-- Dos RPCs sobre la infraestructura existente:
--   - export_my_data(): un snapshot jsonb de todo lo que este proyecto sabe
--     del caller (Art. 15 GDPR, derecho de acceso).
--   - delete_my_account(): wrapper sobre request_account_deletion() (ya
--     existente) con el guardrail de "no dejar una cuenta de equipo sin
--     owner" y revocación inmediata de sesiones activas (Art. 17, derecho al
--     olvido). request_account_deletion() no se toca -- otros callers no se
--     rompen.
--
-- Nota de diseño (export): resources_created_summary da solo CONTEOS de
-- api_keys, no su contenido -- ese contenido es de la cuenta (tenant), no
-- dato personal identificable del usuario. billing solo incluye la cuenta
-- personal (accounts.id = profiles.id por convención de handle_new_profile);
-- billing de cuentas de equipo NO se incluye, es dato del negocio compartido,
-- no del individuo.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.export_my_data()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := (SELECT auth.uid());
  v_result jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'exported_at', now(),
    'profile', (
      SELECT to_jsonb(p) - 'metadata'
      FROM public.profiles p
      WHERE p.id = v_uid
    ),
    'auth', jsonb_build_object(
      'email', u.email,
      'created_at', u.created_at,
      'last_sign_in_at', u.last_sign_in_at
    ),
    'memberships', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'account_id', a.id,
        'account_name', a.name,
        'account_type', a.type,
        'role', m.role,
        'joined_at', m.created_at
      ) ORDER BY m.created_at)
      FROM public.accounts_memberships m
      JOIN public.accounts a ON a.id = m.account_id
      WHERE m.user_id = v_uid AND a.deleted_at IS NULL
    ), '[]'::jsonb),
    'personal_account_billing', COALESCE((
      SELECT jsonb_build_object(
        'subscriptions', COALESCE(jsonb_agg(to_jsonb(s)) FILTER (WHERE s.id IS NOT NULL), '[]'::jsonb),
        'invoices', COALESCE((
          SELECT jsonb_agg(to_jsonb(i) ORDER BY i.created_at)
          FROM billing.invoices i
          WHERE i.customer_id = c.id
        ), '[]'::jsonb)
      )
      FROM public.accounts a
      JOIN billing.customers c ON c.account_id = a.id
      LEFT JOIN billing.subscriptions s ON s.customer_id = c.id
      WHERE a.id = v_uid AND a.type = 'personal'
      GROUP BY c.id
    ), jsonb_build_object('subscriptions', '[]'::jsonb, 'invoices', '[]'::jsonb)),
    'sessions', COALESCE((SELECT jsonb_agg(row_to_json(s)) FROM public.list_my_sessions() s), '[]'::jsonb),
    'mfa_factors_count', (
      SELECT count(*)::int FROM auth.mfa_factors WHERE user_id = v_uid AND status = 'verified'
    ),
    'unused_recovery_codes_count', public.count_unused_recovery_codes(),
    'notifications', COALESCE((
      SELECT jsonb_agg(to_jsonb(n) ORDER BY n.created_at DESC)
      FROM public.notifications n
      WHERE n.user_id = v_uid
    ), '[]'::jsonb),
    'resources_created_summary', jsonb_build_object(
      'api_keys', (SELECT count(*) FROM public.api_keys WHERE created_by = v_uid)
    ),
    'audit_trail', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'action', l.action, 'resource_type', l.resource_type, 'created_at', l.created_at
      ) ORDER BY l.created_at DESC)
      FROM (
        SELECT * FROM audit.logs WHERE actor_id = v_uid ORDER BY created_at DESC LIMIT 1000
      ) l
    ), '[]'::jsonb)
  ) INTO v_result
  FROM auth.users u
  WHERE u.id = v_uid;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.export_my_data() IS
  'Exporta un snapshot jsonb de todos los datos personales del caller (GDPR Art. 15, F3-C3). resources_created_summary da solo conteos (api_keys) -- el contenido pertenece a la cuenta/tenant, no es dato personal identificable. personal_account_billing cubre solo la cuenta personal, nunca cuentas de equipo compartidas.';

REVOKE ALL ON FUNCTION public.export_my_data() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.export_my_data() TO authenticated;

-- ============================================================================
-- delete_my_account: wrapper GDPR sobre request_account_deletion()
-- ============================================================================

CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := (SELECT auth.uid());
  v_blocking_accounts text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  -- Bloquear si el caller es el único owner de alguna cuenta de EQUIPO.
  -- La cuenta personal no cuenta: siempre tiene un único owner (el mismo
  -- usuario) y la maneja request_account_deletion() más abajo.
  SELECT string_agg(a.name || ' (' || a.slug || ')', ', ' ORDER BY a.name)
  INTO v_blocking_accounts
  FROM public.accounts_memberships m
  JOIN public.accounts a ON a.id = m.account_id AND a.type = 'team'
  WHERE m.user_id = v_uid AND m.role = 'owner'
    AND NOT EXISTS (
      SELECT 1 FROM public.accounts_memberships m2
      WHERE m2.account_id = m.account_id AND m2.role = 'owner' AND m2.user_id <> v_uid
    );

  IF v_blocking_accounts IS NOT NULL THEN
    RAISE EXCEPTION 'sole_owner_must_transfer'
      USING ERRCODE = 'P0001', DETAIL = v_blocking_accounts;
  END IF;

  -- Reutiliza el flujo de soft-delete ya probado (profile + account personal).
  PERFORM public.request_account_deletion();

  -- Extra GDPR: revocar TODAS las sesiones activas ya, no esperar a que
  -- expiren solas.
  DELETE FROM auth.sessions WHERE user_id = v_uid;
END;
$$;

COMMENT ON FUNCTION public.delete_my_account() IS
  'Borrado GDPR (Art. 17) del caller: bloquea si es único owner de alguna cuenta de equipo (sole_owner_must_transfer, DETAIL = nombres de las cuentas bloqueantes), si no wrapea request_account_deletion() y revoca todas sus sesiones activas. F3-C3.';

REVOKE ALL ON FUNCTION public.delete_my_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;
