-- pgTAP: billing read RPCs (F2-2A-core) — entitlements con fallback Free,
-- overview/invoices gated a owner/admin, billing.* invisible a authenticated.
-- Run with: pnpm supa:test

BEGIN;
SELECT plan(37);

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

-- ── reducer v2: crea sub activa, idempotencia, entitlements ────────────────
RESET role;
SELECT set_config(
  'app.test_pro_plan_id',
  (SELECT id::text FROM billing.plans WHERE slug = 'pro' AND "interval" = 'month'),
  true
);
SET LOCAL role service_role;

SELECT is(
  public.apply_subscription_created(
    'mock', 'mock_evt_1', '00000000-0000-0000-0000-000000000930',
    current_setting('app.test_pro_plan_id')::uuid,
    'mock_sub_test', 'active', now(), now() + interval '30 days', false,
    NULL, '{}'::jsonb),
  'applied', 'primer evento de suscripción v2 se aplica');

SELECT is(
  public.apply_subscription_created(
    'mock', 'mock_evt_1', '00000000-0000-0000-0000-000000000930',
    current_setting('app.test_pro_plan_id')::uuid,
    'mock_sub_test', 'active', now(), now() + interval '30 days', false,
    NULL, '{}'::jsonb),
  'duplicate', 'mismo evento de proveedor es idempotente (no-op)');

RESET role;

-- service_role no tiene SELECT directo sobre billing.subscriptions (deny-all
-- salvo RPCs); esta lectura corre como el superusuario ambiente del test runner.
SELECT is(
  (SELECT provider FROM billing.subscriptions WHERE external_subscription_id = 'mock_sub_test'),
  'mock', 'el reducer v2 persiste explícitamente el provider');

SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM pg_proc AS procedure
    INNER JOIN pg_namespace AS namespace ON namespace.oid = procedure.pronamespace
    WHERE namespace.nspname = 'public'
      AND procedure.proname = 'apply_subscription_event'
  ),
  'el RPC heredado amplio apply_subscription_event fue retirado'
);

SELECT set_config('request.jwt.claims',
  json_build_object('sub','00000000-0000-0000-0000-000000000831','role','authenticated')::text, true);

SELECT is(
  (SELECT plan_slug FROM public.get_account_entitlements('00000000-0000-0000-0000-000000000930')),
  'pro', 'tras suscribir, entitlements refleja el plan pro');

SELECT is(
  (SELECT external_subscription_id FROM public.get_billing_overview('00000000-0000-0000-0000-000000000930')),
  'mock_sub_test', 'get_billing_overview expone el external_subscription_id para poder cancelar');

SELECT is(
  public.get_account_id_by_external_subscription('mock_sub_test'),
  '00000000-0000-0000-0000-000000000930'::uuid,
  'owner puede resolver la suscripción de su propia cuenta para cancelar'
);

SELECT set_config('request.jwt.claims',
  json_build_object('sub','00000000-0000-0000-0000-000000000832','role','authenticated')::text, true);

SELECT throws_ok(
  $$SELECT public.get_account_id_by_external_subscription('mock_sub_test')$$,
  'not_authorized',
  'member no puede resolver el ID externo de suscripción de la cuenta'
);

-- ── Billing v2: identidad e idempotencia delimitadas por proveedor ──────────
INSERT INTO public.accounts (id, type, name, slug, created_by)
VALUES
  ('00000000-0000-0000-0000-000000000931', 'team', 'Billing Stripe', 'billing-stripe',
   '00000000-0000-0000-0000-000000000831'),
  ('00000000-0000-0000-0000-000000000932', 'team', 'Billing Shared', 'billing-shared',
   '00000000-0000-0000-0000-000000000831'),
  ('00000000-0000-0000-0000-000000000933', 'team', 'Billing Duplicate', 'billing-duplicate',
   '00000000-0000-0000-0000-000000000831'),
  ('00000000-0000-0000-0000-000000000934', 'team', 'Billing Subscription A', 'billing-sub-a',
   '00000000-0000-0000-0000-000000000831'),
  ('00000000-0000-0000-0000-000000000935', 'team', 'Billing Subscription B', 'billing-sub-b',
   '00000000-0000-0000-0000-000000000831');

INSERT INTO billing.customers (account_id, provider, external_id)
VALUES ('00000000-0000-0000-0000-000000000931', 'stripe', 'cus_stripe_931');

SELECT lives_ok(
  $$INSERT INTO billing.customers (account_id, provider, external_id)
    VALUES ('00000000-0000-0000-0000-000000000931', 'mercadopago', 'cus_mp_931')$$,
  'one Iroko account may have a customer identity in multiple providers'
);

SELECT throws_like(
  $$INSERT INTO billing.customers (account_id, provider, external_id)
    VALUES ('00000000-0000-0000-0000-000000000931', 'stripe', 'cus_stripe_931_bis')$$,
  '%duplicate key%', 'same account/provider pair is rejected'
);

INSERT INTO billing.customers (account_id, provider, external_id)
VALUES ('00000000-0000-0000-0000-000000000932', 'stripe', 'cus_shared');

SELECT throws_like(
  $$INSERT INTO billing.customers (account_id, provider, external_id)
    VALUES ('00000000-0000-0000-0000-000000000933', 'stripe', 'cus_shared')$$,
  '%duplicate key%', 'same provider/external customer id is rejected'
);

SELECT lives_ok(
  $$INSERT INTO billing.events (event_type, provider, external_event_id, payload)
    VALUES ('invoice_paid', 'stripe', 'evt_shared', '{}'::jsonb)$$,
  'first provider event is accepted'
);

SELECT lives_ok(
  $$INSERT INTO billing.events (event_type, provider, external_event_id, payload)
    VALUES ('invoice_paid', 'mercadopago', 'evt_shared', '{}'::jsonb)$$,
  'same external event id is independent across providers'
);

SELECT throws_like(
  $$INSERT INTO billing.events (event_type, provider, external_event_id, payload)
    VALUES ('invoice_paid', 'stripe', 'evt_shared', '{}'::jsonb)$$,
  '%duplicate key%', 'same provider/external event id is rejected'
);

INSERT INTO billing.customers (account_id, provider, external_id)
VALUES
  ('00000000-0000-0000-0000-000000000934', 'stripe', 'cus_sub_934'),
  ('00000000-0000-0000-0000-000000000935', 'mercadopago', 'cus_sub_935');

INSERT INTO billing.subscriptions (customer_id, plan_id, provider, external_subscription_id)
VALUES (
  (SELECT id FROM billing.customers WHERE external_id = 'cus_sub_934'),
  (SELECT id FROM billing.plans WHERE slug = 'free' AND "interval" = 'month'),
  'stripe', 'sub_shared'
);

SELECT lives_ok(
  $$INSERT INTO billing.subscriptions (customer_id, plan_id, provider, external_subscription_id)
    VALUES (
      (SELECT id FROM billing.customers WHERE external_id = 'cus_sub_935'),
      (SELECT id FROM billing.plans WHERE slug = 'free' AND "interval" = 'month'),
      'mercadopago', 'sub_shared'
    )$$,
  'same external subscription id is independent across providers'
);

SELECT throws_like(
  $$INSERT INTO billing.subscriptions (customer_id, plan_id, provider, external_subscription_id)
    VALUES (
      (SELECT id FROM billing.customers WHERE external_id = 'cus_sub_934'),
      (SELECT id FROM billing.plans WHERE slug = 'free' AND "interval" = 'month'),
      'stripe', 'sub_shared'
    )$$,
  '%duplicate key%', 'same provider/external subscription id is rejected'
);

SELECT lives_ok(
  $$INSERT INTO billing.provider_prices (plan_id, provider, external_price_id, currency, amount)
    VALUES (
      (SELECT id FROM billing.plans WHERE slug = 'free' AND "interval" = 'month'),
      'stripe', 'price_shared', 'USD', 0
    )$$,
  'provider price can be created for reverse lookup'
);

SELECT throws_like(
  $$INSERT INTO billing.provider_prices (plan_id, provider, external_price_id, currency, amount)
    VALUES (
      (SELECT id FROM billing.plans WHERE slug = 'pro' AND "interval" = 'month'),
      'stripe', 'price_shared', 'USD',
      (SELECT price FROM billing.plans WHERE slug = 'pro' AND "interval" = 'month')
    )$$,
  '%duplicate key%', 'provider price reverse lookup is unique'
);

SELECT is(
  (SELECT external_price_id FROM billing.provider_prices
   WHERE provider = 'mock'
     AND plan_id = (SELECT id FROM billing.plans WHERE slug = 'pro' AND "interval" = 'month')),
  'mock:pro:month', 'mock provider prices use the same reverse catalog as real providers'
);

-- ── Billing v2 reducer RPCs: responsabilidades de mutación estrechas ───────
SELECT id AS pro_monthly_plan_id
FROM billing.plans
WHERE slug = 'pro' AND "interval" = 'month'
\gset

SET LOCAL role service_role;

SELECT is(
  public.apply_subscription_created(
    'stripe',
    'evt_subscription_created_v2',
    '00000000-0000-0000-0000-000000000933',
    :'pro_monthly_plan_id'::uuid,
    'sub_v2_933',
    'active',
    '2026-08-01T00:00:00.000Z'::timestamptz,
    '2026-09-01T00:00:00.000Z'::timestamptz,
    false,
    'cus_v2_933',
    '{}'::jsonb
  ),
  'applied', 'subscription-created reducer RPC applies a resolved plan'
);

SELECT is(
  public.apply_subscription_created(
    'stripe',
    'evt_subscription_created_v2',
    '00000000-0000-0000-0000-000000000933',
    :'pro_monthly_plan_id'::uuid,
    'sub_v2_933',
    'active',
    '2026-08-01T00:00:00.000Z'::timestamptz,
    '2026-09-01T00:00:00.000Z'::timestamptz,
    false,
    'cus_v2_933',
    '{}'::jsonb
  ),
  'duplicate', 'subscription-created reducer RPC is idempotent by provider event id'
);

RESET role;

SELECT is(
  (SELECT provider FROM billing.subscriptions WHERE external_subscription_id = 'sub_v2_933'),
  'stripe', 'subscription-created reducer RPC persists the provider namespace'
);

SET LOCAL role service_role;

SELECT is(
  public.apply_invoice_paid(
    'stripe',
    'evt_invoice_paid_v2',
    '00000000-0000-0000-0000-000000000933',
    'sub_v2_933',
    'in_v2_933',
    'pi_v2_933',
    2500,
    'USD',
    '2030-08-01T00:00:00.000Z'::timestamptz,
    '2030-09-01T00:00:00.000Z'::timestamptz,
    '2026-08-02T00:00:00.000Z'::timestamptz,
    NULL,
    NULL,
    '{}'::jsonb
  ),
  'applied', 'invoice-paid reducer RPC persists invoice and payment data'
);

RESET role;

SELECT is(
  (SELECT status FROM billing.subscriptions WHERE external_subscription_id = 'sub_v2_933'),
  'active'::billing.subscription_status,
  'invoice-paid reducer RPC does not mutate subscription status'
);

SELECT is(
  (SELECT current_period_end FROM billing.subscriptions WHERE external_subscription_id = 'sub_v2_933'),
  '2026-09-01T00:00:00.000Z'::timestamptz,
  'invoice-paid reducer RPC does not mutate subscription period'
);

-- ── Reducers restantes: cada uno tiene una superficie de mutación acotada ──
SET LOCAL role service_role;

SELECT is(
  public.apply_subscription_updated(
    'mock', 'evt_subscription_updated_v2',
    '00000000-0000-0000-0000-000000000930', 'mock_sub_test', NULL::uuid,
    'past_due', NULL, NULL, false, NULL, '{}'::jsonb
  ),
  'applied', 'subscription-updated reducer applies without a replacement plan'
);

RESET role;
SELECT is(
  (SELECT plan_id FROM billing.subscriptions WHERE external_subscription_id = 'mock_sub_test'),
  (SELECT id FROM billing.plans WHERE slug = 'pro' AND "interval" = 'month'),
  'subscription-updated reducer keeps the existing plan when no plan id is supplied'
);

SET LOCAL role service_role;
SELECT is(
  public.apply_subscription_canceled(
    'mock', 'evt_subscription_canceled_v2',
    '00000000-0000-0000-0000-000000000930', 'mock_sub_test',
    '2026-08-20T00:00:00.000Z'::timestamptz, NULL, '{}'::jsonb
  ),
  'applied', 'subscription-canceled reducer changes only cancellation state'
);

SELECT is(
  public.apply_invoice_payment_failed(
    'mock', 'evt_payment_failed_v2',
    '00000000-0000-0000-0000-000000000930', 'mock_sub_test', 'in_failed_v2',
    'pi_failed_v2', 'failed', 2500, 'USD', '2026-08-20T00:00:00.000Z'::timestamptz,
    'card_declined', 'declined', '{}'::jsonb
  ),
  'applied', 'payment-failed reducer records a payment attempt'
);

SELECT is(
  public.apply_payment_recovered(
    'mock', 'evt_payment_recovered_v2',
    '00000000-0000-0000-0000-000000000930', 'mock_sub_test', 'in_failed_v2',
    'pi_failed_v2', 'recovered', 2500, 'USD', '2026-08-21T00:00:00.000Z'::timestamptz,
    '{}'::jsonb
  ),
  'applied', 'payment-recovered reducer upserts the same payment attempt'
);

RESET role;
SELECT is(
  (SELECT status FROM billing.payment_attempts WHERE provider = 'mock' AND external_payment_id = 'pi_failed_v2'),
  'recovered', 'payment recovery does not duplicate the payment attempt'
);

SELECT * FROM finish();
ROLLBACK;
