-- pgTAP: ciclo de invitación (Plan 009 / PR 2).
--
-- Cubre que el ciclo invitar → aceptar → estar dentro del team termine SIEMPRE
-- en el mismo lugar. Antes, accept_invitation creaba la membresía pero no
-- tocaba la cuenta activa, así que el destino lo decidía el fallback del hook
-- JWT ("membresía más reciente"): el usuario saltaba al team solo si nunca
-- había hecho switch_account(); si alguna vez lo había hecho, se quedaba donde
-- estaba. Mismo flujo, dos resultados según un historial invisible.
--
-- Las assertions miran el claim que mintea el hook, no solo la columna: es lo
-- que realmente lee la app para decidir en qué cuenta estás.
--
-- Run with: pnpm supa:test

BEGIN;
SELECT plan(7);

-- ── Escenario ──────────────────────────────────────────────────────────────
-- inviter: owner de un team.  invitee: usuario que acepta la invitación.
INSERT INTO auth.users (id, email, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_confirmed_at, recovery_token, aud, role)
VALUES
  ('00000000-0000-0000-0000-000000000901', 'inviter@example.com',
   '{"given_name":"Inviter","family_name":"Test"}'::jsonb, now(), now(), '', now(), '',
   'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000000902', 'invitee@example.com',
   '{"given_name":"Invitee","family_name":"Test"}'::jsonb, now(), now(), '', now(), '',
   'authenticated', 'authenticated');

-- Punto de partida: el invitee solo tiene su cuenta personal (id = user id),
-- así que el claim resuelve a ella con o sin preferencia guardada.
SELECT is(
  (public.custom_access_token_hook(
    jsonb_build_object('user_id', '00000000-0000-0000-0000-000000000902',
      'claims', jsonb_build_object('app_metadata', '{}'::jsonb))
  ) -> 'claims' -> 'app_metadata' ->> 'account_id')::uuid,
  '00000000-0000-0000-0000-000000000902'::uuid,
  'antes de aceptar, la cuenta activa del invitado es su personal');

-- ── Team del inviter + invitación pendiente ────────────────────────────────
INSERT INTO public.accounts (id, type, name, slug, created_by)
VALUES ('00000000-0000-0000-0000-000000000960', 'team', 'Team Invite', 'team-invite-flow',
        '00000000-0000-0000-0000-000000000901');

INSERT INTO public.accounts_memberships (account_id, user_id, role)
VALUES ('00000000-0000-0000-0000-000000000960', '00000000-0000-0000-0000-000000000901', 'owner');

INSERT INTO public.invitations (account_id, email, role, invited_by, token_hash, expires_at)
VALUES (
  '00000000-0000-0000-0000-000000000960',
  'invitee@example.com',
  'member',
  '00000000-0000-0000-0000-000000000901',
  encode(extensions.digest('tok_invitation_flow', 'sha256'), 'hex'),
  now() + interval '7 days');

-- ── El invitee acepta ──────────────────────────────────────────────────────
SELECT set_config('request.jwt.claims',
  json_build_object('sub','00000000-0000-0000-0000-000000000902','role','authenticated')::text,
  true);

SELECT lives_ok(
  $$SELECT public.accept_invitation('tok_invitation_flow')$$,
  'accept_invitation acepta un token válido y vigente');

-- ── Efectos de aceptar ─────────────────────────────────────────────────────
SELECT is(
  (SELECT role::text FROM public.accounts_memberships
    WHERE account_id = '00000000-0000-0000-0000-000000000960'
      AND user_id = '00000000-0000-0000-0000-000000000902'),
  'member',
  'aceptar crea la membresía con el rol de la invitación');

SELECT is(
  (SELECT status::text FROM public.invitations
    WHERE account_id = '00000000-0000-0000-0000-000000000960'
      AND email = 'invitee@example.com'),
  'accepted',
  'aceptar marca la invitación como accepted');

-- El corazón de este PR: el destino del flujo es explícito, no un efecto
-- secundario del orden de las membresías.
SELECT is(
  (SELECT active_account_id FROM public.profiles
    WHERE id = '00000000-0000-0000-0000-000000000902'),
  '00000000-0000-0000-0000-000000000960'::uuid,
  'aceptar deja el team como cuenta activa del invitado');

-- El hook es lo que traduce active_account_id al claim que lee la app; sin
-- esta assertion el punto anterior podría pasar y el usuario aterrizar igual
-- en su cuenta anterior.
SELECT is(
  (public.custom_access_token_hook(
    jsonb_build_object('user_id', '00000000-0000-0000-0000-000000000902',
      'claims', jsonb_build_object('app_metadata', '{}'::jsonb))
  ) -> 'claims' -> 'app_metadata' ->> 'account_id')::uuid,
  '00000000-0000-0000-0000-000000000960'::uuid,
  'el hook JWT mintea el team como account_id tras aceptar la invitación');

-- ── Un token inválido no crea nada ─────────────────────────────────────────
SELECT throws_like(
  $$SELECT public.accept_invitation('tok_que_no_existe')$$,
  '%Invalid or expired invitation%',
  'accept_invitation rechaza un token inexistente');

SELECT * FROM finish();
ROLLBACK;
