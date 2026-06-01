-- Fix: avatars bucket SELECT policy is too permissive.
-- Current policy allows any authenticated user to list all files.
-- This restricts listing to the user's own folder only.
-- Files are still publicly accessible by direct URL (bucket is public=true).

DROP POLICY IF EXISTS "avatars_read_public" ON storage.objects;

CREATE POLICY "avatars_select_own_folder"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
