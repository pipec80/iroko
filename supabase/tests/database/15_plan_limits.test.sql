-- pgTAP: helpers de entitlements + límites por plan en RPCs (F3-3H-1)
-- Run with: pnpm supa:test

BEGIN;
SELECT plan(14);

-- Seed: 2 usuarios → handle_new_profile crea cuenta personal+owner por cada uno.
-- Cuenta A queda en free (sin suscripción); cuenta B recibe sub pro vía RPC.
INSERT INTO auth.users (id, email, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_confirmed_at, recovery_token, aud, role)
VALUES
  ('00000000-0000-0000-0000-000000001001', 'limits-free@example.com',
   '{"given_name":"Free","family_name":"User"}'::jsonb, now(), now(), '', now(), '',
   'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000001002', 'limits-pro@example.com',
   '{"given_name":"Pro","family_name":"User"}'::jsonb, now(), now(), '', now(), '',
   'authenticated', 'authenticated');

INSERT INTO public.accounts (id, type, name, slug, created_by)
VALUES
  ('00000000-0000-0000-0000-000000001100', 'team', 'Limits Free', 'limits-free',
   '00000000-0000-0000-0000-000000001001'),
  ('00000000-0000-0000-0000-000000001101', 'team', 'Limits Pro', 'limits-pro',
   '00000000-0000-0000-0000-000000001002');

INSERT INTO public.accounts_memberships (account_id, user_id, role)
VALUES
  ('00000000-0000-0000-0000-000000001100', '00000000-0000-0000-0000-000000001001', 'owner'),
  ('00000000-0000-0000-0000-000000001101', '00000000-0000-0000-0000-000000001002', 'owner');

-- Sub pro para la cuenta B (patrón de 11_billing.test.sql)
SET LOCAL role service_role;
SELECT public.apply_subscription_event(
  '00000000-0000-0000-0000-000000001101', 'pro', 'month', 'active',
  'sub_limits_pro', 'evt_limits_1', 'subscription_created',
  now(), now() + interval '30 days', false, NULL, NULL);
RESET role;

-- ── helpers ──────────────────────────────────────────────────────────────
SELECT is(
  private.get_account_limit('00000000-0000-0000-0000-000000001100', 'webhook_endpoints_max'),
  0, 'cuenta free: webhook_endpoints_max = 0');

SELECT is(
  private.get_account_limit('00000000-0000-0000-0000-000000001101', 'api_keys_max'),
  20, 'cuenta pro: api_keys_max = 20');

SELECT is(
  private.account_has_feature('00000000-0000-0000-0000-000000001100', 'webhooks_enabled'),
  false, 'cuenta free: webhooks_enabled = false');

SELECT is(
  private.account_has_feature('00000000-0000-0000-0000-000000001101', 'webhooks_enabled'),
  true, 'cuenta pro: webhooks_enabled = true');

SELECT is(
  (SELECT slug FROM private.get_account_plan_row('00000000-0000-0000-0000-000000001100')),
  'free', 'cuenta free: get_account_plan_row.slug = free');

SELECT is(
  (SELECT slug FROM private.get_account_plan_row('00000000-0000-0000-0000-000000001101')),
  'pro', 'cuenta pro: get_account_plan_row.slug = pro');

-- ── gate de webhooks ─────────────────────────────────────────────────────
-- free (webhooks_enabled=false) no puede crear
SELECT set_config('request.jwt.claims',
  json_build_object('sub','00000000-0000-0000-0000-000000001001','role','authenticated')::text, true);
SET LOCAL role authenticated;
SELECT throws_like(
  $$SELECT * FROM public.create_webhook_endpoint(
      '00000000-0000-0000-0000-000000001100', 'https://example.com/hook',
      ARRAY['account.updated'])$$,
  '%feature_not_in_plan%', 'cuenta free no puede crear webhooks');
RESET role;

-- pro sí puede crear
SELECT set_config('request.jwt.claims',
  json_build_object('sub','00000000-0000-0000-0000-000000001002','role','authenticated')::text, true);
SET LOCAL role authenticated;
SELECT lives_ok(
  $$SELECT * FROM public.create_webhook_endpoint(
      '00000000-0000-0000-0000-000000001101', 'https://example.com/hook',
      ARRAY['account.updated'])$$,
  'cuenta pro crea webhook dentro del límite');
RESET role;

-- gate de entrega: delivery de cuenta free se marca exhausted sin llamar pg_net
-- (endpoint sembrado directo como superuser para simular datos pre-gate)
INSERT INTO public.webhook_endpoints (id, account_id, url, events, secret)
VALUES ('00000000-0000-0000-0000-000000001200',
        '00000000-0000-0000-0000-000000001100',
        'https://example.com/legacy-hook', ARRAY['account.updated'], 'whsec_test_legacy');
INSERT INTO public.webhook_deliveries (id, endpoint_id, account_id, event_type, payload, status)
VALUES ('00000000-0000-0000-0000-000000001201',
        '00000000-0000-0000-0000-000000001200',
        '00000000-0000-0000-0000-000000001100',
        'account.updated', '{}'::jsonb, 'pending');

SELECT private.send_webhook_delivery('00000000-0000-0000-0000-000000001201');

SELECT is(
  (SELECT d.status FROM public.webhook_deliveries d
   WHERE d.id = '00000000-0000-0000-0000-000000001201'),
  'exhausted'::public.webhook_delivery_status,
  'delivery de cuenta sin feature queda exhausted');

SELECT is(
  (SELECT d.last_error FROM public.webhook_deliveries d
   WHERE d.id = '00000000-0000-0000-0000-000000001201'),
  'feature_not_in_plan', 'last_error explica el motivo');

-- ── límite de API keys por plan ──────────────────────────────────────────
SELECT set_config('request.jwt.claims',
  json_build_object('sub','00000000-0000-0000-0000-000000001001','role','authenticated')::text, true);
SET LOCAL role authenticated;
-- free: api_keys_max = 2 → las dos primeras pasan (un statement por lives_ok),
-- la tercera revienta
SELECT lives_ok(
  $$SELECT * FROM public.create_api_key('00000000-0000-0000-0000-000000001100', 'k1', NULL)$$,
  'cuenta free crea la primera api key');
SELECT lives_ok(
  $$SELECT * FROM public.create_api_key('00000000-0000-0000-0000-000000001100', 'k2', NULL)$$,
  'cuenta free crea la segunda api key');
SELECT throws_like(
  $$SELECT * FROM public.create_api_key('00000000-0000-0000-0000-000000001100', 'k3', NULL)$$,
  '%key_limit_reached%', 'la tercera key de una cuenta free es rechazada');
RESET role;

-- ── seats por plan ───────────────────────────────────────────────────────
-- free: seats_max = 2; la cuenta 1100 tiene 1 member → invitar 2 excede
SELECT set_config('request.jwt.claims',
  json_build_object('sub','00000000-0000-0000-0000-000000001001','role','authenticated')::text, true);
SET LOCAL role authenticated;
SELECT throws_like(
  $$SELECT * FROM public.invite_members('00000000-0000-0000-0000-000000001100',
      ARRAY['nuevo1@example.com','nuevo2@example.com'], 'member')$$,
  '%seat_limit_reached%', 'invitar por encima de seats_max es rechazado');
RESET role;

SELECT * FROM finish();
ROLLBACK;
