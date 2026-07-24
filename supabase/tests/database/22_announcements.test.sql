-- pgTAP test: global platform announcements (F3-C7). Covers: direct INSERT
-- into public.announcements is blocked (must go through publish_announcement),
-- publish_announcement rejects non-admins/aal1/invalid input and succeeds for
-- admin+aal2, SELECT is open to any authenticated (including non-admins),
-- the Realtime broadcast lands in realtime.messages and is readable by any
-- authenticated but not directly writable, and anon has no access at all.
-- Run with: pnpm supa:test

BEGIN;
SELECT plan(16);

-- ── Seed an admin and a non-admin. handle_new_profile auto-creates a
--    personal account + owner membership per auth.users row — irrelevant
--    noise, not asserted on. ──────────────────────────────────────────────
INSERT INTO auth.users (id, email, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_confirmed_at, recovery_token, aud, role)
VALUES
  ('00000000-0000-0000-0000-000000002601', 'c7-admin@example.com',
   '{"given_name":"Admin","family_name":"A"}'::jsonb, now(), now(), '', now(), '',
   'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000002602', 'c7-nonadmin@example.com',
   '{"given_name":"NonAdmin","family_name":"B"}'::jsonb, now(), now(), '', now(), '',
   'authenticated', 'authenticated');

INSERT INTO public.platform_admins (user_id)
VALUES ('00000000-0000-0000-0000-000000002601');

-- ============================================================================
-- 1. Direct INSERT into public.announcements is blocked for everyone,
--    even the platform_admin — only publish_announcement() may write.
-- ============================================================================
SET LOCAL role authenticated;
SELECT set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000002601', 'role', 'authenticated', 'aal', 'aal2')::text,
  true);
SELECT throws_like(
  $$INSERT INTO public.announcements (type, title, created_by)
    VALUES ('info', 'direct insert', '00000000-0000-0000-0000-000000002601')$$,
  '%row-level security%',
  'admin cannot INSERT into announcements directly, even at aal2'
);
RESET role;

-- ============================================================================
-- 2-6. publish_announcement — rejects non-admin, rejects aal1, rejects
--      empty title, rejects invalid type, succeeds for admin+aal2.
-- ============================================================================
SET LOCAL role authenticated;

-- 2. Non-admin, aal2 — rejected on the whitelist check.
SELECT set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000002602', 'role', 'authenticated', 'aal', 'aal2')::text,
  true);
SELECT throws_ok(
  $$SELECT public.publish_announcement('info', 'title')$$,
  'not_platform_admin',
  'Non-admin is rejected regardless of aal'
);

-- 3. Admin, aal1 — rejected on the MFA check.
SELECT set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000002601', 'role', 'authenticated', 'aal', 'aal1')::text,
  true);
SELECT throws_ok(
  $$SELECT public.publish_announcement('info', 'title')$$,
  'mfa_required',
  'Whitelisted admin on an aal1 session is rejected'
);

-- 4-6. Admin, aal2 — passes the guard, then validates input.
SELECT set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000002601', 'role', 'authenticated', 'aal', 'aal2')::text,
  true);
SELECT throws_ok(
  $$SELECT public.publish_announcement('info', '   ')$$,
  'title_required',
  'Blank title is rejected'
);
SELECT throws_ok(
  $$SELECT public.publish_announcement('urgent', 'title')$$,
  'invalid_type',
  'Type outside info|success|warning|error is rejected'
);
SELECT is(
  (SELECT title FROM public.publish_announcement('info', 'Mantenimiento programado', 'El sábado a las 3am', NULL)),
  'Mantenimiento programado',
  'Admin+aal2 with valid input inserts and returns the new row'
);

-- ============================================================================
-- 7-8. The inserted row is attributed to the admin and visible via SELECT
--      to any authenticated user, including a non-admin (announcements_select_all).
-- ============================================================================
SELECT ok(
  EXISTS(
    SELECT 1 FROM public.announcements
    WHERE title = 'Mantenimiento programado'
      AND created_by = '00000000-0000-0000-0000-000000002601'
  ),
  'The published announcement is attributed to the publishing admin'
);

SELECT set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000002602', 'role', 'authenticated', 'aal', 'aal2')::text,
  true);
SELECT ok(
  EXISTS(SELECT 1 FROM public.announcements WHERE title = 'Mantenimiento programado'),
  'Non-admin can SELECT the announcement (open to all authenticated)'
);

-- ============================================================================
-- 9-11. Realtime: the trigger lands a message on platform:announcements,
--       readable by any authenticated, not directly writable by anyone.
-- ============================================================================
SELECT ok(
  EXISTS(
    SELECT 1 FROM realtime.messages
    WHERE topic = 'platform:announcements' AND event = 'announcement_created'
  ),
  'Non-admin can read the platform:announcements broadcast row (open SELECT policy)'
);

SELECT throws_like(
  $$INSERT INTO realtime.messages (topic, extension, event, payload, private)
    VALUES ('platform:announcements', 'broadcast', 'announcement_created', '{}'::jsonb, true)$$,
  '%row-level security%',
  'Authenticated non-admin cannot write directly to the platform:announcements topic (only the trigger, via realtime.send, may)'
);

SELECT set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000002601', 'role', 'authenticated', 'aal', 'aal2')::text,
  true);
SELECT throws_like(
  $$INSERT INTO realtime.messages (topic, extension, event, payload, private)
    VALUES ('platform:announcements', 'broadcast', 'announcement_created', '{}'::jsonb, true)$$,
  '%row-level security%',
  'Same denial applies to the platform_admin — publishing must go through publish_announcement, not raw inserts'
);
RESET role;

-- ============================================================================
-- 12-14. RLS/GRANT boundary: anon has zero access to announcements or its
--        Realtime topic, and non-admin's guard rejections above didn't leave
--        anything published (row count stays at exactly one, the seeded row).
-- ============================================================================
SET LOCAL role anon;
SELECT throws_like(
  $$SELECT * FROM public.announcements$$,
  '%permission denied%',
  'anon cannot SELECT announcements at all (REVOKEd)'
);
SELECT throws_like(
  $$SELECT public.publish_announcement('info', 'anon attempt')$$,
  '%permission denied%',
  'anon cannot call publish_announcement (no EXECUTE grant)'
);
RESET role;

SET LOCAL role authenticated;
SELECT set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000002601', 'role', 'authenticated', 'aal', 'aal2')::text,
  true);
SELECT is(
  (SELECT count(*)::int FROM public.announcements),
  1,
  'Only the one successful publish_announcement call left a row — every rejected attempt above inserted nothing'
);
RESET role;

-- ============================================================================
-- 15-16. Regression: deleting the publishing admin's auth.users row must SET
--     NULL on created_by, not block the delete (bug found while building
--     F3-C3/GDPR purge — created_by was NOT NULL + FK NO ACTION originally).
-- ============================================================================
SELECT lives_ok(
  $$DELETE FROM auth.users WHERE id = '00000000-0000-0000-0000-000000002601'$$,
  'Deleting the admin who published an announcement does not fail on the FK'
);
SELECT ok(
  EXISTS(
    SELECT 1 FROM public.announcements
    WHERE title = 'Mantenimiento programado' AND created_by IS NULL
  ),
  'The announcement survives with created_by set to NULL after the author is deleted'
);

SELECT * FROM finish();
ROLLBACK;
