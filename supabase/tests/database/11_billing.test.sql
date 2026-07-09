-- pgTAP: billing read RPCs (F2-2A-core) — entitlements con fallback Free,
-- overview/invoices gated a owner/admin, billing.* invisible a authenticated.
-- Run with: pnpm supa:test

BEGIN;
SELECT plan(9);

INSERT INTO auth.users (id, email, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_confirmed_at, recovery_token, aud, role)
VALUES
  ('00000000-0000-0000-0000-000000000831', 'billing-owner@example.com',
   '{"given_name":"Owner","family_name":"A"}'::jsonb, now(), now(), '', now(), '',
   'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000000832', 'billing-member@example.com',
   '{"given_name":"Member","family_name":"B"}'::jsonb, now(), now(), '', now(), '',
   'authenticated', 'authenticated');

INSERT INTO public.accounts (id, type, name, slug, created_by)
VALUES ('00000000-0000-0000-0000-000000000930', 'team', 'Team Billing', 'team-billing',
        '00000000-0000-0000-0000-000000000831');

INSERT INTO public.accounts_memberships (account_id, user_id, role)
VALUES
  ('00000000-0000-0000-0000-000000000930', '00000000-0000-0000-0000-000000000831', 'owner'),
  ('00000000-0000-0000-0000-000000000930', '00000000-0000-0000-0000-000000000832', 'member');

-- ── entitlements: sin suscripción → plan Free (miembro raso puede leerlo) ────
SELECT set_config('request.jwt.claims',
  json_build_object('sub','00000000-0000-0000-0000-000000000832','role','authenticated')::text, true);

SELECT is(
  (SELECT plan_slug FROM public.get_account_entitlements('00000000-0000-0000-0000-000000000930')),
  'free', 'sin suscripción, entitlements cae al plan free');

SELECT is(
  (SELECT (features->>'webhooks_enabled')::boolean
   FROM public.get_account_entitlements('00000000-0000-0000-0000-000000000930')),
  false, 'el plan free no habilita webhooks');

-- ── overview/invoices: member es rechazado ──────────────────────────────────
SELECT throws_ok(
  $$SELECT * FROM public.get_billing_overview('00000000-0000-0000-0000-000000000930')$$,
  'not_authorized', 'member no puede ver el overview de billing');

-- ── billing.* invisible directamente ────────────────────────────────────────
SET LOCAL role authenticated;
SELECT throws_like(
  $$SELECT * FROM billing.plans$$, '%permission denied%',
  'authenticated no lee billing.plans directamente');
RESET role;

-- ── owner: overview vacío sin sub, invoices vacío ───────────────────────────
SELECT set_config('request.jwt.claims',
  json_build_object('sub','00000000-0000-0000-0000-000000000831','role','authenticated')::text, true);

SELECT is(
  (SELECT count(*)::int FROM public.get_billing_overview('00000000-0000-0000-0000-000000000930')),
  0, 'owner sin suscripción ve overview vacío');

SELECT is(
  (SELECT count(*)::int FROM public.list_account_invoices('00000000-0000-0000-0000-000000000930')),
  0, 'owner sin facturas ve historial vacío');

-- ── apply_subscription_event: crea sub activa, idempotencia, entitlements ────
RESET role;
SET LOCAL role service_role;

SELECT is(
  public.apply_subscription_event(
    '00000000-0000-0000-0000-000000000930', 'pro', 'month', 'active',
    'mock_sub_test', 'mock_evt_1', 'subscription_created',
    now(), now() + interval '30 days', false, NULL, NULL),
  'applied', 'primer evento se aplica');

SELECT is(
  public.apply_subscription_event(
    '00000000-0000-0000-0000-000000000930', 'pro', 'month', 'active',
    'mock_sub_test', 'mock_evt_1', 'subscription_created',
    now(), now() + interval '30 days', false, NULL, NULL),
  'duplicate', 'mismo external_event_id es idempotente (no-op)');

RESET role;
SELECT set_config('request.jwt.claims',
  json_build_object('sub','00000000-0000-0000-0000-000000000831','role','authenticated')::text, true);

SELECT is(
  (SELECT plan_slug FROM public.get_account_entitlements('00000000-0000-0000-0000-000000000930')),
  'pro', 'tras suscribir, entitlements refleja el plan pro');

SELECT * FROM finish();
ROLLBACK;
