-- pgTAP: private.cancel_overdue_mercadopago_subscriptions (F2-2A-providers)
-- Run with: pnpm supa:test

BEGIN;
SELECT plan(3);

INSERT INTO auth.users (id, email, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_confirmed_at, recovery_token, aud, role)
VALUES
  ('00000000-0000-0000-0000-000000000851', 'mp-cron@example.com',
   '{"given_name":"MP","family_name":"Cron"}'::jsonb, now(), now(), '', now(), '',
   'authenticated', 'authenticated');

INSERT INTO public.accounts (id, type, name, slug, created_by)
VALUES ('00000000-0000-0000-0000-000000000940', 'team', 'Team MP Cron', 'team-mp-cron',
        '00000000-0000-0000-0000-000000000851');

-- service_role no tiene INSERT directo sobre billing.customers/subscriptions
-- (deny-all salvo RPCs); este seed corre como el superusuario ambiente del
-- test runner.
INSERT INTO billing.customers (account_id, provider)
VALUES ('00000000-0000-0000-0000-000000000940', 'mercadopago');

-- Suscripción vencida marcada para cancelar: debe cancelarse.
INSERT INTO billing.subscriptions (
  customer_id, plan_id, status, current_period_end, cancel_at_period_end,
  provider, external_subscription_id)
SELECT c.id, p.id, 'active', now() - interval '1 day', true, 'mercadopago', 'pa_overdue'
FROM billing.customers c, billing.plans p
WHERE c.account_id = '00000000-0000-0000-0000-000000000940'
  AND p.slug = 'pro' AND p."interval" = 'month';

-- Suscripción vigente (no vencida): NO debe cancelarse.
INSERT INTO billing.subscriptions (
  customer_id, plan_id, status, current_period_end, cancel_at_period_end,
  provider, external_subscription_id)
SELECT c.id, p.id, 'active', now() + interval '10 days', true, 'mercadopago', 'pa_active'
FROM billing.customers c, billing.plans p
WHERE c.account_id = '00000000-0000-0000-0000-000000000940'
  AND p.slug = 'pro' AND p."interval" = 'month';

-- Suscripción vencida de Stripe (otro proveedor): NO debe tocarse por este job.
INSERT INTO billing.subscriptions (
  customer_id, plan_id, status, current_period_end, cancel_at_period_end,
  provider, external_subscription_id)
SELECT c.id, p.id, 'active', now() - interval '1 day', true, 'stripe', 'sub_stripe_overdue'
FROM billing.customers c, billing.plans p
WHERE c.account_id = '00000000-0000-0000-0000-000000000940'
  AND p.slug = 'pro' AND p."interval" = 'month';

SELECT private.cancel_overdue_mercadopago_subscriptions();

SELECT is(
  (SELECT status::text FROM billing.subscriptions WHERE external_subscription_id = 'pa_overdue'),
  'canceled', 'la suscripción MercadoPago vencida y marcada se cancela');

SELECT is(
  (SELECT status::text FROM billing.subscriptions WHERE external_subscription_id = 'pa_active'),
  'active', 'la suscripción MercadoPago vigente no se toca');

SELECT is(
  (SELECT status::text FROM billing.subscriptions WHERE external_subscription_id = 'sub_stripe_overdue'),
  'active', 'una suscripción vencida de otro proveedor no se toca');

SELECT * FROM finish();
ROLLBACK;
