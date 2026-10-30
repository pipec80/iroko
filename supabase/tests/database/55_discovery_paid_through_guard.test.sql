-- SQL progress invariants only; HTTP admission is exercised by discovery-persistence.test.ts.
BEGIN;
SET LOCAL search_path=public,extensions;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT plan(5);
INSERT INTO auth.users(id,email,raw_user_meta_data,created_at,updated_at,confirmation_token,email_confirmed_at,recovery_token,aud,role)
VALUES('00000000-0000-0000-0000-000000005501','recovery55@example.com','{}',now(),now(),'',now(),'','authenticated','authenticated');
INSERT INTO public.accounts(id,type,name,slug,created_by) VALUES('00000000-0000-0000-0000-000000005510','team','Recovery55','recovery55','00000000-0000-0000-0000-000000005501');
INSERT INTO billing.customers(id,account_id,provider) VALUES('00000000-0000-0000-0000-000000005520','00000000-0000-0000-0000-000000005510','mercadopago');
INSERT INTO billing.subscriptions(id,customer_id,plan_id,status,provider,external_subscription_id,current_period_end)
VALUES('00000000-0000-0000-0000-000000005530','00000000-0000-0000-0000-000000005520',(SELECT id FROM billing.plans WHERE slug='pro' AND "interval"='month'),'active','mercadopago','pa-55','2026-09-01');

CREATE TEMP TABLE claimed AS SELECT * FROM public.claim_billing_reconciliation_candidates(20,90,'fixture55');
SELECT is(public.complete_billing_reconciliation_candidate('00000000-0000-0000-0000-000000005530','fixture55','failed',NULL,NULL,'provider_discovery_payment_status_divergence'),'failed','divergent page records failure');
SELECT is((SELECT current_period_end FROM billing.subscriptions WHERE id='00000000-0000-0000-0000-000000005530'),'2026-09-01'::timestamptz,'failure cannot advance paid-through');
SELECT is((SELECT count(*) FROM billing.invoices WHERE subscription_id='00000000-0000-0000-0000-000000005530'),0::bigint,'failure cannot create invoice');
SELECT is((SELECT failure_count FROM billing.reconciliation_state WHERE subscription_id='00000000-0000-0000-0000-000000005530'),1,'failure is durable');
SELECT ok((SELECT invoice_watermark IS NULL AND scan_cursor IS NULL AND lease_owner IS NULL AND last_error_code='provider_discovery_payment_status_divergence' FROM billing.reconciliation_state WHERE subscription_id='00000000-0000-0000-0000-000000005530'),'failure releases lease without progress');
SELECT * FROM finish();
ROLLBACK;
