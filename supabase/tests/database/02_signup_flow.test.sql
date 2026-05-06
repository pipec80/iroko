-- pgTAP test: Signup flow auto-creates profile, personal account, and owner membership
-- Exercises handle_new_user (004) and handle_new_profile (005) triggers.
-- Run with: pnpm supa:test

BEGIN;
SELECT plan(4);

-- Insert a synthetic auth user (bypasses Supabase Auth, tests DB triggers only)
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
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'test-signup@example.com',
  '{"given_name": "Test", "family_name": "User"}'::jsonb,
  now(),
  now(),
  '',
  now(),
  '',
  'authenticated',
  'authenticated'
);

-- 1. Profile was auto-created by handle_new_user trigger
SELECT ok(
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = '00000000-0000-0000-0000-000000000001'
  ),
  'handle_new_user creates a profile row'
);

-- 2. given_name was populated from raw_user_meta_data
SELECT is(
  (SELECT given_name FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000000001'),
  'Test',
  'Profile given_name populated from raw_user_meta_data'
);

-- 3. Personal account was auto-created by handle_new_profile trigger
SELECT ok(
  EXISTS (
    SELECT 1 FROM public.accounts
    WHERE created_by = '00000000-0000-0000-0000-000000000001'
      AND type = 'personal'
  ),
  'handle_new_profile creates a personal account'
);

-- 4. Owner membership was auto-created for the personal account
SELECT ok(
  EXISTS (
    SELECT 1 FROM public.accounts_memberships m
    JOIN public.accounts a ON a.id = m.account_id
    WHERE m.user_id = '00000000-0000-0000-0000-000000000001'
      AND m.role = 'owner'
      AND a.type = 'personal'
  ),
  'Owner membership created for the personal account'
);

SELECT * FROM finish();
ROLLBACK;
