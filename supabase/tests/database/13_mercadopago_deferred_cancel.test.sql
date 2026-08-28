-- pgTAP: Mercado Pago provisional subscription and retired local cancellation
-- Run with: pnpm supa:test

BEGIN;
SELECT plan(11);

INSERT INTO auth.users (id, email, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_confirmed_at, recovery_token, aud, role)
VALUES
  ('00000000-0000-0000-0000-000000000851', 'mp-provisional@example.com',
   '{"given_name":"MP","family_name":"Provisional"}'::jsonb, now(), now(), '', now(), '',
   'authenticated', 'authenticated');

INSERT INTO public.accounts (id, type, name, slug, created_by)
VALUES ('00000000-0000-0000-0000-000000000940', 'team', 'Team MP Provisional',
        'team-mp-provisional', '00000000-0000-0000-0000-000000000851');

SELECT id AS pro_monthly_plan_id
FROM billing.plans
WHERE slug = 'pro' AND "interval" = 'month'
\gset

SELECT ok(
  to_regprocedure('public.create_billing_provisional_subscription(uuid,uuid,text)') IS NOT NULL,
  'the Mercado Pago provisional-subscription RPC exists'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_proc AS procedure
    WHERE procedure.oid = to_regprocedure(
      'public.create_billing_provisional_subscription(uuid,uuid,text)'
    )
      AND has_function_privilege('service_role', procedure.oid, 'EXECUTE')
      AND NOT has_function_privilege('authenticated', procedure.oid, 'EXECUTE')
      AND NOT has_function_privilege('anon', procedure.oid, 'EXECUTE')
  ),
  'the provisional-subscription RPC is executable only by service_role'
);

SET LOCAL role service_role;

SELECT is(
  public.create_billing_provisional_subscription(
    '00000000-0000-0000-0000-000000000940',
    :'pro_monthly_plan_id'::uuid,
    'pa_provisional_940'
  ),
  'applied',
  'the service-role RPC persists a Mercado Pago provisional subscription'
);

SELECT is(
  public.create_billing_provisional_subscription(
    '00000000-0000-0000-0000-000000000940',
    :'pro_monthly_plan_id'::uuid,
    'pa_provisional_940'
  ),
  'applied',
  'the provisional-subscription RPC upserts the same Mercado Pago preapproval'
);

RESET role;

SELECT ok(
  EXISTS (
    SELECT 1
    FROM billing.customers AS customer
    WHERE customer.account_id = '00000000-0000-0000-0000-000000000940'
      AND customer.provider = 'mercadopago'
  ),
  'the provisional RPC creates the Mercado Pago customer identity'
);

SELECT is(
  (SELECT count(*)::integer
   FROM billing.subscriptions AS subscription
   WHERE subscription.provider = 'mercadopago'
     AND subscription.external_subscription_id = 'pa_provisional_940'),
  1,
  'the provisional preapproval has exactly one local subscription row'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM billing.subscriptions AS subscription
    WHERE subscription.provider = 'mercadopago'
      AND subscription.external_subscription_id = 'pa_provisional_940'
      AND subscription.plan_id = :'pro_monthly_plan_id'::uuid
      AND subscription.status = 'incomplete'
      AND subscription.current_period_start IS NULL
      AND subscription.current_period_end IS NULL
      AND subscription.canceled_at IS NULL
      AND subscription.cancel_at_period_end = false
  ),
  'the provisional row retains the selected plan without paid-period or cancellation state'
);

SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM billing.events AS event
    WHERE event.provider = 'mercadopago'
      AND event.external_event_id = 'pa_provisional_940'
  ),
  'the provisional write does not fabricate a provider event'
);

SELECT ok(
  to_regprocedure('private.cancel_overdue_mercadopago_subscriptions()') IS NULL,
  'the local-only overdue Mercado Pago cancellation function is retired'
);

SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM cron.job
    WHERE jobname = 'cancel-overdue-mercadopago-subscriptions'
  ),
  'the retired local-only Mercado Pago cancellation schedule is absent'
);

INSERT INTO billing.subscriptions (
  customer_id, plan_id, status, current_period_end, cancel_at_period_end,
  provider, external_subscription_id
)
SELECT customer.id, :'pro_monthly_plan_id'::uuid, 'active', now() - interval '1 day', true,
       'mercadopago', 'pa_expired_940'
FROM billing.customers AS customer
WHERE customer.account_id = '00000000-0000-0000-0000-000000000940'
  AND customer.provider = 'mercadopago';

SELECT is(
  (SELECT status::text
   FROM billing.subscriptions
   WHERE provider = 'mercadopago'
     AND external_subscription_id = 'pa_expired_940'),
  'active',
  'an expired Mercado Pago row remains active without the retired database-only cancellation route'
);

SELECT * FROM finish();
ROLLBACK;
