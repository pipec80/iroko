-- Plan 010 / PR 1: Storage authorization must read the membership table at
-- statement time. JWT app_metadata is intentionally not authority here: it can
-- remain valid after a member is removed or demoted.
--
-- `storage.objects` belongs to Supabase Storage, so there is no project-schema
-- mirror for these policies. This versioned migration is the source of change.

DROP POLICY "documents_insert_editor" ON storage.objects;
DROP POLICY "documents_select_member" ON storage.objects;
DROP POLICY "documents_delete_own_or_admin" ON storage.objects;
DROP POLICY "documents_update_own_or_admin" ON storage.objects;
DROP POLICY "org_assets_insert_admin" ON storage.objects;
DROP POLICY "org_assets_update_admin" ON storage.objects;
DROP POLICY "org_assets_delete_admin" ON storage.objects;
DROP POLICY "org_assets_select_member" ON storage.objects;

CREATE POLICY "documents_insert_editor"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
    AND (SELECT private.get_user_role(
      ((storage.foldername(name))[1])::uuid,
      (SELECT auth.uid())
    )) IN ('owner', 'admin', 'member')
  );

CREATE POLICY "documents_select_member"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'documents'
    AND (SELECT private.user_is_member(
      ((storage.foldername(name))[1])::uuid,
      (SELECT auth.uid())
    ))
  );

CREATE POLICY "documents_delete_own_or_admin"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'documents'
    AND (SELECT private.user_is_member(
      ((storage.foldername(name))[1])::uuid,
      (SELECT auth.uid())
    ))
    AND (
      (storage.foldername(name))[2] = (SELECT auth.uid())::text
      OR (SELECT private.get_user_role(
        ((storage.foldername(name))[1])::uuid,
        (SELECT auth.uid())
      )) IN ('admin', 'owner')
    )
  );

CREATE POLICY "documents_update_own_or_admin"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'documents'
    AND (SELECT private.user_is_member(
      ((storage.foldername(name))[1])::uuid,
      (SELECT auth.uid())
    ))
    AND (
      (storage.foldername(name))[2] = (SELECT auth.uid())::text
      OR (SELECT private.get_user_role(
        ((storage.foldername(name))[1])::uuid,
        (SELECT auth.uid())
      )) IN ('admin', 'owner')
    )
  )
  WITH CHECK (
    bucket_id = 'documents'
    AND (SELECT private.user_is_member(
      ((storage.foldername(name))[1])::uuid,
      (SELECT auth.uid())
    ))
    AND (
      (storage.foldername(name))[2] = (SELECT auth.uid())::text
      OR (SELECT private.get_user_role(
        ((storage.foldername(name))[1])::uuid,
        (SELECT auth.uid())
      )) IN ('admin', 'owner')
    )
  );

CREATE POLICY "org_assets_insert_admin"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'org-assets'
    AND (SELECT private.get_user_role(
      ((storage.foldername(name))[1])::uuid,
      (SELECT auth.uid())
    )) IN ('admin', 'owner')
  );

CREATE POLICY "org_assets_update_admin"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'org-assets'
    AND (SELECT private.get_user_role(
      ((storage.foldername(name))[1])::uuid,
      (SELECT auth.uid())
    )) IN ('admin', 'owner')
  )
  WITH CHECK (
    bucket_id = 'org-assets'
    AND (SELECT private.get_user_role(
      ((storage.foldername(name))[1])::uuid,
      (SELECT auth.uid())
    )) IN ('admin', 'owner')
  );

CREATE POLICY "org_assets_delete_admin"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'org-assets'
    AND (SELECT private.get_user_role(
      ((storage.foldername(name))[1])::uuid,
      (SELECT auth.uid())
    )) IN ('admin', 'owner')
  );

CREATE POLICY "org_assets_select_member"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'org-assets'
    AND (SELECT private.user_is_member(
      ((storage.foldername(name))[1])::uuid,
      (SELECT auth.uid())
    ))
  );
