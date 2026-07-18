-- pgTAP: RPC set_account_logo (F3-3H-2)
-- Run with: pnpm supa:test

BEGIN;
SELECT plan(3);

INSERT INTO auth.users (id, email, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_confirmed_at, recovery_token, aud, role)
VALUES
  ('00000000-0000-0000-0000-000000002201', 'logo-owner@example.com',
   '{"given_name":"Owner","family_name":"User"}'::jsonb, now(), now(), '', now(), '',
   'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000002202', 'logo-member@example.com',
   '{"given_name":"Member","family_name":"User"}'::jsonb, now(), now(), '', now(), '',
   'authenticated', 'authenticated');

INSERT INTO public.accounts (id, type, name, slug, created_by)
VALUES ('00000000-0000-0000-0000-000000002300', 'team', 'Logo Org', 'logo-org',
        '00000000-0000-0000-0000-000000002201');

INSERT INTO public.accounts_memberships (account_id, user_id, role)
VALUES
  ('00000000-0000-0000-0000-000000002300', '00000000-0000-0000-0000-000000002201', 'owner'),
  ('00000000-0000-0000-0000-000000002300', '00000000-0000-0000-0000-000000002202', 'member');

-- Owner puede setear el logo
SELECT set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000002201', 'role', 'authenticated')::text, true);
SET LOCAL role authenticated;
SELECT lives_ok(
  $$SELECT public.set_account_logo('00000000-0000-0000-0000-000000002300',
      'org-assets/00000000-0000-0000-0000-000000002300/logo.png')$$,
  'owner puede setear el logo de su cuenta');
RESET role;

SELECT is(
  (SELECT logo_url FROM public.accounts WHERE id = '00000000-0000-0000-0000-000000002300'),
  'org-assets/00000000-0000-0000-0000-000000002300/logo.png',
  'logo_url quedó persistido');

-- Member no puede setear el logo
SELECT set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000002202', 'role', 'authenticated')::text, true);
SET LOCAL role authenticated;
SELECT throws_like(
  $$SELECT public.set_account_logo('00000000-0000-0000-0000-000000002300', NULL)$$,
  '%not_authorized%', 'member no puede quitar/setear el logo');
RESET role;

SELECT * FROM finish();
ROLLBACK;
