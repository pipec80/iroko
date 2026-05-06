-- ============================================================================
-- Migration 008: Billing Customers & Subscriptions
-- ============================================================================
-- billing.customers: 1:1 link between accounts and payment providers.
--   FK ON DELETE RESTRICT (ajuste #2) — prevents accidental deletion of
--   billing data when an account is hard-deleted. Use soft delete instead.
--
-- billing.subscriptions: tracks the active plan for each customer.
-- billing.subscription_items: line items for metered/per-seat billing.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Customers
-- ---------------------------------------------------------------------------
CREATE TABLE billing.customers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id      uuid UNIQUE NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
  -- ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  -- Ajuste #2: RESTRICT instead of CASCADE.
  -- Deleting an account must be a conscious process:
  --   1. Cancel active subscriptions
  --   2. Soft-delete the account
  --   3. pg_cron hard-deletes after 90 days, explicitly handling billing
  provider        text NOT NULL DEFAULT 'stripe',
  external_id     text,   -- stripe customer_id / mercadopago payer_id
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  UNIQUE(provider, external_id)
);

SELECT private.apply_updated_at_trigger('billing.customers');

-- ---------------------------------------------------------------------------
-- Subscriptions
-- ---------------------------------------------------------------------------
CREATE TABLE billing.subscriptions (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id              uuid NOT NULL REFERENCES billing.customers(id) ON DELETE CASCADE,
  plan_id                  uuid NOT NULL REFERENCES billing.plans(id),
  status                   billing.subscription_status NOT NULL DEFAULT 'trialing',
  current_period_start     timestamptz,
  current_period_end       timestamptz,
  cancel_at_period_end     boolean DEFAULT false,
  canceled_at              timestamptz,
  trial_start              timestamptz,
  trial_end                timestamptz,
  provider                 text NOT NULL DEFAULT 'stripe',
  external_subscription_id text,
  metadata                 jsonb DEFAULT '{}'::jsonb,
  created_at               timestamptz DEFAULT now(),
  updated_at               timestamptz DEFAULT now()
);

CREATE INDEX idx_subscriptions_customer ON billing.subscriptions(customer_id);
CREATE INDEX idx_subscriptions_status   ON billing.subscriptions(status) WHERE status = 'active';

SELECT private.apply_updated_at_trigger('billing.subscriptions');

-- ---------------------------------------------------------------------------
-- Subscription Items (per-seat, metered, flat)
-- ---------------------------------------------------------------------------
CREATE TABLE billing.subscription_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES billing.subscriptions(id) ON DELETE CASCADE,
  description     text NOT NULL,
  type            text NOT NULL DEFAULT 'flat',   -- flat, per_seat, metered
  quantity        integer DEFAULT 1,
  unit_price      integer NOT NULL DEFAULT 0,     -- cents
  currency        char(3) DEFAULT 'USD',
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);
