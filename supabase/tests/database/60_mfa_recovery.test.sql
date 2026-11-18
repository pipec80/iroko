BEGIN;
SELECT plan(18);
INSERT INTO auth.users(id,email,raw_user_meta_data,created_at,updated_at,confirmation_token,email_confirmed_at,recovery_token,aud,role)
VALUES ('00000000-0000-0000-0000-000000006001','mfa-recovery@example.test','{}',now(),now(),'',now(),'','authenticated','authenticated'),
       ('00000000-0000-0000-0000-000000006002','mfa-other@example.test','{}',now(),now(),'',now(),'','authenticated','authenticated');
INSERT INTO auth.mfa_factors(id,user_id,friendly_name,factor_type,status,secret,created_at,updated_at)
VALUES ('00000000-0000-0000-0000-000000006011','00000000-0000-0000-0000-000000006001','fixture','totp','verified','fixture',now(),now());
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000006001","aal":"aal1","role":"authenticated"}',true);
SELECT throws_ok('SELECT public.generate_recovery_codes()', 'P0001', 'mfa_required', 'AAL1 cannot generate a recovery credential');
SELECT ok(NOT has_function_privilege('anon','public.begin_mfa_recovery(text)','execute'), 'anonymous cannot claim');
SELECT ok(NOT has_function_privilege('authenticated','public.complete_mfa_recovery(uuid,uuid)','execute'), 'caller cannot acknowledge privileged reset');
SELECT ok(NOT has_table_privilege('authenticated','public.auth_recovery_codes','insert'), 'caller cannot forge a recovery credential');
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000006001","aal":"aal2","role":"authenticated"}',true);
CREATE TEMP TABLE fixture_codes AS SELECT unnest(public.generate_recovery_codes()) AS code;
SELECT is((SELECT count(*)::int FROM fixture_codes),10,'AAL2 with verified factor creates ten codes');
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000006001","aal":"aal1","role":"authenticated"}',true);
SELECT is((SELECT count(*)::int FROM public.begin_mfa_recovery('0000-0000')),0,'invalid code cannot claim');
CREATE TEMP TABLE fixture_claim AS SELECT * FROM public.begin_mfa_recovery((SELECT code FROM fixture_codes LIMIT 1));
SELECT is((SELECT count(*)::int FROM fixture_claim),1,'valid caller code authorizes one reset');
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000006001","aal":"aal2","role":"authenticated"}',true);
SELECT throws_ok('SELECT public.generate_recovery_codes()', 'P0001', 'mfa_recovery_in_progress', 'rotation cannot destroy an in-flight recovery');
SELECT is((SELECT count(*)::int FROM public.auth_recovery_codes WHERE id=(SELECT recovery_id FROM fixture_claim)),1,'in-flight snapshot survives attempted rotation');
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000006001","aal":"aal1","role":"authenticated"}',true);
SELECT is((SELECT factor_ids FROM fixture_claim),ARRAY['00000000-0000-0000-0000-000000006011']::uuid[],'claim snapshots only verified caller factors');
SELECT is((SELECT recovery_id FROM public.begin_mfa_recovery((SELECT code FROM fixture_codes LIMIT 1))), (SELECT recovery_id FROM fixture_claim),'retry resumes the same authorization');
INSERT INTO auth.mfa_factors(id,user_id,friendly_name,factor_type,status,secret,created_at,updated_at)
VALUES ('00000000-0000-0000-0000-000000006012','00000000-0000-0000-0000-000000006001','new-fixture','totp','verified','fixture',now(),now());
SELECT is((SELECT factor_ids FROM public.begin_mfa_recovery((SELECT code FROM fixture_codes LIMIT 1))), (SELECT factor_ids FROM fixture_claim),'retry never targets a newly enrolled factor');
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000006002","aal":"aal1","role":"authenticated"}',true);
SELECT is((SELECT count(*)::int FROM public.begin_mfa_recovery((SELECT code FROM fixture_codes LIMIT 1))),0,'another user cannot claim the code');
SELECT ok(public.complete_mfa_recovery('00000000-0000-0000-0000-000000006001',(SELECT recovery_id FROM fixture_claim)), 'server acknowledges reset');
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000006001","aal":"aal1","role":"authenticated"}',true);
SELECT is((SELECT count(*)::int FROM public.begin_mfa_recovery((SELECT code FROM fixture_codes LIMIT 1))),0,'completed code cannot start another recovery');
UPDATE public.auth_recovery_codes SET recovery_completed_at=null, used_at=now()-interval '16 minutes' WHERE id=(SELECT recovery_id FROM fixture_claim);
SELECT is((SELECT count(*)::int FROM public.begin_mfa_recovery((SELECT code FROM fixture_codes LIMIT 1))),0,'pending authorization expires');
SELECT set_config('request.jwt.claims','{}',true);
SELECT is((SELECT count(*)::int FROM public.begin_mfa_recovery((SELECT code FROM fixture_codes LIMIT 1))),0,'missing identity cannot claim');
SELECT throws_ok('SELECT public.generate_recovery_codes()', 'P0001', 'not_authenticated', 'missing identity cannot generate codes');
SELECT * FROM finish();
ROLLBACK;
