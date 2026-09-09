-- pgTAP: checkout return confirmation is authorized and tenant scoped.
-- Run with: pnpm supa:test

BEGIN;
SELECT plan(9);

SELECT ok(
  to_regprocedure('public.get_billing_checkout_confirmation(uuid,text)') IS NOT NULL,
  'checkout confirmation RPC exists'
);

SELECT ok(
  has_function_privilege(
    'authenticated',
    'public.get_billing_checkout_confirmation(uuid,text)',
    'EXECUTE'
  )
  AND NOT has_function_privilege(
    'anon',
    'public.get_billing_checkout_confirmation(uuid,text)',
    'EXECUTE'
  ),
  'only authenticated callers receive the public grant'
);

INSERT INTO auth.users (
  id, email, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_confirmed_at, recovery_token, aud, role
)
VALUES
  ('00000000-0000-0000-0000-000000003501', 'confirmation-owner@example.com',
   '{}'::jsonb, now(), now(), '', now(), '', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000003502', 'confirmation-admin@example.com',
   '{}'::jsonb, now(), now(), '', now(), '', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000003503', 'confirmation-member@example.com',
   '{}'::jsonb, now(), now(), '', now(), '', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000003504', 'confirmation-other@example.com',
   '{}'::jsonb, now(), now(), '', now(), '', 'authenticated', 'authenticated');

INSERT INTO public.accounts (id, type, name, slug, created_by)
VALUES
  ('00000000-0000-0000-0000-000000003510', 'team', 'Confirmation A',
   'confirmation-a', '00000000-0000-0000-0000-000000003501'),
  ('00000000-0000-0000-0000-000000003520', 'team', 'Confirmation B',
   'confirmation-b', '00000000-0000-0000-0000-000000003504');

INSERT INTO public.accounts_memberships (account_id, user_id, role)
VALUES
  ('00000000-0000-0000-0000-000000003510', '00000000-0000-0000-0000-000000003501', 'owner'),
  ('00000000-0000-0000-0000-000000003510', '00000000-0000-0000-0000-000000003502', 'admin'),
  ('00000000-0000-0000-0000-000000003510', '00000000-0000-0000-0000-000000003503', 'member'),
  ('00000000-0000-0000-0000-000000003520', '00000000-0000-0000-0000-000000003504', 'owner');

INSERT INTO billing.customers (id, account_id, provider, external_id)
VALUES
  ('00000000-0000-0000-0000-000000003511', '00000000-0000-0000-0000-000000003510',
   'mercadopago', 'customer-confirmation-a'),
  ('00000000-0000-0000-0000-000000003521', '00000000-0000-0000-0000-000000003520',
   'mercadopago', 'customer-confirmation-b');

INSERT INTO billing.subscriptions (
  id, customer_id, plan_id, status, provider, external_subscription_id
)
VALUES
  ('00000000-0000-0000-0000-000000003531',
   '00000000-0000-0000-0000-000000003511',
   (SELECT id FROM billing.plans WHERE slug = 'pro' AND "interval" = 'month'),
   'incomplete', 'mercadopago', 'confirmation-pending'),
  ('00000000-0000-0000-0000-000000003532',
   '00000000-0000-0000-0000-000000003511',
   (SELECT id FROM billing.plans WHERE slug = 'pro' AND "interval" = 'month'),
   'active', 'mercadopago', 'confirmation-active'),
  ('00000000-0000-0000-0000-000000003533',
   '00000000-0000-0000-0000-000000003511',
   (SELECT id FROM billing.plans WHERE slug = 'pro' AND "interval" = 'month'),
   'canceled', 'mercadopago', 'confirmation-canceled'),
  ('00000000-0000-0000-0000-000000003534',
   '00000000-0000-0000-0000-000000003521',
   (SELECT id FROM billing.plans WHERE slug = 'pro' AND "interval" = 'month'),
   'active', 'mercadopago', 'confirmation-other-account');

SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000003501', 'role', 'authenticated')::text,
  true
);
SET LOCAL role authenticated;

SELECT results_eq(
  $$ SELECT state, external_subscription_id, status::text
     FROM public.get_billing_checkout_confirmation(
       '00000000-0000-0000-0000-000000003510', 'confirmation-pending') $$,
  $$ VALUES ('pending'::text, 'confirmation-pending'::text, 'incomplete'::text) $$,
  'owner sees the exact incomplete subscription as pending'
);

SELECT results_eq(
  $$ SELECT state, external_subscription_id, status::text
     FROM public.get_billing_checkout_confirmation(
       '00000000-0000-0000-0000-000000003510', 'confirmation-active') $$,
  $$ VALUES ('confirmed'::text, 'confirmation-active'::text, 'active'::text) $$,
  'owner sees the exact active subscription as confirmed'
);

SELECT results_eq(
  $$ SELECT state, external_subscription_id, status::text
     FROM public.get_billing_checkout_confirmation(
       '00000000-0000-0000-0000-000000003510', 'confirmation-canceled') $$,
  $$ VALUES ('failed'::text, 'confirmation-canceled'::text, 'canceled'::text) $$,
  'terminal failed subscription states do not confirm checkout'
);

SELECT results_eq(
  $$ SELECT state, external_subscription_id, status::text
     FROM public.get_billing_checkout_confirmation(
       '00000000-0000-0000-0000-000000003510', 'confirmation-other-account') $$,
  $$ VALUES ('not_found'::text, 'confirmation-other-account'::text, NULL::text) $$,
  'an id belonging to another account is not disclosed'
);

SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000003502', 'role', 'authenticated')::text,
  true
);

SELECT results_eq(
  $$ SELECT state FROM public.get_billing_checkout_confirmation(
       '00000000-0000-0000-0000-000000003510', 'confirmation-active') $$,
  $$ VALUES ('confirmed'::text) $$,
  'admin can confirm a subscription in the account'
);

SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000003503', 'role', 'authenticated')::text,
  true
);

SELECT throws_like(
  $$ SELECT * FROM public.get_billing_checkout_confirmation(
       '00000000-0000-0000-0000-000000003510', 'confirmation-active') $$,
  '%not_authorized%',
  'member cannot call checkout confirmation'
);

SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000003504', 'role', 'authenticated')::text,
  true
);

SELECT results_eq(
  $$ SELECT state, status::text FROM public.get_billing_checkout_confirmation(
       '00000000-0000-0000-0000-000000003520', 'confirmation-active') $$,
  $$ VALUES ('not_found'::text, NULL::text) $$,
  'owner of another account cannot claim the first account subscription'
);

RESET role;
SELECT * FROM finish();
ROLLBACK;
