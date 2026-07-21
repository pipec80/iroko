-- pgTAP test: platform_admins whitelist + guard functions + both back-office
-- RPCs (F3-C1). Covers: RLS deny-all on platform_admins, is_platform_admin
-- true/false, assert_platform_admin's two independent checks (whitelist
-- membership AND real aal2 — not just the mfa_enrolled claim), and that
-- admin_list_accounts / get_platform_audit_logs reject non-admins and
-- invalid input while an admin session sees the seeded data.
-- Run with: pnpm supa:test

BEGIN;
SELECT plan(15);

-- ── Seed three users: an admin, a non-admin, and an extra owner used only
--    to populate a team account (handle_new_profile auto-creates a personal
--    account + owner membership per auth.users row — irrelevant noise we
--    must not count against). ────────────────────────────────────────────
INSERT INTO auth.users (id, email, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_confirmed_at, recovery_token, aud, role)
VALUES
  ('00000000-0000-0000-0000-000000000901', 'c1-admin@example.com',
   '{"given_name":"Admin","family_name":"A"}'::jsonb, now(), now(), '', now(), '',
   'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000000902', 'c1-nonadmin@example.com',
   '{"given_name":"NonAdmin","family_name":"B"}'::jsonb, now(), now(), '', now(), '',
   'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000000903', 'c1-owner@example.com',
   '{"given_name":"Owner","family_name":"C"}'::jsonb, now(), now(), '', now(), '',
   'authenticated', 'authenticated');

INSERT INTO public.platform_admins (user_id)
VALUES ('00000000-0000-0000-0000-000000000901');

-- A TEAM account distinct from the auto-created personal ones, so the RPC
-- assertions below can check "the admin sees THIS account" (relative),
-- never "sees exactly N accounts" (absolute — breaks under seed drift).
INSERT INTO public.accounts (id, type, name, slug, created_by)
VALUES ('00000000-0000-0000-0000-000000000950', 'team', 'C1 Test Team', 'c1-test-team',
  '00000000-0000-0000-0000-000000000903');

INSERT INTO public.accounts_memberships (account_id, user_id, role)
VALUES ('00000000-0000-0000-0000-000000000950', '00000000-0000-0000-0000-000000000903', 'owner');

INSERT INTO audit.logs (actor_id, action, resource_type, resource_id, account_id, created_at)
VALUES ('00000000-0000-0000-0000-000000000903', 'create', 'projects', 'c1-p1',
  '00000000-0000-0000-0000-000000000950', now());

-- ============================================================================
-- 1-2. RLS deny-all on platform_admins — authenticated cannot read it at all,
--      even the admin's own row (access goes through private.* only).
-- ============================================================================
SET LOCAL role authenticated;
SELECT set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000000901', 'role', 'authenticated', 'aal', 'aal2')::text,
  true);

SELECT throws_like(
  $$SELECT * FROM public.platform_admins$$,
  '%permission denied%',
  'authenticated (even an actual admin) cannot SELECT platform_admins directly'
);

RESET role;
SET LOCAL role anon;
SELECT throws_like(
  $$SELECT * FROM public.platform_admins$$,
  '%permission denied%',
  'anon cannot SELECT platform_admins'
);
RESET role;

-- ============================================================================
-- 3-4. private.is_platform_admin — true for the whitelisted user, false else.
-- ============================================================================
SELECT ok(
  private.is_platform_admin('00000000-0000-0000-0000-000000000901'),
  'is_platform_admin(admin) is true'
);
SELECT ok(
  NOT private.is_platform_admin('00000000-0000-0000-0000-000000000902'),
  'is_platform_admin(non-admin) is false'
);

-- ============================================================================
-- 5-8. private.assert_platform_admin — rejects no-membership, rejects aal1
--      even for a whitelisted admin, passes for admin+aal2.
-- ============================================================================
SET LOCAL role authenticated;

-- 5. Non-admin, any aal — rejected on the whitelist check.
SELECT set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000000902', 'role', 'authenticated', 'aal', 'aal2')::text,
  true);
SELECT throws_ok(
  $$SELECT private.assert_platform_admin()$$,
  'not_platform_admin',
  'Non-whitelisted user is rejected regardless of aal'
);

-- 6. Admin, aal1 — rejected on the MFA check (whitelist check already passed).
SELECT set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000000901', 'role', 'authenticated', 'aal', 'aal1')::text,
  true);
SELECT throws_ok(
  $$SELECT private.assert_platform_admin()$$,
  'mfa_required',
  'Whitelisted admin on an aal1 session is rejected — real aal, not just the mfa_enrolled claim'
);

-- 7. Admin, aal2 — passes (returns void, no exception).
SELECT set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000000901', 'role', 'authenticated', 'aal', 'aal2')::text,
  true);
SELECT lives_ok(
  $$SELECT private.assert_platform_admin()$$,
  'Whitelisted admin on an aal2 session passes'
);

-- 8. Non-admin with NO row anywhere (regression for the NULL-check trap —
--    is_platform_admin must return false, not NULL, for a total stranger).
SELECT ok(
  NOT private.is_platform_admin('00000000-0000-0000-0000-000000000903'),
  'is_platform_admin(owner, never granted) is false'
);

-- ============================================================================
-- 9-11. admin_list_accounts — admin sees the seeded team account (relative
--       assertion), non-admin is rejected, invalid_limit is rejected.
-- ============================================================================
SELECT set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000000901', 'role', 'authenticated', 'aal', 'aal2')::text,
  true);

SELECT ok(
  (SELECT count(*)::int FROM public.admin_list_accounts('c1-test-team')
     WHERE account_id = '00000000-0000-0000-0000-000000000950') = 1,
  'Admin sees the seeded team account when searching its slug'
);

SELECT set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000000902', 'role', 'authenticated', 'aal', 'aal2')::text,
  true);
SELECT throws_ok(
  $$SELECT * FROM public.admin_list_accounts()$$,
  'not_platform_admin',
  'Non-admin (even at aal2) is rejected by admin_list_accounts'
);

SELECT set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000000901', 'role', 'authenticated', 'aal', 'aal2')::text,
  true);
SELECT throws_ok(
  $$SELECT * FROM public.admin_list_accounts(NULL, 0)$$,
  'invalid_limit',
  'admin_list_accounts rejects p_limit=0'
);

-- ============================================================================
-- 12-15. get_platform_audit_logs — admin sees the seeded log row filtered by
--        account, non-admin rejected, invalid_limit rejected, impersonator_id
--        column is present (NULL — nobody populates it until C2).
-- ============================================================================
SELECT ok(
  (SELECT count(*)::int FROM public.get_platform_audit_logs(
     20, NULL, NULL, '00000000-0000-0000-0000-000000000950'
   ) WHERE resource_id = 'c1-p1') = 1,
  'Admin sees the seeded audit row when filtering by account_id'
);

SELECT ok(
  (SELECT impersonator_id FROM public.get_platform_audit_logs(
     20, NULL, NULL, '00000000-0000-0000-0000-000000000950'
   ) WHERE resource_id = 'c1-p1') IS NULL,
  'impersonator_id column is present and NULL (populated by C2, not C1)'
);

SELECT set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000000902', 'role', 'authenticated', 'aal', 'aal2')::text,
  true);
SELECT throws_ok(
  $$SELECT * FROM public.get_platform_audit_logs()$$,
  'not_platform_admin',
  'Non-admin is rejected by get_platform_audit_logs'
);

SELECT set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000000901', 'role', 'authenticated', 'aal', 'aal2')::text,
  true);
SELECT throws_ok(
  $$SELECT * FROM public.get_platform_audit_logs(0)$$,
  'invalid_limit',
  'get_platform_audit_logs rejects p_limit=0'
);

RESET role;
SELECT * FROM finish();
ROLLBACK;
