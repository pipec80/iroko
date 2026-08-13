-- pgTAP: service_role puede insertar en notifications, authenticated no puede
-- directo (hallazgo de QA manual 2026-08-13 — notify() fallaba en Cloud
-- porque la tabla nunca tuvo GRANT INSERT explícito para service_role).
-- Run with: pnpm supa:test

BEGIN;
SELECT plan(2);

INSERT INTO auth.users (id, email, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_confirmed_at, recovery_token, aud, role)
VALUES
  ('00000000-0000-0000-0000-000000002801', 'notif-user@example.com',
   '{"given_name":"Notif","family_name":"User"}'::jsonb, now(), now(), '', now(), '',
   'authenticated', 'authenticated');

-- service_role (el admin client de notify()) sí puede insertar
SET LOCAL role service_role;
SELECT lives_ok(
  $$INSERT INTO public.notifications (user_id, type, title)
    VALUES ('00000000-0000-0000-0000-000000002801', 'info', 'Test notification')$$,
  'service_role puede insertar notificaciones directo');
RESET role;

-- authenticated sigue bloqueado por la política restrictiva (solo el server helper inserta)
SELECT set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000002801', 'role', 'authenticated')::text, true);
SET LOCAL role authenticated;
SELECT throws_like(
  $$INSERT INTO public.notifications (user_id, type, title)
    VALUES ('00000000-0000-0000-0000-000000002801', 'info', 'Direct insert attempt')$$,
  '%row-level security policy%',
  'authenticated no puede insertar notificaciones directo (bloqueado por RLS)');
RESET role;

SELECT * FROM finish();
ROLLBACK;
