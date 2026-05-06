-- ============================================================================
-- Migration 009: Payment Methods
-- ============================================================================
-- Stores tokenized payment method references from payment providers.
-- Actual card data is NEVER stored — only provider tokens, brand, and last 4.
-- ============================================================================

CREATE TABLE billing.payment_methods (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id     uuid NOT NULL REFERENCES billing.customers(id) ON DELETE CASCADE,
  type            billing.payment_method_type NOT NULL DEFAULT 'card',
  provider        text NOT NULL DEFAULT 'stripe',
  external_id     text,       -- provider's payment method ID
  brand           text,       -- visa, mastercard, amex
  last_four       char(4),
  exp_month       smallint,
  exp_year        smallint,
  is_default      boolean DEFAULT false,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

SELECT private.apply_updated_at_trigger('billing.payment_methods');
