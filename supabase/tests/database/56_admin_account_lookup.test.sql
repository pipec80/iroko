-- 017.5-T8: exact detail lookup, including a row beyond the list's first page.
BEGIN;
SELECT plan(6);

INSERT INTO auth.users (id, email, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_confirmed_at, recovery_token, aud, role)
VALUES
  ('00000000-0000-0000-0000-000000005601', 't8-admin@example.com', '{}'::jsonb,
   now(), now(), '', now(), '', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000005602', 't8-user@example.com', '{}'::jsonb,
   now(), now(), '', now(), '', 'authenticated', 'authenticated');

INSERT INTO public.platform_admins (user_id)
VALUES ('00000000-0000-0000-0000-000000005601');

INSERT INTO public.accounts (id, type, name, slug, created_by)
VALUES ('00000000-0000-0000-0000-000000005650', 'team', 'T8 Detail', 't8-detail',
  '00000000-0000-0000-0000-000000005602');

SET LOCAL role authenticated;
SELECT set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000005601',
    'role', 'authenticated', 'aal', 'aal2')::text, true);

SELECT is(
  (SELECT name FROM public.get_admin_account('00000000-0000-0000-0000-000000005650')),
  'T8 Detail', 'admin AAL2 resolves exact account ID');
SELECT is(
  (SELECT count(*)::int FROM public.get_admin_account('00000000-0000-0000-0000-000000005699')),
  0, 'unknown account returns no row');
SELECT ok(
  (SELECT count(*) FROM public.get_admin_account('00000000-0000-0000-0000-000000005650')) = 1,
  'exact lookup returns one row');

SELECT set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000005602',
    'role', 'authenticated', 'aal', 'aal2')::text, true);
SELECT throws_ok(
  $$SELECT * FROM public.get_admin_account('00000000-0000-0000-0000-000000005650')$$,
  'not_platform_admin', 'non-admin AAL2 denied');

SELECT set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000005601',
    'role', 'authenticated', 'aal', 'aal1')::text, true);
SELECT throws_ok(
  $$SELECT * FROM public.get_admin_account('00000000-0000-0000-0000-000000005650')$$,
  'mfa_required', 'admin AAL1 denied');

RESET role;
SET LOCAL role anon;
SELECT throws_like(
  $$SELECT * FROM public.get_admin_account('00000000-0000-0000-0000-000000005650')$$,
  '%permission denied%', 'anon has no execute grant');

RESET role;
SELECT * FROM finish();
ROLLBACK;
