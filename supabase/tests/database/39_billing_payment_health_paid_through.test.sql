-- pgTAP: payment health remains separate from subscription lifecycle, while
-- canceled subscriptions retain access only through a verified paid period.
-- Run with: supabase test db --local supabase/tests/database/39_billing_payment_health_paid_through.test.sql

BEGIN;
SELECT plan(51);

INSERT INTO auth.users (
  id, email, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_confirmed_at, recovery_token, aud, role
)
VALUES
  ('00000000-0000-0000-0000-000000003901', 'health-owner@example.com',
   '{}'::jsonb, now(), now(), '', now(), '', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000003902', 'health-admin@example.com',
   '{}'::jsonb, now(), now(), '', now(), '', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000003903', 'health-member@example.com',
   '{}'::jsonb, now(), now(), '', now(), '', 'authenticated', 'authenticated');

INSERT INTO public.accounts (id, type, name, slug, created_by)
VALUES
  ('00000000-0000-0000-0000-000000003910', 'team', 'Paid Through Health',
   'paid-through-health', '00000000-0000-0000-0000-000000003901'),
  ('00000000-0000-0000-0000-000000003920', 'team', 'Expired Health',
   'expired-health', '00000000-0000-0000-0000-000000003901'),
  ('00000000-0000-0000-0000-000000003930', 'team', 'Unknown Health',
   'unknown-health', '00000000-0000-0000-0000-000000003901'),
  ('00000000-0000-0000-0000-000000003940', 'team', 'Invoice Period Health',
   'invoice-period-health', '00000000-0000-0000-0000-000000003901'),
  ('00000000-0000-0000-0000-000000003950', 'team', 'Past Period Health',
   'past-period-health', '00000000-0000-0000-0000-000000003901');

INSERT INTO public.accounts_memberships (account_id, user_id, role)
VALUES
  ('00000000-0000-0000-0000-000000003910', '00000000-0000-0000-0000-000000003901', 'owner'),
  ('00000000-0000-0000-0000-000000003910', '00000000-0000-0000-0000-000000003902', 'admin'),
  ('00000000-0000-0000-0000-000000003910', '00000000-0000-0000-0000-000000003903', 'member'),
  ('00000000-0000-0000-0000-000000003920', '00000000-0000-0000-0000-000000003901', 'owner'),
  ('00000000-0000-0000-0000-000000003930', '00000000-0000-0000-0000-000000003901', 'owner'),
  ('00000000-0000-0000-0000-000000003940', '00000000-0000-0000-0000-000000003901', 'owner'),
  ('00000000-0000-0000-0000-000000003950', '00000000-0000-0000-0000-000000003901', 'owner');

INSERT INTO billing.customers (id, account_id, provider, external_id)
VALUES
  ('00000000-0000-0000-0000-000000003911', '00000000-0000-0000-0000-000000003910',
   'mercadopago', 'customer-health-paid-through'),
  ('00000000-0000-0000-0000-000000003921', '00000000-0000-0000-0000-000000003920',
   'mercadopago', 'customer-health-expired'),
  ('00000000-0000-0000-0000-000000003941', '00000000-0000-0000-0000-000000003940',
   'mercadopago', 'customer-health-invoice-period'),
  ('00000000-0000-0000-0000-000000003951', '00000000-0000-0000-0000-000000003950',
   'mercadopago', 'customer-health-past-period');

INSERT INTO billing.subscriptions (
  id, customer_id, plan_id, status, current_period_start, current_period_end,
  canceled_at, provider, external_subscription_id, created_at
)
VALUES
  ('00000000-0000-0000-0000-000000003912',
   '00000000-0000-0000-0000-000000003911',
   (SELECT id FROM billing.plans WHERE slug = 'pro' AND "interval" = 'month'),
   'canceled', now() - interval '23 days', now() + interval '7 days',
   now() - interval '1 day', 'mercadopago', 'preapproval-health-paid-through',
   now() - interval '23 days'),
  ('00000000-0000-0000-0000-000000003922',
   '00000000-0000-0000-0000-000000003921',
   (SELECT id FROM billing.plans WHERE slug = 'pro' AND "interval" = 'month'),
   'canceled', NULL, NULL,
   now() - interval '1 day', 'mercadopago', 'preapproval-health-expired',
   now() - interval '23 days'),
  ('00000000-0000-0000-0000-000000003942',
   '00000000-0000-0000-0000-000000003941',
   (SELECT id FROM billing.plans WHERE slug = 'pro' AND "interval" = 'month'),
   'active', NULL, NULL,
   NULL, 'mercadopago', 'preapproval-health-invoice-period',
   now() - interval '23 days'),
  ('00000000-0000-0000-0000-000000003952',
   '00000000-0000-0000-0000-000000003951',
   (SELECT id FROM billing.plans WHERE slug = 'pro' AND "interval" = 'month'),
   'canceled', now() - interval '31 days', now() - interval '1 day',
   now() - interval '2 days', 'mercadopago', 'preapproval-health-past-period',
   now() - interval '23 days');

INSERT INTO billing.invoices (
  id, customer_id, subscription_id, status, currency, total, amount_paid,
  period_start, period_end, paid_at, external_invoice_id, provider
)
VALUES (
  '00000000-0000-0000-0000-000000003913',
  '00000000-0000-0000-0000-000000003911',
  '00000000-0000-0000-0000-000000003912',
  'paid', 'CLP', 19990, 19990,
  now() - interval '23 days', now() + interval '7 days', now() - interval '23 days',
  'invoice-health-paid-through', 'mercadopago'
);

INSERT INTO billing.payment_attempts (
  id, provider, subscription_id, invoice_id, external_payment_id,
  external_invoice_id, status, amount, currency, failure_code,
  failure_message, attempted_at, metadata, created_at
)
VALUES (
  '00000000-0000-0000-0000-000000003914', 'mercadopago',
  '00000000-0000-0000-0000-000000003912',
  '00000000-0000-0000-0000-000000003913', 'payment-health-failed',
  'invoice-health-paid-through', 'failed', 19990, 'CLP',
  'cc_rejected_other_reason', 'provider detail must remain private',
  '2026-09-11 10:00:00+00', '{"raw_provider_payload":"must remain private"}'::jsonb,
  '2026-09-11 10:01:00+00'
);

SELECT set_config(
  'app.health_pro_plan_id',
  (SELECT id::text FROM billing.plans WHERE slug = 'pro' AND "interval" = 'month'),
  true
);

SET LOCAL role service_role;

SELECT is(
  public.apply_invoice_paid(
    'mercadopago', 'invoice-period-initial-39',
    '00000000-0000-0000-0000-000000003940',
    'preapproval-health-invoice-period', 'invoice-period-initial-39',
    'payment-period-initial-39', 19990, 'CLP',
    '2099-01-01 00:00:00+00', '2099-02-01 00:00:00+00',
    '2026-09-14 10:00:00+00', NULL, NULL, '{}'::jsonb
  ),
  'applied',
  'approved invoice applies through the real reducer RPC'
);

RESET role;

SELECT results_eq(
  $$ SELECT current_period_start, current_period_end, status::text
     FROM billing.subscriptions
     WHERE id = '00000000-0000-0000-0000-000000003942' $$,
  $$ VALUES (
       '2099-01-01 00:00:00+00'::timestamptz,
       '2099-02-01 00:00:00+00'::timestamptz,
       'active'::text
     ) $$,
  'approved invoice populates the provider-neutral period without changing lifecycle status'
);

SET LOCAL role service_role;

SELECT is(
  public.apply_subscription_canceled(
    'mercadopago', 'invoice-period-canceled-39',
    '00000000-0000-0000-0000-000000003940',
    'preapproval-health-invoice-period', '2026-09-14 11:00:00+00',
    NULL, '{}'::jsonb
  ),
  'applied',
  'cancellation with absent access evidence applies through the real reducer RPC'
);

RESET role;

SELECT results_eq(
  $$ SELECT subscription.status::text, subscription.current_period_end,
            (SELECT slug FROM private.get_account_plan_row(
              '00000000-0000-0000-0000-000000003940'))
     FROM billing.subscriptions AS subscription
     WHERE subscription.id = '00000000-0000-0000-0000-000000003942' $$,
  $$ VALUES (
       'canceled'::text, '2099-02-01 00:00:00+00'::timestamptz, 'pro'::text
     ) $$,
  'canceled subscription retains Pro through the invoice-backed future period'
);

SET LOCAL role service_role;

SELECT is(
  public.apply_invoice_paid(
    'mercadopago', 'invoice-period-older-39',
    '00000000-0000-0000-0000-000000003940',
    'preapproval-health-invoice-period', 'invoice-period-older-39',
    'payment-period-older-39', 19990, 'CLP',
    '2098-12-01 00:00:00+00', '2099-01-15 00:00:00+00',
    '2026-09-14 12:00:00+00', NULL, NULL, '{}'::jsonb
  ),
  'applied',
  'older approved invoice remains an idempotent ledger event'
);

RESET role;

SELECT results_eq(
  $$ SELECT current_period_start, current_period_end, status::text
     FROM billing.subscriptions
     WHERE id = '00000000-0000-0000-0000-000000003942' $$,
  $$ VALUES (
       '2099-01-01 00:00:00+00'::timestamptz,
       '2099-02-01 00:00:00+00'::timestamptz,
       'canceled'::text
     ) $$,
  'older approved invoice cannot regress the verified subscription period'
);

SET LOCAL role service_role;

SELECT is(
  public.apply_invoice_paid(
    'mercadopago', 'invoice-period-newer-39',
    '00000000-0000-0000-0000-000000003940',
    'preapproval-health-invoice-period', 'invoice-period-newer-39',
    'payment-period-newer-39', 19990, 'CLP',
    '2099-02-01 00:00:00+00', '2099-03-01 00:00:00+00',
    '2026-09-14 13:00:00+00', NULL, NULL, '{}'::jsonb
  ),
  'applied',
  'newer approved invoice applies as a distinct ledger event'
);

RESET role;

SELECT results_eq(
  $$ SELECT current_period_start, current_period_end, status::text
     FROM billing.subscriptions
     WHERE id = '00000000-0000-0000-0000-000000003942' $$,
  $$ VALUES (
       '2099-02-01 00:00:00+00'::timestamptz,
       '2099-03-01 00:00:00+00'::timestamptz,
       'canceled'::text
     ) $$,
  'newer approved invoice advances the period without changing canceled status'
);

SET LOCAL role service_role;

SELECT is(
  public.apply_invoice_paid(
    'mercadopago', 'invoice-period-start-only-39',
    '00000000-0000-0000-0000-000000003940',
    'preapproval-health-invoice-period', 'invoice-period-start-only-39',
    'payment-period-start-only-39', 19990, 'CLP',
    '2099-03-01 00:00:00+00', NULL,
    '2026-09-14 13:10:00+00', NULL, NULL, '{}'::jsonb
  ),
  'applied',
  'invoice with only a period start remains processable'
);

RESET role;

SELECT results_eq(
  $$ SELECT current_period_start, current_period_end
     FROM billing.subscriptions
     WHERE id = '00000000-0000-0000-0000-000000003942' $$,
  $$ VALUES (
       '2099-02-01 00:00:00+00'::timestamptz,
       '2099-03-01 00:00:00+00'::timestamptz
     ) $$,
  'start-only invoice interval cannot change the verified subscription period'
);

SET LOCAL role service_role;

SELECT is(
  public.apply_invoice_paid(
    'mercadopago', 'invoice-period-end-only-39',
    '00000000-0000-0000-0000-000000003940',
    'preapproval-health-invoice-period', 'invoice-period-end-only-39',
    'payment-period-end-only-39', 19990, 'CLP',
    NULL, '2099-06-01 00:00:00+00',
    '2026-09-14 13:20:00+00', NULL, NULL, '{}'::jsonb
  ),
  'applied',
  'invoice with only a period end remains processable'
);

RESET role;

SELECT results_eq(
  $$ SELECT current_period_start, current_period_end
     FROM billing.subscriptions
     WHERE id = '00000000-0000-0000-0000-000000003942' $$,
  $$ VALUES (
       '2099-02-01 00:00:00+00'::timestamptz,
       '2099-03-01 00:00:00+00'::timestamptz
     ) $$,
  'end-only invoice interval cannot change the verified subscription period'
);

SET LOCAL role service_role;

SELECT is(
  public.apply_invoice_paid(
    'mercadopago', 'invoice-period-equal-39',
    '00000000-0000-0000-0000-000000003940',
    'preapproval-health-invoice-period', 'invoice-period-equal-39',
    'payment-period-equal-39', 19990, 'CLP',
    '2099-06-01 00:00:00+00', '2099-06-01 00:00:00+00',
    '2026-09-14 13:30:00+00', NULL, NULL, '{}'::jsonb
  ),
  'applied',
  'invoice with equal period bounds remains processable'
);

RESET role;

SELECT results_eq(
  $$ SELECT current_period_start, current_period_end
     FROM billing.subscriptions
     WHERE id = '00000000-0000-0000-0000-000000003942' $$,
  $$ VALUES (
       '2099-02-01 00:00:00+00'::timestamptz,
       '2099-03-01 00:00:00+00'::timestamptz
     ) $$,
  'equal invoice interval bounds cannot change the verified subscription period'
);

SET LOCAL role service_role;

SELECT is(
  public.apply_invoice_paid(
    'mercadopago', 'invoice-period-reversed-39',
    '00000000-0000-0000-0000-000000003940',
    'preapproval-health-invoice-period', 'invoice-period-reversed-39',
    'payment-period-reversed-39', 19990, 'CLP',
    '2099-07-01 00:00:00+00', '2099-06-01 00:00:00+00',
    '2026-09-14 13:40:00+00', NULL, NULL, '{}'::jsonb
  ),
  'applied',
  'invoice with reversed period bounds remains processable'
);

RESET role;

SELECT results_eq(
  $$ SELECT current_period_start, current_period_end
     FROM billing.subscriptions
     WHERE id = '00000000-0000-0000-0000-000000003942' $$,
  $$ VALUES (
       '2099-02-01 00:00:00+00'::timestamptz,
       '2099-03-01 00:00:00+00'::timestamptz
     ) $$,
  'reversed invoice interval cannot change the verified subscription period'
);

SET LOCAL role service_role;

SELECT is(
  public.apply_invoice_paid(
    'mercadopago', 'invoice-period-newer-39',
    '00000000-0000-0000-0000-000000003940',
    'preapproval-health-invoice-period', 'invoice-period-newer-replay-39',
    'payment-period-newer-replay-39', 19990, 'CLP',
    '2099-03-01 00:00:00+00', '2099-06-01 00:00:00+00',
    '2026-09-14 13:50:00+00', NULL, NULL, '{}'::jsonb
  ),
  'duplicate',
  'replayed invoice-paid provider event remains idempotent despite a longer interval'
);

RESET role;

SELECT results_eq(
  $$ SELECT current_period_start, current_period_end
     FROM billing.subscriptions
     WHERE id = '00000000-0000-0000-0000-000000003942' $$,
  $$ VALUES (
       '2099-02-01 00:00:00+00'::timestamptz,
       '2099-03-01 00:00:00+00'::timestamptz
     ) $$,
  'duplicate invoice-paid event cannot advance the verified subscription period'
);

SET LOCAL role service_role;

SELECT is(
  public.apply_subscription_updated(
    'mercadopago', 'invoice-period-update-null-39',
    '00000000-0000-0000-0000-000000003940',
    'preapproval-health-invoice-period', NULL, 'canceled',
    NULL, NULL, false, NULL, '{}'::jsonb
  ),
  'applied',
  'subscription update with absent period evidence still applies lifecycle fields'
);

RESET role;

SELECT results_eq(
  $$ SELECT current_period_start, current_period_end, status::text,
            cancel_at_period_end
     FROM billing.subscriptions
     WHERE id = '00000000-0000-0000-0000-000000003942' $$,
  $$ VALUES (
       '2099-02-01 00:00:00+00'::timestamptz,
       '2099-03-01 00:00:00+00'::timestamptz,
       'canceled'::text, false
     ) $$,
  'subscription update with null period cannot erase verified invoice evidence'
);

SET LOCAL role service_role;

SELECT is(
  public.apply_subscription_updated(
    'mercadopago', 'invoice-period-update-older-39',
    '00000000-0000-0000-0000-000000003940',
    'preapproval-health-invoice-period', NULL, 'canceled',
    '2099-01-15 00:00:00+00', '2099-02-15 00:00:00+00',
    false, NULL, '{}'::jsonb
  ),
  'applied',
  'subscription update with older provider period remains processable'
);

RESET role;

SELECT results_eq(
  $$ SELECT current_period_start, current_period_end
     FROM billing.subscriptions
     WHERE id = '00000000-0000-0000-0000-000000003942' $$,
  $$ VALUES (
       '2099-02-01 00:00:00+00'::timestamptz,
       '2099-03-01 00:00:00+00'::timestamptz
     ) $$,
  'older provider snapshot cannot regress stronger verified invoice evidence'
);

SET LOCAL role service_role;

SELECT is(
  public.apply_subscription_updated(
    'mercadopago', 'invoice-period-update-newer-39',
    '00000000-0000-0000-0000-000000003940',
    'preapproval-health-invoice-period', NULL, 'canceled',
    '2099-03-01 00:00:00+00', '2099-04-01 00:00:00+00',
    false, NULL, '{}'::jsonb
  ),
  'applied',
  'subscription update with stronger provider period applies normally'
);

RESET role;

SELECT results_eq(
  $$ SELECT current_period_start, current_period_end, status::text
     FROM billing.subscriptions
     WHERE id = '00000000-0000-0000-0000-000000003942' $$,
  $$ VALUES (
       '2099-03-01 00:00:00+00'::timestamptz,
       '2099-04-01 00:00:00+00'::timestamptz,
       'canceled'::text
     ) $$,
  'stronger provider snapshot advances the period and preserves lifecycle semantics'
);

SET LOCAL role service_role;

SELECT is(
  public.apply_subscription_created(
    'mercadopago', 'invoice-period-created-null-39',
    '00000000-0000-0000-0000-000000003940',
    current_setting('app.health_pro_plan_id')::uuid,
    'preapproval-health-invoice-period', 'canceled', NULL, NULL, true,
    'customer-health-invoice-period', '{}'::jsonb
  ),
  'applied',
  'later subscription-created event with null period remains processable'
);

RESET role;

SELECT results_eq(
  $$ SELECT current_period_start, current_period_end, status::text,
            cancel_at_period_end
     FROM billing.subscriptions
     WHERE id = '00000000-0000-0000-0000-000000003942' $$,
  $$ VALUES (
       '2099-03-01 00:00:00+00'::timestamptz,
       '2099-04-01 00:00:00+00'::timestamptz,
       'canceled'::text, true
     ) $$,
  'subscription-created upsert preserves stronger period while applying lifecycle fields'
);

SET LOCAL role service_role;

SELECT is(
  public.apply_subscription_canceled(
    'mercadopago', 'invoice-period-canceled-shorter-39',
    '00000000-0000-0000-0000-000000003940',
    'preapproval-health-invoice-period', '2026-09-14 14:00:00+00',
    '2099-03-15 00:00:00+00', '{}'::jsonb
  ),
  'applied',
  'cancellation with a shorter provider period remains processable'
);

RESET role;

SELECT results_eq(
  $$ SELECT current_period_start, current_period_end, status::text,
            cancel_at_period_end
     FROM billing.subscriptions
     WHERE id = '00000000-0000-0000-0000-000000003942' $$,
  $$ VALUES (
       '2099-03-01 00:00:00+00'::timestamptz,
       '2099-04-01 00:00:00+00'::timestamptz,
       'canceled'::text, false
     ) $$,
  'shorter cancellation evidence cannot regress period and lifecycle fields still apply'
);

SELECT is(
  (SELECT slug FROM private.get_account_plan_row(
    '00000000-0000-0000-0000-000000003910')),
  'pro',
  'canceled subscription retains its plan before verified period end'
);

SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000003901', 'role', 'authenticated')::text,
  true
);
SET LOCAL role authenticated;

SELECT results_eq(
  $$ SELECT plan_slug, status::text
     FROM public.get_account_subscription('00000000-0000-0000-0000-000000003910') $$,
  $$ VALUES ('pro'::text, 'canceled'::text) $$,
  'account subscription exposes canceled paid-through access'
);

SELECT results_eq(
  $$ SELECT plan_slug, status::text
     FROM public.get_billing_overview('00000000-0000-0000-0000-000000003910') $$,
  $$ VALUES ('pro'::text, 'canceled'::text) $$,
  'billing overview exposes canceled paid-through access'
);

SELECT has_function(
  'public', 'get_billing_payment_health', ARRAY['uuid'],
  'payment-health RPC exists'
);

SELECT results_eq(
  $$ SELECT state, last_failure_code
     FROM public.get_billing_payment_health('00000000-0000-0000-0000-000000003910') $$,
  $$ VALUES ('attention_required'::text, 'cc_rejected_other_reason'::text) $$,
  'latest failed payment requires attention without changing subscription status'
);

SELECT is(
  (SELECT status::text FROM public.get_billing_overview(
    '00000000-0000-0000-0000-000000003910')),
  'canceled',
  'failed payment evidence does not change subscription status'
);

SELECT ok(
  (SELECT (SELECT count(*) FROM jsonb_object_keys(to_jsonb(health))) = 3
          AND NOT (to_jsonb(health) ? 'metadata')
          AND NOT (to_jsonb(health) ? 'failure_message')
   FROM public.get_billing_payment_health(
     '00000000-0000-0000-0000-000000003910') AS health),
  'payment health exposes only bounded fields and no raw metadata'
);

RESET role;

INSERT INTO billing.payment_attempts (
  id, provider, subscription_id, invoice_id, external_payment_id,
  external_invoice_id, status, amount, currency, attempted_at, metadata, created_at
)
VALUES (
  '00000000-0000-0000-0000-000000003916', 'stripe',
  '00000000-0000-0000-0000-000000003912',
  '00000000-0000-0000-0000-000000003913', 'payment-health-cross-provider',
  'invoice-health-paid-through', 'recovered', 19990, 'CLP',
  '2026-09-11 11:00:00+00', '{}'::jsonb, '2026-09-11 11:01:00+00'
);

SET LOCAL role authenticated;

SELECT results_eq(
  $$ SELECT state, last_failure_code
     FROM public.get_billing_payment_health('00000000-0000-0000-0000-000000003910') $$,
  $$ VALUES ('attention_required'::text, 'cc_rejected_other_reason'::text) $$,
  'newer attempt from another provider cannot replace Mercado Pago health'
);

RESET role;

INSERT INTO billing.payment_attempts (
  id, provider, subscription_id, invoice_id, external_payment_id,
  external_invoice_id, status, amount, currency, failure_code,
  attempted_at, metadata, created_at
)
VALUES (
  '00000000-0000-0000-0000-000000003917', 'mercadopago',
  '00000000-0000-0000-0000-000000003912',
  '00000000-0000-0000-0000-000000003913', 'payment-health-oversized-code',
  'invoice-health-paid-through', 'failed', 19990, 'CLP',
  '  ' || repeat('0123456789', 12) || '  ',
  '2026-09-11 12:00:00+00', '{}'::jsonb, '2026-09-11 12:01:00+00'
);

SET LOCAL role authenticated;

SELECT results_eq(
  $$ SELECT state, last_failure_code, char_length(last_failure_code)
     FROM public.get_billing_payment_health('00000000-0000-0000-0000-000000003910') $$,
  $$ VALUES (
       'attention_required'::text,
       '0123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789'::text,
       100
     ) $$,
  'failed payment code is trimmed and capped to the exact public bound'
);

RESET role;

INSERT INTO billing.payment_attempts (
  id, provider, subscription_id, invoice_id, external_payment_id,
  external_invoice_id, status, amount, currency, attempted_at, metadata, created_at
)
VALUES (
  '00000000-0000-0000-0000-000000003915', 'mercadopago',
  '00000000-0000-0000-0000-000000003912',
  '00000000-0000-0000-0000-000000003913', 'payment-health-recovered',
  'invoice-health-paid-through', 'recovered', 19990, 'CLP',
  '2026-09-11 12:00:00+00', '{"raw_provider_payload":"must remain private"}'::jsonb,
  '2026-09-11 12:02:00+00'
);

SET LOCAL role authenticated;

SELECT results_eq(
  $$ SELECT state, last_failure_code
     FROM public.get_billing_payment_health('00000000-0000-0000-0000-000000003910') $$,
  $$ VALUES ('healthy'::text, NULL::text) $$,
  'equal-or-newer recovered payment clears the warning'
);

SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000003902', 'role', 'authenticated')::text,
  true
);

SELECT results_eq(
  $$ SELECT state FROM public.get_billing_payment_health(
       '00000000-0000-0000-0000-000000003910') $$,
  $$ VALUES ('healthy'::text) $$,
  'authenticated admin can read payment health'
);

SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000003903', 'role', 'authenticated')::text,
  true
);

SELECT throws_ok(
  $$ SELECT * FROM public.get_billing_overview(
       '00000000-0000-0000-0000-000000003910') $$,
  'not_authorized',
  'billing overview rejects an authenticated member'
);

SELECT throws_ok(
  $$ SELECT * FROM public.get_billing_payment_health(
       '00000000-0000-0000-0000-000000003910') $$,
  'not_authorized',
  'payment health matches billing overview member rejection'
);

SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000003901', 'role', 'authenticated')::text,
  true
);

RESET role;

SELECT is(
  (SELECT slug FROM private.get_account_plan_row(
    '00000000-0000-0000-0000-000000003920')),
  'free',
  'canceled subscription without a future verified period falls back to free'
);

SELECT is(
  (SELECT slug FROM private.get_account_plan_row(
    '00000000-0000-0000-0000-000000003950')),
  'free',
  'canceled subscription with a past non-null period falls back to free'
);

SET LOCAL role authenticated;

SELECT is(
  (SELECT count(*)::integer FROM public.get_account_subscription(
    '00000000-0000-0000-0000-000000003920')),
  0,
  'account subscription excludes canceled access without a future verified period'
);

SELECT is(
  (SELECT count(*)::integer FROM public.get_billing_overview(
    '00000000-0000-0000-0000-000000003920')),
  0,
  'billing overview excludes canceled access without a future verified period'
);

SELECT is(
  (SELECT count(*)::integer FROM public.get_account_subscription(
    '00000000-0000-0000-0000-000000003950')),
  0,
  'account subscription excludes canceled access with a past verified period'
);

SELECT is(
  (SELECT count(*)::integer FROM public.get_billing_overview(
    '00000000-0000-0000-0000-000000003950')),
  0,
  'billing overview excludes canceled access with a past verified period'
);

SELECT is(
  (SELECT count(*)::integer FROM public.get_billing_payment_health(
    '00000000-0000-0000-0000-000000003930')),
  1,
  'authorized account without payment evidence receives exactly one row'
);

SELECT results_eq(
  $$ SELECT state, last_attempt_at, last_failure_code
     FROM public.get_billing_payment_health('00000000-0000-0000-0000-000000003930') $$,
  $$ VALUES ('unknown'::text, NULL::timestamptz, NULL::text) $$,
  'missing payment evidence is unknown with null details'
);

RESET role;
SET LOCAL role anon;

SELECT ok(
  has_function_privilege(
    'authenticated', 'public.get_billing_payment_health(uuid)', 'EXECUTE'
  )
  AND NOT has_function_privilege(
    'anon', 'public.get_billing_payment_health(uuid)', 'EXECUTE'
  ),
  'payment health is granted to authenticated callers and denied to anon'
);

SELECT throws_like(
  $$ SELECT * FROM public.get_billing_payment_health(
       '00000000-0000-0000-0000-000000003910') $$,
  '%permission denied%',
  'anon cannot call payment health'
);

RESET role;
SELECT * FROM finish();
ROLLBACK;
