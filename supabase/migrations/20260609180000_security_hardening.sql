-- ============================================================================
-- Security hardening — 7 fixes identified in audit
-- ============================================================================
-- Fix 1 (BUG): request_account_deletion() usaba SECURITY INVOKER pero
--   authenticated no tiene UPDATE privilege en accounts (revocado en 040000).
--   La función fallaba silenciosamente, dejando el perfil sin borrar.
--   → Promovida a SECURITY DEFINER con verificación de auth.uid() interna.
--
-- Fix 2 (SECURITY): Política UPDATE de profiles sin deleted_at IS NULL:
--   (a) Un usuario autenticado podía hacer UPDATE directo vía REST API para
--       marcar su propio deleted_at, bypasseando request_account_deletion y
--       dejando la cuenta del account sin borrar (perfil → NULL, account → activo).
--   (b) Un perfil soft-deleted podía re-activarse con SET deleted_at = NULL.
--   → Añadido deleted_at IS NULL en USING y WITH CHECK.
--
-- Fix 3 (SECURITY): Política UPDATE de documents sin WITH CHECK:
--   Un admin podía hacer UPDATE ... SET account_id = 'otro-account-uuid'
--   y mover un documento a otro account. El USING verifica la cuenta origen
--   pero sin WITH CHECK no se valida la cuenta destino.
--   → WITH CHECK añadido (verifica rol en la fila resultante).
--
-- Fix 4 (SECURITY): Igual que Fix 3 para la tabla projects.
--
-- Fix 5 (PERF): Políticas de storage documents usan auth.jwt() sin wrapper
--   (select auth.jwt()). Postgres re-evalúa la función volátil por cada fila.
--   → Envuelto en (select ...) para evaluación única por query (InitPlan).
--
-- Fix 6 (PERF): Política SELECT de avatars usa auth.uid() sin wrapper.
--   → Envuelto en (select auth.uid()).
--
-- Fix 7 (PERF): get_my_account_id() usa auth.uid() bare.
--   → Envuelto en (select auth.uid()).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Fix 1: request_account_deletion → SECURITY DEFINER
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.request_account_deletion()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := (SELECT auth.uid());
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  UPDATE public.profiles
  SET
    deleted_at = now(),
    metadata   = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('pending_deletion', true),
    updated_at = now()
  WHERE id = v_uid;

  UPDATE public.accounts
  SET deleted_at = now(), updated_at = now()
  WHERE created_by = v_uid AND type = 'personal' AND deleted_at IS NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_account_deletion() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.request_account_deletion() FROM PUBLIC;

COMMENT ON FUNCTION public.request_account_deletion() IS
  'Marca el perfil + account personal del caller como soft-deleted. '
  'SECURITY DEFINER: authenticated no tiene UPDATE en accounts (revocado en '
  'migration 040000). El ownership se verifica con (SELECT auth.uid()). '
  'El job pg_cron hard-delete-old-accounts elimina tras 90 días. '
  'Next.js debe llamar supabase.auth.signOut() después de esta función.';

-- ---------------------------------------------------------------------------
-- Fix 2: Profiles UPDATE — cerrar bypass de soft-delete vía REST directo
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Profiles: update propio" ON public.profiles;

CREATE POLICY "Profiles: update propio"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    id = (SELECT auth.uid())
    AND deleted_at IS NULL
  )
  WITH CHECK (
    id = (SELECT auth.uid())
    AND deleted_at IS NULL
  );

-- ---------------------------------------------------------------------------
-- Fix 3: documents UPDATE — WITH CHECK para prevenir movimiento cross-account
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "admins_can_update_documents" ON public.documents;

CREATE POLICY "admins_can_update_documents" ON public.documents
  FOR UPDATE TO authenticated
  USING (
    (SELECT private.get_user_role(account_id, (SELECT auth.uid())))
    IN ('owner', 'admin')
  )
  WITH CHECK (
    (SELECT private.get_user_role(account_id, (SELECT auth.uid())))
    IN ('owner', 'admin')
  );

-- ---------------------------------------------------------------------------
-- Fix 4: projects UPDATE — WITH CHECK para prevenir movimiento cross-account
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "admins_can_update_projects" ON public.projects;

CREATE POLICY "admins_can_update_projects" ON public.projects
  FOR UPDATE TO authenticated
  USING (
    (SELECT private.get_user_role(account_id, (SELECT auth.uid())))
    IN ('owner', 'admin')
  )
  WITH CHECK (
    (SELECT private.get_user_role(account_id, (SELECT auth.uid())))
    IN ('owner', 'admin')
  );

-- ---------------------------------------------------------------------------
-- Fix 5: storage.objects — documents: (select auth.jwt()) InitPlan
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "documents_insert_member"       ON storage.objects;
DROP POLICY IF EXISTS "documents_select_member"       ON storage.objects;
DROP POLICY IF EXISTS "documents_delete_own_or_admin" ON storage.objects;
DROP POLICY IF EXISTS "documents_update_own_or_admin" ON storage.objects;

CREATE POLICY "documents_insert_member"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = ((select auth.jwt()) -> 'app_metadata' ->> 'account_id')
    AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
  );

CREATE POLICY "documents_select_member"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = ((select auth.jwt()) -> 'app_metadata' ->> 'account_id')
  );

CREATE POLICY "documents_delete_own_or_admin"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = ((select auth.jwt()) -> 'app_metadata' ->> 'account_id')
    AND (
      (storage.foldername(name))[2] = (SELECT auth.uid())::text
      OR ((select auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'owner')
    )
  );

CREATE POLICY "documents_update_own_or_admin"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = ((select auth.jwt()) -> 'app_metadata' ->> 'account_id')
    AND (
      (storage.foldername(name))[2] = (SELECT auth.uid())::text
      OR ((select auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'owner')
    )
  )
  WITH CHECK (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = ((select auth.jwt()) -> 'app_metadata' ->> 'account_id')
    AND (
      (storage.foldername(name))[2] = (SELECT auth.uid())::text
      OR ((select auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'owner')
    )
  );

-- ---------------------------------------------------------------------------
-- Fix 6: storage.objects — avatars SELECT: (select auth.uid()) InitPlan
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "avatars_select_own_folder" ON storage.objects;

CREATE POLICY "avatars_select_own_folder"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

-- ---------------------------------------------------------------------------
-- Fix 7: get_my_account_id — (select auth.uid()) InitPlan
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_my_account_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT account_id
  FROM public.accounts_memberships
  WHERE user_id = (SELECT auth.uid())
  ORDER BY created_at DESC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_account_id() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_my_account_id() FROM anon, public;

-- ---------------------------------------------------------------------------
-- Fix extra: documents.created_by — índice FK faltante
-- La tabla documents (20260602210000) tiene created_by → profiles(id) sin índice.
-- Causa sequential scans en DELETE/UPDATE de la fila referenciada.
-- Mismo patrón que el fix aplicado para projects.created_by en 20260602175125.
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_documents_created_by
  ON public.documents(created_by);
