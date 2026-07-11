-- ============================================================================
-- Billing: cancelación diferida de suscripciones MercadoPago (F2-2A-providers)
-- ============================================================================
-- MercadoPago no soporta "cancelar al fin del período" nativamente (spec
-- 2026-07-09-2a-providers-stripe-mercadopago-design.md, sección 5). Este job
-- diario cierra localmente las suscripciones marcadas cancel_at_period_end
-- cuyo período ya venció. No llama a la API de MercadoPago (ver nota de
-- diseño en el plan) — solo mantiene el estado local consistente.
-- ============================================================================

CREATE OR REPLACE FUNCTION private.cancel_overdue_mercadopago_subscriptions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE billing.subscriptions
  SET status = 'canceled', canceled_at = now()
  WHERE provider = 'mercadopago'
    AND cancel_at_period_end = true
    AND current_period_end < now()
    AND status <> 'canceled';
END;
$$;

COMMENT ON FUNCTION private.cancel_overdue_mercadopago_subscriptions() IS
  'Cierra localmente suscripciones MercadoPago vencidas y marcadas para cancelar (F2-2A-providers). No llama a la API de MercadoPago.';

REVOKE EXECUTE ON FUNCTION private.cancel_overdue_mercadopago_subscriptions() FROM PUBLIC, authenticated, anon;

SELECT cron.schedule(
  'cancel-overdue-mercadopago-subscriptions',
  '0 3 * * *',
  $$SELECT private.cancel_overdue_mercadopago_subscriptions();$$
);
