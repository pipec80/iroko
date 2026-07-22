-- pgTAP: tabla impersonation_sessions, assert_impersonation_target_valid,
-- claim impersonated_by en el hook, audit_log puebla impersonator_id, y
-- owner_id agregado a admin_list_accounts (F3-C2).
-- Run with: pnpm supa:test

BEGIN;
SELECT plan(20);

-- ── Seed completo ANTES de cualquier SET LOCAL role — mismo orden que usa
--    el resto de los tests pgTAP del repo (14_email_queue, 19_platform_admin):
--    todo el seed corre como superuser, el cambio a `authenticated` viene
--    después y solo para las llamadas a RPCs/tablas con RLS. ─────────────
INSERT INTO auth.users (id, email, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_confirmed_at, recovery_token, aud, role)
VALUES
  ('00000000-0000-0000-0000-000000000871', 'c2-admin@example.com',
   '{"given_name":"Admin","family_name":"C2"}'::jsonb, now(), now(), '', now(), '',
   'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000000872', 'c2-admin-2@example.com',
   '{"given_name":"AdminTwo","family_name":"C2"}'::jsonb, now(), now(), '', now(), '',
   'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000000873', 'c2-target@example.com',
   '{"given_name":"Target","family_name":"C2"}'::jsonb, now(), now(), '', now(), '',
   'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000000874', 'c2-target-2@example.com',
   '{"given_name":"TargetTwo","family_name":"C2"}'::jsonb, now(), now(), '', now(), '',
   'authenticated', 'authenticated');

INSERT INTO public.platform_admins (user_id) VALUES
  ('00000000-0000-0000-0000-000000000871'),
  ('00000000-0000-0000-0000-000000000872');

INSERT INTO public.accounts (id, type, name, slug, created_by)
VALUES ('00000000-0000-0000-0000-000000000970', 'team', 'C2 Test Team', 'c2-test-team',
  '00000000-0000-0000-0000-000000000873');
INSERT INTO public.accounts_memberships (account_id, user_id, role)
VALUES ('00000000-0000-0000-0000-000000000970', '00000000-0000-0000-0000-000000000873', 'owner');

-- ============================================================================
-- 1-4. assert_impersonation_target_valid: self / admin-target / not-found / ok.
-- ============================================================================
SET LOCAL role authenticated;
SELECT set_config('request.jwt.claims',
  json_build_object('sub','00000000-0000-0000-0000-000000000871','role','authenticated','aal','aal2')::text,
  true);

SELECT throws_ok(
  $$SELECT private.assert_impersonation_target_valid('00000000-0000-0000-0000-000000000871')$$,
  'cannot_impersonate_self',
  'Un admin no puede impersonarse a sí mismo');

SELECT throws_ok(
  $$SELECT private.assert_impersonation_target_valid('00000000-0000-0000-0000-000000000872')$$,
  'cannot_impersonate_admin',
  'Un admin no puede impersonar a otro admin');

SELECT throws_ok(
  $$SELECT private.assert_impersonation_target_valid('00000000-0000-0000-0000-000000000999')$$,
  'target_not_found',
  'Target inexistente es rechazado');

SELECT lives_ok(
  $$SELECT private.assert_impersonation_target_valid('00000000-0000-0000-0000-000000000873')$$,
  'Target válido (no-admin, existe) pasa la validación');

-- ============================================================================
-- 5. RLS deny-all de impersonation_sessions.
-- ============================================================================
SELECT throws_like(
  $$SELECT * FROM public.impersonation_sessions$$,
  '%permission denied%',
  'authenticated no puede SELECT impersonation_sessions directo');

-- ============================================================================
-- 6-10. begin_impersonation_session: rechaza reason corto, rechaza self,
--       rechaza admin-target, abre una sesión válida y deja auditoría.
-- ============================================================================
SELECT throws_ok(
  $$SELECT public.begin_impersonation_session('00000000-0000-0000-0000-000000000873', 'ab')$$,
  'reason_required',
  'begin_impersonation_session rechaza un motivo de menos de 3 caracteres');

SELECT throws_ok(
  $$SELECT public.begin_impersonation_session('00000000-0000-0000-0000-000000000871', 'motivo válido')$$,
  'cannot_impersonate_self',
  'begin_impersonation_session rechaza auto-impersonación');

SELECT throws_ok(
  $$SELECT public.begin_impersonation_session('00000000-0000-0000-0000-000000000872', 'motivo válido')$$,
  'cannot_impersonate_admin',
  'begin_impersonation_session rechaza impersonar a otro admin');

-- Se guarda el row completo en una tabla temp (mismo patrón que
-- 09_api_keys.test.sql) porque el id de la sesión se necesita más abajo
-- (tests 17-19) y `impersonation_sessions` es RLS deny-all + sin GRANT a
-- authenticated: no se puede sub-consultar directo desde el script de test.
CREATE TEMP TABLE t_impersonation_session AS
SELECT * FROM public.begin_impersonation_session(
  '00000000-0000-0000-0000-000000000873', 'ticket de soporte #1'
);

SELECT ok(
  (SELECT target_user_id FROM t_impersonation_session) = '00000000-0000-0000-0000-000000000873',
  'begin_impersonation_session abre una sesión válida para el target correcto');

-- authenticated no tiene SELECT directo sobre audit.logs (mismo patrón que
-- 08_audit_log_viewer.test.sql) — se verifica como superuser y se vuelve
-- a authenticated para no alterar el resto del bloque. De paso, se habilita
-- el acceso a la tabla temp para las próximas veces que cambiemos de role.
RESET role;
SELECT ok(
  EXISTS(
    SELECT 1 FROM audit.logs
    WHERE action = 'impersonate_start' AND actor_id = '00000000-0000-0000-0000-000000000871'
  ),
  'begin_impersonation_session deja rastro impersonate_start en audit.logs');
GRANT SELECT ON t_impersonation_session TO authenticated;
SET LOCAL role authenticated;

-- ============================================================================
-- 11. No se puede abrir una segunda sesión activa para el mismo admin —
--     el índice único se propaga como error de Postgres a través de la RPC.
-- ============================================================================
SELECT throws_like(
  $$SELECT public.begin_impersonation_session('00000000-0000-0000-0000-000000000874', 'otra sesión')$$,
  '%duplicate key%',
  'Un admin no puede tener dos sesiones de impersonation activas a la vez');

-- ============================================================================
-- 12-13. custom_access_token_hook: solo invocable por supabase_auth_admin
--     (mismo patrón que Supabase Auth en producción) — se llama como
--     superuser, igual que los checks de audit.logs de arriba.
-- ============================================================================
RESET role;
SELECT ok(
  (public.custom_access_token_hook(
    json_build_object(
      'user_id', '00000000-0000-0000-0000-000000000873',
      'claims', json_build_object('sub', '00000000-0000-0000-0000-000000000873')
    )::jsonb
  ) -> 'claims' -> 'app_metadata' ->> 'impersonated_by') = '00000000-0000-0000-0000-000000000871',
  'El hook mintea impersonated_by = admin cuando hay una sesión activa para el target');

SELECT ok(
  (public.custom_access_token_hook(
    json_build_object(
      'user_id', '00000000-0000-0000-0000-000000000871',
      'claims', json_build_object('sub', '00000000-0000-0000-0000-000000000871')
    )::jsonb
  ) -> 'claims' -> 'app_metadata' -> 'impersonated_by') IS NULL,
  'impersonated_by es null para un usuario sin sesión de impersonation activa como target');
SET LOCAL role authenticated;

-- ============================================================================
-- 14-15. private.audit_log() puebla impersonator_id desde el claim JWT, sin
--        tocar actor_id.
-- ============================================================================
SET LOCAL role authenticated;
SELECT set_config('request.jwt.claims',
  json_build_object(
    'sub', '00000000-0000-0000-0000-000000000873',
    'role', 'authenticated',
    'aal', 'aal2',
    'app_metadata', json_build_object('impersonated_by', '00000000-0000-0000-0000-000000000871')
  )::text,
  true);

-- authenticated no tiene UPDATE directo sobre accounts (pasa por RPCs), pero
-- sí lo tiene sobre su propia fila de profiles (self-update), y esa tabla
-- también dispara trg_profiles_audit → private.audit_log().
UPDATE public.profiles SET given_name = 'Target (renamed)'
WHERE id = '00000000-0000-0000-0000-000000000873';

-- created_at es now() (estable dentro de la transacción): coincide entre la
-- fila del INSERT automático (handle_new_user) y la de este UPDATE — hay que
-- desambiguar filtrando por action='update', no solo ordenar por created_at.
RESET role;
SELECT ok(
  (SELECT impersonator_id FROM audit.logs
     WHERE resource_type = 'profiles' AND resource_id = '00000000-0000-0000-0000-000000000873'
       AND action = 'update') = '00000000-0000-0000-0000-000000000871',
  'audit.logs.impersonator_id queda poblado con el admin real durante la impersonation');

SELECT ok(
  (SELECT actor_id FROM audit.logs
     WHERE resource_type = 'profiles' AND resource_id = '00000000-0000-0000-0000-000000000873'
       AND action = 'update') = '00000000-0000-0000-0000-000000000873',
  'actor_id sigue siendo el target, no el admin — RLS/visor por cuenta no se rompen');
SET LOCAL role authenticated;

-- ============================================================================
-- 16. Fuera de impersonation, impersonator_id queda NULL (regresión).
-- ============================================================================
SELECT set_config('request.jwt.claims',
  json_build_object('sub','00000000-0000-0000-0000-000000000873','role','authenticated','aal','aal2')::text,
  true);
UPDATE public.profiles SET given_name = 'Target (no impersonation)'
WHERE id = '00000000-0000-0000-0000-000000000873';
RESET role;
SELECT ok(
  (SELECT impersonator_id FROM audit.logs
     WHERE resource_type = 'profiles' AND resource_id = '00000000-0000-0000-0000-000000000873'
       AND new_data ->> 'given_name' = 'Target (no impersonation)') IS NULL,
  'Sin claim impersonated_by, impersonator_id queda NULL como antes de C2');
SET LOCAL role authenticated;

-- ============================================================================
-- 17-19. end_impersonation_session: un tercer admin no puede cerrarla; el
--        dueño sí; cerrarla dos veces es idempotente (no falla).
-- ============================================================================
SELECT set_config('request.jwt.claims',
  json_build_object('sub','00000000-0000-0000-0000-000000000872','role','authenticated','aal','aal2')::text,
  true);
SELECT throws_ok(
  $$SELECT public.end_impersonation_session(
    (SELECT id FROM t_impersonation_session), 'manual'
  )$$,
  'not_authorized',
  'Un admin distinto al dueño de la sesión no puede cerrarla');

SELECT set_config('request.jwt.claims',
  json_build_object('sub','00000000-0000-0000-0000-000000000871','role','authenticated','aal','aal2')::text,
  true);
SELECT lives_ok(
  $$SELECT public.end_impersonation_session(
    (SELECT id FROM t_impersonation_session), 'manual'
  )$$,
  'El admin dueño de la sesión sí puede cerrarla');

SELECT lives_ok(
  $$SELECT public.end_impersonation_session(
    (SELECT id FROM t_impersonation_session), 'manual'
  )$$,
  'Cerrar una sesión ya cerrada es idempotente, no falla');

-- ============================================================================
-- 20. admin_list_accounts ahora expone owner_id.
-- ============================================================================
SELECT ok(
  (SELECT owner_id FROM public.admin_list_accounts('c2-test-team')
     WHERE account_id = '00000000-0000-0000-0000-000000000970') = '00000000-0000-0000-0000-000000000873',
  'admin_list_accounts expone owner_id = el uuid real del owner');

RESET role;
SELECT * FROM finish();
ROLLBACK;
