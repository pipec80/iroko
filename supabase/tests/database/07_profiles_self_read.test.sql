-- pgTAP test: profiles SELECT is self-read only (no cross-tenant PII leak)
-- Verifies migration 20260702000001_profiles_self_read.
-- Run with: pnpm supa:test

BEGIN;
SELECT plan(3);

-- ── Seed two unrelated users (as superuser, before dropping into RLS) ────────
INSERT INTO auth.users (id, email, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_confirmed_at, recovery_token, aud, role)
VALUES
  ('00000000-0000-0000-0000-000000000701', 'self-read-a@example.com',
   '{"given_name":"Alice","family_name":"A"}'::jsonb, now(), now(), '', now(), '',
   'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000000702', 'self-read-b@example.com',
   '{"given_name":"Bob","family_name":"B"}'::jsonb, now(), now(), '', now(), '',
   'authenticated', 'authenticated');

-- Give Bob some PII that must never leak to Alice.
UPDATE public.profiles
SET phone_number = '+56900000000', bio = 'private note'
WHERE id = '00000000-0000-0000-0000-000000000702';

-- ── Act as Alice (authenticated role + JWT sub = Alice) ─────────────────────
SET LOCAL role authenticated;
SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000000701', 'role', 'authenticated')::text,
  true
);

-- 1. Alice reads her own profile.
SELECT is(
  (SELECT count(*)::int FROM public.profiles
   WHERE id = '00000000-0000-0000-0000-000000000701'),
  1,
  'Alice can read her own profile'
);

-- 2. Alice CANNOT read Bob's profile — RLS filters it out.
SELECT is(
  (SELECT count(*)::int FROM public.profiles
   WHERE id = '00000000-0000-0000-0000-000000000702'),
  0,
  'Alice cannot read another user''s profile (cross-tenant PII blocked)'
);

-- 3. Alice cannot enumerate the table — she only ever sees her own row.
SELECT is(
  (SELECT count(*)::int FROM public.profiles),
  1,
  'Alice can only see her own row when selecting all profiles'
);

RESET role;
SELECT * FROM finish();
ROLLBACK;
