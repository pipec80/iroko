-- pgTAP: RPC update_account_info (QA manual 2026-08-13 — org/settings sin backend)
-- Run with: pnpm supa:test

BEGIN;
SELECT plan(8);

INSERT INTO auth.users (id, email, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_confirmed_at, recovery_token, aud, role)
VALUES
  ('00000000-0000-0000-0000-000000002601', 'info-owner@example.com',
   '{"given_name":"Owner","family_name":"User"}'::jsonb, now(), now(), '', now(), '',
   'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000002602', 'info-member@example.com',
   '{"given_name":"Member","family_name":"User"}'::jsonb, now(), now(), '', now(), '',
   'authenticated', 'authenticated');

INSERT INTO public.accounts (id, type, name, slug, created_by)
VALUES
  ('00000000-0000-0000-0000-000000002700', 'team', 'Info Org', 'info-org',
   '00000000-0000-0000-0000-000000002601'),
  ('00000000-0000-0000-0000-000000002701', 'team', 'Taken Org', 'taken-slug',
   '00000000-0000-0000-0000-000000002601');

INSERT INTO public.accounts_memberships (account_id, user_id, role)
VALUES
  ('00000000-0000-0000-0000-000000002700', '00000000-0000-0000-0000-000000002601', 'owner'),
  ('00000000-0000-0000-0000-000000002700', '00000000-0000-0000-0000-000000002602', 'member');

-- Owner puede actualizar todo
SELECT set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000002601', 'role', 'authenticated')::text, true);
SET LOCAL role authenticated;
SELECT lives_ok(
  $$SELECT public.update_account_info('00000000-0000-0000-0000-000000002700',
      'Info Org Renamed', 'info-org-renamed', 'https://example.com', 'Chile')$$,
  'owner puede actualizar name/slug/website/country');
RESET role;

SELECT is(
  (SELECT name FROM public.accounts WHERE id = '00000000-0000-0000-0000-000000002700'),
  'Info Org Renamed', 'name quedó persistido');

SELECT is(
  (SELECT website FROM public.accounts WHERE id = '00000000-0000-0000-0000-000000002700'),
  'https://example.com', 'website quedó persistido');

-- Website/country vacíos se guardan como NULL, no como ''
SELECT set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000002601', 'role', 'authenticated')::text, true);
SET LOCAL role authenticated;
SELECT public.update_account_info('00000000-0000-0000-0000-000000002700',
  'Info Org Renamed', 'info-org-renamed', '', '');
RESET role;

SELECT is(
  (SELECT website FROM public.accounts WHERE id = '00000000-0000-0000-0000-000000002700'),
  NULL, 'website vacío se guarda como NULL');

SELECT set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000002601', 'role', 'authenticated')::text, true);
SET LOCAL role authenticated;

-- Nombre vacío rechazado
SELECT throws_like(
  $$SELECT public.update_account_info('00000000-0000-0000-0000-000000002700', '',
      'info-org-renamed', NULL, NULL)$$,
  '%invalid_name%', 'nombre vacío es rechazado');

-- Slug con formato inválido rechazado
SELECT throws_like(
  $$SELECT public.update_account_info('00000000-0000-0000-0000-000000002700', 'Info Org',
      'Not A Valid Slug!', NULL, NULL)$$,
  '%invalid_slug%', 'slug con mayúsculas/espacios/símbolos es rechazado');

-- Slug ya tomado por otra cuenta rechazado
SELECT throws_like(
  $$SELECT public.update_account_info('00000000-0000-0000-0000-000000002700', 'Info Org',
      'taken-slug', NULL, NULL)$$,
  '%slug_taken%', 'slug de otra cuenta es rechazado');

RESET role;

-- Member no puede actualizar
SELECT set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000002602', 'role', 'authenticated')::text, true);
SET LOCAL role authenticated;
SELECT throws_like(
  $$SELECT public.update_account_info('00000000-0000-0000-0000-000000002700', 'Hacked',
      'hacked', NULL, NULL)$$,
  '%not_authorized%', 'member no puede actualizar la info de la cuenta');
RESET role;

SELECT * FROM finish();
ROLLBACK;
