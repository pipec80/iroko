-- Local P1 remediation. Invoker RPC preserves document RLS and the D04 composite FK.
ALTER TABLE public.documents ADD COLUMN revision integer NOT NULL DEFAULT 0;
ALTER TABLE public.documents ADD CONSTRAINT documents_revision_nonnegative CHECK (revision >= 0);

CREATE OR REPLACE FUNCTION public.advance_document_revision()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  NEW.revision := OLD.revision + 1;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.advance_document_revision() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER documents_advance_revision BEFORE UPDATE ON public.documents
FOR EACH ROW EXECUTE FUNCTION public.advance_document_revision();

CREATE OR REPLACE FUNCTION public.save_document_revision(
  p_document_id uuid, p_content text, p_expected_revision integer
) RETURNS TABLE(revision integer)
LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
  UPDATE public.documents AS document
  SET content = p_content
  WHERE document.id = p_document_id
    AND document.revision = p_expected_revision
    AND document.deleted_at IS NULL
  RETURNING document.revision;
$$;
REVOKE ALL ON FUNCTION public.save_document_revision(uuid,text,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_document_revision(uuid,text,integer) TO authenticated;
COMMENT ON FUNCTION public.save_document_revision(uuid,text,integer) IS
  'Atomic revision compare-and-swap under document RLS. No rows means conflict or unavailable; discloses no content.';
