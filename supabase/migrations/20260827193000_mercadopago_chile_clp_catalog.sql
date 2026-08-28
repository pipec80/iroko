-- ============================================================================
-- Mercado Pago Chile: approved CLP monthly catalog
-- ============================================================================
-- Keep durable plan slugs/ids (free, pro, scale) so existing entitlements and
-- subscriptions remain stable. Their public labels become Free, Plus and Pro.
-- Mercado Pago pending preapprovals do not use a reusable remote plan, so
-- external_price_id intentionally remains NULL for the CLP entries.
-- ============================================================================

BEGIN;

UPDATE billing.plans AS plan
SET name = catalog.name
FROM (
  VALUES
    ('free'::text, 'Free'::text),
    ('pro'::text, 'Plus'::text),
    ('scale'::text, 'Pro'::text)
) AS catalog(slug, name)
WHERE plan.slug = catalog.slug
  AND plan.name IS DISTINCT FROM catalog.name;

WITH monthly_prices(slug, amount) AS (
  VALUES
    ('free'::text, 0::integer),
    ('pro'::text, 19990::integer),
    ('scale'::text, 102990::integer)
)
INSERT INTO billing.provider_prices (
  plan_id,
  provider,
  external_price_id,
  currency,
  amount,
  is_active,
  metadata
)
SELECT
  plan.id,
  'mercadopago',
  NULL,
  'CLP',
  monthly_prices.amount,
  true,
  '{"checkout_mode":"preapproval_without_plan","country":"CL"}'::jsonb
FROM billing.plans AS plan
INNER JOIN monthly_prices ON monthly_prices.slug = plan.slug
WHERE plan."interval" = 'month'
ON CONFLICT (plan_id, provider, currency) DO UPDATE
SET external_price_id = NULL,
    amount = EXCLUDED.amount,
    is_active = true,
    metadata = EXCLUDED.metadata,
    updated_at = now();

COMMIT;
