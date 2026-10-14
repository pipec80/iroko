-- Transactional fixtures: no external requests or durable fixture residue.
BEGIN;
SELECT plan(35);
SELECT has_function('public','admit_account_api_request',ARRAY['inet','text'],'durable admission RPC exists');
SELECT ok(has_function_privilege('service_role','public.admit_account_api_request(inet,text)','EXECUTE'),'service role can admit');
SELECT ok(NOT has_function_privilege('anon','public.admit_account_api_request(inet,text)','EXECUTE'),'anon cannot admit');
SELECT ok(NOT has_function_privilege('authenticated','public.admit_account_api_request(inet,text)','EXECUTE'),'authenticated cannot admit');
SELECT ok(NOT has_table_privilege('anon','private.account_api_ip_admissions','SELECT'),'IP events are private');
SELECT ok(NOT has_table_privilege('authenticated','private.account_api_account_admissions','INSERT'),'account events cannot be forged');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid='private.account_api_ip_admissions'::regclass),'IP events have RLS');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid='private.account_api_account_admissions'::regclass),'account events have RLS');
INSERT INTO public.accounts(id,type,name,slug) VALUES
('00000000-0000-0000-0000-000000004800','team','Admission A','admission-a-48'),
('00000000-0000-0000-0000-000000004801','team','Admission B','admission-b-48');
INSERT INTO public.api_keys(account_id,name,key_prefix,key_hash,expires_at,revoked_at) VALUES
('00000000-0000-0000-0000-000000004800','A1','irk_test_a1',repeat('a',64),NULL,NULL),
('00000000-0000-0000-0000-000000004800','A2','irk_test_a2',repeat('b',64),NULL,NULL),
('00000000-0000-0000-0000-000000004801','B','irk_test_b',repeat('c',64),NULL,NULL),
('00000000-0000-0000-0000-000000004801','Expired','irk_expired',repeat('d',64),now()-interval '1 second',NULL),
('00000000-0000-0000-0000-000000004801','Revoked','irk_revoked',repeat('e',64),NULL,now());
SELECT is((SELECT decision FROM public.admit_account_api_request('198.51.100.48',NULL)),'missing_key','missing credentials rejected after IP admission');
SELECT is((SELECT count(*) FROM private.account_api_ip_admissions WHERE client_ip='198.51.100.48'),1::bigint,'invalid attempt consumes IP budget');
SELECT is((SELECT decision FROM public.admit_account_api_request('198.51.100.48',repeat('d',64))),'invalid_key','expired key rejected');
SELECT is((SELECT decision FROM public.admit_account_api_request('198.51.100.48',repeat('e',64))),'invalid_key','revoked key rejected');
INSERT INTO private.account_api_account_admissions(account_id,admitted_at)
SELECT '00000000-0000-0000-0000-000000004800',clock_timestamp()-interval '30 seconds' FROM generate_series(1,99);
SELECT is((SELECT decision FROM public.admit_account_api_request('198.51.100.48',repeat('a',64))),'allowed','admission 100 succeeds');
SELECT is((SELECT decision FROM public.admit_account_api_request('198.51.100.49',repeat('b',64))),'account_limited','rotated key shares account quota');
SELECT is((SELECT count(*) FROM private.account_api_account_admissions WHERE account_id='00000000-0000-0000-0000-000000004800'),100::bigint,'account rejection adds no account event');
SELECT ok((SELECT retry_after_seconds BETWEEN 1 AND 300 FROM public.admit_account_api_request('198.51.100.49',repeat('b',64))),'retry derives from oldest live account event');
SELECT is((SELECT decision FROM public.admit_account_api_request('198.51.100.48',repeat('c',64))),'allowed','different account has separate quota');
INSERT INTO private.account_api_ip_admissions(client_ip,admitted_at)
SELECT '198.51.100.50',clock_timestamp()-interval '1 second' FROM generate_series(1,299);
SELECT is((SELECT decision FROM public.admit_account_api_request('198.51.100.50',NULL)),'missing_key','IP admission 300 reaches verification');
SELECT is((SELECT decision FROM public.admit_account_api_request('198.51.100.50',repeat('c',64))),'ip_limited','IP admission 301 rejected before key use');
SELECT is((SELECT count(*) FROM private.account_api_ip_admissions WHERE client_ip='198.51.100.50'),300::bigint,'IP rejection does not extend window');
UPDATE private.account_api_ip_admissions SET admitted_at=clock_timestamp()-interval '301 seconds' WHERE client_ip='198.51.100.50';
SELECT is((SELECT decision FROM public.admit_account_api_request('198.51.100.50',repeat('c',64))),'allowed','expired IP window recovers');
UPDATE private.account_api_account_admissions SET admitted_at=clock_timestamp()-interval '301 seconds' WHERE account_id='00000000-0000-0000-0000-000000004800';
SELECT is((SELECT decision FROM public.admit_account_api_request('198.51.100.49',repeat('b',64))),'allowed','expired account window recovers');
SELECT is((SELECT count(*) FROM private.account_api_account_admissions WHERE account_id='00000000-0000-0000-0000-000000004800'),1::bigint,'expired events pruned');
SET LOCAL ROLE service_role;
SELECT is((SELECT account_id FROM public.admit_account_api_request('198.51.100.51',repeat('c',64))),'00000000-0000-0000-0000-000000004801'::uuid,'service role resolves account from key');
RESET ROLE;
SELECT throws_ok($$SELECT * FROM public.admit_account_api_request(NULL,NULL)$$,'22023',NULL,'missing IP fails closed');
SELECT throws_ok($$SELECT * FROM public.admit_account_api_request('198.51.100.0/24',NULL)$$,'22023',NULL,'network prefixes cannot select a different IP bucket');
SELECT is((SELECT decision FROM public.admit_account_api_request('198.51.100.52','unknown')),'invalid_key','unknown key is invalid');
SELECT is((SELECT count(*) FROM private.account_api_ip_admissions WHERE client_ip='198.51.100.52'),1::bigint,'unknown key still consumes IP quota');
SET LOCAL ROLE anon;
SELECT throws_ok($$SELECT * FROM public.admit_account_api_request('198.51.100.52',NULL)$$,'42501',NULL,'anon execution actually denied');
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT throws_ok($$SELECT * FROM public.admit_account_api_request('198.51.100.52',NULL)$$,'42501',NULL,'authenticated execution actually denied');
RESET ROLE;
SELECT ok(NOT has_function_privilege('service_role','private.cleanup_account_api_admissions()','EXECUTE'),'service role cannot invoke maintenance');
SELECT ok((SELECT command LIKE '%DELETE FROM private.rate_limit_counters%' AND command LIKE '%DELETE FROM private.rate_limits%'
  AND command LIKE '%private.cleanup_account_api_admissions()%'
  FROM cron.job WHERE jobname='cleanup-rate-limits'),'maintenance preserves established cleanups and appends admission cleanup');
INSERT INTO private.account_api_ip_admissions(client_ip,admitted_at)
SELECT '198.51.100.53',clock_timestamp()-interval '301 seconds' FROM generate_series(1,5001);
INSERT INTO private.account_api_account_admissions(account_id,admitted_at)
SELECT '00000000-0000-0000-0000-000000004801',clock_timestamp()-interval '301 seconds' FROM generate_series(1,5001);
CREATE TEMP TABLE admission_cleanup_before AS
SELECT (SELECT count(*) FROM private.account_api_ip_admissions) AS ip_events,
  (SELECT count(*) FROM private.account_api_account_admissions) AS account_events;
SELECT private.cleanup_account_api_admissions();
SELECT is((SELECT ip_events FROM admission_cleanup_before)-(SELECT count(*) FROM private.account_api_ip_admissions),5000::bigint,'maintenance bounds IP deletion to 5000');
SELECT is((SELECT account_events FROM admission_cleanup_before)-(SELECT count(*) FROM private.account_api_account_admissions),5000::bigint,'maintenance bounds account deletion to 5000');
SELECT ok(EXISTS(SELECT 1 FROM private.account_api_account_admissions WHERE admitted_at>clock_timestamp()-interval '300 seconds'),'maintenance preserves live reservations');
SELECT * FROM finish();
ROLLBACK;
