-- Exercise the exact account summary read after durable admission.
-- Fixture and all assertions are transactional; no HTTP or provider changes.
BEGIN;
SELECT plan(7);
INSERT INTO public.accounts(id,type,name,slug,metadata)
VALUES ('00000000-0000-0000-0000-000000004900','team','API summary ACL','api-summary-acl-49','{"hidden":true}');

SELECT ok(NOT has_table_privilege('service_role','public.accounts','SELECT'),'backend summary does not gain table-wide SELECT');
SELECT ok(NOT has_table_privilege('service_role','public.accounts','INSERT')
  AND NOT has_table_privilege('service_role','public.accounts','UPDATE')
  AND NOT has_table_privilege('service_role','public.accounts','DELETE'),'backend summary does not gain direct mutation grants');
SET LOCAL ROLE service_role;
SELECT results_eq(
  $$SELECT id,name,slug,type FROM public.accounts WHERE id='00000000-0000-0000-0000-000000004900'::uuid$$,
  $$VALUES ('00000000-0000-0000-0000-000000004900'::uuid,'API summary ACL'::text,'api-summary-acl-49'::text,'team'::public.account_type)$$,
  'backend executes exact four-column account lookup and id filter');
SELECT throws_ok('SELECT metadata FROM public.accounts','42501',NULL,'backend metadata read remains denied');
SELECT throws_ok('SELECT * FROM public.accounts','42501',NULL,'backend wildcard read remains denied');
RESET ROLE;
SELECT ok(NOT has_any_column_privilege('anon','public.accounts','SELECT'),'anon does not gain account summary visibility');
SELECT ok(NOT has_table_privilege('anon','public.accounts','INSERT')
  AND NOT has_table_privilege('anon','public.accounts','UPDATE')
  AND NOT has_table_privilege('anon','public.accounts','DELETE'),'anon mutation ACL remains closed');
SELECT * FROM finish();
ROLLBACK;
