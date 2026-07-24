-- F3-C3: GDPR — export_my_data() / delete_my_account() + cron de purga de
-- identidades. Hand-written (supabase db diff es inconfiable en Windows) y
-- mirrored en supabase/schemas/gdpr.sql (excepto el cron, que sigue el mismo
-- precedente de hard-delete-old-accounts de no mirrorearse).
--
-- Nota de implementación (diverge del design doc original): el design doc
-- proponía purgar auth.users vía pg_net contra el Admin API de GoTrue con un
-- service_role_key guardado en Vault. Este proyecto no tiene ese patrón en
-- ningún otro lado (los cron→HTTP existentes llaman a Edge Functions propias
-- con verify_jwt=false, nunca al Admin API de Supabase con un secret global),
-- y sembrar un secret real en una migración no es seguro. En su lugar: DELETE
-- directo sobre auth.users, igual que hard-delete-old-accounts ya hace DELETE
-- directo sobre public.accounts. auth.users tiene ON DELETE CASCADE hacia
-- profiles/identities/sessions/mfa_factors/etc (esquema base de Supabase) y
-- hacia accounts_memberships/notifications/auth_recovery_codes (este repo),
-- así que un DELETE ahí purga todo correctamente. Requiere el fix de
-- private.enforce_single_owner_per_account() (PR previo) para no bloquear el
-- cascade en cuentas personales.

-- ============================================================================
-- 1. export_my_data()
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
-- 2. delete_my_account()
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

  PERFORM public.request_account_deletion();

  DELETE FROM auth.sessions WHERE user_id = v_uid;
END;
$$;

COMMENT ON FUNCTION public.delete_my_account() IS
  'Borrado GDPR (Art. 17) del caller: bloquea si es único owner de alguna cuenta de equipo (sole_owner_must_transfer, DETAIL = nombres de las cuentas bloqueantes), si no wrapea request_account_deletion() y revoca todas sus sesiones activas. F3-C3.';

REVOKE ALL ON FUNCTION public.delete_my_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;

-- ============================================================================
-- 3. Cron: purge-deleted-identities — cierra el gap de hard-delete-old-accounts
--    (que borra accounts pero nunca profiles/auth.users). Corre a las 03:30,
--    después de hard-delete-old-accounts (03:00), para no competir por locks
--    sobre las mismas filas en la misma ventana.
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-deleted-identities') THEN
    PERFORM cron.schedule(
      'purge-deleted-identities',
      '30 3 * * *',
      $cmd$
        DO $inner$
        DECLARE
          v_cutoff  timestamptz := now() - INTERVAL '90 days';
          v_user    record;
          v_purged  int := 0;
          v_skipped int := 0;
        BEGIN
          FOR v_user IN
            SELECT id FROM public.profiles
            WHERE pending_deletion = true
              AND deleted_at IS NOT NULL
              AND deleted_at < v_cutoff
          LOOP
            BEGIN
              -- ON DELETE CASCADE limpia profiles, accounts_memberships,
              -- notifications, auth_recovery_codes, auth.identities/
              -- sessions/mfa_factors/etc. api_keys.created_by y
              -- announcements.created_by quedan en NULL (SET NULL).
              DELETE FROM auth.users WHERE id = v_user.id;
              v_purged := v_purged + 1;
            EXCEPTION WHEN OTHERS THEN
              -- No debe frenar el resto del batch: por ejemplo, alguien que
              -- se auto-eliminó por la vía vieja request_account_deletion()
              -- sin pasar por el guardrail de delete_my_account() y sigue
              -- siendo único owner de una cuenta de equipo.
              v_skipped := v_skipped + 1;
              RAISE LOG 'purge-deleted-identities: no se pudo purgar user_id=% (%)',
                v_user.id, SQLERRM;
            END;
          END LOOP;

          RAISE LOG 'purge-deleted-identities: % purgadas, % omitidas (cutoff %)',
            v_purged, v_skipped, v_cutoff;
        END $inner$;
      $cmd$
    );
  END IF;
END $$;
