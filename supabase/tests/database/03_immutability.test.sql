-- pgTAP test: audit.logs and billing.events are append-only (deny_mutation trigger)
-- deny_mutation() raises: 'Mutations not allowed on append-only table <TG_TABLE_NAME>'
-- TG_TABLE_NAME is the bare table name: 'logs' for audit.logs, 'events' for billing.events
-- Run with: pnpm supa:test

BEGIN;
SELECT plan(4);

-- Seed one row in each table using valid enum values
INSERT INTO audit.logs (actor_id, action, resource_type, resource_id)
VALUES ('00000000-0000-0000-0000-000000000002', 'create', 'profile', 'p1');

INSERT INTO billing.events (event_type, provider, payload)
VALUES ('invoice.paid', 'stripe', '{"amount": 9900}'::jsonb);

-- 1. UPDATE on audit.logs must raise the deny_mutation exception
SELECT throws_ok(
  $$UPDATE audit.logs SET actor_type = 'hacked' WHERE resource_type = 'profile'$$,
  'Mutations not allowed on append-only table logs'
);

-- 2. DELETE on audit.logs must raise the deny_mutation exception
SELECT throws_ok(
  $$DELETE FROM audit.logs WHERE resource_type = 'profile'$$,
  'Mutations not allowed on append-only table logs'
);

-- 3. UPDATE on billing.events must raise the deny_mutation exception
SELECT throws_ok(
  $$UPDATE billing.events SET provider = 'hacked' WHERE event_type = 'invoice.paid'$$,
  'Mutations not allowed on append-only table events'
);

-- 4. DELETE on billing.events must raise the deny_mutation exception
SELECT throws_ok(
  $$DELETE FROM billing.events WHERE event_type = 'invoice.paid'$$,
  'Mutations not allowed on append-only table events'
);

SELECT * FROM finish();
ROLLBACK;
