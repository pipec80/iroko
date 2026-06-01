-- ============================================================================
-- Migration: RLS policies for storage.objects (documents bucket)
-- ============================================================================
-- Bucket: documents  (public = false — acceso solo via URL firmada)
-- Path convention: documents/{accountId}/{userId}/{uuid}.{ext}
--
-- Isolación por org:
--   foldername(name)[1] = accountId  (del JWT app_metadata.account_id)
--   foldername(name)[2] = userId     (del JWT sub)
--
-- Reglas:
--   INSERT  → miembro activo de la org, solo en su propia subcarpeta
--   SELECT  → cualquier miembro de la org puede listar/generar signed URLs
--   DELETE  → propietario del archivo O admin/owner de la org
--   UPDATE  → mismo criterio que DELETE
-- ============================================================================

-- Subir archivos: solo a la propia subcarpeta dentro de la org del JWT
CREATE POLICY "documents_insert_member"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = (auth.jwt() -> 'app_metadata' ->> 'account_id')
    AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
  );

-- Listar y generar signed URLs: cualquier miembro de la org
CREATE POLICY "documents_select_member"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = (auth.jwt() -> 'app_metadata' ->> 'account_id')
  );

-- Eliminar: propio archivo O admin/owner de la org
CREATE POLICY "documents_delete_own_or_admin"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = (auth.jwt() -> 'app_metadata' ->> 'account_id')
    AND (
      (storage.foldername(name))[2] = (SELECT auth.uid())::text
      OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'owner')
    )
  );

-- Actualizar (renombrar/sobreescribir): mismo criterio que DELETE
CREATE POLICY "documents_update_own_or_admin"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = (auth.jwt() -> 'app_metadata' ->> 'account_id')
    AND (
      (storage.foldername(name))[2] = (SELECT auth.uid())::text
      OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'owner')
    )
  )
  WITH CHECK (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = (auth.jwt() -> 'app_metadata' ->> 'account_id')
    AND (
      (storage.foldername(name))[2] = (SELECT auth.uid())::text
      OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'owner')
    )
  );
