-- ============================================================================
-- Migration 002: Enum Types
-- ============================================================================
-- All enum types for the SaaS schema. Values are carefully chosen because
-- enums in Postgres can be extended (ADD VALUE) but NEVER reduced.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Public schema enums (exposed via PostgREST)
-- ---------------------------------------------------------------------------
CREATE TYPE public.account_type      AS ENUM ('personal', 'team');
CREATE TYPE public.membership_role   AS ENUM ('owner', 'admin', 'member', 'viewer');
CREATE TYPE public.invitation_status AS ENUM ('pending', 'accepted', 'revoked', 'expired');

-- ---------------------------------------------------------------------------
-- Billing schema enums (internal, accessed only via RPCs)
-- ---------------------------------------------------------------------------
CREATE TYPE billing.plan_interval AS ENUM ('month', 'year', 'one_time');

CREATE TYPE billing.subscription_status AS ENUM (
  'trialing', 'active', 'past_due', 'canceled', 'paused', 'unpaid', 'incomplete'
);

CREATE TYPE billing.invoice_status AS ENUM (
  'draft', 'open', 'paid', 'void', 'uncollectible'
);

CREATE TYPE billing.payment_method_type AS ENUM (
  'card', 'bank_transfer', 'wallet', 'other'
);

-- ---------------------------------------------------------------------------
-- Audit schema enums
-- NOTE: This enum will likely grow. When it exceeds ~20 values, consider
-- migrating to a lookup table. Add new values with:
--   ALTER TYPE audit.action_type ADD VALUE 'new_action';
-- ---------------------------------------------------------------------------
CREATE TYPE audit.action_type AS ENUM (
  'create', 'update', 'delete',
  'login', 'logout',
  'invite', 'role_change',
  'subscription_change', 'payment', 'export'
);
