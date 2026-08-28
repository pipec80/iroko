-- pgTAP: Mercado Pago CLP catalog uses the Chilean monthly commercial prices.
-- Run with: pnpm supa:test

BEGIN;
SELECT plan(3);

SELECT results_eq(
  $$
    SELECT
      plan.slug,
      plan.name,
      provider_price.currency::text,
      provider_price.amount,
      provider_price.external_price_id IS NULL
    FROM billing.provider_prices AS provider_price
    INNER JOIN billing.plans AS plan ON plan.id = provider_price.plan_id
    WHERE provider_price.provider = 'mercadopago'
      AND plan."interval" = 'month'
    ORDER BY plan.sort_order
  $$,
  $$
    VALUES
      ('free'::text, 'Free'::text, 'CLP'::text, 0::integer, true),
      ('pro'::text, 'Plus'::text, 'CLP'::text, 19990::integer, true),
      ('scale'::text, 'Pro'::text, 'CLP'::text, 102990::integer, true)
  $$,
  'Mercado Pago has the approved monthly CLP catalog without reusable remote price ids'
);

SELECT is(
  (SELECT count(*)::integer
   FROM billing.provider_prices AS provider_price
   INNER JOIN billing.plans AS plan ON plan.id = provider_price.plan_id
   WHERE provider_price.provider = 'mercadopago'),
  3,
  'Mercado Pago has one catalog price for each Chilean monthly plan'
);

SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM billing.provider_prices AS provider_price
    INNER JOIN billing.plans AS plan ON plan.id = provider_price.plan_id
    WHERE provider_price.provider = 'mercadopago'
      AND plan."interval" = 'year'
  ),
  'Mercado Pago does not advertise an annual checkout without an approved annual CLP price'
);

SELECT * FROM finish();
ROLLBACK;
