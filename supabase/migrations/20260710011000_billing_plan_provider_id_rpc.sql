-- ============================================================================
-- Billing: get_plan_provider_id (F2-2A-providers)
-- ============================================================================
-- billing.plans es RLS deny-all; los adapters reales (Stripe, MercadoPago)
-- necesitan resolver planSlug+interval → el ID específico del proveedor
-- (price_id de Stripe, preapproval_plan_id de MercadoPago) guardado en
-- billing.plans.provider_ids. Misma forma que get_active_plans: lectura
-- pública de metadata de planes, no de datos de cuenta — no hay nada sensible
-- que proteger acá, por eso queda accesible a authenticated (los adapters se
-- invocan siempre desde un server action ya autenticado).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_plan_provider_id(
  p_slug     text,
  p_interval billing.plan_interval,
  p_provider text
)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT provider_ids->>p_provider
  FROM billing.plans
  WHERE slug = p_slug AND "interval" = p_interval
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_plan_provider_id(text, billing.plan_interval, text) IS
  'Resuelve el ID específico del proveedor (price_id de Stripe, preapproval_plan_id de MercadoPago) para un plan+interval. Lectura pública de metadata de planes (F2-2A-providers).';

GRANT EXECUTE ON FUNCTION public.get_plan_provider_id(text, billing.plan_interval, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_plan_provider_id(text, billing.plan_interval, text) FROM PUBLIC;
