-- pgTAP: pgmq email_queue setup + broadcast_alert_email RPC (F2-2F), gateado a
-- platform_admin desde F3-C6.
-- Run with: pnpm supa:test

BEGIN;
SELECT plan(9);

SELECT ok(
  to_regclass('pgmq.q_email_queue') IS NOT NULL,
  'la cola pgmq email_queue existe');

SELECT ok(
  EXISTS(SELECT 1 FROM cron.job WHERE jobname = 'process-email-queue'),
  'el cron process-email-queue está registrado');

-- La DB local puede tener cuentas reales con owners: el broadcast va a TODOS
-- los owners, así que la cola se purga primero (transaccional, se revierte
-- con el ROLLBACK) y las assertions de conteo son relativas al total de
-- owners, no absolutas.
SELECT pgmq.purge_queue('email_queue');

INSERT INTO auth.users (id, email, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_confirmed_at, recovery_token, aud, role)
VALUES
  ('00000000-0000-0000-0000-000000000861', 'owner-a@example.com',
   '{"given_name":"Owner","family_name":"A"}'::jsonb, now(), now(), '', now(), '',
   'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000000862', 'owner-b@example.com',
   '{"given_name":"Owner","family_name":"B"}'::jsonb, now(), now(), '', now(), '',
   'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000000863', 'member-a@example.com',
   '{"given_name":"Member","family_name":"A"}'::jsonb, now(), now(), '', now(), '',
   'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000000864', 'c6-admin@example.com',
   '{"given_name":"Admin","family_name":"C6"}'::jsonb, now(), now(), '', now(), '',
   'authenticated', 'authenticated');

INSERT INTO public.platform_admins (user_id)
VALUES ('00000000-0000-0000-0000-000000000864');

INSERT INTO public.accounts (id, type, name, slug, created_by)
VALUES
  ('00000000-0000-0000-0000-000000000950', 'team', 'Team A', 'team-a-broadcast',
   '00000000-0000-0000-0000-000000000861'),
  ('00000000-0000-0000-0000-000000000951', 'team', 'Team B', 'team-b-broadcast',
   '00000000-0000-0000-0000-000000000862');

INSERT INTO public.accounts_memberships (account_id, user_id, role)
VALUES
  ('00000000-0000-0000-0000-000000000950', '00000000-0000-0000-0000-000000000861', 'owner'),
  ('00000000-0000-0000-0000-000000000950', '00000000-0000-0000-0000-000000000863', 'member'),
  ('00000000-0000-0000-0000-000000000951', '00000000-0000-0000-0000-000000000862', 'owner');

-- ============================================================================
-- 3. No-admin (owner-a, aun con aal2) rechazado — el gate corre ANTES de
--    cualquier lógica de negocio de la función.
-- ============================================================================
SELECT set_config('request.jwt.claims',
  json_build_object('sub','00000000-0000-0000-0000-000000000861','role','authenticated','aal','aal2')::text,
  true);
SELECT throws_ok(
  $$SELECT public.broadcast_alert_email('x', 'y')$$,
  'not_platform_admin',
  'Owner-a (no-admin) es rechazado por broadcast_alert_email aunque tenga aal2');

-- ============================================================================
-- 4. Admin whitelisteado pero sin aal2 real (sesión aal1) rechazado.
-- ============================================================================
SELECT set_config('request.jwt.claims',
  json_build_object('sub','00000000-0000-0000-0000-000000000864','role','authenticated','aal','aal1')::text,
  true);
SELECT throws_ok(
  $$SELECT public.broadcast_alert_email('x', 'y')$$,
  'mfa_required',
  'Admin whitelisteado en sesión aal1 es rechazado — aal2 real, no solo el claim');

-- ============================================================================
-- Admin con aal2 real — a partir de acá corren los 5 casos originales de F2-2F,
-- ahora en sesión de admin.
-- ============================================================================
SELECT set_config('request.jwt.claims',
  json_build_object('sub','00000000-0000-0000-0000-000000000864','role','authenticated','aal','aal2')::text,
  true);

SELECT is(
  public.broadcast_alert_email('Mantenimiento programado', 'El sábado a las 3am habrá mantenimiento.'),
  (SELECT count(*)::int FROM public.accounts_memberships WHERE role = 'owner'),
  'admin: encola un mensaje por cada owner de cuenta (los members no cuentan)');

SELECT is(
  (SELECT count(*)::int FROM pgmq.q_email_queue),
  (SELECT count(*)::int FROM public.accounts_memberships WHERE role = 'owner'),
  'admin: la cola tiene exactamente un mensaje por owner tras el broadcast');

SELECT is(
  (SELECT message->>'email' FROM pgmq.q_email_queue WHERE message->>'accountId' = '00000000-0000-0000-0000-000000000950'),
  'owner-a@example.com', 'admin: el mensaje de team-a va al email del owner correcto, no de un member');

SELECT throws_like(
  $$SELECT public.broadcast_alert_email('', 'body')$$,
  '%subject_required%', 'admin: subject vacío rechazado (después de pasar el gate)');

SET LOCAL role anon;
SELECT throws_like(
  $$SELECT public.broadcast_alert_email('x', 'y')$$,
  '%permission denied%', 'anon no puede invocar broadcast_alert_email');
RESET role;

SELECT * FROM finish();
ROLLBACK;
