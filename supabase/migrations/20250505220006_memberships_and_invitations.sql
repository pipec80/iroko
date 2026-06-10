-- ============================================================================
-- Migration 006: Memberships & Invitations
-- ============================================================================
-- Memberships: links users to accounts with roles (owner, admin, member, viewer)
-- Invitations: token-based invite flow with expiration
--
-- Includes INDEX ON user_id (ajuste #5) — critical for get_my_accounts() performance.
-- RLS auto-enabled by event trigger from migration 001.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Memberships
-- ---------------------------------------------------------------------------
CREATE TABLE public.accounts_memberships (
  account_id  uuid REFERENCES public.accounts(id) ON DELETE CASCADE,
  user_id     uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  role        public.membership_role NOT NULL DEFAULT 'member',
  invited_by  uuid REFERENCES public.profiles(id),
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  PRIMARY KEY (account_id, user_id)
);

-- Ajuste #5: Index on user_id — avoids sequential scan in get_my_accounts()
-- Without this index, every login triggers a full table scan.
CREATE INDEX idx_memberships_user_id ON public.accounts_memberships(user_id);

-- Auto-update updated_at
SELECT private.apply_updated_at_trigger('public.accounts_memberships');

-- ---------------------------------------------------------------------------
-- Invitations
-- ---------------------------------------------------------------------------
CREATE TABLE public.invitations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  email       text NOT NULL,
  role        public.membership_role NOT NULL DEFAULT 'member',
  token       text NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  status      public.invitation_status DEFAULT 'pending',
  invited_by  uuid REFERENCES public.profiles(id),
  expires_at  timestamptz DEFAULT now() + interval '7 days',
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  UNIQUE(account_id, email)
);

-- Partial index: only index pending invitations (the only ones looked up by token)
CREATE INDEX idx_invitations_token ON public.invitations(token) WHERE status = 'pending';

-- Auto-update updated_at
SELECT private.apply_updated_at_trigger('public.invitations');
