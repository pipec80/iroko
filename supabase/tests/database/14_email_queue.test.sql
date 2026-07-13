-- pgTAP: pgmq email_queue setup (F2-2F)
-- Run with: pnpm supa:test

BEGIN;
SELECT plan(1);

SELECT ok(
  to_regclass('pgmq.q_email_queue') IS NOT NULL,
  'la cola pgmq email_queue existe');

SELECT * FROM finish();
ROLLBACK;
