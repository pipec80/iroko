-- ============================================================================
-- Migration 012: Audit Logs
-- ============================================================================
-- Immutable, append-only audit trail for compliance and debugging.
-- Uses bigint IDENTITY for optimal sequential writes.
-- Only service_role can read/write (via GRANT on audit schema).
--
-- Index strategy (ajuste #10): consolidated composite index instead of
-- 4 separate indexes, reducing INSERT overhead on this high-write table.
-- ============================================================================

CREATE TABLE audit.logs (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id      uuid,
  actor_type    text DEFAULT 'user',   -- user, system, webhook
  action        audit.action_type NOT NULL,
  resource_type text NOT NULL,
  resource_id   text,
  account_id    uuid,
  old_data      jsonb,
  new_data      jsonb,
  ip_address    inet,
  user_agent    text,
  created_at    timestamptz DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Ajuste #10: Consolidated indexes
-- Instead of 4 separate indexes (actor, resource, account, created_at),
-- use 2 composite indexes that cover the main query patterns:
--   1. "What happened in this account?" → (account_id, resource_type, created_at)
--   2. "What did this user do?"          → (actor_id, created_at)
-- ---------------------------------------------------------------------------
CREATE INDEX idx_audit_account_resource
  ON audit.logs(account_id, resource_type, created_at DESC);

CREATE INDEX idx_audit_actor
  ON audit.logs(actor_id, created_at DESC);

-- BRIN index for time-range scans without account/actor filters (archiving,
-- analytics, cleanup jobs). 10x smaller than B-tree on append-only data.
CREATE INDEX idx_audit_created_brin
  ON audit.logs USING brin(created_at);

-- Append-only enforcement
CREATE TRIGGER audit_logs_immutable
  BEFORE UPDATE OR DELETE ON audit.logs
  FOR EACH ROW EXECUTE FUNCTION private.deny_mutation();
