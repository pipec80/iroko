-- Plan 012.4: preserve extension/backend capabilities while denying clients.
-- Values never leave SQL; all synthetic Vault state is rolled back.
BEGIN;
SELECT plan(17);

SELECT ok(NOT has_schema_privilege('anon','vault','USAGE'),'anon cannot resolve Vault');
SET LOCAL ROLE anon;
SELECT throws_ok($$SELECT count(*) FROM vault.secrets$$,'42501',NULL,'anon cannot inspect encrypted rows');
SELECT throws_ok($$SELECT count(*) FROM vault.decrypted_secrets$$,'42501',NULL,'anon cannot inspect decrypted rows');
SELECT throws_ok($$SELECT vault.create_secret('synthetic-0124')$$,'42501',NULL,'anon cannot create secrets');
SELECT throws_ok($$SELECT private.email_worker_secret()$$,'42501',NULL,'anon cannot invoke email secret helper');
RESET ROLE;

SELECT ok(NOT has_schema_privilege('authenticated','vault','USAGE'),'authenticated cannot resolve Vault');
SET LOCAL ROLE authenticated;
SELECT throws_ok($$SELECT count(*) FROM vault.secrets$$,'42501',NULL,'authenticated cannot inspect encrypted rows');
SELECT throws_ok($$SELECT count(*) FROM vault.decrypted_secrets$$,'42501',NULL,'authenticated cannot inspect decrypted rows');
SELECT throws_ok($$SELECT vault.create_secret('synthetic-0124')$$,'42501',NULL,'authenticated cannot create secrets');
SELECT throws_ok($$SELECT private.email_worker_secret()$$,'42501',NULL,'authenticated cannot invoke email secret helper');
RESET ROLE;

SELECT ok(NOT EXISTS(SELECT 1 FROM pg_namespace n CROSS JOIN LATERAL aclexplode(n.nspacl) a WHERE n.nspname='vault' AND a.grantee=0 AND a.privilege_type='USAGE'),'PUBLIC has no Vault schema usage');
SELECT ok(NOT EXISTS(SELECT 1 FROM pg_proc p CROSS JOIN LATERAL aclexplode(p.proacl) a WHERE p.oid IN ('private.project_url()'::regprocedure,'private.email_worker_secret()'::regprocedure,'private.invoke_billing_worker(text)'::regprocedure) AND a.grantee=0 AND a.privilege_type='EXECUTE'),'PUBLIC cannot execute secret or dispatcher helpers');
SELECT ok(has_schema_privilege('service_role','vault','USAGE'),'reviewed backend Vault access is preserved');
SELECT ok(has_table_privilege('service_role','vault.decrypted_secrets','SELECT'),'reviewed backend decryption capability is preserved');
SELECT ok((SELECT bool_and(pg_get_userbyid(proowner)='postgres') FROM pg_proc WHERE oid IN ('private.project_url()'::regprocedure,'private.email_worker_secret()'::regprocedure,'private.invoke_billing_worker(text)'::regprocedure)),'application helpers retain their reviewed owner');

CREATE TEMP TABLE vault_0124_fixture ON COMMIT DROP AS SELECT vault.create_secret('synthetic-0124','plan0124-transaction-only') AS id;
SELECT ok((SELECT decrypted_secret='synthetic-0124' FROM vault.decrypted_secrets WHERE id=(SELECT id FROM vault_0124_fixture)),'owner-managed consumer can decrypt synthetic value without exposing it'); -- gitleaks:allow public transaction-only fixture
DELETE FROM vault.secrets WHERE id=(SELECT id FROM vault_0124_fixture);
SELECT is((SELECT count(*) FROM vault.secrets WHERE id=(SELECT id FROM vault_0124_fixture)),0::bigint,'owner cleanup removes synthetic secret');
SELECT * FROM finish();
ROLLBACK;
