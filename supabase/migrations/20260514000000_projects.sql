-- ============================================================================
-- Migration: Projects
-- ============================================================================
-- Each project belongs to an account (team or personal).
-- Members can view projects; admins/owners can create/update; owners can delete.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Enum
-- ---------------------------------------------------------------------------
CREATE TYPE public.project_status AS ENUM ('active', 'paused', 'draft');

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------
CREATE TABLE public.projects (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  uuid        NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  name        text        NOT NULL,
  slug        text        NOT NULL,
  description text,
  status      public.project_status NOT NULL DEFAULT 'active',
  color       text,
  metadata    jsonb       DEFAULT '{}'::jsonb,
  created_by  uuid        REFERENCES public.profiles(id),
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  deleted_at  timestamptz,
  UNIQUE (account_id, slug)
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX idx_projects_account_id ON public.projects(account_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_status     ON public.projects(status)     WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
SELECT private.apply_updated_at_trigger('public.projects');

-- ---------------------------------------------------------------------------
-- RLS policies  — always (select auth.uid()) to avoid per-row re-evaluation
-- ---------------------------------------------------------------------------
CREATE POLICY "members_can_view_projects" ON public.projects
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.accounts_memberships
      WHERE account_id = projects.account_id
        AND user_id    = (SELECT auth.uid())
    )
  );

CREATE POLICY "admins_can_create_projects" ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.accounts_memberships
      WHERE account_id = projects.account_id
        AND user_id    = (SELECT auth.uid())
        AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "admins_can_update_projects" ON public.projects
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.accounts_memberships
      WHERE account_id = projects.account_id
        AND user_id    = (SELECT auth.uid())
        AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "owners_can_delete_projects" ON public.projects
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.accounts_memberships
      WHERE account_id = projects.account_id
        AND user_id    = (SELECT auth.uid())
        AND role = 'owner'
    )
  );

-- Hide table from anon — RLS protects rows, REVOKE hides the table from REST/GraphQL
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.projects FROM anon;
