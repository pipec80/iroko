-- pgTAP test: All SECURITY DEFINER functions in our schemas have search_path set
-- Prevents search_path injection attacks on privilege-escalating functions.
-- Scoped to our custom schemas (public, private, billing, audit).
-- Run with: pnpm supa:test

BEGIN;
SELECT plan(1);

SELECT is(
  (
    SELECT count(*)::int
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.prosecdef = true
      AND n.nspname IN ('public', 'private', 'billing', 'audit')
      AND NOT (
        p.proconfig IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM unnest(p.proconfig) AS cfg
          WHERE cfg LIKE 'search_path=%'
        )
      )
  ),
  0,
  'All SECURITY DEFINER functions in our schemas have search_path set'
);

SELECT * FROM finish();
ROLLBACK;
