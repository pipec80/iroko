-- ============================================================================
-- Migration 003: Helper Functions
-- ============================================================================
-- Utility functions in the `private` schema. These are NOT exposed via API.
--   1. set_updated_at()           — trigger function for auto-updating timestamps
--   2. slugify()                  — generates URL-safe slugs from text
--   3. apply_updated_at_trigger() — macro to attach the trigger to any table
--   4. deny_mutation()            — blocks UPDATE/DELETE on append-only tables
--
-- All functions have SET search_path = '' to prevent search_path injection.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Auto-update updated_at on row modification
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. Generate URL-safe slug from text
--    Removes non-alphanumeric chars, replaces spaces with hyphens, lowercases.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.slugify(text)
RETURNS text
LANGUAGE sql
IMMUTABLE STRICT
SET search_path = ''
AS $$
  SELECT lower(
    regexp_replace(
      regexp_replace($1, '[^a-zA-Z0-9\s-]', '', 'g'),
      '\s+', '-', 'g'
    )
  );
$$;

-- ---------------------------------------------------------------------------
-- 3. Macro: attach set_updated_at trigger to any table
--    Usage: SELECT private.apply_updated_at_trigger('schema.table_name');
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.apply_updated_at_trigger(table_name regclass)
RETURNS void
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  EXECUTE format(
    'CREATE TRIGGER set_updated_at BEFORE UPDATE ON %s
     FOR EACH ROW EXECUTE FUNCTION private.set_updated_at()',
    table_name
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. Deny mutation on append-only tables (audit.logs, billing.events)
--    Raises an exception on any UPDATE or DELETE attempt.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.deny_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'Mutations not allowed on append-only table %', TG_TABLE_NAME;
END;
$$;
