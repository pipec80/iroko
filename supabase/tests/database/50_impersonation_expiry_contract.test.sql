-- Plan 012.4: exercise actual caller roles and signed-claim contracts.
-- All fixtures, including the backend body-only EXECUTE grant, roll back.
BEGIN;
SELECT plan(26);

INSERT INTO auth.users(id,email,raw_user_meta_data,created_at,updated_at,
 confirmation_token,email_confirmed_at,recovery_token,aud,role)
SELECT ('00000000-0000-0000-0000-' || lpad(n::text,12,'0'))::uuid,
 'impersonation-50-' || n || '@example.test','{}'::jsonb,now(),now(),'',now(),'',
 'authenticated','authenticated'
FROM generate_series(5001,5004) n;

INSERT INTO public.impersonation_sessions(id,admin_id,target_user_id,reason,expires_at)
VALUES ('00000000-0000-0000-0000-000000005050','00000000-0000-0000-0000-000000005001',
 '00000000-0000-0000-0000-000000005002','expiry contract',clock_timestamp()-interval '1 minute');

SELECT ok(has_function_privilege('authenticated','public.end_impersonation_session(uuid,text)','EXECUTE'),'authenticated RPC grant preserved');
SELECT ok(NOT has_function_privilege('anon','public.end_impersonation_session(uuid,text)','EXECUTE'),'anon RPC ACL stays denied');
SELECT ok(NOT has_function_privilege('service_role','public.end_impersonation_session(uuid,text)','EXECUTE'),'existing backend RPC ACL stays unchanged');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"role":"authenticated"}',true);
SELECT throws_ok($$SELECT public.end_impersonation_session('00000000-0000-0000-0000-000000005050','expired')$$,'42501','not_authorized','authenticated without sub cannot close a row');
SELECT set_config('request.jwt.claims','{"role":"service_role"}',true);
SELECT throws_ok($$SELECT public.end_impersonation_session('00000000-0000-0000-0000-000000005050','expired')$$,'42501','not_authorized','JWT role alone cannot impersonate backend caller');
SELECT set_config('request.jwt.claims','{"role":"authenticated","sub":"00000000-0000-0000-0000-000000005003","app_metadata":{"impersonated_by":"00000000-0000-0000-0000-000000005001"}}',true);
SELECT throws_ok($$SELECT public.end_impersonation_session('00000000-0000-0000-0000-000000005050','expired')$$,'42501','not_authorized','another target cannot close the row');
SELECT set_config('request.jwt.claims','{"role":"authenticated","sub":"00000000-0000-0000-0000-000000005002","app_metadata":{"impersonated_by":"00000000-0000-0000-0000-000000005003"}}',true);
SELECT throws_ok($$SELECT public.end_impersonation_session('00000000-0000-0000-0000-000000005050','expired')$$,'42501','not_authorized','wrong admin claim cannot close the row');
SELECT set_config('request.jwt.claims','{"role":"authenticated","sub":"00000000-0000-0000-0000-000000005002","user_metadata":{"impersonated_by":"00000000-0000-0000-0000-000000005001"}}',true);
SELECT throws_ok($$SELECT public.end_impersonation_session('00000000-0000-0000-0000-000000005050','expired')$$,'42501','not_authorized','user-editable metadata is never authorization');
SELECT set_config('request.jwt.claims','{"role":"authenticated","sub":"00000000-0000-0000-0000-000000005002","app_metadata":{"impersonated_by":"00000000-0000-0000-0000-000000005001"}}',true);
SELECT throws_ok($$SELECT public.end_impersonation_session('00000000-0000-0000-0000-000000005050','manual')$$,'42501','not_authorized','target cannot use manual reason');
SELECT throws_ok($$SELECT public.end_impersonation_session('00000000-0000-0000-0000-000000005050',NULL)$$,'42501','not_authorized','target cannot use NULL reason');
SELECT throws_ok($$SELECT public.end_impersonation_session('00000000-0000-0000-0000-000000005099','expired')$$,'P0001','session_not_found','unknown row rejected');
RESET ROLE;
UPDATE public.impersonation_sessions SET expires_at=clock_timestamp()+interval '1 minute' WHERE id='00000000-0000-0000-0000-000000005050';
SET LOCAL ROLE authenticated;
SELECT throws_ok($$SELECT public.end_impersonation_session('00000000-0000-0000-0000-000000005050','expired')$$,'42501','not_authorized','target cannot close before expiry');
RESET ROLE;
SELECT is((SELECT count(*) FROM audit.logs WHERE resource_id='00000000-0000-0000-0000-000000005050' AND action='impersonate_end'),0::bigint,'denied calls do not audit a successful close');
SELECT ok((SELECT ended_at IS NULL FROM public.impersonation_sessions WHERE id='00000000-0000-0000-0000-000000005050'),'denied calls preserve active row');
UPDATE public.impersonation_sessions SET expires_at=clock_timestamp()-interval '1 minute' WHERE id='00000000-0000-0000-0000-000000005050';
SET LOCAL ROLE anon;
SELECT throws_ok($$SELECT public.end_impersonation_session('00000000-0000-0000-0000-000000005050','expired')$$,'42501',NULL,'anon cannot invoke closure');
SET LOCAL ROLE authenticated;
SELECT lives_ok($$SELECT public.end_impersonation_session('00000000-0000-0000-0000-000000005050','expired')$$,'correct target and signed admin claim can close expired row');
SELECT lives_ok($$SELECT public.end_impersonation_session('00000000-0000-0000-0000-000000005050','expired')$$,'same authorized expiry is idempotent');
RESET ROLE;
SELECT is((SELECT ended_reason FROM public.impersonation_sessions WHERE id='00000000-0000-0000-0000-000000005050'),'expired','successful expiry persists reason');
SELECT is((SELECT count(*) FROM audit.logs WHERE resource_id='00000000-0000-0000-0000-000000005050' AND action='impersonate_end'),1::bigint,'idempotent expiry emits only one end audit');

INSERT INTO public.impersonation_sessions(id,admin_id,target_user_id,reason,expires_at)
VALUES ('00000000-0000-0000-0000-000000005051','00000000-0000-0000-0000-000000005001','00000000-0000-0000-0000-000000005002','manual contract',clock_timestamp()+interval '30 minutes');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"role":"authenticated","sub":"00000000-0000-0000-0000-000000005001"}',true);
SELECT lives_ok($$SELECT public.end_impersonation_session('00000000-0000-0000-0000-000000005051','manual')$$,'owner manual close remains allowed before expiry');
RESET ROLE;
SELECT is((SELECT ended_reason FROM public.impersonation_sessions WHERE id='00000000-0000-0000-0000-000000005051'),'manual','owner manual reason persisted');

INSERT INTO public.impersonation_sessions(id,admin_id,target_user_id,reason,expires_at)
VALUES ('00000000-0000-0000-0000-000000005052','00000000-0000-0000-0000-000000005001','00000000-0000-0000-0000-000000005002','backend contract',clock_timestamp()-interval '1 minute');
-- Existing backend ACL denies entry. This transactional grant tests the body
-- independently without broadening the shipped production function grants.
SET LOCAL ROLE service_role;
SELECT set_config('request.jwt.claims','{"role":"service_role"}',true);
SELECT throws_ok($$SELECT public.end_impersonation_session('00000000-0000-0000-0000-000000005052','expired')$$,'42501',NULL,'real backend RPC remains denied by unchanged ACL');
RESET ROLE;
GRANT EXECUTE ON FUNCTION public.end_impersonation_session(uuid,text) TO service_role;
SET LOCAL ROLE service_role;
SELECT set_config('request.jwt.claims','{"role":"authenticated"}',true);
SELECT throws_ok($$SELECT public.end_impersonation_session('00000000-0000-0000-0000-000000005052','expired')$$,'42501','not_authorized','backend body requires matching verified JWT role');
SELECT set_config('request.jwt.claims','{"role":"service_role"}',true);
SELECT lives_ok($$SELECT public.end_impersonation_session('00000000-0000-0000-0000-000000005052','expired')$$,'verified service_role body accepts no-UID backend caller');
RESET ROLE;
SELECT ok((SELECT ended_at IS NOT NULL FROM public.impersonation_sessions WHERE id='00000000-0000-0000-0000-000000005052'),'backend positive really closes the row');
SELECT is((SELECT count(*) FROM audit.logs WHERE resource_id='00000000-0000-0000-0000-000000005052' AND action='impersonate_end'),1::bigint,'backend body success emits one end audit');
SELECT * FROM finish();
ROLLBACK;
