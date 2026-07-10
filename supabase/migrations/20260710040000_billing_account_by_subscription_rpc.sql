-- ============================================================================
-- Billing: get_account_id_by_external_subscription (F2-2A-providers)
-- ============================================================================
-- La cancelación diferida de MercadoPago solo recibe el external_subscription_id
-- (contrato de PaymentProvider.cancelSubscription), pero necesita accountId
-- para reconstruir el NormalizedEvent que alimenta apply_subscription_event.
-- SECURITY DEFINER porque billing.* es deny-all; devuelve NULL si no hay match
-- en vez de fallar, para que el caller decida qué hacer.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_account_id_by_external_subscription(
  p_external_subscription_id text
)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT c.account_id
  FROM billing.subscriptions s
  JOIN billing.customers c ON c.id = s.customer_id
  WHERE s.external_subscription_id = p_external_subscription_id
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_account_id_by_external_subscription(text) IS
  'Resuelve accountId a partir del id de suscripción del proveedor (F2-2A-providers, cancelación diferida de MercadoPago). NULL si no hay match.';

GRANT EXECUTE ON FUNCTION public.get_account_id_by_external_subscription(text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_account_id_by_external_subscription(text) FROM PUBLIC;
