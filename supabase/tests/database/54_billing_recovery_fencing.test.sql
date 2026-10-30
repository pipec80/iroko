BEGIN;
SET LOCAL statement_timeout='30s';
SET LOCAL search_path=public,extensions;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT plan(27);
CREATE EXTENSION IF NOT EXISTS dblink WITH SCHEMA extensions;
-- Run exclusively without workers. Include future work whose backoff may expire.
DO $guard$
BEGIN
 IF EXISTS(SELECT 1 FROM billing.recovery_jobs WHERE status IN ('pending','processing') OR resource_id IN ('p54','p54-event')) THEN
   RAISE EXCEPTION 'test54_foreign_jobs_or_fixture_collision: no jobs changed';
 END IF;
END;
$guard$;
CREATE TEMP TABLE foreign_jobs_before AS SELECT * FROM billing.recovery_jobs;
CREATE FUNCTION pg_temp.recovery_claim_during_apply() RETURNS SETOF text LANGUAGE plpgsql AS $test$
DECLARE job_id uuid; token uuid; expires timestamptz; resource text:='recovery54-'||gen_random_uuid(); quantity bigint;
BEGIN
 PERFORM iroko_test_guard.connect('recovery54-a');
 PERFORM iroko_test_guard.connect('recovery54-b');
 PERFORM extensions.dblink_exec('recovery54-a', 'SET statement_timeout=''10s''');
 PERFORM extensions.dblink_exec('recovery54-b', 'SET statement_timeout=''10s''');
 -- Commit ownership on a separate connection so cancellation of this transaction
 -- cannot hide the resource from the runner's finally cleanup.
 PERFORM extensions.dblink_exec('recovery54-a',format('INSERT INTO iroko_test_guard.recovery_resources VALUES (%L)',resource));
 SELECT id INTO job_id FROM extensions.dblink('recovery54-a',format('SELECT public.enqueue_billing_recovery_job(''mercadopago'',''payment'',%L,''payment_pending'',%L)',resource,resource)) AS x(id uuid);
 SELECT lease_token INTO token FROM extensions.dblink('recovery54-a',format('SELECT lease_token FROM public.claim_billing_recovery_jobs(20,900) WHERE id=%L',job_id)) AS x(lease_token uuid);
 SELECT lease_expires_at INTO expires FROM extensions.dblink('recovery54-a',format('UPDATE billing.recovery_jobs SET lease_expires_at=clock_timestamp()+interval ''500 milliseconds'' WHERE id=%L RETURNING lease_expires_at',job_id)) AS x(lease_expires_at timestamptz);
 PERFORM extensions.dblink_exec('recovery54-a','BEGIN');
 -- Explicit barrier: apply returned, but its transaction and row lock remain open.
 PERFORM * FROM extensions.dblink('recovery54-a',format('SELECT status FROM public.apply_billing_recovery_result(%L,%L,''{"kind":"unrelated"}'')',job_id,token)) AS x(status text);
 WHILE clock_timestamp()<expires LOOP PERFORM pg_stat_clear_snapshot(); END LOOP;
 SELECT count INTO quantity FROM extensions.dblink('recovery54-b',format('SELECT count(*) FROM public.claim_billing_recovery_jobs(20,900) WHERE id=%L',job_id)) AS x(count bigint);
 RETURN NEXT is(quantity,0::bigint,'claim skips locked row after original lease deadline');
 PERFORM extensions.dblink_exec('recovery54-a','COMMIT');
 SELECT count INTO quantity FROM extensions.dblink('recovery54-b',format('SELECT count(*) FROM billing.recovery_jobs WHERE id=%L AND status=''resolved''',job_id)) AS x(count bigint);
 RETURN NEXT is(quantity,1::bigint,'in-flight owner commits without competing reclaim');
 PERFORM extensions.dblink_exec('recovery54-b',format('DELETE FROM billing.recovery_jobs WHERE id=%L',job_id));
 SELECT count INTO quantity FROM extensions.dblink('recovery54-b',format('SELECT count(*) FROM billing.recovery_jobs WHERE id=%L',job_id)) AS x(count bigint);
 RETURN NEXT is(quantity,0::bigint,'concurrent recovery fixture cleaned');
 PERFORM extensions.dblink_disconnect('recovery54-a'); PERFORM extensions.dblink_disconnect('recovery54-b');
EXCEPTION WHEN query_canceled OR OTHERS THEN
 IF 'recovery54-b'=ANY(coalesce(extensions.dblink_get_connections(),ARRAY[]::text[])) THEN PERFORM extensions.dblink_disconnect('recovery54-b'); END IF;
 IF 'recovery54-a'=ANY(coalesce(extensions.dblink_get_connections(),ARRAY[]::text[])) THEN
 PERFORM extensions.dblink_exec('recovery54-a','ROLLBACK');
 PERFORM extensions.dblink_exec('recovery54-a',format('DELETE FROM billing.recovery_jobs WHERE resource_id=%L',resource));
 PERFORM extensions.dblink_disconnect('recovery54-a'); END IF;
 RAISE;
END;
$test$;
SELECT * FROM pg_temp.recovery_claim_during_apply();
SELECT has_column('billing','recovery_jobs','lease_token','lease has independent generation');
SELECT has_function('public','apply_billing_recovery_result',ARRAY['uuid','uuid','jsonb'],'atomic result RPC');
SELECT ok(NOT has_function_privilege('service_role','public.complete_billing_recovery_job(uuid,text,text)','EXECUTE'),'legacy completion revoked');
SELECT public.enqueue_billing_recovery_job('mercadopago','payment','p54','payment_pending','e54');
CREATE TEMP TABLE claim_a AS SELECT * FROM public.claim_billing_recovery_jobs(20,900) WHERE resource_id='p54';
UPDATE billing.recovery_jobs SET lease_expires_at=clock_timestamp()-interval '1 second' WHERE resource_id='p54';
CREATE TEMP TABLE claim_b AS SELECT * FROM public.claim_billing_recovery_jobs(20,900) WHERE resource_id='p54';
SELECT isnt((SELECT lease_token FROM claim_a),(SELECT lease_token FROM claim_b),'reclaim gets a fresh token');
SELECT throws_ok(format('SELECT * FROM public.apply_billing_recovery_result(%L,%L,%L)',(SELECT id FROM claim_a),(SELECT lease_token FROM claim_a),'{"kind":"pending"}'),'P0001','billing_recovery_lease_not_owned','old worker fenced');
SELECT throws_ok(format('SELECT * FROM public.apply_billing_recovery_result(%L,NULL,%L)',(SELECT id FROM claim_b),'{"kind":"pending"}'),'P0001','billing_recovery_lease_not_owned','null token rejected');
SELECT is((SELECT status FROM public.apply_billing_recovery_result((SELECT id FROM claim_b),(SELECT lease_token FROM claim_b),'{"kind":"unrelated"}')),'resolved','current owner completes');
SELECT throws_ok(format('SELECT * FROM public.apply_billing_recovery_result(%L,%L,%L)',(SELECT id FROM claim_b),(SELECT lease_token FROM claim_b),'{"kind":"pending"}'),'P0001','billing_recovery_lease_not_owned','replay cannot mutate completed work');
SELECT ok(NOT has_function_privilege('anon','public.apply_billing_recovery_result(uuid,uuid,jsonb)','EXECUTE') AND NOT has_function_privilege('authenticated','public.apply_billing_recovery_result(uuid,uuid,jsonb)','EXECUTE') AND has_function_privilege('service_role','public.apply_billing_recovery_result(uuid,uuid,jsonb)','EXECUTE'),'only backend can apply');

SELECT public.enqueue_billing_recovery_job('mercadopago','payment','p54-event','payment_pending','e54-event');
CREATE TEMP TABLE event_claim AS SELECT * FROM public.claim_billing_recovery_jobs(20,900) WHERE resource_id='p54-event';
INSERT INTO auth.users(id,email,raw_user_meta_data,created_at,updated_at,confirmation_token,email_confirmed_at,recovery_token,aud,role)
VALUES('00000000-0000-0000-0000-000000005401','recovery54@example.com','{}',now(),now(),'',now(),'','authenticated','authenticated');
INSERT INTO public.accounts(id,type,name,slug,created_by) VALUES('00000000-0000-0000-0000-000000005410','team','Recovery54','recovery54','00000000-0000-0000-0000-000000005401');
INSERT INTO billing.customers(id,account_id,provider) VALUES('00000000-0000-0000-0000-000000005420','00000000-0000-0000-0000-000000005410','mercadopago');
INSERT INTO billing.subscriptions(id,customer_id,plan_id,status,provider,external_subscription_id,current_period_end)
VALUES('00000000-0000-0000-0000-000000005430','00000000-0000-0000-0000-000000005420',(SELECT id FROM billing.plans WHERE slug='pro' AND "interval"='month'),'active','mercadopago','pa-54','2026-09-01');
CREATE TEMP TABLE event_result AS SELECT '{"kind":"event","event":{"provider":"mercadopago","type":"invoice_paid","accountId":"00000000-0000-0000-0000-000000005410","externalEventId":"evt-paid54","externalSubscriptionId":"pa-54","externalInvoiceId":"invoice54","externalPaymentId":"p54-event","amountPaid":19990,"currency":"CLP","paidAt":"2026-10-20T12:00:00Z","periodStart":"2026-10-01T00:00:00Z","periodEnd":"2026-11-01T00:00:00Z","raw":{}}}'::jsonb AS payload;
SELECT throws_ok(format('SELECT * FROM public.apply_billing_recovery_result(%L,%L,%L)',(SELECT id FROM event_claim),'00000000-0000-0000-0000-000000005499',(SELECT payload FROM event_result)),'P0001','billing_recovery_lease_not_owned','wrong token cannot invoice');
UPDATE billing.recovery_jobs SET lease_expires_at=clock_timestamp()-interval '1 second' WHERE resource_id='p54-event';
SELECT throws_ok(format('SELECT * FROM public.apply_billing_recovery_result(%L,%L,%L)',(SELECT id FROM event_claim),(SELECT lease_token FROM event_claim),(SELECT payload FROM event_result)),'P0001','billing_recovery_lease_not_owned','expired without reclaim cannot invoice');
CREATE TEMP TABLE event_b AS SELECT * FROM public.claim_billing_recovery_jobs(20,900) WHERE resource_id='p54-event';
SELECT throws_ok(format('SELECT * FROM public.apply_billing_recovery_result(%L,%L,%L)',(SELECT id FROM event_claim),(SELECT lease_token FROM event_claim),(SELECT payload FROM event_result)),'P0001','billing_recovery_lease_not_owned','reclaimed old event cannot invoice');
SELECT throws_ok(format('SELECT * FROM public.apply_billing_recovery_result(%L,%L,%L)',(SELECT id FROM event_claim),(SELECT lease_token FROM event_claim),'{"kind":"anomaly","observation":{"anomalyType":"refund","externalResourceId":"p54-event"}}'),'P0001','billing_recovery_lease_not_owned','reclaimed old anomaly fenced');
SELECT throws_ok(format('SELECT * FROM public.apply_billing_recovery_result(%L,%L,%L)',(SELECT id FROM event_claim),(SELECT lease_token FROM event_claim),'{"kind":"error","errorCode":"provider_timeout"}'),'P0001','billing_recovery_lease_not_owned','reclaimed old error fenced');
SELECT is((SELECT count(*) FROM billing.invoices WHERE external_invoice_id='invoice54'),0::bigint,'stale results leave no invoice');
SELECT is((SELECT count(*) FROM billing.financial_anomalies WHERE external_resource_id='p54-event'),0::bigint,'stale results leave no anomaly');
SELECT throws_ok(format('SELECT * FROM public.apply_billing_recovery_result(%L,%L,%L)',(SELECT id FROM event_b),(SELECT lease_token FROM event_b),'{"kind":"anomaly","observation":{"anomalyType":"refund","externalResourceId":"other-resource"}}'),'P0001','billing_recovery_result_invalid','resource from other job rejected');
CREATE FUNCTION pg_temp.fail_recovery_completion() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.resource_id='p54-event' AND NEW.status='resolved' THEN RAISE EXCEPTION 'fixture_completion_failure'; END IF; RETURN NEW; END $$;
CREATE TRIGGER fixture_fail_completion BEFORE UPDATE ON billing.recovery_jobs FOR EACH ROW EXECUTE FUNCTION pg_temp.fail_recovery_completion();
SELECT throws_ok(format('SELECT * FROM public.apply_billing_recovery_result(%L,%L,%L)',(SELECT id FROM event_b),(SELECT lease_token FROM event_b),(SELECT payload FROM event_result)),'P0001','fixture_completion_failure','completion failure aborts effect transaction');
SELECT is((SELECT count(*) FROM billing.invoices WHERE external_invoice_id='invoice54'),0::bigint,'invoice rolled back with completion');
SELECT is((SELECT status FROM billing.recovery_jobs WHERE resource_id='p54-event'),'processing','failed transaction retains processing lease');
DROP TRIGGER fixture_fail_completion ON billing.recovery_jobs;
SELECT is((SELECT status FROM public.apply_billing_recovery_result((SELECT id FROM event_b),(SELECT lease_token FROM event_b),(SELECT payload FROM event_result))),'resolved','retry after rollback applies successfully');
SELECT is((SELECT count(*) FROM billing.invoices WHERE external_invoice_id='invoice54'),1::bigint,'exactly one persisted invoice');
SELECT is((SELECT current_period_end FROM billing.subscriptions WHERE id='00000000-0000-0000-0000-000000005430'),'2026-11-01'::timestamptz,'valid owner advances paid-through');

SELECT is((SELECT jsonb_agg(to_jsonb(j) ORDER BY j.id) FROM billing.recovery_jobs j JOIN foreign_jobs_before b USING(id)),(SELECT jsonb_agg(to_jsonb(b) ORDER BY b.id) FROM foreign_jobs_before b),'foreign jobs unchanged');
SELECT * FROM finish();
ROLLBACK;
