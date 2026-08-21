-- pgTAP: Plan 010 / PR 1 — Storage debe autorizar contra memberships vivas,
-- no contra app_metadata de un JWT que puede seguir vigente tras una remoción.
-- Run with: supabase test db --local supabase/tests/database/32_tenant_isolation_regression.test.sql

BEGIN;
SELECT plan(4);

-- Dos usuarios y un team. El segundo usuario empieza como admin, por lo que
-- sus claims serán válidos al emitirse, pero se elimina la membership antes de
-- las operaciones sensibles de abajo.
INSERT INTO auth.users (id, email, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_confirmed_at, recovery_token, aud, role)
VALUES
  ('00000000-0000-0000-0000-000000003201', 'storage-owner@example.com',
   '{"given_name":"Storage","family_name":"Owner"}'::jsonb, now(), now(), '', now(), '',
   'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000003202', 'removed-storage-admin@example.com',
   '{"given_name":"Removed","family_name":"Admin"}'::jsonb, now(), now(), '', now(), '',
   'authenticated', 'authenticated');

INSERT INTO public.accounts (id, type, name, slug, created_by)
VALUES ('00000000-0000-0000-0000-000000003200', 'team', 'Storage Isolation',
        'storage-isolation', '00000000-0000-0000-0000-000000003201');

INSERT INTO public.accounts_memberships (account_id, user_id, role)
VALUES
  ('00000000-0000-0000-0000-000000003200', '00000000-0000-0000-0000-000000003201', 'owner'),
  ('00000000-0000-0000-0000-000000003200', '00000000-0000-0000-0000-000000003202', 'admin');

-- El owner crea un documento y un logo reales dentro de la cuenta.
SELECT set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000003201', 'role', 'authenticated',
    'app_metadata', json_build_object(
      'account_id', '00000000-0000-0000-0000-000000003200', 'role', 'owner'))::text, true);
SET LOCAL role authenticated;
INSERT INTO storage.objects (bucket_id, name, owner)
VALUES
  ('documents', '00000000-0000-0000-0000-000000003200/00000000-0000-0000-0000-000000003201/report.txt',
   '00000000-0000-0000-0000-000000003201'),
  ('org-assets', '00000000-0000-0000-0000-000000003200/logo.png',
   '00000000-0000-0000-0000-000000003201');
RESET role;

-- La membership se elimina, pero el JWT que recibió antes conserva account_id
-- y role=admin. Todas las operaciones siguientes ocurren en esta misma sesión.
DELETE FROM public.accounts_memberships
WHERE account_id = '00000000-0000-0000-0000-000000003200'
  AND user_id = '00000000-0000-0000-0000-000000003202';

SELECT set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000003202', 'role', 'authenticated',
    'app_metadata', json_build_object(
      'account_id', '00000000-0000-0000-0000-000000003200', 'role', 'admin'))::text, true);
SET LOCAL role authenticated;

SELECT is(
  (SELECT count(*)::int FROM storage.objects
   WHERE bucket_id = 'documents'
     AND name = '00000000-0000-0000-0000-000000003200/00000000-0000-0000-0000-000000003201/report.txt'),
  0,
  'un admin removido no puede listar documentos aunque conserve claims antiguos');

SELECT throws_like(
  $$INSERT INTO storage.objects (bucket_id, name, owner)
    VALUES ('documents', '00000000-0000-0000-0000-000000003200/00000000-0000-0000-0000-000000003202/stale.txt',
            '00000000-0000-0000-0000-000000003202')$$,
  '%row-level security%',
  'un admin removido no puede subir documentos aunque conserve claims antiguos');

SELECT throws_like(
  $$INSERT INTO storage.objects (bucket_id, name, owner)
    VALUES ('org-assets', '00000000-0000-0000-0000-000000003200/stale-logo.png',
            '00000000-0000-0000-0000-000000003202')$$,
  '%row-level security%',
  'un admin removido no puede subir assets de la cuenta aunque conserve claims antiguos');

-- El trigger de Storage protege los DELETE SQL directos; el flag replica la
-- operación autorizada de la API sin saltarse RLS. PostgreSQL deniega un
-- DELETE por RLS filtrando cero filas (no necesariamente con excepción), por
-- lo que se comprueba el efecto real de la operación. No usamos RETURNING:
-- también está sujeto a la policy SELECT y podría ocultar un borrado real.
SELECT set_config('storage.allow_delete_query', 'true', true);
DELETE FROM storage.objects
WHERE bucket_id = 'org-assets'
  AND name = '00000000-0000-0000-0000-000000003200/logo.png';

RESET role;
SELECT is(
  (SELECT count(*)::int FROM storage.objects
   WHERE bucket_id = 'org-assets'
     AND name = '00000000-0000-0000-0000-000000003200/logo.png'),
  1,
  'un admin removido no puede borrar assets aunque conserve claims antiguos');
SELECT * FROM finish();
ROLLBACK;
