BEGIN;
SELECT plan(15);
SELECT has_table('private','billing_worker_health','worker health exists');
SELECT has_function('public','get_billing_reconciliation_candidates',ARRAY['integer'],'scan RPC exists');
SELECT has_function('public','apply_billing_reconciliation_snapshot',ARRAY['text','text','uuid','text','uuid','billing.subscription_status','timestamp with time zone','timestamp with time zone','boolean','text','jsonb','timestamp with time zone'],'CAS RPC exists');
SELECT has_function('public','record_billing_worker_result',ARRAY['text','text','integer','jsonb'],'health RPC exists');
SELECT has_function('private','invoke_billing_worker',ARRAY['text'],'Vault dispatcher exists');
SELECT ok(has_function_privilege('service_role','public.get_billing_reconciliation_candidates(integer)','EXECUTE')
  AND NOT has_function_privilege('authenticated','public.get_billing_reconciliation_candidates(integer)','EXECUTE'),'scan is service only');
SELECT ok(NOT has_function_privilege('service_role','private.invoke_billing_worker(text)','EXECUTE'),'dispatcher has no application grant');
SELECT is(public.record_billing_worker_result('recovery','request-38',200,'{"claimed":1}'::jsonb),'recorded','health stores real route result');
SELECT results_eq($$select mode,last_status_code from private.billing_worker_health where mode='recovery'$$,
  $$select * from (values('recovery'::text,200)) expected(mode,last_status_code)$$,'health is singleton by mode');
SELECT throws_ok($$select private.invoke_billing_worker('invalid')$$,'P0001','billing_worker_mode_invalid','invalid dispatch mode fails closed');

INSERT INTO auth.users(id,email,raw_user_meta_data,created_at,updated_at,confirmation_token,email_confirmed_at,recovery_token,aud,role)
VALUES('00000000-0000-0000-0000-000000003801','reconcile@example.com','{}',now(),now(),'',now(),'','authenticated','authenticated');
INSERT INTO public.accounts(id,type,name,slug,created_by) VALUES('00000000-0000-0000-0000-000000003810','team','Reconcile','reconcile-38','00000000-0000-0000-0000-000000003801');
INSERT INTO billing.customers(id,account_id,provider) VALUES('00000000-0000-0000-0000-000000003820','00000000-0000-0000-0000-000000003810','mercadopago');
INSERT INTO billing.subscriptions(id,customer_id,plan_id,status,provider,external_subscription_id)
VALUES('00000000-0000-0000-0000-000000003830','00000000-0000-0000-0000-000000003820',(SELECT id FROM billing.plans WHERE slug='pro' AND "interval"='month'),'incomplete','mercadopago','pa-38');
SELECT is((SELECT count(*) FROM public.get_billing_reconciliation_candidates(20) WHERE external_subscription_id='pa-38'),1::bigint,'nonterminal row is scanned');
SELECT is(public.apply_billing_reconciliation_snapshot('mercadopago','reconcile-stale-38','00000000-0000-0000-0000-000000003810','pa-38',NULL,'active',NULL,NULL,false,NULL,'{}',now()-interval '1 day'),'stale','old snapshot loses CAS');
SELECT is((SELECT status::text FROM billing.subscriptions WHERE id='00000000-0000-0000-0000-000000003830'),'incomplete','stale CAS does not mutate');
SELECT is(public.apply_billing_reconciliation_snapshot('mercadopago','reconcile-apply-38','00000000-0000-0000-0000-000000003810','pa-38',NULL,'active',NULL,NULL,false,NULL,'{}',(SELECT updated_at FROM billing.subscriptions WHERE id='00000000-0000-0000-0000-000000003830')),'applied','matching CAS applies through reducer RPC');
SELECT is((SELECT status::text FROM billing.subscriptions WHERE id='00000000-0000-0000-0000-000000003830'),'active','matching snapshot repairs status');
SELECT * FROM finish();
ROLLBACK;
