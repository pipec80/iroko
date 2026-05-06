-- pgTAP test: All foreign keys in our schemas have a supporting index
-- Unindexed FKs cause sequential scans on DELETE/UPDATE of the referenced row.
-- Scoped to our custom schemas (public, billing, audit, private).
-- Run with: pnpm supa:test

BEGIN;
SELECT plan(1);

SELECT is(
  (
    WITH fk_cols AS (
      SELECT
        tc.table_schema,
        tc.table_name,
        kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON kcu.constraint_name = tc.constraint_name
       AND kcu.table_schema    = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema IN ('public', 'billing', 'audit', 'private')
    ),
    indexed_cols AS (
      SELECT
        n.nspname  AS table_schema,
        t.relname  AS table_name,
        a.attname  AS column_name
      FROM pg_index ix
      JOIN pg_class t  ON t.oid = ix.indrelid
      JOIN pg_class i  ON i.oid = ix.indexrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      JOIN pg_attribute a ON a.attrelid = t.oid
                          AND a.attnum = ix.indkey[0]  -- leading column only
      WHERE n.nspname IN ('public', 'billing', 'audit', 'private')
    )
    SELECT count(*)::int
    FROM fk_cols f
    WHERE NOT EXISTS (
      SELECT 1 FROM indexed_cols ic
      WHERE ic.table_schema = f.table_schema
        AND ic.table_name   = f.table_name
        AND ic.column_name  = f.column_name
    )
  ),
  0,
  'All foreign key columns in our schemas have a supporting index'
);

SELECT * FROM finish();
ROLLBACK;
