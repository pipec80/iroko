-- pgTAP: active_account_id + hook (Bloque 1 — Account Model)
-- Run with: pnpm supa:test

BEGIN;
SELECT plan(16);

INSERT INTO auth.users (id, email, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_confirmed_at, recovery_token, aud, role)
VALUES
  ('00000000-0000-0000-0000-000000002001', 'teams-a@example.com',
   '{"given_name":"Ana","family_name":"A"}'::jsonb, now(), now(), '', now(), '',
   'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000002002', 'teams-b@example.com',
   '{"given_name":"Bea","family_name":"B"}'::jsonb, now(), now(), '', now(), '',
   'authenticated', 'authenticated');

-- handle_new_user → handle_new_profile ya crearon la personal account de cada
-- uno (id = user id). Sembramos un Team extra para el usuario A.
INSERT INTO public.accounts (id, type, name, slug, created_by)
VALUES ('00000000-0000-0000-0000-000000002100', 'team', 'Team A1', 'team-a1',
        '00000000-0000-0000-0000-000000002001');
INSERT INTO public.accounts_memberships (account_id, user_id, role)
VALUES ('00000000-0000-0000-0000-000000002100', '00000000-0000-0000-0000-000000002001', 'owner');

-- 1) sin active_account_id seteado: el hook cae al fallback (personal, la
--    única membership hasta este punto salvo por el team recién sembrado —
--    el team es más reciente, así que el fallback debe elegirlo)
SELECT is(
  (public.custom_access_token_hook(
    jsonb_build_object('user_id', '00000000-0000-0000-0000-000000002001',
      'claims', jsonb_build_object('app_metadata', '{}'::jsonb))
  ) -> 'claims' -> 'app_metadata' ->> 'account_id')::uuid,
  '00000000-0000-0000-0000-000000002100'::uuid,
  'sin preferencia: el hook cae al fallback (membership más reciente = el team)');

-- 2) con active_account_id apuntando a la personal account (válida): el hook
--    la prefiere sobre el fallback
UPDATE public.profiles SET active_account_id = '00000000-0000-0000-0000-000000002001'
WHERE id = '00000000-0000-0000-0000-000000002001';

SELECT is(
  (public.custom_access_token_hook(
    jsonb_build_object('user_id', '00000000-0000-0000-0000-000000002001',
      'claims', jsonb_build_object('app_metadata', '{}'::jsonb))
  ) -> 'claims' -> 'app_metadata' ->> 'account_id')::uuid,
  '00000000-0000-0000-0000-000000002001'::uuid,
  'con preferencia válida: el hook la usa en vez del fallback');

SELECT is(
  (public.custom_access_token_hook(
    jsonb_build_object('user_id', '00000000-0000-0000-0000-000000002001',
      'claims', jsonb_build_object('app_metadata', '{}'::jsonb))
  ) -> 'claims' -> 'app_metadata' ->> 'role'),
  'owner', 'el role del claim corresponde a la cuenta preferida, no al fallback');

-- 3) active_account_id apuntando a una cuenta de la que NO es miembro (ej.
--    lo sacaron del team): el hook ignora el valor colgado y cae al fallback
UPDATE public.profiles SET active_account_id = '00000000-0000-0000-0000-000000002100'
WHERE id = '00000000-0000-0000-0000-000000002002'; -- usuario B, no es miembro del team A1

SELECT is(
  (public.custom_access_token_hook(
    jsonb_build_object('user_id', '00000000-0000-0000-0000-000000002002',
      'claims', jsonb_build_object('app_metadata', '{}'::jsonb))
  ) -> 'claims' -> 'app_metadata' ->> 'account_id')::uuid,
  '00000000-0000-0000-0000-000000002002'::uuid,
  'active_account_id colgado (no-miembro): el hook cae al fallback, no al valor inválido');

-- 4) mfa_enrolled / onboarding_completed / is_platform_admin siguen presentes
--    (no se rompió el resto del hook al tocar la sección de account_id)
SELECT ok(
  (public.custom_access_token_hook(
    jsonb_build_object('user_id', '00000000-0000-0000-0000-000000002001',
      'claims', jsonb_build_object('app_metadata', '{}'::jsonb))
  ) -> 'claims' -> 'app_metadata') ? 'mfa_enrolled',
  'el claim mfa_enrolled se sigue emitiendo');

SELECT ok(
  (public.custom_access_token_hook(
    jsonb_build_object('user_id', '00000000-0000-0000-0000-000000002001',
      'claims', jsonb_build_object('app_metadata', '{}'::jsonb))
  ) -> 'claims' -> 'app_metadata') ? 'onboarding_completed',
  'el claim onboarding_completed se sigue emitiendo');

SELECT ok(
  (public.custom_access_token_hook(
    jsonb_build_object('user_id', '00000000-0000-0000-0000-000000002001',
      'claims', jsonb_build_object('app_metadata', '{}'::jsonb))
  ) -> 'claims' -> 'app_metadata') ? 'is_platform_admin',
  'el claim is_platform_admin se sigue emitiendo');

-- 5) columna nueva: nullable, FK a accounts, on delete set null
SELECT has_column('public', 'profiles', 'active_account_id', 'profiles.active_account_id existe');
SELECT col_is_fk('public', 'profiles', 'active_account_id', 'active_account_id es FK');

-- ── switch_account ──────────────────────────────────────────────────────
-- usuario A es miembro de su personal Y del team sembrado arriba
SELECT set_config('request.jwt.claims',
  json_build_object('sub','00000000-0000-0000-0000-000000002001','role','authenticated')::text, true);
SET LOCAL role authenticated;
SELECT lives_ok(
  $$SELECT public.switch_account('00000000-0000-0000-0000-000000002100')$$,
  'miembro puede cambiar a una cuenta de la que es owner');
RESET role;

SELECT is(
  (SELECT active_account_id FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000002001'),
  '00000000-0000-0000-0000-000000002100'::uuid,
  'switch_account persiste la preferencia');

-- usuario B NO es miembro del team A1
SELECT set_config('request.jwt.claims',
  json_build_object('sub','00000000-0000-0000-0000-000000002002','role','authenticated')::text, true);
SET LOCAL role authenticated;
SELECT throws_like(
  $$SELECT public.switch_account('00000000-0000-0000-0000-000000002100')$$,
  '%not_a_member%', 'no-miembro no puede cambiar a esa cuenta');
RESET role;

-- ── create_team ──────────────────────────────────────────────────────────
SELECT set_config('request.jwt.claims',
  json_build_object('sub','00000000-0000-0000-0000-000000002002','role','authenticated')::text, true);
SET LOCAL role authenticated;

SELECT isnt(
  (SELECT public.create_team('Equipo Nuevo B')), NULL,
  'create_team devuelve un uuid');

SELECT throws_like(
  $$SELECT public.create_team('')$$,
  '%invalid_name%', 'nombre vacío es rechazado');

RESET role;

-- Verificar que la cuenta fue creada correctamente (verificación sin restricción RLS)
SELECT is(
  (SELECT type FROM public.accounts a
   JOIN public.accounts_memberships m ON m.account_id = a.id
   WHERE m.user_id = '00000000-0000-0000-0000-000000002002' AND m.role = 'owner'
     AND a.name = 'Equipo Nuevo B'),
  'team'::public.account_type,
  'la cuenta creada es type=team');

SELECT is(
  (SELECT active_account_id FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000002002'),
  (SELECT id FROM public.accounts WHERE name = 'Equipo Nuevo B'),
  'create_team deja el team nuevo como cuenta activa');

SELECT * FROM finish();
ROLLBACK;
