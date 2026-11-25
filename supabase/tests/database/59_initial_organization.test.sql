BEGIN;
SELECT plan(22);

INSERT INTO auth.users (id, email, raw_user_meta_data, email_confirmed_at)
VALUES
  ('00000000-0000-0000-0000-000000005901', 'org59-owner@example.com', '{"given_name":"Owner"}', now()),
  ('00000000-0000-0000-0000-000000005902', 'org59-invitee@example.com', '{"given_name":"Invitee"}', now()),
  ('00000000-0000-0000-0000-000000005903', 'org59-unconfirmed@example.com', '{}', NULL),
  ('00000000-0000-0000-0000-000000005904', 'org59-legacy@example.com', '{}', now());

UPDATE public.profiles SET organization_entry_state = 'legacy'
WHERE id = '00000000-0000-0000-0000-000000005904';

SELECT ok(NOT has_function_privilege('anon', 'public.ensure_initial_organization()', 'EXECUTE'),
  'anonymous users cannot provision a team');
SELECT ok(NOT has_column_privilege('authenticated', 'public.profiles', 'organization_entry_state', 'UPDATE'),
  'organization entry state is controlled by the server');
SELECT ok(NOT has_function_privilege('anon', 'public.get_my_organization_quota()', 'EXECUTE'),
  'the effective quota requires an authenticated identity');

SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000005903","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
SELECT throws_like('SELECT public.ensure_initial_organization()', '%email_not_confirmed%',
  'unconfirmed identities cannot provision an organization');
RESET ROLE;

SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000005904","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
SELECT is(public.ensure_initial_organization(), NULL::uuid, 'legacy profiles are not provisioned');
RESET ROLE;

SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000005901","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
SELECT set_config('test.initial_team_59', public.ensure_initial_organization()::text, true) AS org \gset
SELECT is(public.ensure_initial_organization(), current_setting('test.initial_team_59')::uuid,
  'repeated entry returns the same organization');
SELECT throws_like($$SELECT public.create_team('Over Free quota')$$, '%team_limit_reached%',
  'initial organization consumes the Free owner slot');
SELECT set_config('test.invite_59', (
  SELECT token FROM public.invite_members(current_setting('test.initial_team_59')::uuid,
    ARRAY['org59-invitee@example.com'], 'viewer')
), true) AS invite \gset
RESET ROLE;

SELECT results_eq($$SELECT a.type::text, m.role::text FROM public.accounts a
  JOIN public.accounts_memberships m ON m.account_id = a.id
  WHERE a.id = current_setting('test.initial_team_59')::uuid
    AND m.user_id = '00000000-0000-0000-0000-000000005901'$$,
  $$VALUES ('team'::text, 'owner'::text)$$, 'initial organization is collaborative and owned by the caller');
SELECT is((SELECT active_account_id FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000005901'),
  current_setting('test.initial_team_59')::uuid, 'initial organization is selected');

SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000005902","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
SELECT is((SELECT account_id FROM public.accept_invitation(current_setting('test.invite_59'))),
  current_setting('test.initial_team_59')::uuid, 'confirmed invitee enters the invited organization');
SELECT is(public.ensure_initial_organization(), current_setting('test.initial_team_59')::uuid,
  'accepted invitation resolves entry without creating a personal team');
RESET ROLE;
SELECT is((SELECT count(*) FROM public.accounts WHERE type = 'team' AND created_by = '00000000-0000-0000-0000-000000005902'),
  0::bigint, 'the invitation does not create an owned organization');

INSERT INTO billing.customers (account_id, provider)
VALUES (current_setting('test.initial_team_59')::uuid, 'mercadopago');
INSERT INTO billing.subscriptions (customer_id, plan_id, status, provider, external_subscription_id)
SELECT c.id, p.id, 'active', 'mercadopago', 'initial-organization-59'
FROM billing.customers c CROSS JOIN billing.plans p
WHERE c.account_id = current_setting('test.initial_team_59')::uuid AND c.provider = 'mercadopago'
  AND p.slug = 'pro' AND p."interval" = 'month';

SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000005901","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
SELECT set_config('test.second_team_59', public.create_team('Second team')::text, true) AS second_team \gset
SELECT lives_ok($$SELECT public.create_team('Third team')$$, 'Plus permits three owned organizations total');
SELECT throws_like($$SELECT public.create_team('Fourth team')$$, '%team_limit_reached%',
  'the fourth organization is rejected');
SELECT is((SELECT plan_slug FROM public.get_account_entitlements(current_setting('test.second_team_59')::uuid)),
  'free', 'the second organization has an independent Free plan');
SELECT results_eq('SELECT owned_count, organization_limit FROM public.get_my_organization_quota()',
  'VALUES (3, 3)', 'the quota shown to the owner reflects all owned teams and their effective plans');
RESET ROLE;

UPDATE billing.plans SET limits = jsonb_set(limits, '{teams_max}', '-1')
WHERE slug = 'pro' AND "interval" = 'month';
SET LOCAL ROLE authenticated;
SELECT lives_ok($$SELECT public.create_team('Fourth team')$$,
  'an explicit unlimited entitlement remains unlimited');
SELECT results_eq('SELECT owned_count, organization_limit FROM public.get_my_organization_quota()',
  'VALUES (4, -1)', 'the limit shown to the UI preserves an unlimited entitlement');
RESET ROLE;

UPDATE billing.subscriptions SET status = 'canceled', current_period_end = NULL
WHERE external_subscription_id = 'initial-organization-59';
SET LOCAL ROLE authenticated;
SELECT results_eq('SELECT owned_count, organization_limit FROM public.get_my_organization_quota()',
  'VALUES (4, 1)', 'downgrade preserves owned teams but lowers capacity');
SELECT throws_like($$SELECT public.create_team('After downgrade')$$, '%team_limit_reached%',
  'downgrade prevents further creation when already above capacity');
SELECT public.transfer_ownership(current_setting('test.initial_team_59')::uuid,
  '00000000-0000-0000-0000-000000005902');
SELECT results_eq('SELECT owned_count, organization_limit FROM public.get_my_organization_quota()',
  'VALUES (3, 1)', 'the former owner no longer counts a transferred team');
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000005902","role":"authenticated"}', true);
SELECT results_eq('SELECT owned_count, organization_limit FROM public.get_my_organization_quota()',
  'VALUES (1, 1)', 'the new owner counts the transferred team');
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
