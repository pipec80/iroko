-- 017.2-T3: do not silently repair or discard mismatched documents.
DO $$
DECLARE v_invalid text;
BEGIN
  SELECT string_agg(d.id::text, ', ' ORDER BY d.id) INTO v_invalid
  FROM public.documents d LEFT JOIN public.projects p
    ON p.id=d.project_id AND p.account_id=d.account_id
  WHERE p.id IS NULL;
  IF v_invalid IS NOT NULL THEN
    RAISE EXCEPTION 'document_project_account_preflight_failed: %',v_invalid;
  END IF;
END;
$$;
ALTER TABLE public.projects ADD CONSTRAINT projects_id_account_id_key UNIQUE(id,account_id);
ALTER TABLE public.documents ADD CONSTRAINT documents_project_account_fkey
  FOREIGN KEY(project_id,account_id) REFERENCES public.projects(id,account_id) ON DELETE CASCADE;
ALTER TABLE public.documents DROP CONSTRAINT documents_project_id_fkey;
