-- pgTAP: RLS de realtime.messages para el canal account:{id}:presence (F3-3H-2)
-- Run with: pnpm supa:test

BEGIN;
SELECT plan(3);

INSERT INTO auth.users (id, email, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_confirmed_at, recovery_token, aud, role)
VALUES
  ('00000000-0000-0000-0000-000000002401', 'presence-member@example.com',
   '{"given_name":"Member","family_name":"User"}'::jsonb, now(), now(), '', now(), '',
   'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000002402', 'presence-outsider@example.com',
   '{"given_name":"Outsider","family_name":"User"}'::jsonb, now(), now(), '', now(), '',
   'authenticated', 'authenticated');

INSERT INTO public.accounts (id, type, name, slug, created_by)
VALUES ('00000000-0000-0000-0000-000000002500', 'team', 'Presence Org', 'presence-org',
        '00000000-0000-0000-0000-000000002401');

INSERT INTO public.accounts_memberships (account_id, user_id, role)
VALUES ('00000000-0000-0000-0000-000000002500', '00000000-0000-0000-0000-000000002401', 'owner');

-- Member de la cuenta puede escribir (track presence) en el topic de su cuenta
SELECT set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000002401', 'role', 'authenticated')::text, true);
SET LOCAL role authenticated;
SELECT lives_ok(
  $$INSERT INTO realtime.messages (topic, extension, event, payload, private)
    VALUES ('account:00000000-0000-0000-0000-000000002500:presence', 'presence', 'sync',
            '{}'::jsonb, true)$$,
  'member puede escribir presence en el topic de su propia cuenta');

SELECT is(
  (SELECT count(*)::int FROM realtime.messages
   WHERE topic = 'account:00000000-0000-0000-0000-000000002500:presence'),
  1, 'member puede leer (SELECT) el mensaje que acaba de escribir en su topic');
RESET role;

-- Outsider (no member) no puede escribir en el topic de esa cuenta
SELECT set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000002402', 'role', 'authenticated')::text, true);
SET LOCAL role authenticated;
SELECT throws_like(
  $$INSERT INTO realtime.messages (topic, extension, event, payload, private)
    VALUES ('account:00000000-0000-0000-0000-000000002500:presence', 'broadcast', 'presence',
            '{}'::jsonb, true)$$,
  '%row-level security%',
  'outsider (no member) no puede escribir en el topic de presence de una cuenta ajena');
RESET role;

SELECT * FROM finish();
ROLLBACK;
