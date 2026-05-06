-- ============================================================================
-- Migration: Enable RLS on billing.* and audit.logs as defense in depth
-- ============================================================================
-- The schemas billing and audit have `REVOKE ALL ON SCHEMA FROM public, anon,
-- authenticated` (migration 001). Today's security relies on that REVOKE +
-- access-only-through-RPCs (SECURITY DEFINER).
--
-- Risk: a future migration that GRANTs USAGE by mistake would expose every
-- row. RLS with a RESTRICTIVE deny-all policy is cheap and bulletproof:
-- even if someone GRANTs USAGE later, the tables stay locked.
--
-- SECURITY DEFINER functions (our RPCs) bypass RLS because they run with the
-- function owner's privileges, so this change does NOT break existing flows.
-- ============================================================================

-- --------------------------------------------------------------------------
-- billing.* — lock everything, RPCs access via SECURITY DEFINER
-- --------------------------------------------------------------------------
ALTER TABLE billing.plans              ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing.customers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing.subscriptions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing.subscription_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing.payment_methods    ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing.invoices           ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing.invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing.events             ENABLE ROW LEVEL SECURITY;

-- RESTRICTIVE policies combine with AND, so "false" blocks everyone that
-- reaches the table via a non-DEFINER path (the current surface is zero).
CREATE POLICY "billing_plans_deny_all"
  ON billing.plans AS RESTRICTIVE FOR ALL TO public USING (false) WITH CHECK (false);

CREATE POLICY "billing_customers_deny_all"
  ON billing.customers AS RESTRICTIVE FOR ALL TO public USING (false) WITH CHECK (false);

CREATE POLICY "billing_subscriptions_deny_all"
  ON billing.subscriptions AS RESTRICTIVE FOR ALL TO public USING (false) WITH CHECK (false);

CREATE POLICY "billing_subscription_items_deny_all"
  ON billing.subscription_items AS RESTRICTIVE FOR ALL TO public USING (false) WITH CHECK (false);

CREATE POLICY "billing_payment_methods_deny_all"
  ON billing.payment_methods AS RESTRICTIVE FOR ALL TO public USING (false) WITH CHECK (false);

CREATE POLICY "billing_invoices_deny_all"
  ON billing.invoices AS RESTRICTIVE FOR ALL TO public USING (false) WITH CHECK (false);

CREATE POLICY "billing_invoice_line_items_deny_all"
  ON billing.invoice_line_items AS RESTRICTIVE FOR ALL TO public USING (false) WITH CHECK (false);

CREATE POLICY "billing_events_deny_all"
  ON billing.events AS RESTRICTIVE FOR ALL TO public USING (false) WITH CHECK (false);

-- --------------------------------------------------------------------------
-- audit.logs — append-only, never readable from client/authenticated path
-- --------------------------------------------------------------------------
ALTER TABLE audit.logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs_deny_all"
  ON audit.logs AS RESTRICTIVE FOR ALL TO public USING (false) WITH CHECK (false);
