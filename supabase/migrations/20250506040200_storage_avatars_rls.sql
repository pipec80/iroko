-- ============================================================================
-- Migration: RLS policies for storage.objects (avatars bucket)
-- ============================================================================
-- Folder convention: avatars/{user_id}/<filename>
-- - SELECT: public (bucket already public=true in config.toml).
-- - INSERT/UPDATE/DELETE: only if the top-level folder matches auth.uid().
-- ============================================================================

-- Upload own avatars
CREATE POLICY "avatars_insert_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Update own avatars (overwrite/rename within own folder)
CREATE POLICY "avatars_update_own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Delete own avatars
CREATE POLICY "avatars_delete_own"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Public read (bucket.public=true already enables GET; this makes the policy
-- explicit and grep-able).
CREATE POLICY "avatars_read_public"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'avatars');
