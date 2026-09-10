-- pgTAP: durable payment recovery and financial anomalies.
BEGIN;
SELECT plan(20);

SELECT has_table('billing', 'recovery_jobs', 'recovery jobs table exists');
SELECT has_table('billing', 'financial_anomalies', 'financial anomalies table exists');
SELECT has_function('public', 'enqueue_billing_recovery_job', ARRAY['text','text','text','text','text'], 'enqueue RPC exists');
SELECT has_function('public', 'claim_billing_recovery_jobs', ARRAY['integer','integer'], 'claim RPC exists');
SELECT has_function('public', 'complete_billing_recovery_job', ARRAY['uuid','text','text'], 'completion RPC exists');
SELECT has_function('public', 'upsert_billing_financial_anomaly', ARRAY['text','text','text','text','uuid','uuid'], 'anomaly RPC exists');
SELECT has_function('private', 'resolve_billing_financial_anomaly', ARRAY['uuid','text'], 'manual resolver exists');

SELECT ok(
  has_function_privilege('service_role', 'public.enqueue_billing_recovery_job(text,text,text,text,text)', 'EXECUTE')
  AND NOT has_function_privilege('authenticated', 'public.enqueue_billing_recovery_job(text,text,text,text,text)', 'EXECUTE'),
  'recovery enqueue is service-role only');
SELECT ok(
  NOT has_function_privilege('service_role', 'private.resolve_billing_financial_anomaly(uuid,text)', 'EXECUTE')
  AND NOT has_function_privilege('authenticated', 'private.resolve_billing_financial_anomaly(uuid,text)', 'EXECUTE'),
  'manual anomaly resolution has no application grants');

SELECT public.enqueue_billing_recovery_job('mercadopago','payment','pay-37','unlinked_payment','evt-37');
SELECT public.enqueue_billing_recovery_job('mercadopago','payment','pay-37','unlinked_payment','evt-duplicate-37');
SELECT is((SELECT count(*) FROM billing.recovery_jobs WHERE resource_id='pay-37'), 1::bigint, 'duplicate delivery creates one job');

SELECT is((SELECT count(*) FROM public.claim_billing_recovery_jobs(20, 900)), 1::bigint, 'first worker claims the job');
SELECT is((SELECT count(*) FROM public.claim_billing_recovery_jobs(20, 900)), 0::bigint, 'second worker cannot claim the lease');
SELECT is((SELECT attempt_count FROM billing.recovery_jobs WHERE resource_id='pay-37'), 1, 'claim increments attempts atomically');

SELECT is(
  (SELECT status FROM public.complete_billing_recovery_job(
    (SELECT id FROM billing.recovery_jobs WHERE resource_id='pay-37'), 'pending', 'still_pending')),
  'pending', 'a pending resource is scheduled again');
SELECT ok(
  (SELECT next_attempt_at > now() FROM billing.recovery_jobs WHERE resource_id='pay-37'),
  'retry gets a future backoff');

SELECT public.upsert_billing_financial_anomaly(
  'mercadopago','refund','pay-refund-37','refunded',NULL,NULL);
SELECT public.upsert_billing_financial_anomaly(
  'mercadopago','refund','pay-refund-37','refunded',NULL,NULL);
SELECT results_eq(
  $$ SELECT occurrence_count, status FROM billing.financial_anomalies
     WHERE external_resource_id='pay-refund-37' $$,
  $$ VALUES (2, 'open'::text) $$,
  'anomaly upsert is deduplicated and counted');

UPDATE billing.recovery_jobs SET status='processing', attempt_count=5 WHERE resource_id='pay-37';
SELECT results_eq(
  format($$ SELECT status, anomaly_created FROM public.complete_billing_recovery_job('%s','error','provider_down') $$,
    (SELECT id FROM billing.recovery_jobs WHERE resource_id='pay-37')),
  $$ VALUES ('exhausted'::text, true) $$,
  'fifth failure exhausts and creates one anomaly');
SELECT is((SELECT count(*) FROM billing.financial_anomalies WHERE external_resource_id='pay-37'), 1::bigint, 'exhaustion anomaly exists once');
SELECT is((SELECT count(*) FROM billing.recovery_jobs WHERE resource_id='pay-37' AND last_error_code='provider_down'), 1::bigint, 'safe error code is retained');

SELECT ok(
  NOT has_table_privilege('authenticated', 'billing.recovery_jobs', 'SELECT')
  AND NOT has_table_privilege('anon', 'billing.financial_anomalies', 'SELECT'),
  'application roles cannot inspect private recovery data');

SELECT * FROM finish();
ROLLBACK;
