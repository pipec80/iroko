-- pgTAP: matriz RBAC canónica (Plan 009 / PR 3).
--
-- Antes de este PR, 'member' y 'viewer' eran indistinguibles en el core:
-- ninguna policy de escritura sobre projects/documents aceptaba 'member', así
-- que el enum describía 4 roles y la DB implementaba 3 comportamientos. Y nada
-- lo cubría: la suite pasaba entera con la matriz mal.
--
--   Acción                      owner  admin  member  viewer
--   --------------------------- -----  -----  ------  ------
--   Ver projects / documents      si     si     si      si
--   Crear projects / documents    si     si     si      no
--   Editar projects / documents   si     si     si      no
--   Borrar projects / documents   si     no     no      no
--   Subir a Storage documents     si     si     si      no
--   Invitar                       si     si     no      no
--
-- Nota sobre RLS: un INSERT que viola WITH CHECK lanza; un UPDATE o DELETE que
-- no matchea el USING simplemente no afecta filas, sin error. Por eso los casos
-- negativos de escritura/borrado se verifican por EFECTO, no con throws.
--
-- Run with: pnpm supa:test

BEGIN;
SELECT plan(18);

-- ── Seed: un team con los cuatro roles + un outsider ───────────────────────
INSERT INTO auth.users (id, email, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_confirmed_at, recovery_token, aud, role)
VALUES
  ('00000000-0000-0000-0000-000000003001', 'rbac-owner@example.com',
   '{"given_name":"Owner","family_name":"R"}'::jsonb, now(), now(), '', now(), '', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000003002', 'rbac-admin@example.com',
   '{"given_name":"Admin","family_name":"R"}'::jsonb, now(), now(), '', now(), '', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000003003', 'rbac-member@example.com',
   '{"given_name":"Member","family_name":"R"}'::jsonb, now(), now(), '', now(), '', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000003004', 'rbac-viewer@example.com',
   '{"given_name":"Viewer","family_name":"R"}'::jsonb, now(), now(), '', now(), '', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000003005', 'rbac-outsider@example.com',
   '{"given_name":"Outsider","family_name":"R"}'::jsonb, now(), now(), '', now(), '', 'authenticated', 'authenticated');

INSERT INTO public.accounts (id, type, name, slug, created_by)
VALUES ('00000000-0000-0000-0000-000000003100', 'team', 'RBAC Team', 'rbac-team',
        '00000000-0000-0000-0000-000000003001');

INSERT INTO public.accounts_memberships (account_id, user_id, role)
VALUES
  ('00000000-0000-0000-0000-000000003100', '00000000-0000-0000-0000-000000003001', 'owner'),
  ('00000000-0000-0000-0000-000000003100', '00000000-0000-0000-0000-000000003002', 'admin'),
  ('00000000-0000-0000-0000-000000003100', '00000000-0000-0000-0000-000000003003', 'member'),
  ('00000000-0000-0000-0000-000000003100', '00000000-0000-0000-0000-000000003004', 'viewer');

-- Contenido semilla, creado como postgres (sin pasar por RLS). El 3200 se usa
-- para los casos de borrado y termina eliminado; el 3201 es el contenedor
-- estable de los documents (project_id es NOT NULL).
INSERT INTO public.projects (id, account_id, name, slug, created_by)
VALUES
  ('00000000-0000-0000-0000-000000003200', '00000000-0000-0000-0000-000000003100',
   'Seed Project', 'seed-project', '00000000-0000-0000-0000-000000003001'),
  ('00000000-0000-0000-0000-000000003201', '00000000-0000-0000-0000-000000003100',
   'Doc Holder', 'doc-holder', '00000000-0000-0000-0000-000000003001');

INSERT INTO public.documents (id, account_id, project_id, name, created_by)
VALUES ('00000000-0000-0000-0000-000000003300', '00000000-0000-0000-0000-000000003100',
        '00000000-0000-0000-0000-000000003201', 'Seed Doc',
        '00000000-0000-0000-0000-000000003001');

-- Team aparte con un solo miembro: el plan free trae seats_max=2, así que el
-- team principal (4 miembros) rechaza cualquier invitación por límite de
-- asientos antes de llegar al chequeo de rol. Este existe para poder probar el
-- camino feliz de invitar sin mezclarlo con el gate de plan.
INSERT INTO public.accounts (id, type, name, slug, created_by)
VALUES ('00000000-0000-0000-0000-000000003101', 'team', 'RBAC Small', 'rbac-small',
        '00000000-0000-0000-0000-000000003001');

INSERT INTO public.accounts_memberships (account_id, user_id, role)
VALUES ('00000000-0000-0000-0000-000000003101', '00000000-0000-0000-0000-000000003001', 'owner');

-- ── Helper: actuar como un usuario con su rol en el claim ──────────────────
CREATE OR REPLACE FUNCTION pg_temp.act_as(
  p_user uuid,
  p_role text,
  p_account uuid DEFAULT '00000000-0000-0000-0000-000000003100'
) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', p_user, 'role', 'authenticated',
      'app_metadata', json_build_object('account_id', p_account, 'role', p_role))::text,
    true);
END;
$$;

-- ═══ PROJECTS ══════════════════════════════════════════════════════════════

-- 1. Ver: todos los roles, incluido viewer.
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000003004', 'viewer');
SET LOCAL role authenticated;
SELECT is(
  (SELECT count(*)::int FROM public.projects WHERE account_id = '00000000-0000-0000-0000-000000003100'),
  2, 'viewer ve los projects de su cuenta');
RESET role;

-- 2-4. Crear: member SÍ (cambio de este PR), viewer NO, admin SÍ.
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000003003', 'member');
SET LOCAL role authenticated;
SELECT lives_ok(
  $$INSERT INTO public.projects (account_id, name, slug, created_by)
    VALUES ('00000000-0000-0000-0000-000000003100', 'By Member', 'by-member',
            '00000000-0000-0000-0000-000000003003')$$,
  'member CREA projects — es el rol que trabaja');
RESET role;

SELECT pg_temp.act_as('00000000-0000-0000-0000-000000003004', 'viewer');
SET LOCAL role authenticated;
SELECT throws_like(
  $$INSERT INTO public.projects (account_id, name, slug, created_by)
    VALUES ('00000000-0000-0000-0000-000000003100', 'By Viewer', 'by-viewer',
            '00000000-0000-0000-0000-000000003004')$$,
  '%row-level security%', 'viewer NO puede crear projects');
RESET role;

SELECT pg_temp.act_as('00000000-0000-0000-0000-000000003002', 'admin');
SET LOCAL role authenticated;
SELECT lives_ok(
  $$INSERT INTO public.projects (account_id, name, slug, created_by)
    VALUES ('00000000-0000-0000-0000-000000003100', 'By Admin', 'by-admin',
            '00000000-0000-0000-0000-000000003002')$$,
  'admin crea projects');
RESET role;

-- 5-6. Editar: member SÍ, viewer NO (por efecto: un UPDATE sin match no lanza).
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000003003', 'member');
SET LOCAL role authenticated;
UPDATE public.projects SET name = 'Renombrado por member'
WHERE id = '00000000-0000-0000-0000-000000003200';
RESET role;
SELECT is(
  (SELECT name FROM public.projects WHERE id = '00000000-0000-0000-0000-000000003200'),
  'Renombrado por member', 'member EDITA projects');

SELECT pg_temp.act_as('00000000-0000-0000-0000-000000003004', 'viewer');
SET LOCAL role authenticated;
UPDATE public.projects SET name = 'Renombrado por viewer'
WHERE id = '00000000-0000-0000-0000-000000003200';
RESET role;
SELECT is(
  (SELECT name FROM public.projects WHERE id = '00000000-0000-0000-0000-000000003200'),
  'Renombrado por member', 'viewer NO puede editar projects — el nombre no cambió');

-- 7-9. Borrar: solo owner. Decisión consciente: subir member a editor no le da
-- capacidad de destruir, y admin tampoco la tiene.
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000003003', 'member');
SET LOCAL role authenticated;
DELETE FROM public.projects WHERE id = '00000000-0000-0000-0000-000000003200';
RESET role;
SELECT is(
  (SELECT count(*)::int FROM public.projects WHERE id = '00000000-0000-0000-0000-000000003200'),
  1, 'member NO puede borrar projects');

SELECT pg_temp.act_as('00000000-0000-0000-0000-000000003002', 'admin');
SET LOCAL role authenticated;
DELETE FROM public.projects WHERE id = '00000000-0000-0000-0000-000000003200';
RESET role;
SELECT is(
  (SELECT count(*)::int FROM public.projects WHERE id = '00000000-0000-0000-0000-000000003200'),
  1, 'admin NO puede borrar projects — borrar es solo del owner');

SELECT pg_temp.act_as('00000000-0000-0000-0000-000000003001', 'owner');
SET LOCAL role authenticated;
DELETE FROM public.projects WHERE id = '00000000-0000-0000-0000-000000003200';
RESET role;
SELECT is(
  (SELECT count(*)::int FROM public.projects WHERE id = '00000000-0000-0000-0000-000000003200'),
  0, 'owner borra projects');

-- ═══ DOCUMENTS ═════════════════════════════════════════════════════════════

-- 10-12. Mismo patrón: member edita, viewer no crea, member no borra.
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000003003', 'member');
SET LOCAL role authenticated;
SELECT lives_ok(
  $$INSERT INTO public.documents (account_id, project_id, name, created_by)
    VALUES ('00000000-0000-0000-0000-000000003100',
            '00000000-0000-0000-0000-000000003201', 'Doc de member',
            '00000000-0000-0000-0000-000000003003')$$,
  'member CREA documents');
RESET role;

SELECT pg_temp.act_as('00000000-0000-0000-0000-000000003004', 'viewer');
SET LOCAL role authenticated;
SELECT throws_like(
  $$INSERT INTO public.documents (account_id, project_id, name, created_by)
    VALUES ('00000000-0000-0000-0000-000000003100',
            '00000000-0000-0000-0000-000000003201', 'Doc de viewer',
            '00000000-0000-0000-0000-000000003004')$$,
  '%row-level security%', 'viewer NO puede crear documents');
RESET role;

SELECT pg_temp.act_as('00000000-0000-0000-0000-000000003003', 'member');
SET LOCAL role authenticated;
DELETE FROM public.documents WHERE id = '00000000-0000-0000-0000-000000003300';
RESET role;
SELECT is(
  (SELECT count(*)::int FROM public.documents WHERE id = '00000000-0000-0000-0000-000000003300'),
  1, 'member NO puede borrar documents');

-- ═══ STORAGE (bucket documents) ════════════════════════════════════════════

-- 13-14. La policy de INSERT comparaba carpeta y uid pero nunca el rol, así que
-- un viewer podía subir archivos pese a ser de solo lectura en la tabla.
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000003003', 'member');
SET LOCAL role authenticated;
SELECT lives_ok(
  $$INSERT INTO storage.objects (bucket_id, name, owner)
    VALUES ('documents',
            '00000000-0000-0000-0000-000000003100/00000000-0000-0000-0000-000000003003/f.pdf',
            '00000000-0000-0000-0000-000000003003')$$,
  'member puede subir al bucket documents');
RESET role;

SELECT pg_temp.act_as('00000000-0000-0000-0000-000000003004', 'viewer');
SET LOCAL role authenticated;
SELECT throws_like(
  $$INSERT INTO storage.objects (bucket_id, name, owner)
    VALUES ('documents',
            '00000000-0000-0000-0000-000000003100/00000000-0000-0000-0000-000000003004/f.pdf',
            '00000000-0000-0000-0000-000000003004')$$,
  '%row-level security%', 'viewer NO puede subir al bucket documents');
RESET role;

-- ═══ INVITACIONES ══════════════════════════════════════════════════════════

-- 15-17. Solo owner/admin invitan, y solo en cuentas de equipo.
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000003003', 'member');
SET LOCAL role authenticated;
SELECT throws_like(
  $$SELECT public.invite_members('00000000-0000-0000-0000-000000003100',
      ARRAY['x@example.com'], 'member'::public.membership_role)$$,
  '%Only owner or admin%', 'member NO puede invitar');
RESET role;

SELECT pg_temp.act_as('00000000-0000-0000-0000-000000003001', 'owner',
                      '00000000-0000-0000-0000-000000003101');
SET LOCAL role authenticated;
SELECT lives_ok(
  $$SELECT public.invite_members('00000000-0000-0000-0000-000000003101',
      ARRAY['nuevo@example.com'], 'member'::public.membership_role)$$,
  'owner invita en una cuenta de equipo');
RESET role;

-- La cuenta personal del owner (id = user id) no admite colaboradores.
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000003001', 'owner');
SET LOCAL role authenticated;
SELECT throws_like(
  $$SELECT public.invite_members('00000000-0000-0000-0000-000000003001',
      ARRAY['otro@example.com'], 'member'::public.membership_role)$$,
  '%not_a_team%', 'invitar a una cuenta personal se rechaza — Personal es 1:1');
RESET role;

-- ═══ CROSS-TENANT ══════════════════════════════════════════════════════════

-- 18. Un usuario sin membresía no ve nada de la cuenta.
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000003005', 'viewer');
SET LOCAL role authenticated;
SELECT is(
  (SELECT count(*)::int FROM public.projects
    WHERE account_id = '00000000-0000-0000-0000-000000003100'),
  0, 'un outsider no ve los projects del team, ni con un claim de rol falsificado');
RESET role;

SELECT * FROM finish();
ROLLBACK;
