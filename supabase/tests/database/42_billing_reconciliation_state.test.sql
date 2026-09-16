BEGIN;

SELECT plan(49);

SELECT has_table(
  'billing',
  'reconciliation_state',
  'provider-neutral reconciliation state exists'
);
SELECT has_index(
  'billing',
  'reconciliation_state',
  'reconciliation_state_next_scan_idx',
  'due reconciliation scans have a stable ordering index'
);
SELECT has_function(
  'public',
  'claim_billing_reconciliation_candidates',
  ARRAY['integer', 'integer', 'text'],
  'claim RPC exists'
);
SELECT has_function(
  'public',
  'complete_billing_reconciliation_candidate',
  ARRAY[
    'uuid',
    'text',
    'text',
    'timestamp with time zone',
    'text',
    'text'
  ],
  'completion RPC exists'
);
SELECT ok(
  has_table_privilege('service_role', 'billing.reconciliation_state', 'SELECT')
    AND NOT has_table_privilege('anon', 'billing.reconciliation_state', 'SELECT')
    AND NOT has_table_privilege('authenticated', 'billing.reconciliation_state', 'SELECT'),
  'only the service role can read reconciliation state'
);
SELECT ok(
  has_function_privilege(
    'service_role',
    'public.claim_billing_reconciliation_candidates(integer,integer,text)',
    'EXECUTE'
  )
    AND NOT has_function_privilege(
      'anon',
      'public.claim_billing_reconciliation_candidates(integer,integer,text)',
      'EXECUTE'
    )
    AND NOT has_function_privilege(
      'authenticated',
      'public.claim_billing_reconciliation_candidates(integer,integer,text)',
      'EXECUTE'
    ),
  'claim RPC is service-only'
);
SELECT ok(
  has_function_privilege(
    'service_role',
    'public.complete_billing_reconciliation_candidate(uuid,text,text,timestamp with time zone,text,text)',
    'EXECUTE'
  )
    AND NOT has_function_privilege(
      'anon',
      'public.complete_billing_reconciliation_candidate(uuid,text,text,timestamp with time zone,text,text)',
      'EXECUTE'
    )
    AND NOT has_function_privilege(
      'authenticated',
      'public.complete_billing_reconciliation_candidate(uuid,text,text,timestamp with time zone,text,text)',
      'EXECUTE'
    ),
  'completion RPC is service-only'
);

INSERT INTO auth.users (
  id,
  email,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_confirmed_at,
  recovery_token,
  aud,
  role
)
VALUES (
  '00000000-0000-0000-0000-000000004201',
  'reconciliation-state@example.com',
  '{}',
  now(),
  now(),
  '',
  now(),
  '',
  'authenticated',
  'authenticated'
);

INSERT INTO public.accounts (id, type, name, slug, created_by)
VALUES (
  '00000000-0000-0000-0000-000000004210',
  'team',
  'Reconciliation State',
  'reconciliation-state-42',
  '00000000-0000-0000-0000-000000004201'
);

INSERT INTO billing.customers (id, account_id, provider)
VALUES (
  '00000000-0000-0000-0000-000000004220',
  '00000000-0000-0000-0000-000000004210',
  'mercadopago'
);

INSERT INTO billing.subscriptions (
  id,
  customer_id,
  plan_id,
  status,
  provider,
  external_subscription_id
)
SELECT
  (
    '00000000-0000-0000-0000-'
    || lpad((4230 + fixture_number)::text, 12, '0')
  )::uuid,
  '00000000-0000-0000-0000-000000004220'::uuid,
  (
    SELECT id
    FROM billing.plans
    WHERE slug = 'pro' AND "interval" = 'month'
  ),
  'active',
  'mercadopago',
  'pa-42-' || lpad(fixture_number::text, 2, '0')
FROM generate_series(1, 25) AS fixtures(fixture_number);

INSERT INTO billing.subscriptions (
  id,
  customer_id,
  plan_id,
  status,
  provider,
  external_subscription_id
)
VALUES
  (
    '00000000-0000-0000-0000-000000004290',
    '00000000-0000-0000-0000-000000004220',
    (SELECT id FROM billing.plans WHERE slug = 'pro' AND "interval" = 'month'),
    'active',
    'future-provider',
    'future-provider-42'
  ),
  (
    '00000000-0000-0000-0000-000000004291',
    '00000000-0000-0000-0000-000000004220',
    (SELECT id FROM billing.plans WHERE slug = 'pro' AND "interval" = 'month'),
    'canceled',
    'mercadopago',
    'pa-terminal-42'
  ),
  (
    '00000000-0000-0000-0000-000000004292',
    '00000000-0000-0000-0000-000000004220',
    (SELECT id FROM billing.plans WHERE slug = 'pro' AND "interval" = 'month'),
    'active',
    'mercadopago',
    NULL
  );

SELECT is(
  (
    SELECT count(*)
    FROM billing.subscriptions AS subscription
    LEFT JOIN billing.reconciliation_state AS state
      ON state.subscription_id = subscription.id
    WHERE NULLIF(btrim(subscription.external_subscription_id), '') IS NOT NULL
      AND state.subscription_id IS NULL
  ),
  0::bigint,
  'every subscription with a remote identity has durable state'
);
SELECT is(
  (
    SELECT count(*)
    FROM billing.reconciliation_state
    WHERE subscription_id = '00000000-0000-0000-0000-000000004292'
  ),
  0::bigint,
  'a missing remote identity does not create reconciliation state'
);

UPDATE billing.subscriptions
SET external_subscription_id = 'pa-trigger-42'
WHERE id = '00000000-0000-0000-0000-000000004292';

UPDATE billing.subscriptions
SET external_subscription_id = 'pa-trigger-42-updated'
WHERE id = '00000000-0000-0000-0000-000000004292';

SELECT is(
  (
    SELECT count(*)
    FROM billing.reconciliation_state
    WHERE subscription_id = '00000000-0000-0000-0000-000000004292'
  ),
  1::bigint,
  'the remote-identity trigger creates state exactly once'
);

UPDATE billing.reconciliation_state
SET next_scan_at = now() - interval '1 minute'
WHERE subscription_id BETWEEN
  '00000000-0000-0000-0000-000000004231' AND
  '00000000-0000-0000-0000-000000004255';
UPDATE billing.reconciliation_state
SET next_scan_at = now() + interval '1 day'
WHERE subscription_id IN (
  '00000000-0000-0000-0000-000000004290',
  '00000000-0000-0000-0000-000000004292'
);

SELECT throws_ok(
  $$SELECT public.claim_billing_reconciliation_candidates(0, 900, 'worker-42')$$,
  'P0001',
  'billing_reconciliation_batch_invalid',
  'claim rejects a batch below one'
);
SELECT throws_ok(
  $$SELECT public.claim_billing_reconciliation_candidates(21, 900, 'worker-42')$$,
  'P0001',
  'billing_reconciliation_batch_invalid',
  'claim rejects a batch above twenty'
);
SELECT throws_ok(
  $$SELECT public.claim_billing_reconciliation_candidates(1, 29, 'worker-42')$$,
  'P0001',
  'billing_reconciliation_visibility_invalid',
  'claim rejects visibility below thirty seconds'
);
SELECT throws_ok(
  $$SELECT public.claim_billing_reconciliation_candidates(1, 1801, 'worker-42')$$,
  'P0001',
  'billing_reconciliation_visibility_invalid',
  'claim rejects visibility above thirty minutes'
);
SELECT throws_ok(
  $$SELECT public.claim_billing_reconciliation_candidates(1, 30, '')$$,
  'P0001',
  'billing_reconciliation_worker_invalid',
  'claim rejects an empty worker ID'
);
SELECT throws_ok(
  $$SELECT public.claim_billing_reconciliation_candidates(1, 1800, repeat('w', 101))$$,
  'P0001',
  'billing_reconciliation_worker_invalid',
  'claim rejects a worker ID longer than one hundred characters'
);

CREATE TEMP TABLE claim_42_first ON COMMIT DROP AS
SELECT row_number() OVER () AS claim_ordinal, claimed.*
FROM public.claim_billing_reconciliation_candidates(20, 900, 'worker-42-a') AS claimed;
CREATE TEMP TABLE claim_42_second ON COMMIT DROP AS
SELECT *
FROM public.claim_billing_reconciliation_candidates(20, 900, 'worker-42-b');

SELECT is(
  (SELECT count(*) FROM claim_42_first),
  20::bigint,
  'first worker claims one bounded page'
);
SELECT is(
  (SELECT count(DISTINCT subscription_id) FROM claim_42_first),
  20::bigint,
  'a claim contains unique subscriptions'
);
SELECT is(
  (SELECT array_agg(subscription_id ORDER BY claim_ordinal) FROM claim_42_first),
  (
    SELECT array_agg(
      (
        '00000000-0000-0000-0000-'
        || lpad((4230 + fixture_number)::text, 12, '0')
      )::uuid
      ORDER BY fixture_number
    )
    FROM generate_series(1, 20) AS fixtures(fixture_number)
  ),
  'the returned ordinal follows subscription UUID order for identical due times'
);
SELECT is(
  (SELECT count(*) FROM claim_42_second),
  5::bigint,
  'a concurrent worker claims the remaining due rows'
);
SELECT is(
  (
    SELECT count(*)
    FROM claim_42_first AS first_claim
    INNER JOIN claim_42_second AS second_claim USING (subscription_id)
  ),
  0::bigint,
  'active leases cannot be claimed twice'
);
SELECT is(
  (
    SELECT count(*)
    FROM billing.reconciliation_state
    WHERE subscription_id = '00000000-0000-0000-0000-000000004291'
      AND lease_owner IS NOT NULL
  ),
  0::bigint,
  'terminal subscriptions keep history without entering a claim'
);

SELECT throws_ok(
  $$
    SELECT public.complete_billing_reconciliation_candidate(
      '00000000-0000-0000-0000-000000004231',
      'wrong-worker',
      'completed',
      NULL,
      NULL,
      NULL
    )
  $$,
  'P0001',
  'billing_reconciliation_lease_not_owned',
  'only the lease owner completes a candidate'
);
SELECT throws_ok(
  $$
    SELECT public.complete_billing_reconciliation_candidate(
      '00000000-0000-0000-0000-000000004231',
      'worker-42-a',
      'invalid',
      NULL,
      NULL,
      NULL
    )
  $$,
  'P0001',
  'billing_reconciliation_outcome_invalid',
  'completion rejects unknown outcomes'
);

UPDATE billing.reconciliation_state
SET lease_expires_at = now() - interval '1 second',
  next_scan_at = now() - interval '1 minute'
WHERE subscription_id = '00000000-0000-0000-0000-000000004231';

CREATE TEMP TABLE claim_42_reclaimed ON COMMIT DROP AS
SELECT *
FROM public.claim_billing_reconciliation_candidates(1, 30, 'worker-42-reclaimer');

SELECT is(
  (SELECT subscription_id FROM claim_42_reclaimed),
  '00000000-0000-0000-0000-000000004231'::uuid,
  'an expired lease is reclaimable'
);
SELECT throws_ok(
  $$
    SELECT public.complete_billing_reconciliation_candidate(
      '00000000-0000-0000-0000-000000004231',
      'worker-42-a',
      'completed',
      NULL,
      NULL,
      NULL
    )
  $$,
  'P0001',
  'billing_reconciliation_lease_not_owned',
  'the old owner cannot complete a reclaimed lease'
);
SELECT is(
  public.complete_billing_reconciliation_candidate(
    '00000000-0000-0000-0000-000000004231',
    'worker-42-reclaimer',
    'completed',
    '2026-09-12T12:00:00Z',
    NULL,
    NULL
  ),
  'completed',
  'the current owner completes a final page'
);
SELECT ok(
  (
    SELECT invoice_watermark = '2026-09-12T12:00:00Z'
      AND scan_cursor IS NULL
      AND scan_watermark IS NULL
      AND failure_count = 0
      AND lease_owner IS NULL
      AND lease_expires_at IS NULL
      AND last_completed_at IS NOT NULL
      AND next_scan_at BETWEEN now() + interval '59 minutes' AND now() + interval '61 minutes'
    FROM billing.reconciliation_state
    WHERE subscription_id = '00000000-0000-0000-0000-000000004231'
  ),
  'final completion advances the watermark and schedules the next hourly scan'
);

UPDATE billing.reconciliation_state
SET invoice_watermark = '2026-09-10T12:00:00Z',
  failure_count = 3
WHERE subscription_id = '00000000-0000-0000-0000-000000004232';
SELECT is(
  public.complete_billing_reconciliation_candidate(
    '00000000-0000-0000-0000-000000004232',
    'worker-42-a',
    'deferred',
    '2026-09-12T12:00:00Z',
    'cursor-42',
    NULL
  ),
  'deferred',
  'an intermediate page is deferred durably'
);
SELECT ok(
  (
    SELECT invoice_watermark = '2026-09-10T12:00:00Z'
      AND scan_watermark = '2026-09-12T12:00:00Z'
      AND scan_cursor = 'cursor-42'
      AND failure_count = 3
      AND lease_owner IS NULL
      AND lease_expires_at IS NULL
      AND next_scan_at BETWEEN now() + interval '59 seconds' AND now() + interval '61 seconds'
    FROM billing.reconciliation_state
    WHERE subscription_id = '00000000-0000-0000-0000-000000004232'
  ),
  'deferred completion retains scan progress and releases the lease'
);

UPDATE billing.reconciliation_state
SET next_scan_at = now() - interval '1 second'
WHERE subscription_id = '00000000-0000-0000-0000-000000004232';
CREATE TEMP TABLE claim_42_resumed ON COMMIT DROP AS
SELECT *
FROM public.claim_billing_reconciliation_candidates(1, 30, 'worker-42-resumer');
SELECT results_eq(
  $$
    SELECT subscription_id, scan_cursor, scan_watermark
    FROM claim_42_resumed
  $$,
  $$
    VALUES (
      '00000000-0000-0000-0000-000000004232'::uuid,
      'cursor-42'::text,
      '2026-09-12T12:00:00Z'::timestamptz
    )
  $$,
  'the next lease resumes the persisted cursor and scan watermark'
);
SELECT is(
  public.complete_billing_reconciliation_candidate(
    '00000000-0000-0000-0000-000000004232',
    'worker-42-resumer',
    'completed',
    '2026-09-11T12:00:00Z',
    NULL,
    NULL
  ),
  'completed',
  'the resumed final page completes'
);
SELECT ok(
  (
    SELECT invoice_watermark = '2026-09-12T12:00:00Z'
      AND scan_cursor IS NULL
      AND scan_watermark IS NULL
      AND failure_count = 0
    FROM billing.reconciliation_state
    WHERE subscription_id = '00000000-0000-0000-0000-000000004232'
  ),
  'final completion uses the greatest accumulated watermark and resets scan failures'
);

UPDATE billing.reconciliation_state
SET invoice_watermark = '2026-09-10T12:00:00Z',
  failure_count = 2
WHERE subscription_id = '00000000-0000-0000-0000-000000004233';
SELECT is(
  public.complete_billing_reconciliation_candidate(
    '00000000-0000-0000-0000-000000004233',
    'worker-42-a',
    'completed',
    '2026-09-13T12:00:00Z',
    'cursor-nonfinal-42',
    NULL
  ),
  'completed',
  'a non-final completed page remains resumable'
);
SELECT ok(
  (
    SELECT invoice_watermark = '2026-09-10T12:00:00Z'
      AND scan_watermark = '2026-09-13T12:00:00Z'
      AND scan_cursor = 'cursor-nonfinal-42'
      AND failure_count = 2
    FROM billing.reconciliation_state
    WHERE subscription_id = '00000000-0000-0000-0000-000000004233'
  ),
  'a cursor prevents premature watermark publication and reset'
);

UPDATE billing.reconciliation_state
SET failure_count = 3
WHERE subscription_id = '00000000-0000-0000-0000-000000004234';
SELECT throws_ok(
  $$
    SELECT public.complete_billing_reconciliation_candidate(
      '00000000-0000-0000-0000-000000004234',
      'worker-42-a',
      'failed',
      NULL,
      NULL,
      NULL
    )
  $$,
  'P0001',
  'billing_reconciliation_error_code_required',
  'failed completion rejects a null error code'
);
SELECT is(
  public.complete_billing_reconciliation_candidate(
    '00000000-0000-0000-0000-000000004234',
    'worker-42-a',
    'failed',
    NULL,
    NULL,
    repeat('e', 150)
  ),
  'failed',
  'a failed candidate records retry state'
);
SELECT ok(
  (
    SELECT failure_count = 4
      AND lease_owner IS NULL
      AND lease_expires_at IS NULL
      AND char_length(last_error_code) = 100
      AND next_scan_at BETWEEN now() + interval '15 minutes 59 seconds'
        AND now() + interval '16 minutes 1 second'
    FROM billing.reconciliation_state
    WHERE subscription_id = '00000000-0000-0000-0000-000000004234'
  ),
  'failure applies exponential backoff and sanitizes its code'
);

UPDATE billing.reconciliation_state
SET failure_count = 10,
  next_scan_at = now() - interval '1 second'
WHERE subscription_id = '00000000-0000-0000-0000-000000004235';
SELECT throws_ok(
  $$
    SELECT public.complete_billing_reconciliation_candidate(
      '00000000-0000-0000-0000-000000004235',
      'worker-42-a',
      'failed',
      NULL,
      NULL,
      '   '
    )
  $$,
  'P0001',
  'billing_reconciliation_error_code_required',
  'failed completion rejects a blank error code'
);
SELECT is(
  public.complete_billing_reconciliation_candidate(
    '00000000-0000-0000-0000-000000004235',
    'worker-42-a',
    'failed',
    NULL,
    NULL,
    'provider_fetch_failed'
  ),
  'failed',
  'a saturated failure counter remains retryable'
);
SELECT ok(
  (
    SELECT failure_count = 10
      AND next_scan_at BETWEEN now() + interval '59 minutes 59 seconds'
        AND now() + interval '60 minutes 1 second'
    FROM billing.reconciliation_state
    WHERE subscription_id = '00000000-0000-0000-0000-000000004235'
  ),
  'failure count and exponential backoff are bounded'
);

UPDATE billing.reconciliation_state
SET next_scan_at = now() - interval '1 second'
WHERE subscription_id = '00000000-0000-0000-0000-000000004290';
CREATE TEMP TABLE claim_42_unsupported ON COMMIT DROP AS
SELECT *
FROM public.claim_billing_reconciliation_candidates(1, 30, 'worker-42-skip');
SELECT results_eq(
  $$SELECT subscription_id, provider FROM claim_42_unsupported$$,
  $$VALUES ('00000000-0000-0000-0000-000000004290'::uuid, 'future-provider'::text)$$,
  'the durable protocol remains provider-neutral'
);
SELECT is(
  public.complete_billing_reconciliation_candidate(
    '00000000-0000-0000-0000-000000004290',
    'worker-42-skip',
    'skipped',
    NULL,
    NULL,
    NULL
  ),
  'skipped',
  'an unsupported provider can be completed explicitly'
);
SELECT ok(
  (
    SELECT lease_owner IS NULL
      AND lease_expires_at IS NULL
      AND next_scan_at BETWEEN now() + interval '5 hours 59 minutes 59 seconds'
        AND now() + interval '6 hours 1 second'
    FROM billing.reconciliation_state
    WHERE subscription_id = '00000000-0000-0000-0000-000000004290'
  ),
  'skipped candidates move six hours forward'
);

UPDATE billing.reconciliation_state
SET scan_cursor = 'obsolete-terminal-cursor',
  scan_watermark = '2026-09-14T12:00:00Z',
  last_error_code = 'obsolete_terminal_error',
  failure_count = 3
WHERE subscription_id = '00000000-0000-0000-0000-000000004236';
UPDATE billing.subscriptions
SET status = 'canceled'
WHERE id = '00000000-0000-0000-0000-000000004236';
SELECT ok(
  (
    SELECT lease_owner = 'worker-42-a'
      AND lease_expires_at > now()
      AND scan_cursor = 'obsolete-terminal-cursor'
      AND scan_watermark = '2026-09-14T12:00:00Z'
      AND last_error_code = 'obsolete_terminal_error'
      AND failure_count = 3
    FROM billing.reconciliation_state
    WHERE subscription_id = '00000000-0000-0000-0000-000000004236'
  ),
  'a terminal transition preserves an active worker lease until its owner completes it'
);
SELECT is(
  public.complete_billing_reconciliation_candidate(
    '00000000-0000-0000-0000-000000004236',
    'worker-42-a',
    'skipped',
    NULL,
    NULL,
    NULL
  ),
  'skipped',
  'the active worker explicitly completes terminal reconciliation as skipped'
);
SELECT ok(
  (
    SELECT next_scan_at BETWEEN now() + interval '5 hours 59 minutes 59 seconds'
        AND now() + interval '6 hours 1 second'
      AND lease_owner IS NULL
      AND lease_expires_at IS NULL
      AND scan_cursor IS NULL
      AND scan_watermark IS NULL
      AND last_error_code IS NULL
      AND failure_count = 0
      AND last_completed_at IS NOT NULL
    FROM billing.reconciliation_state
    WHERE subscription_id = '00000000-0000-0000-0000-000000004236'
  ),
  'skipped completion clears terminal active work and schedules the next scan in six hours'
);

CREATE EXTENSION IF NOT EXISTS dblink WITH SCHEMA extensions;
DO $setup$
BEGIN
  PERFORM extensions.dblink_connect(
    'reconciliation-lock-42',
    'host=host.docker.internal port=54322 dbname=postgres user=postgres password=postgres'
  );
  PERFORM extensions.dblink_connect(
    'reconciliation-claim-42',
    'host=host.docker.internal port=54322 dbname=postgres user=postgres password=postgres'
  );
  PERFORM extensions.dblink_exec(
    'reconciliation-lock-42',
    $remote$
      INSERT INTO auth.users(
        id,email,raw_user_meta_data,created_at,updated_at,confirmation_token,
        email_confirmed_at,recovery_token,aud,role
      ) VALUES (
        '00000000-0000-0000-0000-000000004393',
        'reconciliation-contention-4393@example.com','{}',now(),now(),'',now(),'',
        'authenticated','authenticated'
      ) ON CONFLICT (id) DO NOTHING
    $remote$
  );
  PERFORM extensions.dblink_exec(
    'reconciliation-lock-42',
    $remote$
      INSERT INTO billing.customers(id,account_id,provider)
      VALUES (
        '00000000-0000-0000-0000-000000004394',
        '00000000-0000-0000-0000-000000004393','mercadopago'
      ) ON CONFLICT DO NOTHING
    $remote$
  );
  PERFORM extensions.dblink_exec(
    'reconciliation-lock-42',
    $remote$
      INSERT INTO billing.subscriptions(
        id,customer_id,plan_id,status,provider,external_subscription_id
      ) VALUES
      (
        '00000000-0000-0000-0000-000000004395',
        '00000000-0000-0000-0000-000000004394',
        (SELECT id FROM billing.plans WHERE slug='pro' AND "interval"='month'),
        'active','mercadopago','pa-contention-42-a'
      ),
      (
        '00000000-0000-0000-0000-000000004396',
        '00000000-0000-0000-0000-000000004394',
        (SELECT id FROM billing.plans WHERE slug='pro' AND "interval"='month'),
        'active','mercadopago','pa-contention-42-b'
      ) ON CONFLICT DO NOTHING
    $remote$
  );
  PERFORM extensions.dblink_exec(
    'reconciliation-lock-42',
    $remote$
      UPDATE billing.reconciliation_state
      SET next_scan_at='1900-01-01T00:00:00Z',lease_owner=NULL,lease_expires_at=NULL
      WHERE subscription_id IN (
        '00000000-0000-0000-0000-000000004395',
        '00000000-0000-0000-0000-000000004396'
      )
    $remote$
  );
  PERFORM extensions.dblink_exec('reconciliation-lock-42', 'BEGIN');
END;
$setup$;

CREATE TEMP TABLE contention_lock_42 ON COMMIT DROP AS
SELECT locked.subscription_id
FROM extensions.dblink(
  'reconciliation-lock-42',
  $remote$
    SELECT subscription_id::text
    FROM billing.reconciliation_state
    WHERE subscription_id='00000000-0000-0000-0000-000000004395'
    FOR UPDATE
  $remote$
) AS locked(subscription_id text);

SELECT results_eq(
  $query$
    SELECT claimed.subscription_id::uuid
    FROM extensions.dblink(
      'reconciliation-claim-42',
      $remote$
        SELECT subscription_id::text
        FROM public.claim_billing_reconciliation_candidates(
          1,30,'worker-42-concurrent'
        )
      $remote$
    ) AS claimed(subscription_id text)
  $query$,
  $$VALUES ('00000000-0000-0000-0000-000000004396'::uuid)$$,
  'a second session skips the concurrently locked first due row'
);

DO $cleanup$
BEGIN
  PERFORM extensions.dblink_exec('reconciliation-lock-42', 'ROLLBACK');
  PERFORM extensions.dblink_disconnect('reconciliation-lock-42');
  PERFORM extensions.dblink_exec(
    'reconciliation-claim-42',
    $remote$
      DELETE FROM billing.reconciliation_state
      WHERE subscription_id IN (
        '00000000-0000-0000-0000-000000004395',
        '00000000-0000-0000-0000-000000004396'
      )
    $remote$
  );
  PERFORM extensions.dblink_exec(
    'reconciliation-claim-42',
    $remote$
      DELETE FROM billing.subscriptions
      WHERE id IN (
        '00000000-0000-0000-0000-000000004395',
        '00000000-0000-0000-0000-000000004396'
      )
    $remote$
  );
  PERFORM extensions.dblink_exec(
    'reconciliation-claim-42',
    $remote$
      DELETE FROM billing.customers
      WHERE id='00000000-0000-0000-0000-000000004394'
    $remote$
  );
  PERFORM extensions.dblink_exec(
    'reconciliation-claim-42',
    $remote$
      DELETE FROM public.accounts
      WHERE id='00000000-0000-0000-0000-000000004393'
    $remote$
  );
  PERFORM extensions.dblink_exec(
    'reconciliation-claim-42',
    $remote$
      DELETE FROM auth.users
      WHERE id='00000000-0000-0000-0000-000000004393'
    $remote$
  );
  PERFORM extensions.dblink_disconnect('reconciliation-claim-42');
END;
$cleanup$;

SELECT throws_ok(
  $$
    UPDATE billing.reconciliation_state
    SET failure_count = 11
    WHERE subscription_id = '00000000-0000-0000-0000-000000004237'
  $$,
  '23514',
  NULL,
  'failure count cannot exceed ten'
);

SELECT * FROM finish();
ROLLBACK;
