-- ============================================================================
-- Migration 007: Billing Plans
-- ============================================================================
-- Product/pricing catalog. Plans live in the `billing` schema (not exposed via API).
-- Prices stored as INTEGER in cents to avoid floating-point errors.
-- Accessible to users via the get_active_plans() RPC only.
-- ============================================================================

CREATE TABLE billing.plans (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text UNIQUE NOT NULL,
  name            text NOT NULL,
  description     text,
  interval        billing.plan_interval NOT NULL DEFAULT 'month',
  price           integer NOT NULL DEFAULT 0,   -- always in cents
  currency        char(3) NOT NULL DEFAULT 'USD',
  trial_days      integer DEFAULT 0,
  features        jsonb DEFAULT '{}'::jsonb,     -- feature flags (max_members, api_access, etc.)
  limits          jsonb DEFAULT '{}'::jsonb,     -- quotas (max_projects, etc.)
  sort_order      integer DEFAULT 0,
  is_active       boolean DEFAULT true,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

SELECT private.apply_updated_at_trigger('billing.plans');
