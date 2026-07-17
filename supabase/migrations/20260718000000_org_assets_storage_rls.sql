-- ============================================================================
-- Migration: RLS policies for storage.objects (org-assets bucket)
-- ============================================================================
-- Bucket: org-assets  (public = true — lectura sin RLS, vía URL pública)
-- Path convention: org-assets/{accountId}/logo.{ext}
--
-- Isolación por org (calcado de documents, NO de avatars — es per-org):
--   foldername(name)[1] = accountId  (del JWT app_metadata.account_id)
--
-- Reglas (F3-3H-2):
--   INSERT/UPDATE/DELETE → solo owner/admin de la org, solo en su propia carpeta
--   SELECT → sin política (bucket público, se sirve por URL pública)
-- ============================================================================

CREATE POLICY "org_assets_insert_admin"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'org-assets'
    AND (storage.foldername(name))[1] = (auth.jwt() -> 'app_metadata' ->> 'account_id')
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'owner')
  );

CREATE POLICY "org_assets_update_admin"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'org-assets'
    AND (storage.foldername(name))[1] = (auth.jwt() -> 'app_metadata' ->> 'account_id')
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'owner')
  )
  WITH CHECK (
    bucket_id = 'org-assets'
    AND (storage.foldername(name))[1] = (auth.jwt() -> 'app_metadata' ->> 'account_id')
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'owner')
  );

CREATE POLICY "org_assets_delete_admin"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'org-assets'
    AND (storage.foldername(name))[1] = (auth.jwt() -> 'app_metadata' ->> 'account_id')
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'owner')
  );
