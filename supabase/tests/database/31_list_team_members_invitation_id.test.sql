-- pgTAP: list_team_members expone invitation_id (Plan 009 / PR 4b).
--
-- revoke_invitation(p_invitation_id) no tenía forma de resolver ese id desde
-- la UI: list_team_members nunca lo devolvía. Este test confirma que el id
-- que la función devuelve para una fila pending es el mismo que revoke_invitation
-- acepta, y que las filas activas nunca lo exponen.
--
-- Run with: pnpm supa:test

BEGIN;
SELECT plan(4);

INSERT INTO auth.users (id, email, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_confirmed_at, recovery_token, aud, role)
VALUES
  ('00000000-0000-0000-0000-000000003101', 'ltm-owner@example.com',
   '{"given_name":"Owner","family_name":"L"}'::jsonb, now(), now(), '', now(), '', 'authenticated', 'authenticated');

INSERT INTO public.accounts (id, type, name, slug, created_by)
VALUES ('00000000-0000-0000-0000-000000003200', 'team', 'ListMembers Team', 'list-members-team',
        '00000000-0000-0000-0000-000000003101');

INSERT INTO public.accounts_memberships (account_id, user_id, role)
VALUES ('00000000-0000-0000-0000-000000003200', '00000000-0000-0000-0000-000000003101', 'owner');

INSERT INTO public.invitations (id, account_id, email, role, invited_by, token_hash, expires_at)
VALUES (
  '00000000-0000-0000-0000-000000003900',
  '00000000-0000-0000-0000-000000003200',
  'invitee-ltm@example.com', 'member', '00000000-0000-0000-0000-000000003101',
  encode(extensions.digest('tok_ltm', 'sha256'), 'hex'),
  now() + interval '7 days');

CREATE OR REPLACE FUNCTION pg_temp.act_as(p_user uuid) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
END;
$$;

SELECT pg_temp.act_as('00000000-0000-0000-0000-000000003101');
SET LOCAL role authenticated;

-- 1. La fila activa (el propio owner) nunca expone invitation_id.
SELECT is(
  (SELECT invitation_id FROM public.list_team_members('00000000-0000-0000-0000-000000003200')
    WHERE user_id = '00000000-0000-0000-0000-000000003101'),
  NULL::uuid,
  'invitation_id es NULL para una fila de miembro activo');

-- 2. La fila pending expone el id real de la invitación.
SELECT is(
  (SELECT invitation_id FROM public.list_team_members('00000000-0000-0000-0000-000000003200')
    WHERE status = 'pending'),
  '00000000-0000-0000-0000-000000003900'::uuid,
  'invitation_id de la fila pending coincide con invitations.id');

RESET role;

-- 3. Ese mismo id resuelto por list_team_members es el que revoke_invitation
-- acepta — el contrato end-to-end que motivó este cambio.
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000003101');
SET LOCAL role authenticated;
SELECT lives_ok(
  $$SELECT public.revoke_invitation('00000000-0000-0000-0000-000000003900'::uuid)$$,
  'el invitation_id devuelto por list_team_members es aceptado por revoke_invitation');
RESET role;

-- 4. Tras revocar, la invitación ya no aparece como pending en list_team_members
-- (el filtro status='pending' de la función la excluye).
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000003101');
SET LOCAL role authenticated;
SELECT is(
  (SELECT count(*)::int FROM public.list_team_members('00000000-0000-0000-0000-000000003200')
    WHERE status = 'pending'),
  0,
  'la invitación revocada ya no aparece como pending en list_team_members');
RESET role;

SELECT * FROM finish();
ROLLBACK;
