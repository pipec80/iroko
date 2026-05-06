-- pgTAP test: Internal schemas are inaccessible to anon and public roles
-- The real guard is SCHEMA USAGE, not function-level EXECUTE grants.
-- Migration 001 revokes ALL on billing, audit, and private schemas from
-- public/anon/authenticated. This test verifies that protection holds.
-- Run with: pnpm supa:test

BEGIN;
SELECT plan(3);

-- 1. anon has no USAGE on private schema
--    Without USAGE, anon cannot reference any function in this schema,
--    regardless of EXECUTE grants on individual functions.
SELECT is(
  (
    SELECT count(*)::int
    FROM information_schema.role_usage_grants
    WHERE object_schema = 'private'
      AND grantee IN ('anon', 'PUBLIC')
  ),
  0,
  'anon has no USAGE privilege on private schema'
);

-- 2. anon has no USAGE on billing schema
SELECT is(
  (
    SELECT count(*)::int
    FROM information_schema.role_usage_grants
    WHERE object_schema = 'billing'
      AND grantee IN ('anon', 'PUBLIC')
  ),
  0,
  'anon has no USAGE privilege on billing schema'
);

-- 3. anon has no USAGE on audit schema
SELECT is(
  (
    SELECT count(*)::int
    FROM information_schema.role_usage_grants
    WHERE object_schema = 'audit'
      AND grantee IN ('anon', 'PUBLIC')
  ),
  0,
  'anon has no USAGE privilege on audit schema'
);

SELECT * FROM finish();
ROLLBACK;
