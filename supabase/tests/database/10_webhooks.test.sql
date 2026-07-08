-- pgTAP test: webhooks salientes (F2-2D) — RPCs gated a owner/admin, secret
-- solo en create, emit_webhook_event genera una delivery por endpoint
-- suscrito+enabled y el trigger de envío incrementa attempts.
-- Run with: pnpm supa:test

BEGIN;
SELECT plan(8);

-- ── Seed: owner (0821) y member (0822) en el team 0920 ──────────────────────
INSERT INTO auth.users (id, email, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_confirmed_at, recovery_token, aud, role)
VALUES
  ('00000000-0000-0000-0000-000000000821', 'webhooks-owner@example.com',
   '{"given_name":"Owner","family_name":"A"}'::jsonb, now(), now(), '', now(), '',
   'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000000822', 'webhooks-member@example.com',
   '{"given_name":"Member","family_name":"B"}'::jsonb, now(), now(), '', now(), '',
   'authenticated', 'authenticated');

INSERT INTO public.accounts (id, type, name, slug, created_by)
VALUES ('00000000-0000-0000-0000-000000000920', 'team', 'Team Webhooks', 'team-webhooks',
        '00000000-0000-0000-0000-000000000821');

INSERT INTO public.accounts_memberships (account_id, user_id, role)
VALUES
  ('00000000-0000-0000-0000-000000000920', '00000000-0000-0000-0000-000000000821', 'owner'),
  ('00000000-0000-0000-0000-000000000920', '00000000-0000-0000-0000-000000000822', 'member');

-- ── 1. Member no puede crear endpoints ──────────────────────────────────────
SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000000822', 'role', 'authenticated')::text,
  true
);
SELECT throws_ok(
  $$SELECT * FROM public.create_webhook_endpoint('00000000-0000-0000-0000-000000000920',
      'https://example.com/hook', ARRAY['member.joined'])$$,
  'not_authorized',
  'member no puede crear endpoints'
);

-- ── 2-3. Validaciones de URL y catálogo (como owner) ────────────────────────
SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000000821', 'role', 'authenticated')::text,
  true
);

SELECT throws_ok(
  $$SELECT * FROM public.create_webhook_endpoint('00000000-0000-0000-0000-000000000920',
      'http://insecure.com/hook', ARRAY['member.joined'])$$,
  'invalid_url',
  'URL http:// es rechazada'
);

SELECT throws_ok(
  $$SELECT * FROM public.create_webhook_endpoint('00000000-0000-0000-0000-000000000920',
      'https://example.com/hook', ARRAY['no.such.event'])$$,
  'invalid_events',
  'evento fuera del catálogo es rechazado'
);

-- ── 4. Crear devuelve el secret una única vez ───────────────────────────────
CREATE TEMP TABLE ep AS
SELECT * FROM public.create_webhook_endpoint('00000000-0000-0000-0000-000000000920',
  'https://example.com/hook', ARRAY['member.joined', 'member.removed'], 'test endpoint');

SELECT ok(
  (SELECT secret LIKE 'whsec\_%' ESCAPE '\' FROM ep),
  'el secret devuelto tiene prefijo whsec_'
);

-- ── 5. La tabla es invisible para authenticated ─────────────────────────────
SET LOCAL role authenticated;
SELECT throws_like(
  $$SELECT * FROM public.webhook_endpoints$$,
  '%permission denied%',
  'authenticated no puede leer webhook_endpoints directamente'
);
RESET role;

-- ── 6-7. Emisión: solo el evento suscrito genera delivery, con envío ────────
SELECT private.emit_webhook_event('00000000-0000-0000-0000-000000000920',
  'member.joined', '{"user_id":"u1"}'::jsonb);
SELECT private.emit_webhook_event('00000000-0000-0000-0000-000000000920',
  'account.updated', '{}'::jsonb);  -- NO suscrito

SELECT is(
  (SELECT count(*)::int FROM public.webhook_deliveries
   WHERE endpoint_id = (SELECT ep.id FROM ep)),
  1,
  'solo el evento suscrito generó una delivery'
);

SELECT is(
  (SELECT d.attempts FROM public.webhook_deliveries d
   WHERE d.endpoint_id = (SELECT ep.id FROM ep)),
  1,
  'el trigger de envío incrementó attempts a 1 (http_post encolado)'
);

-- ── 8. Endpoint deshabilitado no recibe nuevas deliveries ───────────────────
SELECT public.update_webhook_endpoint((SELECT ep.id FROM ep),
  'https://example.com/hook', ARRAY['member.joined'], false, 'test endpoint');

SELECT private.emit_webhook_event('00000000-0000-0000-0000-000000000920',
  'member.joined', '{}'::jsonb);

SELECT is(
  (SELECT count(*)::int FROM public.webhook_deliveries
   WHERE endpoint_id = (SELECT ep.id FROM ep)),
  1,
  'endpoint disabled no genera nuevas deliveries'
);

SELECT * FROM finish();
ROLLBACK;
