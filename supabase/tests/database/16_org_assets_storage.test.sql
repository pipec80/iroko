-- pgTAP: RLS de storage.objects para el bucket org-assets (F3-3H-2)
-- Run with: pnpm supa:test

BEGIN;
SELECT plan(5);

-- Seed: 2 usuarios en 2 cuentas distintas. 1200 = admin de su cuenta, 1201 = member.
INSERT INTO auth.users (id, email, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_confirmed_at, recovery_token, aud, role)
VALUES
  ('00000000-0000-0000-0000-000000002001', 'org-assets-owner@example.com',
   '{"given_name":"Owner","family_name":"User"}'::jsonb, now(), now(), '', now(), '',
   'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000002002', 'org-assets-member@example.com',
   '{"given_name":"Member","family_name":"User"}'::jsonb, now(), now(), '', now(), '',
   'authenticated', 'authenticated');

INSERT INTO public.accounts (id, type, name, slug, created_by)
VALUES
  ('00000000-0000-0000-0000-000000002100', 'team', 'Assets Org', 'assets-org',
   '00000000-0000-0000-0000-000000002001');

INSERT INTO public.accounts_memberships (account_id, user_id, role)
VALUES
  ('00000000-0000-0000-0000-000000002100', '00000000-0000-0000-0000-000000002001', 'owner'),
  ('00000000-0000-0000-0000-000000002100', '00000000-0000-0000-0000-000000002002', 'member');

-- Owner puede subir a la carpeta de su propia cuenta
-- (RETURNING replica el comportamiento real de la Storage API — un INSERT
-- ... RETURNING * requiere una política de SELECT además de la de INSERT;
-- sin ella este statement fallaría con "violates row-level security policy"
-- aunque el INSERT en sí esté permitido — bug real detectado en producción)
SELECT set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000002001', 'role', 'authenticated',
    'app_metadata', json_build_object(
      'account_id', '00000000-0000-0000-0000-000000002100', 'role', 'owner'))::text, true);
SET LOCAL role authenticated;
SELECT lives_ok(
  $$INSERT INTO storage.objects (bucket_id, name, owner)
    VALUES ('org-assets', '00000000-0000-0000-0000-000000002100/logo.png',
            '00000000-0000-0000-0000-000000002001')
    RETURNING id$$,
  'owner puede subir logo a la carpeta de su propia cuenta (con RETURNING, como hace la Storage API real)');
RESET role;

-- Owner puede LEER (SELECT) el objeto recién subido — sin esto, el
-- RETURNING de arriba fallaría (bug real: bucket público != política SELECT
-- innecesaria para RLS de Postgres, la lectura pública por URL no pasa por acá)
SELECT set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000002001', 'role', 'authenticated',
    'app_metadata', json_build_object(
      'account_id', '00000000-0000-0000-0000-000000002100', 'role', 'owner'))::text, true);
SET LOCAL role authenticated;
SELECT is(
  (SELECT count(*)::int FROM storage.objects
   WHERE bucket_id = 'org-assets' AND name = '00000000-0000-0000-0000-000000002100/logo.png'),
  1, 'owner puede leer (SELECT) el objeto de su propia cuenta');
RESET role;

-- Member (no admin/owner) NO puede subir
SELECT set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000002002', 'role', 'authenticated',
    'app_metadata', json_build_object(
      'account_id', '00000000-0000-0000-0000-000000002100', 'role', 'member'))::text, true);
SET LOCAL role authenticated;
SELECT throws_like(
  $$INSERT INTO storage.objects (bucket_id, name, owner)
    VALUES ('org-assets', '00000000-0000-0000-0000-000000002100/logo2.png',
            '00000000-0000-0000-0000-000000002002')$$,
  '%row-level security%',
  'member (no admin/owner) no puede subir logo');
RESET role;

-- Owner de OTRA cuenta no puede subir a esta carpeta ajena
SELECT set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000002001', 'role', 'authenticated',
    'app_metadata', json_build_object(
      'account_id', '00000000-0000-0000-0000-000000009999', 'role', 'owner'))::text, true);
SET LOCAL role authenticated;
SELECT throws_like(
  $$INSERT INTO storage.objects (bucket_id, name, owner)
    VALUES ('org-assets', '00000000-0000-0000-0000-000000002100/logo3.png',
            '00000000-0000-0000-0000-000000002001')$$,
  '%row-level security%',
  'owner de otra cuenta no puede subir a una carpeta ajena');
RESET role;

-- Owner puede borrar (DELETE) el archivo de su propia cuenta
-- (storage.protect_delete bloquea DELETE directo por SQL salvo este flag —
-- el flag no bypasea RLS, solo el trigger de protección de la Storage API)
SELECT set_config('storage.allow_delete_query', 'true', true);
SELECT set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000002001', 'role', 'authenticated',
    'app_metadata', json_build_object(
      'account_id', '00000000-0000-0000-0000-000000002100', 'role', 'owner'))::text, true);
SET LOCAL role authenticated;
SELECT lives_ok(
  $$DELETE FROM storage.objects
    WHERE bucket_id = 'org-assets' AND name = '00000000-0000-0000-0000-000000002100/logo.png'$$,
  'owner puede borrar el logo de su propia cuenta');
RESET role;

SELECT * FROM finish();
ROLLBACK;
