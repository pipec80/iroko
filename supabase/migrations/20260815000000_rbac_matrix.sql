-- ============================================================================
-- Plan 009 / PR 3 — Matriz RBAC canónica.
--
-- PROBLEMA: 'member' y 'viewer' eran indistinguibles en el core. Ninguna policy
-- de escritura sobre projects/documents aceptaba 'member', así que ambos roles
-- quedaban en solo lectura y el enum de 4 roles describía 3 comportamientos.
--
-- DECISIÓN: 'member' pasa a ser el rol que TRABAJA (crea y edita contenido) y
-- 'viewer' queda estrictamente en lectura. Es el modelo que hace que los cuatro
-- roles tengan sentido y se puedan explicar.
--
--   Acción                         owner  admin  member  viewer
--   ------------------------------ -----  -----  ------  ------
--   Ver projects / documents         si     si     si      si
--   Crear projects / documents       si     si     SI*     no
--   Editar projects / documents      si     si     SI*     no
--   Borrar projects / documents      si     no     no      no
--   Subir a Storage documents        si     si     si      NO*
--   Invitar                          si     si     no      no
--
--   (*) lo que cambia en esta migración.
--
-- BORRAR SIGUE SIENDO SOLO-OWNER, a propósito: es la acción destructiva y el
-- comportamiento actual no está roto. Subir a member a editor no implica darle
-- capacidad de destruir. Queda documentado como decisión, no como omisión.
--
-- Personal deja de admitir colaboradores: invite_members exige type='team'.
-- El repo ya asumía eso por un lado —el trigger enforce_single_owner_per_account
-- documenta que las personales son "1:1 con su único usuario, sin transferencia
-- de ownership posible" (20260724211828)— mientras por el otro permitía invitar
-- gente a una cuenta personal renombrada. Se resuelve a favor del trigger.
--
-- Espejo en supabase/schemas/public.sql.
-- ============================================================================

-- ── 1. projects / documents: 'member' pasa a editor ────────────────────────
-- Se renombran a editors_can_* : el nombre admins_can_* dejaría de describir
-- lo que la policy hace.

DROP POLICY IF EXISTS "admins_can_create_projects"  ON public.projects;
DROP POLICY IF EXISTS "admins_can_update_projects"  ON public.projects;
DROP POLICY IF EXISTS "admins_can_create_documents" ON public.documents;
DROP POLICY IF EXISTS "admins_can_update_documents" ON public.documents;

CREATE POLICY "editors_can_create_projects" ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT private.get_user_role(projects.account_id, (SELECT auth.uid())))
      = ANY (ARRAY['owner'::public.membership_role,
                   'admin'::public.membership_role,
                   'member'::public.membership_role])
  );

CREATE POLICY "editors_can_update_projects" ON public.projects
  FOR UPDATE TO authenticated
  USING (
    (SELECT private.get_user_role(projects.account_id, (SELECT auth.uid())))
      = ANY (ARRAY['owner'::public.membership_role,
                   'admin'::public.membership_role,
                   'member'::public.membership_role])
  )
  WITH CHECK (
    (SELECT private.get_user_role(projects.account_id, (SELECT auth.uid())))
      = ANY (ARRAY['owner'::public.membership_role,
                   'admin'::public.membership_role,
                   'member'::public.membership_role])
  );

CREATE POLICY "editors_can_create_documents" ON public.documents
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT private.get_user_role(documents.account_id, (SELECT auth.uid())))
      = ANY (ARRAY['owner'::public.membership_role,
                   'admin'::public.membership_role,
                   'member'::public.membership_role])
  );

CREATE POLICY "editors_can_update_documents" ON public.documents
  FOR UPDATE TO authenticated
  USING (
    (SELECT private.get_user_role(documents.account_id, (SELECT auth.uid())))
      = ANY (ARRAY['owner'::public.membership_role,
                   'admin'::public.membership_role,
                   'member'::public.membership_role])
  )
  WITH CHECK (
    (SELECT private.get_user_role(documents.account_id, (SELECT auth.uid())))
      = ANY (ARRAY['owner'::public.membership_role,
                   'admin'::public.membership_role,
                   'member'::public.membership_role])
  );


-- ── 2. Storage: el bucket documents deja de aceptar subidas de viewer ──────
-- La policy comparaba carpeta y uid pero NUNCA el rol, así que un viewer podía
-- subir archivos a su propia carpeta pese a ser de solo lectura en la tabla
-- documents. El criterio de rol es el mismo que su propio DELETE/UPDATE ya
-- aplica (20260609180000), leído del JWT y no de la DB.
DROP POLICY IF EXISTS "documents_insert_member" ON storage.objects;

CREATE POLICY "documents_insert_editor"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = ((select auth.jwt()) -> 'app_metadata' ->> 'account_id')
    AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
    AND ((select auth.jwt()) -> 'app_metadata' ->> 'role') IN ('owner', 'admin', 'member')
  );


-- ── 3. Invitar exige una cuenta de equipo ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.invite_members(
  p_account_id uuid,
  p_emails     text[],
  p_role       public.membership_role DEFAULT 'member'::public.membership_role
)
RETURNS TABLE (email text, token text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller_role public.membership_role;
  v_account_type public.account_type;
  v_email       text;
  v_norm_email  text;
  v_raw_token   text;
  v_token_hash  text;
  v_seats_max   integer;
BEGIN
  -- Las cuentas personales son 1:1 con su usuario (ver comentario de cabecera):
  -- colaborar es lo que define a un team.
  SELECT type INTO v_account_type
  FROM public.accounts
  WHERE id = p_account_id AND deleted_at IS NULL;

  IF v_account_type IS DISTINCT FROM 'team' THEN
    RAISE EXCEPTION 'not_a_team';
  END IF;

  SELECT role INTO v_caller_role
  FROM public.accounts_memberships
  WHERE account_id = p_account_id AND user_id = (SELECT auth.uid());

  IF v_caller_role IS NULL OR v_caller_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'Only owner or admin can invite members';
  END IF;

  IF p_role = 'owner' THEN
    RAISE EXCEPTION 'Cannot invite as owner';
  END IF;

  IF array_length(p_emails, 1) > 20 THEN
    RAISE EXCEPTION 'Maximum 20 emails per batch';
  END IF;

  v_seats_max := private.get_account_limit(p_account_id, 'seats_max');
  IF v_seats_max IS NOT NULL AND
     (SELECT count(*) FROM public.accounts_memberships m
      WHERE m.account_id = p_account_id) + array_length(p_emails, 1) > v_seats_max THEN
    RAISE EXCEPTION 'seat_limit_reached';
  END IF;

  FOREACH v_email IN ARRAY p_emails LOOP
    v_norm_email := lower(trim(v_email));
    v_raw_token  := encode(extensions.gen_random_bytes(32), 'hex');
    v_token_hash := encode(extensions.digest(v_raw_token, 'sha256'), 'hex');

    BEGIN
      INSERT INTO public.invitations (account_id, email, role, invited_by, token_hash)
      VALUES (p_account_id, v_norm_email, p_role, (SELECT auth.uid()), v_token_hash);
      email := v_norm_email;
      token := v_raw_token;
      RETURN NEXT;
    EXCEPTION WHEN unique_violation THEN
      NULL;
    END;
  END LOOP;
END;
$$;

ALTER FUNCTION public.invite_members(uuid, text[], public.membership_role) OWNER TO postgres;

COMMENT ON FUNCTION public.invite_members(uuid, text[], public.membership_role) IS
  'Crea invitaciones y retorna (email, token) pares. El token en texto plano se '
  'retorna UNA SOLA VEZ para enviarse por email. Solo el hash se almacena en BD. '
  'Rechaza cuentas que no sean type=team (Plan 009: Personal es 1:1) y rechaza '
  'si members actuales + invitados excede seats_max del plan (F3-3H-1).';
