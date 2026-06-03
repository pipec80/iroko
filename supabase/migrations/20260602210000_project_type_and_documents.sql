-- ============================================================================
-- Migration: project_type enum + documents table
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. project_type enum + columna en projects
-- ---------------------------------------------------------------------------

CREATE TYPE public.project_type AS ENUM ('docs', 'automation', 'agent');

ALTER TABLE public.projects
  ADD COLUMN type public.project_type NOT NULL DEFAULT 'docs';

-- ---------------------------------------------------------------------------
-- 2. Tabla documents
-- ---------------------------------------------------------------------------
-- account_id se almacena aquí directamente (no derivado de projects) para que
-- las políticas RLS puedan usar private.user_is_member sin JOIN adicional.
-- ---------------------------------------------------------------------------

CREATE TABLE public.documents (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  account_id  uuid        NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  name        text        NOT NULL,
  description text,
  content     text        NOT NULL DEFAULT '',
  created_by  uuid        REFERENCES public.profiles(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz
);

-- ---------------------------------------------------------------------------
-- 3. Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX idx_documents_project_id ON public.documents(project_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_account_id ON public.documents(account_id) WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- 4. updated_at trigger
-- ---------------------------------------------------------------------------

SELECT private.apply_updated_at_trigger('public.documents');

-- ---------------------------------------------------------------------------
-- 5. RLS — mismo patrón que projects: private.* SECURITY DEFINER functions
-- ---------------------------------------------------------------------------

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members_can_view_documents" ON public.documents
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND private.user_is_member(account_id, (SELECT auth.uid()))
  );

CREATE POLICY "admins_can_create_documents" ON public.documents
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT private.get_user_role(account_id, (SELECT auth.uid())))
    IN ('owner', 'admin')
  );

CREATE POLICY "admins_can_update_documents" ON public.documents
  FOR UPDATE TO authenticated
  USING (
    (SELECT private.get_user_role(account_id, (SELECT auth.uid())))
    IN ('owner', 'admin')
  );

CREATE POLICY "owners_can_delete_documents" ON public.documents
  FOR DELETE TO authenticated
  USING (
    (SELECT private.get_user_role(account_id, (SELECT auth.uid())))
    = 'owner'
  );

-- ---------------------------------------------------------------------------
-- 6. Grants — misma lógica que projects: anon no ve la tabla
-- ---------------------------------------------------------------------------

GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.documents FROM anon;
