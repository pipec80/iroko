-- ============================================================================
-- Migration 005: Accounts (Multi-tenant core)
-- ============================================================================
-- Every user gets a personal account on signup (via trigger).
-- Team accounts are created explicitly by users.
--
-- created_by is NOT NULL (ajuste #14) — every account has a known creator.
-- RLS auto-enabled by event trigger from migration 001.
-- ============================================================================

CREATE TABLE public.accounts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type            public.account_type NOT NULL DEFAULT 'team',
  name            text NOT NULL,
  slug            text UNIQUE NOT NULL,
  logo_url        text,
  billing_email   text,
  metadata        jsonb DEFAULT '{}'::jsonb,
  created_by      uuid NOT NULL REFERENCES public.profiles(id),   -- ajuste #14: NOT NULL
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  deleted_at      timestamptz   -- soft delete
);

-- Partial indexes: only index non-deleted rows
CREATE INDEX idx_accounts_slug ON public.accounts(slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_accounts_type ON public.accounts(type) WHERE deleted_at IS NULL;

-- Auto-update updated_at
SELECT private.apply_updated_at_trigger('public.accounts');

-- ---------------------------------------------------------------------------
-- Trigger: auto-create personal account + owner membership on profile creation
-- SECURITY DEFINER to insert into memberships table.
-- Includes RAISE LOG for debugging (ajuste #11).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.handle_new_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_account_id uuid;
BEGIN
  RAISE LOG 'handle_new_profile: creating personal account for user_id=%', NEW.id;

  INSERT INTO public.accounts (id, type, name, slug, created_by)
  VALUES (
    NEW.id,
    'personal',
    COALESCE(NEW.display_name, 'Personal'),
    private.slugify(COALESCE(NEW.display_name, NEW.id::text)),
    NEW.id
  )
  RETURNING id INTO v_account_id;

  INSERT INTO public.accounts_memberships (account_id, user_id, role)
  VALUES (v_account_id, NEW.id, 'owner');

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION private.handle_new_profile();
