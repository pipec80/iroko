-- ============================================================================
-- Migration 011: Billing Events (Event Sourcing)
-- ============================================================================
-- Append-only table for webhook events from payment providers.
-- Uses bigint IDENTITY (not uuid) for optimal sequential writes.
-- external_event_id serves as idempotency key to prevent duplicate processing.
--
-- deny_mutation() trigger (defined in migration 003) blocks UPDATE/DELETE.
-- ============================================================================

CREATE TABLE billing.events (
  id                bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_id       uuid REFERENCES billing.customers(id),
  event_type        text NOT NULL,
  provider          text NOT NULL DEFAULT 'stripe',
  external_event_id text UNIQUE,   -- idempotency key from provider
  payload           jsonb NOT NULL DEFAULT '{}'::jsonb,
  processed_at      timestamptz,
  created_at        timestamptz DEFAULT now()
);

CREATE INDEX idx_billing_events_type     ON billing.events(event_type);
CREATE INDEX idx_billing_events_customer ON billing.events(customer_id);
-- BRIN for time-range scans (reconciliation, analytics). Minimal overhead on
-- this append-only webhook event table.
CREATE INDEX idx_billing_events_created_brin
  ON billing.events USING brin(created_at);

-- Append-only enforcement
CREATE TRIGGER billing_events_immutable
  BEFORE UPDATE OR DELETE ON billing.events
  FOR EACH ROW EXECUTE FUNCTION private.deny_mutation();
