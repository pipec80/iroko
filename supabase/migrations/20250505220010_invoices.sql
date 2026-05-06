-- ============================================================================
-- Migration 010: Invoices
-- ============================================================================
-- billing.invoices: Financial records that MUST be preserved.
--   - customer_id FK: ON DELETE RESTRICT (invoices cannot be orphaned)
--   - subscription_id FK: ON DELETE SET NULL (ajuste #3) — if a subscription
--     is deleted, the invoice remains with a NULL reference.
--
-- Includes composite index (customer_id, created_at DESC) for listing invoices
-- per customer (ajuste #13).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Invoices
-- ---------------------------------------------------------------------------
CREATE TABLE billing.invoices (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id         uuid NOT NULL REFERENCES billing.customers(id) ON DELETE RESTRICT,
  subscription_id     uuid REFERENCES billing.subscriptions(id) ON DELETE SET NULL,
  -- ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  -- Ajuste #3: SET NULL instead of NO ACTION.
  -- If a subscription is purged, the invoice record is preserved with
  -- subscription_id = NULL. Invoices are legal documents — never delete them.
  number              text UNIQUE,
  status              billing.invoice_status DEFAULT 'draft',
  currency            char(3) NOT NULL DEFAULT 'USD',
  subtotal            integer DEFAULT 0,    -- cents
  tax                 integer DEFAULT 0,    -- cents
  total               integer DEFAULT 0,    -- cents
  amount_paid         integer DEFAULT 0,    -- cents
  period_start        timestamptz,
  period_end          timestamptz,
  paid_at             timestamptz,
  external_invoice_id text,
  hosted_url          text,                 -- Stripe hosted invoice URL
  pdf_url             text,                 -- PDF download URL
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

-- Ajuste #13: Composite index for listing invoices per customer
CREATE INDEX idx_invoices_customer_date
  ON billing.invoices(customer_id, created_at DESC);

SELECT private.apply_updated_at_trigger('billing.invoices');

-- ---------------------------------------------------------------------------
-- Invoice Line Items
-- ---------------------------------------------------------------------------
CREATE TABLE billing.invoice_line_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id  uuid NOT NULL REFERENCES billing.invoices(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity    integer DEFAULT 1,
  unit_price  integer NOT NULL,   -- cents
  amount      integer NOT NULL,   -- cents (quantity × unit_price)
  created_at  timestamptz DEFAULT now()
);
