-- pgTAP: lifecycle mínimo de membresías (Plan 009 / PR 4).
--
-- remove_member() ya le decía al usuario "Cannot remove yourself. Use leave
-- team instead." sin que leave_team existiera — la señal más clara de que
-- faltaba: invitar y remover existían, cambiar de rol, transferir ownership
-- y salir del equipo no.
--
-- Run with: pnpm supa:test

BEGIN;
SELECT plan(25);

-- ── Seed: un team con owner + admin + member, y otro team aparte ──────────
INSERT INTO auth.users (id, email, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_confirmed_at, recovery_token, aud, role)
VALUES
  ('00000000-0000-0000-0000-000000004001', 'lc-owner@example.com',
   '{"given_name":"Owner","family_name":"L"}'::jsonb, now(), now(), '', now(), '', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000004002', 'lc-admin@example.com',
   '{"given_name":"Admin","family_name":"L"}'::jsonb, now(), now(), '', now(), '', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000004003', 'lc-member@example.com',
   '{"given_name":"Member","family_name":"L"}'::jsonb, now(), now(), '', now(), '', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000004004', 'lc-outsider@example.com',
   '{"given_name":"Outsider","family_name":"L"}'::jsonb, now(), now(), '', now(), '', 'authenticated', 'authenticated');

INSERT INTO public.accounts (id, type, name, slug, created_by)
VALUES ('00000000-0000-0000-0000-000000004100', 'team', 'Lifecycle Team', 'lifecycle-team',
        '00000000-0000-0000-0000-000000004001');

INSERT INTO public.accounts_memberships (account_id, user_id, role)
VALUES
  ('00000000-0000-0000-0000-000000004100', '00000000-0000-0000-0000-000000004001', 'owner'),
  ('00000000-0000-0000-0000-000000004100', '00000000-0000-0000-0000-000000004002', 'admin'),
  ('00000000-0000-0000-0000-000000004100', '00000000-0000-0000-0000-000000004003', 'member');

CREATE OR REPLACE FUNCTION pg_temp.act_as(p_user uuid) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
END;
$$;

-- ═══ change_member_role ════════════════════════════════════════════════════

-- 1. member no puede cambiar roles.
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000004003');
SET LOCAL role authenticated;
SELECT throws_like(
  $$SELECT public.change_member_role('00000000-0000-0000-0000-000000004100',
      '00000000-0000-0000-0000-000000004003'::uuid, 'viewer'::public.membership_role)$$,
  '%Only owner or admin%', 'member no puede cambiar roles');
RESET role;

-- 2. Nadie puede cambiarse el rol a sí mismo por acá.
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000004001');
SET LOCAL role authenticated;
SELECT throws_like(
  $$SELECT public.change_member_role('00000000-0000-0000-0000-000000004100',
      '00000000-0000-0000-0000-000000004001'::uuid, 'admin'::public.membership_role)$$,
  '%cannot_change_own_role%', 'nadie puede cambiarse el rol a sí mismo');
RESET role;

-- 3. Asignar 'owner' por acá se rechaza — es transfer_ownership.
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000004001');
SET LOCAL role authenticated;
SELECT throws_like(
  $$SELECT public.change_member_role('00000000-0000-0000-0000-000000004100',
      '00000000-0000-0000-0000-000000004003'::uuid, 'owner'::public.membership_role)$$,
  '%use_transfer_ownership%', 'asignar owner se rechaza, usar transfer_ownership');
RESET role;

-- 4. admin no puede promover a otro miembro a admin.
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000004002');
SET LOCAL role authenticated;
SELECT throws_like(
  $$SELECT public.change_member_role('00000000-0000-0000-0000-000000004100',
      '00000000-0000-0000-0000-000000004003'::uuid, 'admin'::public.membership_role)$$,
  '%Only the owner can manage admin roles%', 'admin no puede promover a admin');
RESET role;

-- 5. admin no puede tocar a otro admin (mismo límite que remove_member).
INSERT INTO public.accounts_memberships (account_id, user_id, role)
VALUES ('00000000-0000-0000-0000-000000004100', '00000000-0000-0000-0000-000000004004', 'admin');
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000004002');
SET LOCAL role authenticated;
SELECT throws_like(
  $$SELECT public.change_member_role('00000000-0000-0000-0000-000000004100',
      '00000000-0000-0000-0000-000000004004'::uuid, 'viewer'::public.membership_role)$$,
  '%Only the owner can manage admin roles%', 'admin no puede degradar a otro admin');
RESET role;
DELETE FROM public.accounts_memberships
WHERE account_id = '00000000-0000-0000-0000-000000004100'
  AND user_id = '00000000-0000-0000-0000-000000004004';

-- 6. admin SÍ puede degradar a un member.
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000004002');
SET LOCAL role authenticated;
SELECT lives_ok(
  $$SELECT public.change_member_role('00000000-0000-0000-0000-000000004100',
      '00000000-0000-0000-0000-000000004003'::uuid, 'viewer'::public.membership_role)$$,
  'admin degrada member a viewer');
RESET role;

-- 7. Efecto: el rol quedó realmente actualizado.
SELECT is(
  (SELECT role::text FROM public.accounts_memberships
    WHERE account_id = '00000000-0000-0000-0000-000000004100'
      AND user_id = '00000000-0000-0000-0000-000000004003'),
  'viewer', 'el UPDATE de change_member_role surtió efecto');

-- 8. owner sí puede promover a member/viewer hasta admin.
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000004001');
SET LOCAL role authenticated;
SELECT lives_ok(
  $$SELECT public.change_member_role('00000000-0000-0000-0000-000000004100',
      '00000000-0000-0000-0000-000000004003'::uuid, 'member'::public.membership_role)$$,
  'owner puede volver a promover viewer→member');
RESET role;

-- ═══ transfer_ownership ════════════════════════════════════════════════════

-- 9. Solo el owner actual puede transferir.
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000004002');
SET LOCAL role authenticated;
SELECT throws_like(
  $$SELECT public.transfer_ownership('00000000-0000-0000-0000-000000004100',
      '00000000-0000-0000-0000-000000004003'::uuid)$$,
  '%Only the current owner%', 'admin no puede transferir ownership');
RESET role;

-- 10. El destinatario debe ser miembro.
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000004001');
SET LOCAL role authenticated;
SELECT throws_like(
  $$SELECT public.transfer_ownership('00000000-0000-0000-0000-000000004100',
      '00000000-0000-0000-0000-000000004004'::uuid)$$,
  '%target_not_a_member%', 'no se puede transferir a un no-miembro');
RESET role;

-- 11. Transferir a uno mismo se rechaza.
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000004001');
SET LOCAL role authenticated;
SELECT throws_like(
  $$SELECT public.transfer_ownership('00000000-0000-0000-0000-000000004100',
      '00000000-0000-0000-0000-000000004001'::uuid)$$,
  '%already_owner%', 'transferir a uno mismo se rechaza');
RESET role;

-- 12. El owner transfiere a admin (00...4002).
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000004001');
SET LOCAL role authenticated;
SELECT lives_ok(
  $$SELECT public.transfer_ownership('00000000-0000-0000-0000-000000004100',
      '00000000-0000-0000-0000-000000004002'::uuid)$$,
  'el owner transfiere ownership a un admin existente');
RESET role;

-- 13-14. Efecto: el nuevo es owner, el anterior quedó admin — la cuenta NUNCA
-- se queda sin owner ni con dos owners simultáneos.
SELECT is(
  (SELECT role::text FROM public.accounts_memberships
    WHERE account_id = '00000000-0000-0000-0000-000000004100'
      AND user_id = '00000000-0000-0000-0000-000000004002'),
  'owner', 'el destinatario quedó como owner');

SELECT is(
  (SELECT role::text FROM public.accounts_memberships
    WHERE account_id = '00000000-0000-0000-0000-000000004100'
      AND user_id = '00000000-0000-0000-0000-000000004001'),
  'admin', 'el owner anterior quedó degradado a admin, no eliminado');

SELECT is(
  (SELECT count(*)::int FROM public.accounts_memberships
    WHERE account_id = '00000000-0000-0000-0000-000000004100' AND role = 'owner'),
  1, 'la cuenta tiene exactamente un owner tras la transferencia');

-- 15. Transferir ownership de una cuenta personal se rechaza — 1:1, sin
-- transferencia posible (mismo invariante que enforce_single_owner_per_account
-- ya documenta). El caller SÍ es owner de su propia personal
-- (handle_new_profile la crea así); el rechazo es por tipo de cuenta, antes de
-- llegar siquiera a comprobar quién es el owner.
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000004003');
SET LOCAL role authenticated;
SELECT throws_like(
  $$SELECT public.transfer_ownership('00000000-0000-0000-0000-000000004003'::uuid,
      '00000000-0000-0000-0000-000000004001'::uuid)$$,
  '%not_a_team%', 'transferir ownership de una cuenta personal se rechaza');
RESET role;

-- ═══ leave_team ═════════════════════════════════════════════════════════════

-- 16. No se puede "salir" de una cuenta personal.
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000004003');
SET LOCAL role authenticated;
SELECT throws_like(
  $$SELECT public.leave_team('00000000-0000-0000-0000-000000004003'::uuid)$$,
  '%not_a_team%', 'leave_team rechaza una cuenta personal');
RESET role;

-- 17. Un outsider (no miembro) no puede salir de lo que no integra.
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000004004');
SET LOCAL role authenticated;
SELECT throws_like(
  $$SELECT public.leave_team('00000000-0000-0000-0000-000000004100'::uuid)$$,
  '%not_a_member%', 'un outsider no puede salir de un team que no integra');
RESET role;

-- 18. El último owner no puede salir sin transferir antes.
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000004002');
SET LOCAL role authenticated;
SELECT throws_like(
  $$SELECT public.leave_team('00000000-0000-0000-0000-000000004100'::uuid)$$,
  '%last_owner_must_transfer%', 'el único owner no puede salir sin transferir antes');
RESET role;

-- 19-20. Un member sí puede salir, y la membresía desaparece de verdad.
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000004003');
SET LOCAL role authenticated;
SELECT lives_ok(
  $$SELECT public.leave_team('00000000-0000-0000-0000-000000004100'::uuid)$$,
  'un member puede salir del team');
RESET role;

SELECT is(
  (SELECT count(*)::int FROM public.accounts_memberships
    WHERE account_id = '00000000-0000-0000-0000-000000004100'
      AND user_id = '00000000-0000-0000-0000-000000004003'),
  0, 'la membresía desaparece de verdad tras salir');

-- 21. Si el team era la cuenta activa, salir mueve active_account_id a la
-- personal — sin esto el usuario queda con un active_account_id apuntando a
-- una cuenta de la que ya no es miembro.
UPDATE public.profiles SET active_account_id = '00000000-0000-0000-0000-000000004100'
WHERE id = '00000000-0000-0000-0000-000000004004';
INSERT INTO public.accounts_memberships (account_id, user_id, role)
VALUES ('00000000-0000-0000-0000-000000004100', '00000000-0000-0000-0000-000000004004', 'viewer');

SELECT pg_temp.act_as('00000000-0000-0000-0000-000000004004');
SET LOCAL role authenticated;
SELECT public.leave_team('00000000-0000-0000-0000-000000004100'::uuid);
RESET role;

SELECT is(
  (SELECT active_account_id FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000004004'),
  '00000000-0000-0000-0000-000000004004'::uuid,
  'salir del team activo mueve active_account_id a la personal (id = user id)');

-- ═══ revoke_invitation ══════════════════════════════════════════════════════

INSERT INTO public.invitations (id, account_id, email, role, invited_by, token_hash, expires_at)
VALUES (
  '00000000-0000-0000-0000-000000004900',
  '00000000-0000-0000-0000-000000004100',
  'invitee-lc@example.com', 'member', '00000000-0000-0000-0000-000000004002',
  encode(extensions.digest('tok_lifecycle', 'sha256'), 'hex'),
  now() + interval '7 days');

-- 22. Un outsider (aquí, un member que ya se fue del team) no puede revocar.
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000004003');
SET LOCAL role authenticated;
SELECT throws_like(
  $$SELECT public.revoke_invitation('00000000-0000-0000-0000-000000004900'::uuid)$$,
  '%Only owner or admin%', 'quien no es owner/admin no puede revocar');
RESET role;

-- 23. El owner (ahora 4002, tras la transferencia) sí puede revocar.
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000004002');
SET LOCAL role authenticated;
SELECT lives_ok(
  $$SELECT public.revoke_invitation('00000000-0000-0000-0000-000000004900'::uuid)$$,
  'el owner revoca la invitación pendiente');
RESET role;

-- 24. Revocar una invitación ya no-pending se rechaza explícitamente, no se
-- silencia — evita que un doble clic parezca haber funcionado dos veces.
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000004002');
SET LOCAL role authenticated;
SELECT throws_like(
  $$SELECT public.revoke_invitation('00000000-0000-0000-0000-000000004900'::uuid)$$,
  '%invitation_not_pending%', 'revocar dos veces la misma invitación se rechaza');
RESET role;

SELECT * FROM finish();
ROLLBACK;
