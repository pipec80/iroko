-- ============================================================================
-- Billing: get_billing_overview expone provider + external_subscription_id
-- ============================================================================
-- Gap encontrado al planear 2A-providers: la action cancelSubscription
-- necesita saber CON QUÉ proveedor y CUÁL id externo cancelar, para poder
-- llamar getPaymentProvider(provider).cancelSubscription(externalId, ...) en
-- vez de asumir siempre mock. Esta RPC es la única fuente de esos datos para
-- la UI (billing.* es deny-all).
--
-- Postgres no permite agregar columnas a una función RETURNS TABLE vía
-- CREATE OR REPLACE ("cannot change return type of existing function"), así
-- que hay que dropearla primero.
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_billing_overview(uuid);

CREATE OR REPLACE FUNCTION public.get_billing_overview(p_account_id uuid)
RETURNS TABLE (
  plan_slug               text,
  plan_name               text,
  plan_interval           billing.plan_interval,
  status                  billing.subscription_status,
  current_period_end      timestamptz,
  cancel_at_period_end    boolean,
  trial_end               timestamptz,
  provider                text,
  external_subscription_id text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM private.assert_account_admin(p_account_id);
  RETURN QUERY
  SELECT p.slug, p.name, p."interval", s.status, s.current_period_end,
         s.cancel_at_period_end, s.trial_end, s.provider, s.external_subscription_id
  FROM billing.subscriptions s
  JOIN billing.customers c ON c.id = s.customer_id
  JOIN billing.plans p ON p.id = s.plan_id
  WHERE c.account_id = p_account_id
    AND s.status IN ('active', 'trialing', 'past_due', 'paused')
  ORDER BY s.created_at DESC
  LIMIT 1;
END;
$$;

COMMENT ON FUNCTION public.get_billing_overview(uuid) IS
  'Suscripción vigente de la cuenta para la UI de billing (owner/admin), incluyendo provider + external_subscription_id para poder cancelar contra el adapter real. Vacío si nunca se suscribió.';

GRANT EXECUTE ON FUNCTION public.get_billing_overview(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_billing_overview(uuid) FROM PUBLIC;
