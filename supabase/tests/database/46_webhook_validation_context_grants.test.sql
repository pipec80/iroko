-- Node update validation uses a real column-limited SELECT, including filters.
-- Fixture has no Vault entry or delivery and cannot initiate an HTTP request.
-- All fixture rows are discarded by ROLLBACK.
BEGIN;
SELECT plan(18);

INSERT INTO public.accounts (id, type, name, slug)
VALUES ('00000000-0000-0000-0000-000000004600', 'team', 'Validation ACL fixture', 'validation-acl-fixture-46');
INSERT INTO public.webhook_endpoints (id, account_id, url, secret_id, events, version)
VALUES ('00000000-0000-0000-0000-000000004601',
        '00000000-0000-0000-0000-000000004600',
        'https://example.invalid/never-sent',
        '00000000-0000-0000-0000-000000004602',
        ARRAY['account.updated'], 7);

SELECT ok(has_column_privilege('service_role', 'public.webhook_endpoints', 'id', 'SELECT'), 'Node can filter endpoint id');
SELECT ok(has_column_privilege('service_role', 'public.webhook_endpoints', 'account_id', 'SELECT'), 'Node can read and filter account id');
SELECT ok(has_column_privilege('service_role', 'public.webhook_endpoints', 'version', 'SELECT'), 'Node can read endpoint version');
SELECT ok(NOT has_table_privilege('service_role', 'public.webhook_endpoints', 'SELECT'), 'Node does not gain table-wide SELECT');
SELECT ok(NOT has_column_privilege('service_role', 'public.webhook_endpoints', 'url', 'SELECT'), 'Node does not gain direct URL visibility');
SELECT ok(NOT has_column_privilege('service_role', 'public.webhook_endpoints', 'secret_id', 'SELECT'), 'Node does not gain signing-secret reference visibility');
SELECT ok(NOT has_table_privilege('service_role', 'public.webhook_endpoints', 'INSERT'), 'Node does not gain direct INSERT');
SELECT ok(NOT has_table_privilege('service_role', 'public.webhook_endpoints', 'UPDATE'), 'Node does not gain direct UPDATE');
SELECT ok(NOT has_table_privilege('service_role', 'public.webhook_endpoints', 'DELETE'), 'Node does not gain direct DELETE');

SET LOCAL ROLE service_role;
SELECT results_eq(
  $$SELECT id,account_id,version FROM public.webhook_endpoints WHERE id='00000000-0000-0000-0000-000000004601'::uuid$$,
  $$VALUES ('00000000-0000-0000-0000-000000004601'::uuid,'00000000-0000-0000-0000-000000004600'::uuid,7::bigint)$$,
  'service_role executes the three-column SELECT with id predicate');
SELECT results_eq(
  $$SELECT account_id,version FROM public.webhook_endpoints WHERE id='00000000-0000-0000-0000-000000004601'::uuid AND account_id='00000000-0000-0000-0000-000000004600'::uuid$$,
  $$VALUES ('00000000-0000-0000-0000-000000004600'::uuid,7::bigint)$$,
  'Node registration lookup returns the account and version with both predicates');
SELECT throws_ok($$SELECT url FROM public.webhook_endpoints WHERE id='00000000-0000-0000-0000-000000004601'::uuid$$, '42501', NULL, 'service_role direct URL SELECT remains denied');
SELECT throws_ok($$SELECT secret_id FROM public.webhook_endpoints WHERE id='00000000-0000-0000-0000-000000004601'::uuid$$, '42501', NULL, 'service_role direct secret reference SELECT remains denied');
SELECT throws_ok($$SELECT * FROM public.webhook_endpoints WHERE id='00000000-0000-0000-0000-000000004601'::uuid$$, '42501', NULL, 'service_role wildcard SELECT remains denied');
RESET ROLE;

SET LOCAL ROLE anon;
SELECT throws_ok($$SELECT id,account_id,version FROM public.webhook_endpoints$$, '42501', NULL, 'anon cannot read validation context directly');
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT throws_ok($$SELECT id,account_id,version FROM public.webhook_endpoints$$, '42501', NULL, 'authenticated remains RPC-only');
RESET ROLE;

SELECT ok(NOT has_any_column_privilege('anon', 'public.webhook_endpoints', 'SELECT'), 'anon has no endpoint SELECT column grant');
SELECT ok(NOT has_any_column_privilege('authenticated', 'public.webhook_endpoints', 'SELECT'), 'authenticated has no endpoint SELECT column grant');
SELECT * FROM finish();
ROLLBACK;
