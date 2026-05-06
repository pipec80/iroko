-- ============================================================================
-- Migration 001: Extensions, Schemas & Auto-RLS Event Trigger
-- ============================================================================
-- Sets up the foundational infrastructure:
--   1. Required Postgres extensions
--   2. Schema isolation (public, billing, audit, private)
--   3. Strict REVOKE for internal schemas (no GRANT to authenticated on billing)
--   4. Auto-enable RLS event trigger (official Supabase version)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto"     SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "moddatetime"  SCHEMA extensions;

-- ---------------------------------------------------------------------------
-- 2. Schemas
-- ---------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS billing;
CREATE SCHEMA IF NOT EXISTS audit;
CREATE SCHEMA IF NOT EXISTS private;

-- ---------------------------------------------------------------------------
-- 3. Security: Revoke all access to internal schemas
--    NOTE: NO GRANT USAGE ON billing TO authenticated (ajuste #6 del review)
--    Billing data is ONLY accessible via SECURITY DEFINER RPCs.
-- ---------------------------------------------------------------------------
REVOKE ALL ON SCHEMA billing FROM public, anon, authenticated;
REVOKE ALL ON SCHEMA audit   FROM public, anon, authenticated;
REVOKE ALL ON SCHEMA private FROM public, anon, authenticated;

-- Only service_role can access audit schema directly
GRANT USAGE ON SCHEMA audit TO service_role;

-- ---------------------------------------------------------------------------
-- 4. Auto-enable RLS on new tables in public schema
--    Official Supabase version — handles CREATE TABLE AS, SELECT INTO,
--    partitioned tables, and includes error handling.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.rls_auto_enable()
RETURNS EVENT_TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table', 'partitioned table')
  LOOP
    IF cmd.schema_name IS NOT NULL
       AND cmd.schema_name IN ('public')
       AND cmd.schema_name NOT IN ('pg_catalog', 'information_schema')
       AND cmd.schema_name NOT LIKE 'pg_toast%'
       AND cmd.schema_name NOT LIKE 'pg_temp%'
    THEN
      BEGIN
        EXECUTE format(
          'ALTER TABLE IF EXISTS %s ENABLE ROW LEVEL SECURITY',
          cmd.object_identity
        );
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
    ELSE
      RAISE LOG 'rls_auto_enable: skip % (schema: %)',
        cmd.object_identity, cmd.schema_name;
    END IF;
  END LOOP;
END;
$$;

DROP EVENT TRIGGER IF EXISTS ensure_rls;
CREATE EVENT TRIGGER ensure_rls
ON ddl_command_end
WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
EXECUTE FUNCTION private.rls_auto_enable();
