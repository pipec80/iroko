-- Effective schema privileges include PUBLIC and inherited grants.
BEGIN;
SELECT plan(5);

SELECT ok(NOT has_schema_privilege('anon', 'private', 'USAGE'), 'anon cannot use private');
-- billing.sql grants USAGE explicitly; this does not grant table CRUD or bypass RLS.
SELECT ok(has_schema_privilege('anon', 'billing', 'USAGE'), 'anon retains documented billing schema USAGE');
SELECT ok(NOT has_schema_privilege('anon', 'audit', 'USAGE'), 'anon cannot use audit');
SELECT ok(has_schema_privilege('authenticated', 'private', 'USAGE'), 'authenticated can resolve RLS helpers');
SELECT ok(has_schema_privilege('authenticated', 'public', 'USAGE'), 'authenticated can resolve application objects');

SELECT * FROM finish();
ROLLBACK;
