-- ============================================================================
-- Migration 019: Missing FK Indexes
-- ============================================================================
-- Adds indexes on all foreign key columns that lacked one.
-- Unindexed FKs cause sequential scans when Postgres cascades DELETE/UPDATE
-- to the referencing table.
--
-- Identified by pgTAP test 06_indexes and Supabase advisor check #0001.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- public schema
-- ---------------------------------------------------------------------------

-- accounts.created_by → public.profiles(id)
-- Needed for: "find accounts created by this user"
CREATE INDEX idx_accounts_created_by
  ON public.accounts(created_by);

-- accounts_memberships.invited_by → public.profiles(id)
-- Needed for: FK CASCADE safety on profile deletion
CREATE INDEX idx_memberships_invited_by
  ON public.accounts_memberships(invited_by);

-- invitations.account_id → public.accounts(id)
-- Needed for: "list pending invitations for this account"
CREATE INDEX idx_invitations_account_id
  ON public.invitations(account_id);

-- invitations.invited_by → public.profiles(id)
-- Needed for: FK CASCADE safety on profile deletion
CREATE INDEX idx_invitations_invited_by
  ON public.invitations(invited_by);

-- ---------------------------------------------------------------------------
-- billing schema
-- ---------------------------------------------------------------------------

-- billing.subscriptions.plan_id → billing.plans(id)
-- Needed for: "how many subscriptions does this plan have?"
CREATE INDEX idx_subscriptions_plan
  ON billing.subscriptions(plan_id);

-- billing.subscription_items.subscription_id → billing.subscriptions(id)
-- Needed for: "list line items for this subscription" (ON DELETE CASCADE)
CREATE INDEX idx_subscription_items_subscription
  ON billing.subscription_items(subscription_id);

-- billing.invoices.subscription_id → billing.subscriptions(id)
-- Needed for: "list invoices for this subscription" (ON DELETE SET NULL)
CREATE INDEX idx_invoices_subscription
  ON billing.invoices(subscription_id);

-- billing.invoice_line_items.invoice_id → billing.invoices(id)
-- Needed for: "list line items for this invoice" (ON DELETE CASCADE)
CREATE INDEX idx_invoice_line_items_invoice
  ON billing.invoice_line_items(invoice_id);

-- billing.payment_methods.customer_id → billing.customers(id)
-- Needed for: "list payment methods for this customer" (ON DELETE CASCADE)
CREATE INDEX idx_payment_methods_customer
  ON billing.payment_methods(customer_id);
