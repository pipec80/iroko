-- pgTAP: durable checkout coordination, permissions and lifecycle.
BEGIN;
SELECT plan(33);

SELECT has_table('billing', 'checkout_intents', 'checkout intents table exists');
SELECT has_function('public', 'reserve_billing_checkout', ARRAY['uuid', 'uuid', 'text'], 'reserve RPC exists');
SELECT has_function('public', 'attach_billing_checkout_remote', ARRAY['uuid', 'text', 'text'], 'attach RPC exists');
SELECT has_function('public', 'mark_billing_checkout_failed', ARRAY['uuid', 'text', 'boolean'], 'failure RPC exists');
SELECT has_function('public', 'resolve_billing_checkout_reference', ARRAY['uuid', 'text'], 'reference resolver exists');

SELECT ok(
  has_function_privilege('service_role', 'public.reserve_billing_checkout(uuid,uuid,text)', 'EXECUTE')
  AND NOT has_function_privilege('authenticated', 'public.reserve_billing_checkout(uuid,uuid,text)', 'EXECUTE')
  AND NOT has_function_privilege('anon', 'public.reserve_billing_checkout(uuid,uuid,text)', 'EXECUTE'),
  'reservation is service-role only'
);

INSERT INTO auth.users (
  id, email, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_confirmed_at, recovery_token, aud, role
) VALUES (
  '00000000-0000-0000-0000-000000003601', 'checkout-intent@example.com',
  '{}'::jsonb, now(), now(), '', now(), '', 'authenticated', 'authenticated'
);

INSERT INTO public.accounts (id, type, name, slug, created_by)
VALUES (
  '00000000-0000-0000-0000-000000003610', 'team', 'Checkout Intents',
  'checkout-intents', '00000000-0000-0000-0000-000000003601'
);

SELECT results_eq(
  $$ SELECT action FROM public.reserve_billing_checkout(
    '00000000-0000-0000-0000-000000003610',
    (SELECT id FROM billing.plans WHERE slug = 'pro' AND "interval" = 'month'),
    'mercadopago') $$,
  $$ VALUES ('create'::text) $$,
  'first reservation owns remote creation'
);

SELECT results_eq(
  $$ SELECT action FROM public.reserve_billing_checkout(
    '00000000-0000-0000-0000-000000003610',
    (SELECT id FROM billing.plans WHERE slug = 'pro' AND "interval" = 'month'),
    'mercadopago') $$,
  $$ VALUES ('processing'::text) $$,
  'second reservation cannot create concurrently'
);

SELECT results_eq(
  $$ SELECT action FROM public.reserve_billing_checkout(
    '00000000-0000-0000-0000-000000003610',
    (SELECT id FROM billing.plans WHERE slug = 'scale' AND "interval" = 'month'),
    'mercadopago') $$,
  $$ VALUES ('needs_review'::text) $$,
  'a different plan never replaces the open intent'
);

SELECT lives_ok(
  format(
    $$ SELECT public.attach_billing_checkout_remote('%s', 'preapproval-36', 'https://mercadopago.example/checkout') $$,
    (SELECT id FROM billing.checkout_intents WHERE account_id = '00000000-0000-0000-0000-000000003610')
  ),
  'remote identity and provisional subscription attach atomically'
);

SELECT results_eq(
  $$ SELECT intent.status, subscription.status::text
     FROM billing.checkout_intents AS intent
     JOIN billing.customers AS customer ON customer.account_id = intent.account_id
       AND customer.provider = intent.provider
     JOIN billing.subscriptions AS subscription ON subscription.customer_id = customer.id
       AND subscription.provider = intent.provider
       AND subscription.external_subscription_id = intent.external_subscription_id
     WHERE intent.account_id = '00000000-0000-0000-0000-000000003610' $$,
  $$ VALUES ('pending'::text, 'incomplete'::text) $$,
  'attach commits intent and provisional subscription together'
);

SELECT results_eq(
  $$ SELECT action, url FROM public.reserve_billing_checkout(
    '00000000-0000-0000-0000-000000003610',
    (SELECT id FROM billing.plans WHERE slug = 'pro' AND "interval" = 'month'),
    'mercadopago') $$,
  $$ VALUES ('resume'::text, 'https://mercadopago.example/checkout'::text) $$,
  'known pending checkout reuses its URL'
);

SELECT is(
  public.apply_subscription_updated(
    'mercadopago', 'checkout-intent-update-36',
    '00000000-0000-0000-0000-000000003610', 'preapproval-36', NULL,
    'active', NULL, NULL, false, NULL, '{}'::jsonb
  ),
  'applied',
  'the shared subscription reducer applies the provider transition'
);

SELECT is(
  (SELECT status FROM billing.checkout_intents WHERE external_subscription_id = 'preapproval-36'),
  'confirmed',
  'subscription activation confirms its intent in the same transaction'
);

SELECT results_eq(
  $$ SELECT account_id, checkout_intent_id
     FROM public.resolve_billing_checkout_reference(
       (SELECT id FROM billing.checkout_intents WHERE external_subscription_id = 'preapproval-36'),
       'preapproval-36') $$,
  $$ SELECT account_id, id FROM billing.checkout_intents
     WHERE external_subscription_id = 'preapproval-36' $$,
  'intent external_reference resolves to its owning account'
);

SELECT results_eq(
  $$ SELECT account_id, checkout_intent_id
     FROM public.resolve_billing_checkout_reference(
       '00000000-0000-0000-0000-000000003610', 'preapproval-36') $$,
  $$ VALUES ('00000000-0000-0000-0000-000000003610'::uuid, NULL::uuid) $$,
  'historical account reference resolves only with an exact local subscription'
);

SELECT is_empty(
  $$ SELECT * FROM public.resolve_billing_checkout_reference(
       '00000000-0000-0000-0000-000000003610', 'foreign-preapproval') $$,
  'historical account reference cannot claim an unrelated remote id'
);

SELECT is(
  public.apply_subscription_canceled(
    'mercadopago', 'checkout-intent-cancel-36',
    '00000000-0000-0000-0000-000000003610', 'preapproval-36',
    now(), now(), '{}'::jsonb
  ),
  'applied',
  'the shared cancellation reducer applies the terminal transition'
);
SELECT is(
  (SELECT status FROM billing.checkout_intents WHERE external_subscription_id = 'preapproval-36'),
  'canceled',
  'subscription cancellation closes its intent in the same reducer transaction'
);

SELECT results_eq(
  $$ SELECT action FROM public.reserve_billing_checkout(
    '00000000-0000-0000-0000-000000003610',
    (SELECT id FROM billing.plans WHERE slug = 'scale' AND "interval" = 'month'),
    'mercadopago') $$,
  $$ VALUES ('create'::text) $$,
  'a confirmed intent no longer blocks a later checkout'
);

SELECT lives_ok(
  format(
    $$ SELECT public.mark_billing_checkout_failed('%s', 'provider_rejected', false) $$,
    (SELECT id FROM billing.checkout_intents WHERE account_id = '00000000-0000-0000-0000-000000003610' AND status = 'reserved')
  ),
  'deterministic failure releases the reservation'
);

SELECT results_eq(
  $$ SELECT action FROM public.reserve_billing_checkout(
    '00000000-0000-0000-0000-000000003610',
    (SELECT id FROM billing.plans WHERE slug = 'scale' AND "interval" = 'month'),
    'mercadopago') $$,
  $$ VALUES ('create'::text) $$,
  'a deterministic failure permits a new intent'
);

SELECT lives_ok(
  format(
    $$ SELECT public.mark_billing_checkout_failed('%s', 'provider_outcome_unknown', true) $$,
    (SELECT id FROM billing.checkout_intents WHERE account_id = '00000000-0000-0000-0000-000000003610' AND status = 'reserved')
  ),
  'unknown outcome becomes needs review'
);

SELECT results_eq(
  $$ SELECT action FROM public.reserve_billing_checkout(
    '00000000-0000-0000-0000-000000003610',
    (SELECT id FROM billing.plans WHERE slug = 'scale' AND "interval" = 'month'),
    'mercadopago') $$,
  $$ VALUES ('needs_review'::text) $$,
  'unknown outcome never authorizes another POST'
);

INSERT INTO public.accounts (id, type, name, slug, created_by)
VALUES (
  '00000000-0000-0000-0000-000000003620', 'team', 'Historical Checkout',
  'historical-checkout', '00000000-0000-0000-0000-000000003601'
);
INSERT INTO billing.customers (id, account_id, provider)
VALUES (
  '00000000-0000-0000-0000-000000003621',
  '00000000-0000-0000-0000-000000003620',
  'mercadopago'
);
INSERT INTO billing.subscriptions (
  customer_id, plan_id, status, provider, external_subscription_id, created_at
) VALUES
  (
    '00000000-0000-0000-0000-000000003621',
    (SELECT id FROM billing.plans WHERE slug = 'pro' AND "interval" = 'month'),
    'incomplete', 'mercadopago', 'historical-preapproval-old', now() - interval '2 days'
  ),
  (
    '00000000-0000-0000-0000-000000003621',
    (SELECT id FROM billing.plans WHERE slug = 'scale' AND "interval" = 'month'),
    'incomplete', 'mercadopago', 'historical-preapproval-new', now() - interval '1 day'
  );

SELECT is(
  private.classify_existing_billing_checkout_intents(),
  2,
  'migration classifier records every preexisting incomplete row'
);
SELECT is(
  (SELECT count(*)::integer FROM billing.checkout_intents
   WHERE account_id = '00000000-0000-0000-0000-000000003620'),
  2,
  'classification does not delete or collapse historical subscriptions'
);
SELECT results_eq(
  $$ SELECT status, count(*)::bigint
     FROM billing.checkout_intents
     WHERE account_id = '00000000-0000-0000-0000-000000003620'
     GROUP BY status ORDER BY status $$,
  $$ VALUES ('failed'::text, 1::bigint), ('needs_review'::text, 1::bigint) $$,
  'one ambiguous historical intent blocks creation while older duplicates remain classified'
);

INSERT INTO public.accounts (id, type, name, slug, created_by)
VALUES (
  '00000000-0000-0000-0000-000000003630', 'team', 'Lost Attach',
  'lost-attach', '00000000-0000-0000-0000-000000003601'
);
SELECT * FROM public.reserve_billing_checkout(
  '00000000-0000-0000-0000-000000003630',
  (SELECT id FROM billing.plans WHERE slug = 'pro' AND "interval" = 'month'),
  'mercadopago'
);
SELECT public.mark_billing_checkout_failed(
  (SELECT id FROM billing.checkout_intents
   WHERE account_id = '00000000-0000-0000-0000-000000003630'),
  'remote_created_local_attach_failed',
  true
);

SELECT lives_ok(
  format(
    $$ SELECT * FROM public.resolve_billing_checkout_reference('%s', 'preapproval-lost-attach') $$,
    (SELECT id FROM billing.checkout_intents
     WHERE account_id = '00000000-0000-0000-0000-000000003630')
  ),
  'webhook correlation recovers a remote result after local attach failure'
);
SELECT results_eq(
  $$ SELECT intent.status, subscription.status::text
     FROM billing.checkout_intents AS intent
     JOIN billing.customers AS customer ON customer.account_id = intent.account_id
       AND customer.provider = intent.provider
     JOIN billing.subscriptions AS subscription ON subscription.customer_id = customer.id
       AND subscription.external_subscription_id = intent.external_subscription_id
     WHERE intent.account_id = '00000000-0000-0000-0000-000000003630' $$,
  $$ VALUES ('pending'::text, 'incomplete'::text) $$,
  'recovered correlation restores a linked pending intent without another POST'
);

INSERT INTO public.accounts (id, type, name, slug, created_by)
VALUES
  ('00000000-0000-0000-0000-000000003640', 'team', 'Foreign Claim',
   'foreign-claim', '00000000-0000-0000-0000-000000003601'),
  ('00000000-0000-0000-0000-000000003650', 'team', 'Expired Lease',
   'expired-lease', '00000000-0000-0000-0000-000000003601');
SELECT * FROM public.reserve_billing_checkout(
  '00000000-0000-0000-0000-000000003640',
  (SELECT id FROM billing.plans WHERE slug = 'pro' AND "interval" = 'month'),
  'mercadopago'
);
SELECT throws_like(
  format(
    $$ SELECT public.attach_billing_checkout_remote('%s', 'preapproval-36', 'https://example.com/foreign') $$,
    (SELECT id FROM billing.checkout_intents
     WHERE account_id = '00000000-0000-0000-0000-000000003640')
  ),
  '%billing_checkout_remote_identity_already_claimed%',
  'another account cannot claim an existing provider subscription id'
);

SELECT * FROM public.reserve_billing_checkout(
  '00000000-0000-0000-0000-000000003650',
  (SELECT id FROM billing.plans WHERE slug = 'pro' AND "interval" = 'month'),
  'mercadopago'
);
UPDATE billing.checkout_intents
SET lease_expires_at = now() - interval '1 second'
WHERE account_id = '00000000-0000-0000-0000-000000003650';
SELECT results_eq(
  $$ SELECT action FROM public.reserve_billing_checkout(
    '00000000-0000-0000-0000-000000003650',
    (SELECT id FROM billing.plans WHERE slug = 'pro' AND "interval" = 'month'),
    'mercadopago') $$,
  $$ VALUES ('needs_review'::text) $$,
  'an expired creation lease never permits a blind second POST'
);

SET LOCAL role authenticated;
SELECT throws_ok(
  $$ SELECT id FROM billing.checkout_intents $$,
  42501,
  NULL,
  'checkout intents cannot be read by end users'
);
SELECT throws_ok(
  $$ SELECT public.attach_billing_checkout_remote(
    '00000000-0000-0000-0000-000000003699', 'foreign', 'https://example.com') $$,
  42501,
  NULL,
  'end users cannot attach or claim an intent'
);
RESET role;

SELECT * FROM finish();
ROLLBACK;
