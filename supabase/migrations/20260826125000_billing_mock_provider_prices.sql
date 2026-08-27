-- ============================================================================
-- Billing Core v2: catalog entries for the local Mock provider
-- ============================================================================
-- Mock emits mock:<slug>:<interval> as its verified external price ID. Keep it
-- in the same relational catalog as real providers so the reducer never needs
-- a provider-specific plan fallback.
-- ============================================================================

INSERT INTO billing.provider_prices (
  plan_id, provider, external_price_id, currency, amount, is_active
)
SELECT
  plan.id,
  'mock',
  format('mock:%s:%s', plan.slug, plan."interval"),
  plan.currency,
  plan.price,
  true
FROM billing.plans AS plan
ON CONFLICT (plan_id, provider, currency) DO UPDATE
SET external_price_id = EXCLUDED.external_price_id,
    amount = EXCLUDED.amount,
    is_active = true,
    updated_at = now();
