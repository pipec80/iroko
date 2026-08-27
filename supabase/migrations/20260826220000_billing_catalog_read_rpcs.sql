-- ============================================================================
-- Billing Core v2: server-only provider catalog read RPCs
-- ============================================================================
-- `billing` intentionally remains outside PostgREST's exposed schemas. These
-- narrow SECURITY DEFINER functions are the only REST bridge needed by the
-- server-side provider catalog for checkout and webhook price resolution.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.get_billing_provider_price(
  p_plan_slug text,
  p_interval billing.plan_interval,
  p_provider text,
  p_currency char(3)
)
RETURNS TABLE(
  id uuid,
  plan_id uuid,
  plan_slug text,
  "interval" billing.plan_interval,
  provider text,
  external_price_id text,
  amount integer,
  currency char(3)
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    provider_price.id,
    provider_price.plan_id,
    plan.slug,
    plan."interval",
    provider_price.provider,
    provider_price.external_price_id,
    provider_price.amount,
    provider_price.currency
  FROM billing.provider_prices AS provider_price
  INNER JOIN billing.plans AS plan ON plan.id = provider_price.plan_id
  WHERE plan.slug = p_plan_slug
    AND plan."interval" = p_interval
    AND provider_price.provider = p_provider
    AND provider_price.currency = p_currency
    AND provider_price.is_active;
$$;

COMMENT ON FUNCTION public.get_billing_provider_price(
  text, billing.plan_interval, text, char(3)
) IS
  'Server-only checkout catalog lookup. Reads billing.provider_prices without exposing the billing schema through PostgREST.';

CREATE OR REPLACE FUNCTION public.resolve_billing_plan_by_external_price(
  p_provider text,
  p_external_price_id text
)
RETURNS TABLE(
  plan_id uuid,
  plan_slug text,
  "interval" billing.plan_interval
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    provider_price.plan_id,
    plan.slug,
    plan."interval"
  FROM billing.provider_prices AS provider_price
  INNER JOIN billing.plans AS plan ON plan.id = provider_price.plan_id
  WHERE provider_price.provider = p_provider
    AND provider_price.external_price_id = p_external_price_id;
$$;

COMMENT ON FUNCTION public.resolve_billing_plan_by_external_price(text, text) IS
  'Server-only webhook reverse lookup. Resolves a provider external price ID without exposing the billing schema through PostgREST.';

REVOKE ALL ON FUNCTION public.get_billing_provider_price(
  text, billing.plan_interval, text, char(3)
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_billing_provider_price(
  text, billing.plan_interval, text, char(3)
) TO service_role;

REVOKE ALL ON FUNCTION public.resolve_billing_plan_by_external_price(text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_billing_plan_by_external_price(text, text)
  TO service_role;

COMMIT;
