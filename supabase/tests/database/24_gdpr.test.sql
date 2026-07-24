-- pgTAP test: GDPR export_my_data() / delete_my_account() + purge cron
-- registration (F3-C3). Covers: export shape (email, memberships, api_keys
-- count, audit trail), delete_my_account's not_authenticated gate,
-- sole_owner_must_transfer blocking (and NOT blocking when a co-owner
-- exists), successful soft-delete + session revocation, and anon boundary.
-- Run with: pnpm supa:test

BEGIN;
SELECT plan(14);

-- ── Seed ───────────────────────────────────────────────────────────────
-- 2801: exports their own data (gets an api_key + an audit log row to check).
-- 2802: sole owner of a team account -- delete_my_account must block.
-- 2803 + 2804: co-owners of a team account -- deleting 2803 must NOT block,
--   since 2804 remains as owner.
-- 2805: plain user, only their auto-created personal account + a session.
INSERT INTO auth.users (id, email, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_confirmed_at, recovery_token, aud, role)
VALUES
  ('00000000-0000-0000-0000-000000002801', 'gdpr-exporter@example.com',
   '{"given_name":"Export","family_name":"Er"}'::jsonb, now(), now(), '', now(), '',
   'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000002802', 'gdpr-sole-owner@example.com',
   '{"given_name":"Sole","family_name":"Owner"}'::jsonb, now(), now(), '', now(), '',
   'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000002803', 'gdpr-co-owner-a@example.com',
   '{"given_name":"CoA","family_name":"Owner"}'::jsonb, now(), now(), '', now(), '',
   'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000002804', 'gdpr-co-owner-b@example.com',
   '{"given_name":"CoB","family_name":"Owner"}'::jsonb, now(), now(), '', now(), '',
   'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000002805', 'gdpr-normal-delete@example.com',
   '{"given_name":"Normal","family_name":"User"}'::jsonb, now(), now(), '', now(), '',
   'authenticated', 'authenticated');

INSERT INTO public.accounts (id, type, name, slug, created_by)
VALUES
  ('00000000-0000-0000-0000-000000002850', 'team', 'GDPR Sole Team', 'gdpr-sole-team',
    '00000000-0000-0000-0000-000000002802'),
  ('00000000-0000-0000-0000-000000002851', 'team', 'GDPR Co Team', 'gdpr-co-team',
    '00000000-0000-0000-0000-000000002803');

INSERT INTO public.accounts_memberships (account_id, user_id, role) VALUES
  ('00000000-0000-0000-0000-000000002850', '00000000-0000-0000-0000-000000002802', 'owner'),
  ('00000000-0000-0000-0000-000000002851', '00000000-0000-0000-0000-000000002803', 'owner'),
  ('00000000-0000-0000-0000-000000002851', '00000000-0000-0000-0000-000000002804', 'owner');

-- api_key + audit log row attributed to 2801, for the export assertions.
INSERT INTO public.api_keys (account_id, name, key_prefix, key_hash, created_by)
VALUES ('00000000-0000-0000-0000-000000002801', 'CI key', 'iroko_ci', 'fake-hash-for-test',
  '00000000-0000-0000-0000-000000002801');
INSERT INTO audit.logs (actor_id, action, resource_type, resource_id, account_id, created_at)
VALUES ('00000000-0000-0000-0000-000000002801', 'create', 'api_keys', 'gdpr-test-key',
  '00000000-0000-0000-0000-000000002801', now());

INSERT INTO auth.sessions (id, user_id, created_at, updated_at, not_after)
VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000002805', now(), now(), now() + interval '1 day');

-- ============================================================================
-- 1. export_my_data() requires auth.
-- ============================================================================
SET LOCAL role authenticated;
SELECT throws_ok(
  $$SELECT public.export_my_data()$$,
  'not_authenticated',
  'export_my_data rejects a session with no sub claim'
);

-- ============================================================================
-- 2-5. export_my_data() shape: email, membership, api_keys count, audit trail.
-- ============================================================================
SELECT set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000002801', 'role', 'authenticated')::text,
  true);

SELECT is(
  public.export_my_data() -> 'auth' ->> 'email',
  'gdpr-exporter@example.com',
  'export_my_data returns the caller''s own email'
);
SELECT ok(
  (SELECT count(*) FROM jsonb_array_elements(public.export_my_data() -> 'memberships') m
   WHERE m ->> 'account_id' = '00000000-0000-0000-0000-000000002801') = 1,
  'export_my_data lists the caller''s personal account membership'
);
SELECT is(
  (public.export_my_data() -> 'resources_created_summary' ->> 'api_keys')::int,
  1,
  'export_my_data counts the one seeded api_key'
);
SELECT ok(
  (SELECT count(*) FROM jsonb_array_elements(public.export_my_data() -> 'audit_trail') l
   WHERE l ->> 'resource_type' = 'api_keys') = 1,
  'export_my_data includes the seeded audit_trail row'
);

-- ============================================================================
-- 6. delete_my_account() requires auth. Clear the claims residue from the
--    export_my_data block above (RESET role alone doesn't clear it).
-- ============================================================================
RESET role;
SELECT set_config('request.jwt.claims', '', true);
SET LOCAL role authenticated;
SELECT throws_ok(
  $$SELECT public.delete_my_account()$$,
  'not_authenticated',
  'delete_my_account rejects a session with no sub claim'
);

-- ============================================================================
-- 7. Sole owner of a team account is blocked.
-- ============================================================================
SELECT set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000002802', 'role', 'authenticated')::text,
  true);
SELECT throws_like(
  $$SELECT public.delete_my_account()$$,
  '%sole_owner_must_transfer%',
  'delete_my_account blocks the sole owner of a team account'
);

-- ============================================================================
-- 8-9. A co-owner is NOT blocked (a second owner remains), and the delete
--      actually soft-deletes their profile.
-- ============================================================================
SELECT set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000002803', 'role', 'authenticated')::text,
  true);
SELECT lives_ok(
  $$SELECT public.delete_my_account()$$,
  'delete_my_account does not block a co-owner when another owner remains on the team account'
);
RESET role;
SELECT ok(
  (SELECT pending_deletion FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000002803'),
  'The co-owner''s profile is marked pending_deletion after a successful delete_my_account'
);

-- ============================================================================
-- 10-11. Normal user (only a personal account + an active session): the
--        delete succeeds and every active session is revoked.
-- ============================================================================
SET LOCAL role authenticated;
SELECT set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000002805', 'role', 'authenticated')::text,
  true);
SELECT lives_ok(
  $$SELECT public.delete_my_account()$$,
  'delete_my_account succeeds for a plain user with only a personal account'
);
RESET role;
SELECT is(
  (SELECT count(*)::int FROM auth.sessions WHERE user_id = '00000000-0000-0000-0000-000000002805'),
  0,
  'delete_my_account revokes every active session of the caller'
);

-- ============================================================================
-- 12-13. anon has no access to either RPC.
-- ============================================================================
SET LOCAL role anon;
SELECT throws_like(
  $$SELECT public.export_my_data()$$,
  '%permission denied%',
  'anon cannot call export_my_data'
);
SELECT throws_like(
  $$SELECT public.delete_my_account()$$,
  '%permission denied%',
  'anon cannot call delete_my_account'
);
RESET role;

-- ============================================================================
-- 14. The nightly purge cron is registered.
-- ============================================================================
SELECT ok(
  EXISTS(SELECT 1 FROM cron.job WHERE jobname = 'purge-deleted-identities'),
  'el cron purge-deleted-identities está registrado'
);

SELECT * FROM finish();
ROLLBACK;
