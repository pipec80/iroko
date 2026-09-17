-- pgTAP: normalized financial anomaly detail and service-only atomic upsert.
BEGIN;
SELECT plan(21);

SELECT has_column('billing', 'financial_anomalies', 'original_amount', 'anomalies store original amount');
SELECT has_column('billing', 'financial_anomalies', 'affected_amount', 'anomalies store affected amount');
SELECT has_column('billing', 'financial_anomalies', 'currency', 'anomalies store currency');
SELECT has_function(
  'public',
  'upsert_billing_financial_anomaly',
  ARRAY['text','text','text','text','uuid','uuid','integer','integer','text'],
  'normalized anomaly RPC exists'
);
SELECT hasnt_function(
  'public',
  'upsert_billing_financial_anomaly',
  ARRAY['text','text','text','text','uuid','uuid'],
  'stale six-argument anomaly RPC is removed'
);
SELECT ok(
  has_function_privilege(
    'service_role',
    'public.upsert_billing_financial_anomaly(text,text,text,text,uuid,uuid,integer,integer,text)',
    'EXECUTE'
  )
  AND NOT has_function_privilege(
    'authenticated',
    'public.upsert_billing_financial_anomaly(text,text,text,text,uuid,uuid,integer,integer,text)',
    'EXECUTE'
  )
  AND NOT has_function_privilege(
    'anon',
    'public.upsert_billing_financial_anomaly(text,text,text,text,uuid,uuid,integer,integer,text)',
    'EXECUTE'
  ),
  'normalized anomaly RPC is service-role only'
);

INSERT INTO auth.users (
  id, email, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_confirmed_at, recovery_token, aud, role
) VALUES (
  '00000000-0000-0000-0000-000000004100', 'anomaly-detail@example.com',
  '{}'::jsonb, now(), now(), '', now(), '', 'authenticated', 'authenticated'
);
INSERT INTO public.accounts (id, type, name, slug, created_by)
VALUES (
  '00000000-0000-0000-0000-000000004110', 'team', 'Anomaly Detail',
  'anomaly-detail', '00000000-0000-0000-0000-000000004100'
);
INSERT INTO billing.customers (id, account_id, provider, external_id)
VALUES (
  '00000000-0000-0000-0000-000000004111',
  '00000000-0000-0000-0000-000000004110',
  'mercadopago', 'customer-anomaly-detail'
);
INSERT INTO billing.subscriptions (
  id, customer_id, plan_id, status, current_period_start, current_period_end,
  provider, external_subscription_id
) VALUES (
  '00000000-0000-0000-0000-000000004112',
  '00000000-0000-0000-0000-000000004111',
  (SELECT id FROM billing.plans WHERE slug = 'pro' AND "interval" = 'month'),
  'active', '2026-09-01T00:00:00Z', '2026-10-01T00:00:00Z',
  'mercadopago', 'preapproval-anomaly-detail'
);

SELECT set_config(
  'app.anomaly_detail_id',
  public.upsert_billing_financial_anomaly(
    'mercadopago', 'partial_refund', 'payment-anomaly-detail', 'approved',
    '00000000-0000-0000-0000-000000004110',
    '00000000-0000-0000-0000-000000004112',
    19990, 5000, 'CLP'
  )::text,
  true
);
SELECT set_config(
  'app.anomaly_detail_first_seen',
  (SELECT first_seen_at::text FROM billing.financial_anomalies
   WHERE id = current_setting('app.anomaly_detail_id')::uuid),
  true
);

SELECT results_eq(
  $$ SELECT anomaly_type, original_amount, affected_amount, currency, occurrence_count
     FROM billing.financial_anomalies
     WHERE id = current_setting('app.anomaly_detail_id')::uuid $$,
  $$ VALUES ('partial_refund'::text, 19990, 5000, 'CLP'::text, 1) $$,
  'partial refund persists normalized evidence'
);

SELECT is(
  public.upsert_billing_financial_anomaly(
    'mercadopago', 'partial_refund', 'payment-anomaly-detail', NULL,
    NULL, NULL, NULL, NULL, NULL
  )::text,
  current_setting('app.anomaly_detail_id'),
  'repeat observation preserves anomaly identity'
);
SELECT results_eq(
  $$ SELECT original_amount, affected_amount, currency, occurrence_count
     FROM billing.financial_anomalies
     WHERE id = current_setting('app.anomaly_detail_id')::uuid $$,
  $$ VALUES (19990, 5000, 'CLP'::text, 2) $$,
  'null repeat evidence retains known normalized values and increments count'
);

SELECT is(
  public.upsert_billing_financial_anomaly(
    'mercadopago', 'partial_refund', 'payment-anomaly-detail', 'approved',
    NULL, NULL, 19990, 8000, 'CLP'
  )::text,
  current_setting('app.anomaly_detail_id'),
  'newer non-null evidence updates the existing anomaly'
);
SELECT results_eq(
  $$ SELECT original_amount, affected_amount, currency, occurrence_count,
            first_seen_at::text = current_setting('app.anomaly_detail_first_seen')
     FROM billing.financial_anomalies
     WHERE id = current_setting('app.anomaly_detail_id')::uuid $$,
  $$ VALUES (19990, 8000, 'CLP'::text, 3, true) $$,
  'repeat upsert replaces evidence while preserving first-seen time'
);

SELECT set_config(
  'app.anomaly_detail_refund_id',
  public.upsert_billing_financial_anomaly(
    'mercadopago', 'refund', 'payment-anomaly-detail', 'refunded',
    '00000000-0000-0000-0000-000000004110',
    '00000000-0000-0000-0000-000000004112',
    19990, 19990, 'CLP'
  )::text,
  true
);
SELECT isnt(
  current_setting('app.anomaly_detail_refund_id'),
  current_setting('app.anomaly_detail_id'),
  'partial refund and refund for one payment retain distinct anomaly identities'
);
SELECT results_eq(
  $$ SELECT anomaly_type, occurrence_count
     FROM billing.financial_anomalies
     WHERE provider = 'mercadopago' AND external_resource_id = 'payment-anomaly-detail'
     ORDER BY anomaly_type $$,
  $$ VALUES ('partial_refund'::text, 3), ('refund'::text, 1) $$,
  'provider, anomaly type and payment resource form the durable open-anomaly key'
);
SELECT set_config(
  'app.anomaly_detail_stripe_id',
  public.upsert_billing_financial_anomaly(
    'stripe', 'partial_refund', 'payment-anomaly-detail', 'refunded',
    NULL, NULL, 19990, 5000, 'CLP'
  )::text,
  true
);
SELECT results_eq(
  $$ SELECT provider, anomaly_type, external_resource_id
     FROM billing.financial_anomalies
     WHERE id = current_setting('app.anomaly_detail_stripe_id')::uuid $$,
  $$ VALUES ('stripe'::text, 'partial_refund'::text, 'payment-anomaly-detail'::text) $$,
  'the same type and payment under a second provider is a separate anomaly'
);
SELECT set_config(
  'app.anomaly_detail_over_refund_id',
  public.upsert_billing_financial_anomaly(
    'mercadopago', 'refund', 'payment-over-refund', 'refunded',
    NULL, NULL, NULL, NULL, NULL
  )::text,
  true
);
SELECT results_eq(
  $$ SELECT anomaly_type, original_amount, affected_amount
     FROM billing.financial_anomalies
     WHERE id = current_setting('app.anomaly_detail_over_refund_id')::uuid $$,
  $$ VALUES ('refund'::text, NULL::integer, NULL::integer) $$,
  'over-refund retains refund type without truncated monetary evidence'
);

SELECT throws_ok(
  $$ SELECT public.upsert_billing_financial_anomaly(
       'mercadopago','refund','negative-original',NULL,NULL,NULL,-1,0,'CLP') $$,
  'billing_financial_anomaly_invalid',
  'negative original amount is rejected'
);
SELECT throws_ok(
  $$ SELECT public.upsert_billing_financial_anomaly(
       'mercadopago','refund','negative-affected',NULL,NULL,NULL,100,-1,'CLP') $$,
  'billing_financial_anomaly_invalid',
  'negative affected amount is rejected'
);
SELECT throws_ok(
  $$ SELECT public.upsert_billing_financial_anomaly(
       'mercadopago','refund','over-refund',NULL,NULL,NULL,100,101,'CLP') $$,
  'billing_financial_anomaly_invalid',
  'affected amount greater than original is rejected'
);
SELECT throws_ok(
  $$ SELECT public.upsert_billing_financial_anomaly(
       'mercadopago','refund','bad-currency',NULL,NULL,NULL,100,100,'clp') $$,
  'billing_financial_anomaly_invalid',
  'malformed currency is rejected'
);

SET LOCAL ROLE authenticated;
SELECT throws_like(
  $$ SELECT public.upsert_billing_financial_anomaly(
       'mercadopago','refund','client-call',NULL,NULL,NULL,100,100,'CLP') $$,
  '%permission denied%',
  'authenticated clients cannot execute the anomaly RPC'
);
RESET ROLE;

SELECT results_eq(
  $$ SELECT status::text, current_period_start, current_period_end
     FROM billing.subscriptions
     WHERE id = '00000000-0000-0000-0000-000000004112' $$,
  $$ VALUES (
       'active'::text,
       '2026-09-01T00:00:00Z'::timestamptz,
       '2026-10-01T00:00:00Z'::timestamptz
     ) $$,
  'financial anomalies do not change subscription access or paid period'
);

SELECT * FROM finish();
ROLLBACK;
