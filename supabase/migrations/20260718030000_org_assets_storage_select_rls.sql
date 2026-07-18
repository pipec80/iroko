-- ============================================================================
-- Fix: falta la política de SELECT en storage.objects para org-assets.
-- ============================================================================
-- Bug encontrado en QA manual post-merge de F3-3H-2: el bucket es público
-- (lectura anónima por URL, que no pasa por RLS de Postgres), pero eso NO
-- alcanza para operaciones autenticadas contra la tabla storage.objects. La
-- propia Storage API de Supabase hace `INSERT ... RETURNING *` al subir un
-- archivo (para devolver metadata), y RETURNING exige una política de SELECT
-- ademas de la de INSERT — sin ella, la subida fallaba con
-- "new row violates row-level security policy" pese a que el INSERT en sí
-- estaba permitido.
-- ============================================================================

CREATE POLICY "org_assets_select_member"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'org-assets'
    AND (storage.foldername(name))[1] = (auth.jwt() -> 'app_metadata' ->> 'account_id')
  );
