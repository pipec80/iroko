-- pgTAP: Plan 010 / PR 4 — aceptación integrada de aislamiento tenant.
-- Storage debe autorizar contra memberships vivas, no contra app_metadata de
-- un JWT que puede seguir vigente tras una degradación, remoción o cambio de
-- cuenta activa.
-- Run with: supabase test db --local supabase/tests/database/32_tenant_isolation_regression.test.sql

BEGIN;
SELECT plan(12);

-- Un owner del tenant objetivo, un admin que será degradado/removido y un
-- owner de otro tenant. Los dos últimos conservan claims que apuntan al tenant
-- objetivo para verificar que las policies leen membership y rol en vivo.
INSERT INTO auth.users (id, email, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_confirmed_at, recovery_token, aud, role)
VALUES
  ('00000000-0000-0000-0000-000000003201', 'storage-owner@example.com',
   '{"given_name":"Storage","family_name":"Owner"}'::jsonb, now(), now(), '', now(), '',
   'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000003202', 'removed-storage-admin@example.com',
   '{"given_name":"Removed","family_name":"Admin"}'::jsonb, now(), now(), '', now(), '',
   'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000003203', 'cross-tenant-owner@example.com',
   '{"given_name":"CrossTenant","family_name":"Owner"}'::jsonb, now(), now(), '', now(), '',
   'authenticated', 'authenticated');

INSERT INTO public.accounts (id, type, name, slug, created_by)
VALUES
  ('00000000-0000-0000-0000-000000003200', 'team', 'Storage Isolation',
   'storage-isolation', '00000000-0000-0000-0000-000000003201'),
  ('00000000-0000-0000-0000-000000003204', 'team', 'Cross Tenant Isolation',
   'cross-tenant-isolation', '00000000-0000-0000-0000-000000003203');

INSERT INTO public.accounts_memberships (account_id, user_id, role)
VALUES
  ('00000000-0000-0000-0000-000000003200', '00000000-0000-0000-0000-000000003201', 'owner'),
  ('00000000-0000-0000-0000-000000003200', '00000000-0000-0000-0000-000000003202', 'admin'),
  ('00000000-0000-0000-0000-000000003204', '00000000-0000-0000-0000-000000003203', 'owner');

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

-- La membership se degrada de admin a member, pero el JWT emitido antes aún
-- conserva account_id y role=admin. Las policies de org-assets deben leer el
-- rol vivo, no el claim viejo.
UPDATE public.accounts_memberships
SET role = 'member'
WHERE account_id = '00000000-0000-0000-0000-000000003200'
  AND user_id = '00000000-0000-0000-0000-000000003202';

SELECT set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000003202', 'role', 'authenticated',
    'app_metadata', json_build_object(
      'account_id', '00000000-0000-0000-0000-000000003200', 'role', 'admin'))::text, true);
SET LOCAL role authenticated;

SELECT throws_like(
  $$INSERT INTO storage.objects (bucket_id, name, owner)
    VALUES ('org-assets', '00000000-0000-0000-0000-000000003200/stale-logo.png',
            '00000000-0000-0000-0000-000000003202')$$,
  '%row-level security%',
  'un admin degradado no puede subir assets aunque conserve claims antiguos');

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
  'un admin degradado no puede borrar assets aunque conserve claims antiguos');

-- Ahora se elimina la membership por completo; el mismo JWT todavía parece
-- válido para la cuenta. Documents exige membership viva tanto para leer como
-- para insertar.
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

RESET role;

-- El path nunca debe confiar en app_metadata: este usuario es owner de otra
-- cuenta, pero un claim que apunta a la cuenta objetivo tampoco le concede
-- lectura ni escritura. Las policies anteriores habrían aceptado ambos casos.
SELECT set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000003203', 'role', 'authenticated',
    'app_metadata', json_build_object(
      'account_id', '00000000-0000-0000-0000-000000003200', 'role', 'owner'))::text, true);
SET LOCAL role authenticated;

SELECT is(
  (SELECT count(*)::int FROM storage.objects
   WHERE bucket_id = 'documents'
     AND name = '00000000-0000-0000-0000-000000003200/00000000-0000-0000-0000-000000003201/report.txt'),
  0,
  'un owner de otra cuenta no puede leer documentos aunque el claim apunte al tenant objetivo');

SELECT throws_like(
  $$INSERT INTO storage.objects (bucket_id, name, owner)
    VALUES ('documents', '00000000-0000-0000-0000-000000003200/00000000-0000-0000-0000-000000003203/cross-tenant.txt',
            '00000000-0000-0000-0000-000000003203')$$,
  '%row-level security%',
  'un owner de otra cuenta no puede subir documentos aunque el claim apunte al tenant objetivo');

RESET role;

-- Una invitación es un secreto de un solo uso, pero el secreto no debe bastar:
-- solamente la identidad cuyo email recibió la invitación puede canjearlo.
-- El destinatario usa distinta capitalización para probar la normalización.
INSERT INTO auth.users (id, email, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_confirmed_at, recovery_token, aud, role)
VALUES
  ('00000000-0000-0000-0000-000000003301', 'invitation-owner@example.com',
   '{"given_name":"Invitation","family_name":"Owner"}'::jsonb, now(), now(), '', now(), '',
   'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000003302', 'Invitee.Case@Example.com',
   '{"given_name":"Intended","family_name":"Invitee"}'::jsonb, now(), now(), '', now(), '',
   'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000003303', 'bystander@example.com',
   '{"given_name":"Unintended","family_name":"Invitee"}'::jsonb, now(), now(), '', now(), '',
   'authenticated', 'authenticated');

INSERT INTO public.accounts (id, type, name, slug, created_by)
VALUES ('00000000-0000-0000-0000-000000003300', 'team', 'Invitation Isolation',
        'invitation-isolation', '00000000-0000-0000-0000-000000003301');

INSERT INTO public.accounts_memberships (account_id, user_id, role)
VALUES ('00000000-0000-0000-0000-000000003300',
        '00000000-0000-0000-0000-000000003301', 'owner');

INSERT INTO public.invitations (account_id, email, role, invited_by, token_hash, expires_at)
VALUES (
  '00000000-0000-0000-0000-000000003300',
  'invitee.case@example.com',
  'member',
  '00000000-0000-0000-0000-000000003301',
  encode(extensions.digest('tok_invitation_email_binding', 'sha256'), 'hex'),
  now() + interval '7 days');

SELECT set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000003303', 'role', 'authenticated')::text,
  true);

SELECT throws_like(
  $$SELECT public.accept_invitation('tok_invitation_email_binding')$$,
  '%Invalid or expired invitation%',
  'un usuario ajeno recibe el mismo error genérico aunque tenga un token válido');

SELECT is(
  (SELECT count(*)::int FROM public.accounts_memberships
   WHERE account_id = '00000000-0000-0000-0000-000000003300'
     AND user_id = '00000000-0000-0000-0000-000000003303'),
  0,
  'un usuario ajeno no obtiene membresía con el token de otro destinatario');

SELECT is(
  (SELECT status::text FROM public.invitations
   WHERE account_id = '00000000-0000-0000-0000-000000003300'),
  'pending',
  'el intento ajeno no consume la invitación');

SELECT set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000003302', 'role', 'authenticated')::text,
  true);

SELECT lives_ok(
  $$SELECT public.accept_invitation('tok_invitation_email_binding')$$,
  'el destinatario acepta con email de distinta capitalización');

-- auth.users.email permite NULL (por ejemplo, identidades phone-only). Un
-- NULL no puede pasar inadvertidamente la comparación SQL y aceptar un token
-- emitido para una dirección de email.
UPDATE auth.users
SET email = NULL
WHERE id = '00000000-0000-0000-0000-000000003303';

INSERT INTO public.invitations (account_id, email, role, invited_by, token_hash, expires_at)
VALUES (
  '00000000-0000-0000-0000-000000003300',
  'another-invitee@example.com',
  'member',
  '00000000-0000-0000-0000-000000003301',
  encode(extensions.digest('tok_invitation_email_binding_null', 'sha256'), 'hex'),
  now() + interval '7 days');

SELECT set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000003303', 'role', 'authenticated')::text,
  true);

SELECT throws_like(
  $$SELECT public.accept_invitation('tok_invitation_email_binding_null')$$,
  '%Invalid or expired invitation%',
  'una identidad sin email recibe el mismo error genérico');

SELECT is(
  (SELECT count(*)::int FROM public.accounts_memberships
   WHERE account_id = '00000000-0000-0000-0000-000000003300'
     AND user_id = '00000000-0000-0000-0000-000000003303'),
  0,
  'una identidad sin email no obtiene membresía');

SELECT * FROM finish();
ROLLBACK;
