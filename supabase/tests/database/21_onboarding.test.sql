-- pgTAP: complete_onboarding() RPC + onboarding_completed JWT claim (F3-C4)
-- Run with: pnpm supa:test
--
-- Nota: el backfill de la migración (UPDATE profiles SET onboarding_completed = true
-- WHERE onboarding_completed IS DISTINCT FROM true) no es testeable acá: pgTAP corre
-- después de aplicadas todas las migraciones, no hay forma de sembrar datos "antes" del
-- backfill. Se verifica manualmente en QA con `pnpm supa:reset` sobre seed data preexistente.

BEGIN;
SELECT plan(5);

-- INSERT en auth.users dispara handle_new_user, que auto-crea el profile
-- (onboarding_completed queda en su DEFAULT false) — no insertar en profiles a mano.
INSERT INTO auth.users (
  id, email, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_confirmed_at, recovery_token, aud, role
) VALUES
  ('00000000-0000-0000-0000-000000002101', 'onb-a@example.com',
   '{"given_name":"A","family_name":"Test"}'::jsonb, now(), now(), '', now(), '',
   'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000002102', 'onb-b@example.com',
   '{"given_name":"B","family_name":"Test"}'::jsonb, now(), now(), '', now(), '',
   'authenticated', 'authenticated');

-- Reject anon / sin sesión
SELECT throws_like(
  $$SELECT public.complete_onboarding()$$,
  '%not_authenticated%',
  'complete_onboarding rechaza sin auth.uid()');

-- Sesión de user A
SELECT set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000002101', 'role', 'authenticated')::text, true);
SET LOCAL role authenticated;
SELECT lives_ok(
  $$SELECT public.complete_onboarding()$$,
  'complete_onboarding corre para el caller autenticado');
RESET role;

SELECT is(
  (SELECT onboarding_completed FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000002101'),
  true,
  'user A queda marcado onboarding_completed=true');

SELECT is(
  (SELECT onboarding_completed FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000002102'),
  false,
  'user B (no llamó la RPC) sigue en false — self-only');

-- Hook mintea el claim reflejando el estado real de profiles
SELECT is(
  (
    public.custom_access_token_hook(
      json_build_object(
        'user_id', '00000000-0000-0000-0000-000000002102',
        'claims', json_build_object('app_metadata', '{}'::jsonb)
      )::jsonb
    ) -> 'claims' -> 'app_metadata' ->> 'onboarding_completed'
  ),
  'false',
  'hook mintea onboarding_completed=false para user B');

SELECT * FROM finish();
ROLLBACK;
