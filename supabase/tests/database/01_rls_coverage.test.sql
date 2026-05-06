-- pgTAP test: RLS enabled on all public tables
-- Run with: pnpm supa:test

BEGIN;
SELECT plan(1);

SELECT is(
  (
    SELECT count(*)::int
    FROM pg_tables
    WHERE schemaname = 'public'
      AND NOT rowsecurity
  ),
  0,
  'All tables in public schema have RLS enabled'
);

SELECT * FROM finish();
ROLLBACK;
