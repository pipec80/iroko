-- ============================================================================
-- Migration 017: Role-Level Statement Timeouts
-- ============================================================================
-- Sets per-role query timeouts to protect against runaway queries.
--
--   anon:           3s  — public API callers, defense against abuse
--   authenticated:  15s — logged-in users; dashboards may run heavier queries
--   service_role:   no timeout — background jobs, migrations, admin tasks
--
-- PostgREST picks up ALTER ROLE changes after NOTIFY pgrst, 'reload config'.
-- ============================================================================

ALTER ROLE anon          SET statement_timeout = '3s';
ALTER ROLE authenticated SET statement_timeout = '15s';
-- service_role intentionally left at default (no timeout)

-- Signal PostgREST to reload its connection pool so new sessions inherit
-- the updated role settings immediately.
NOTIFY pgrst, 'reload config';
