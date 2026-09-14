-- pgTAP: operator resolution for abandoned or ambiguous checkout intents.
BEGIN;
SELECT plan(22);

SELECT has_column('billing', 'checkout_intents', 'resolved_at', 'checkout intents record resolution time');
SELECT has_column('billing', 'checkout_intents', 'resolution_code', 'checkout intents record a resolution code');
SELECT has_column('billing', 'checkout_intents', 'resolved_by', 'checkout intents record the operator reference');
SELECT has_function(
  'private',
  'resolve_billing_checkout_intent',
  ARRAY['uuid', 'text', 'text', 'text'],
  'private operator resolver exists'
);
SELECT ok(
  NOT has_function_privilege(
    'service_role',
    'private.resolve_billing_checkout_intent(uuid,text,text,text)',
    'EXECUTE'
  )
  AND NOT has_function_privilege(
    'authenticated',
    'private.resolve_billing_checkout_intent(uuid,text,text,text)',
    'EXECUTE'
  )
  AND NOT has_function_privilege(
    'anon',
    'private.resolve_billing_checkout_intent(uuid,text,text,text)',
    'EXECUTE'
  ),
  'operator resolver has no application grant'
);

INSERT INTO auth.users (
  id, email, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_confirmed_at, recovery_token, aud, role
) VALUES (
  '00000000-0000-0000-0000-000000004000', 'checkout-resolution@example.com',
  '{}'::jsonb, now(), now(), '', now(), '', 'authenticated', 'authenticated'
);

INSERT INTO public.accounts (id, type, name, slug, created_by)
VALUES
  ('00000000-0000-0000-0000-000000004010', 'team', 'Needs Review Resolution',
   'needs-review-resolution', '00000000-0000-0000-0000-000000004000'),
  ('00000000-0000-0000-0000-000000004020', 'team', 'Stale Pending Resolution',
   'stale-pending-resolution', '00000000-0000-0000-0000-000000004000'),
  ('00000000-0000-0000-0000-000000004030', 'team', 'Fresh Pending Resolution',
   'fresh-pending-resolution', '00000000-0000-0000-0000-000000004000'),
  ('00000000-0000-0000-0000-000000004040', 'team', 'Confirmed Resolution',
   'confirmed-resolution', '00000000-0000-0000-0000-000000004000'),
  ('00000000-0000-0000-0000-000000004050', 'team', 'Remote Linked Resolution',
   'remote-linked-resolution', '00000000-0000-0000-0000-000000004000'),
  ('00000000-0000-0000-0000-000000004060', 'team', 'Missing Lease Resolution',
   'missing-lease-resolution', '00000000-0000-0000-0000-000000004000');

INSERT INTO billing.checkout_intents (
  id, account_id, plan_id, provider, status, external_subscription_id,
  lease_expires_at
)
VALUES
  (
    '00000000-0000-0000-0000-000000004001',
    '00000000-0000-0000-0000-000000004010',
    (SELECT id FROM billing.plans WHERE slug = 'pro' AND "interval" = 'month'),
    'mercadopago', 'needs_review', NULL, NULL
  ),
  (
    '00000000-0000-0000-0000-000000004002',
    '00000000-0000-0000-0000-000000004020',
    (SELECT id FROM billing.plans WHERE slug = 'pro' AND "interval" = 'month'),
    'mercadopago', 'pending', NULL, now() - interval '1 minute'
  ),
  (
    '00000000-0000-0000-0000-000000004003',
    '00000000-0000-0000-0000-000000004030',
    (SELECT id FROM billing.plans WHERE slug = 'pro' AND "interval" = 'month'),
    'mercadopago', 'pending', NULL, now() + interval '5 minutes'
  ),
  (
    '00000000-0000-0000-0000-000000004004',
    '00000000-0000-0000-0000-000000004040',
    (SELECT id FROM billing.plans WHERE slug = 'pro' AND "interval" = 'month'),
    'mercadopago', 'confirmed', NULL, NULL
  ),
  (
    '00000000-0000-0000-0000-000000004005',
    '00000000-0000-0000-0000-000000004050',
    (SELECT id FROM billing.plans WHERE slug = 'pro' AND "interval" = 'month'),
    'mercadopago', 'needs_review', 'preapproval-resolution-40', NULL
  ),
  (
    '00000000-0000-0000-0000-000000004006',
    '00000000-0000-0000-0000-000000004060',
    (SELECT id FROM billing.plans WHERE slug = 'pro' AND "interval" = 'month'),
    'mercadopago', 'pending', NULL, NULL
  );

SELECT lives_ok(
  $$ SELECT private.resolve_billing_checkout_intent(
       '00000000-0000-0000-0000-000000004001',
       'failed',
       ' remote_absent_after_provider_review ',
       ' operator:resolution-40 '
     ) $$,
  'a needs-review intent can be resolved after provider inspection'
);
SELECT results_eq(
  $$ SELECT status, resolution_code, resolved_by
     FROM billing.checkout_intents
     WHERE id = '00000000-0000-0000-0000-000000004001' $$,
  $$ VALUES (
       'failed'::text,
       'remote_absent_after_provider_review'::text,
       'operator:resolution-40'::text
     ) $$,
  'resolution stores the terminal status and trimmed audit values atomically'
);
SELECT ok(
  (SELECT resolved_at IS NOT NULL
   FROM billing.checkout_intents
   WHERE id = '00000000-0000-0000-0000-000000004001'),
  'resolution records its timestamp'
);
CREATE TEMP TABLE resolution_40_snapshot AS
SELECT status, resolved_at, resolution_code, resolved_by
FROM billing.checkout_intents
WHERE id = '00000000-0000-0000-0000-000000004001';

SELECT throws_like(
  $$ SELECT private.resolve_billing_checkout_intent(
       '00000000-0000-0000-0000-000000004002', 'confirmed', 'reviewed', 'operator-40') $$,
  '%billing_checkout_outcome_invalid%',
  'only canceled or failed are valid operator outcomes'
);
SELECT throws_like(
  $$ SELECT private.resolve_billing_checkout_intent(
       '00000000-0000-0000-0000-000000004002', 'failed', '   ', 'operator-40') $$,
  '%billing_checkout_resolution_code_invalid%',
  'blank resolution codes are rejected'
);
SELECT throws_like(
  $$ SELECT private.resolve_billing_checkout_intent(
       '00000000-0000-0000-0000-000000004002', 'failed', repeat('c', 101), 'operator-40') $$,
  '%billing_checkout_resolution_code_invalid%',
  'overlong resolution codes are rejected'
);
SELECT throws_like(
  $$ SELECT private.resolve_billing_checkout_intent(
       '00000000-0000-0000-0000-000000004002', 'failed', 'reviewed', '   ') $$,
  '%billing_checkout_operator_reference_invalid%',
  'blank operator references are rejected'
);
SELECT throws_like(
  $$ SELECT private.resolve_billing_checkout_intent(
       '00000000-0000-0000-0000-000000004002', 'failed', 'reviewed', repeat('o', 121)) $$,
  '%billing_checkout_operator_reference_invalid%',
  'overlong operator references are rejected'
);
SELECT throws_like(
  $$ SELECT private.resolve_billing_checkout_intent(
       '00000000-0000-0000-0000-000000004003', 'failed', 'reviewed', 'operator-40') $$,
  '%billing_checkout_intent_not_resolvable%',
  'fresh pending intents remain blocking'
);
SELECT throws_like(
  $$ SELECT private.resolve_billing_checkout_intent(
       '00000000-0000-0000-0000-000000004006', 'failed', 'reviewed', 'operator-40') $$,
  '%billing_checkout_intent_not_resolvable%',
  'pending intents without an expired non-null lease remain blocking'
);
SELECT throws_like(
  $$ SELECT private.resolve_billing_checkout_intent(
       '00000000-0000-0000-0000-000000004004', 'failed', 'reviewed', 'operator-40') $$,
  '%billing_checkout_intent_not_resolvable%',
  'confirmed intents cannot be operator-resolved'
);
SELECT throws_like(
  $$ SELECT private.resolve_billing_checkout_intent(
       '00000000-0000-0000-0000-000000004005', 'failed', 'reviewed', 'operator-40') $$,
  '%billing_checkout_remote_requires_convergence%',
  'remote-linked intents require provider convergence'
);
SELECT is(
  private.resolve_billing_checkout_intent(
    '00000000-0000-0000-0000-000000004002',
    'canceled',
    'remote_terminal_after_provider_review',
    'operator:resolution-40'
  ),
  'canceled',
  'a stale pending intent can be resolved after provider inspection'
);
SELECT results_eq(
  $$ SELECT status, resolution_code, resolved_by, resolved_at IS NOT NULL
     FROM billing.checkout_intents
     WHERE id = '00000000-0000-0000-0000-000000004002' $$,
  $$ VALUES (
       'canceled'::text,
       'remote_terminal_after_provider_review'::text,
       'operator:resolution-40'::text,
       true
     ) $$,
  'stale pending resolution persists complete audit evidence'
);
SELECT throws_like(
  $$ SELECT private.resolve_billing_checkout_intent(
       '00000000-0000-0000-0000-000000004001', 'canceled', 'replacement', 'other-operator') $$,
  '%billing_checkout_intent_not_resolvable%',
  'a second resolution cannot overwrite the first audit record'
);
SELECT results_eq(
  $$ SELECT status, resolved_at, resolution_code, resolved_by
     FROM billing.checkout_intents
     WHERE id = '00000000-0000-0000-0000-000000004001' $$,
  $$ SELECT status, resolved_at, resolution_code, resolved_by
     FROM resolution_40_snapshot $$,
  'the original resolution audit remains unchanged'
);
SELECT throws_like(
  $$ SELECT private.resolve_billing_checkout_intent(
       '00000000-0000-0000-0000-000000004099', 'failed', 'reviewed', 'operator-40') $$,
  '%billing_checkout_intent_not_found%',
  'an unknown intent cannot be resolved'
);

SELECT * FROM finish();
ROLLBACK;
