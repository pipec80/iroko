-- Plan 012.4: direct writes and admin/MFA publication enforce navigation safety.
BEGIN;
SELECT plan(25);
SELECT ok((SELECT bool_and(private.is_safe_navigation_link(href)) FROM (VALUES
 ('/'::text),('/es/dashboard?tab=all#users'),('/a@b?q=https://remote.invalid/a/../b#../@'),
 ('/es/caf%C3%A9'),('/a/%2f/b'),('https://xn--maana-pta.example/'),
 ('https://example.com/a?q=%C3%A9#%C3%B1'),('https://[::1]:8443/'),
 ('https://example.com:0/'),('https://example.com/a?x=@user:pass@host#..')
) corpus(href)),'canonical TS corpus accepts IDNA percent URI IPv6 and query-only delimiters');
SELECT ok((SELECT bool_and(NOT private.is_safe_navigation_link(href)) FROM (VALUES
 ('javascript:alert(1)'::text),('JaVaScRiPt:x'),('data:text/html,x'),('vbscript:x'),
 ('file:///etc/passwd'),('ftp://example.com'),('mailto:a@example.com'),('http://example.com'),
 ('//example.com'),('/a/..//example.com'),('/a/./b'),('/a/%2E%2e/b'),
 (E'/a\\b'),(E'\n/es/dashboard'),(E'/es/\tusers'),('/a'||chr(127)||'b'),('/a'||chr(133)||'b'),
 ('https://user:pass@example.com/'),('https://@example.com/'),('https:/example.com/'),
 ('https:///example.com/'),('https://'),('/bad%zz'),('/bad%'),(''),('   '),
 ('https://example.com:65536/'),('https://example.com:443/'),('https://[not-ip]/')
) corpus(href)),'unsafe or noncanonical corpus fails closed');
SELECT ok(private.is_safe_navigation_link('/'||repeat('a',1999)),'canonical length 2000 accepted');
SELECT ok(NOT private.is_safe_navigation_link('/'||repeat('a',2000)),'canonical length 2001 rejected');
SELECT ok(private.is_safe_navigation_link(NULL),'NULL always means no navigation');
SELECT ok((SELECT NOT prosecdef AND provolatile='i' FROM pg_proc WHERE oid='private.is_safe_navigation_link(text)'::regprocedure),'navigation helper is pure immutable invoker');
SELECT ok(has_function_privilege('authenticated','private.is_safe_navigation_link(text)','EXECUTE'),'authenticated can evaluate constraint helper');
SELECT ok(has_function_privilege('service_role','private.is_safe_navigation_link(text)','EXECUTE'),'backend can evaluate constraint helper');
SELECT ok(NOT has_function_privilege('anon','private.is_safe_navigation_link(text)','EXECUTE'),'anon does not gain helper execution');
SELECT ok(NOT EXISTS(SELECT 1 FROM pg_proc p CROSS JOIN LATERAL aclexplode(p.proacl) a WHERE p.oid='private.is_safe_navigation_link(text)'::regprocedure AND a.grantee=0),'PUBLIC does not gain helper execution');
SELECT ok(NOT has_schema_privilege('service_role','private','USAGE'),'constraint helper adds no broad backend private schema usage');
SELECT is((SELECT count(*) FROM pg_trigger WHERE tgname IN ('announcements_broadcast','notifications_broadcast') AND NOT tgisinternal),2::bigint,'existing broadcasts remain present without duplicate subscriptions');
SELECT is((SELECT count(*) FROM pg_constraint WHERE conname IN ('announcements_navigation_link_check','notifications_navigation_link_check') AND convalidated),2::bigint,'both navigation constraints validated');
SELECT ok(has_function_privilege('authenticated','public.publish_announcement(text,text,text,text)','EXECUTE') AND NOT has_function_privilege('anon','public.publish_announcement(text,text,text,text)','EXECUTE') AND NOT has_function_privilege('service_role','public.publish_announcement(text,text,text,text)','EXECUTE'),'publish RPC ACL preserved');
INSERT INTO auth.users(id,email,raw_user_meta_data,created_at,updated_at,
 confirmation_token,email_confirmed_at,recovery_token,aud,role)
VALUES ('00000000-0000-0000-0000-000000005101','navigation-51@example.test',
 '{}',now(),now(),'',now(),'','authenticated','authenticated');
INSERT INTO public.platform_admins(user_id) VALUES ('00000000-0000-0000-0000-000000005101');

SET LOCAL ROLE service_role;
SELECT throws_ok($$INSERT INTO public.notifications(user_id,type,title,link) VALUES ('00000000-0000-0000-0000-000000005101','info','invalid notification','javascript:alert(1)')$$,'23514',NULL,'backend direct notification INSERT rejects unsafe link');
SELECT lives_ok($$INSERT INTO public.notifications(user_id,type,title,link) VALUES ('00000000-0000-0000-0000-000000005101','info','safe notification','/es/dashboard?tab=all#users')$$,'backend notification INSERT accepts canonical path without broad schema grants');
RESET ROLE;
SELECT throws_ok($$INSERT INTO public.announcements(type,title,link) VALUES ('info','invalid announcement','//host.example')$$,'23514',NULL,'privileged direct announcement INSERT still obeys link constraint');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"role":"authenticated","sub":"00000000-0000-0000-0000-000000005101","aal":"aal2"}',true);
SELECT throws_ok($$SELECT public.publish_announcement('info','invalid RPC',NULL,'data:text/html,bad')$$,'P0001','invalid_link','admin MFA RPC rejects unsafe link before persistence');
SELECT throws_ok($$SELECT public.publish_announcement('info','control RPC',NULL,E'\n/es/dashboard')$$,'P0001','invalid_link','RPC does not trim away forbidden controls');
SELECT is((SELECT link FROM public.publish_announcement('info','safe RPC',NULL,'https://xn--maana-pta.example/es/caf%C3%A9?q=%C3%A9#%C3%B1')),'https://xn--maana-pta.example/es/caf%C3%A9?q=%C3%A9#%C3%B1','admin MFA RPC preserves canonical IDNA percent-encoded URL');
SELECT ok((SELECT link IS NULL FROM public.publish_announcement('info','blank RPC',NULL,'   ')),'blank RPC link means no navigation');
SELECT set_config('request.jwt.claims','{"role":"authenticated","sub":"00000000-0000-0000-0000-000000005101","aal":"aal1"}',true);
SELECT throws_ok($$SELECT public.publish_announcement('info','MFA denied',NULL,'/es/dashboard')$$,'mfa_required','existing MFA guard remains enforced');
RESET ROLE;
SELECT is((SELECT count(*) FROM public.announcements WHERE title IN ('invalid announcement','invalid RPC','control RPC')),0::bigint,'invalid calls do not persist announcements');
SELECT is((SELECT count(*) FROM public.notifications WHERE title='invalid notification'),0::bigint,'invalid backend call does not persist notification');
SELECT throws_ok($$UPDATE public.notifications SET link='//host.example' WHERE title='safe notification'$$,'23514',NULL,'privileged direct UPDATE cannot bypass navigation constraint');
SELECT * FROM finish();
ROLLBACK;
