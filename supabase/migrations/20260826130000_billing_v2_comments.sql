-- Billing Core v2: align operational schema comments with provider-scoped identity.

BEGIN;

COMMENT ON TABLE billing.customers IS
  'Customer identity for one Iroko account at one payment provider. An account may have one identity per provider.';
COMMENT ON COLUMN billing.customers.account_id IS
  'Owning account. Unique together with provider so one account may use multiple payment providers.';
COMMENT ON COLUMN billing.customers.provider IS
  'Payment provider that owns this customer identity, such as mock, stripe, or mercadopago.';
COMMENT ON INDEX billing.customers_account_provider_key IS
  'Ensures one customer identity per account and provider.';

COMMENT ON COLUMN billing.events.provider IS
  'Payment provider that emitted the event, such as mock, stripe, or mercadopago.';
COMMENT ON COLUMN billing.events.external_event_id IS
  'Provider event identifier. Unique together with provider to reject duplicate deliveries safely.';
COMMENT ON INDEX billing.events_provider_external_event_key IS
  'Provider-scoped idempotency: one provider event is reduced at most once.';

COMMENT ON COLUMN billing.subscriptions.provider IS
  'Payment provider that manages this subscription, such as mock, stripe, or mercadopago.';
COMMENT ON COLUMN billing.subscriptions.external_subscription_id IS
  'Provider subscription identifier. Unique together with provider when present.';
COMMENT ON COLUMN billing.invoices.provider IS
  'Payment provider that issued the invoice. External invoice identity is scoped by this provider.';

COMMIT;
