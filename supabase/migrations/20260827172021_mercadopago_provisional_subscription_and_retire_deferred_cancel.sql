-- ============================================================================
-- Mercado Pago: provisional checkout state and retirement of unsafe local cancel
-- ============================================================================
-- Mercado Pago returns a pending preapproval before payment. This narrow
-- server-only RPC preserves the selected Iroko plan without inventing a
-- webhook event or a provider price. Deferred cancellation is unsupported in
-- the MVP, so the former database-only cancellation route is removed.
-- ============================================================================

BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM cron.job
    WHERE jobname = 'cancel-overdue-mercadopago-subscriptions'
  ) THEN
    PERFORM cron.unschedule('cancel-overdue-mercadopago-subscriptions');
  END IF;
END;
$$;

DROP FUNCTION IF EXISTS private.cancel_overdue_mercadopago_subscriptions();

CREATE OR REPLACE FUNCTION public.create_billing_provisional_subscription(
  p_account_id uuid,
  p_plan_id uuid,
  p_external_preapproval_id text
)
RETURNS text
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_customer_id uuid;
  v_external_preapproval_id text;
BEGIN
  v_external_preapproval_id := NULLIF(btrim(p_external_preapproval_id), '');

  IF v_external_preapproval_id IS NULL THEN
    RAISE EXCEPTION 'billing_required_external_preapproval_id_missing';
  END IF;

  INSERT INTO billing.customers (account_id, provider)
  VALUES (p_account_id, 'mercadopago')
  ON CONFLICT (account_id, provider) DO UPDATE
  SET updated_at = now()
  RETURNING id INTO v_customer_id;

  INSERT INTO billing.subscriptions (
    customer_id,
    plan_id,
    status,
    current_period_start,
    current_period_end,
    cancel_at_period_end,
    canceled_at,
    provider,
    external_subscription_id
  )
  VALUES (
    v_customer_id,
    p_plan_id,
    'incomplete',
    NULL,
    NULL,
    false,
    NULL,
    'mercadopago',
    v_external_preapproval_id
  )
  ON CONFLICT (provider, external_subscription_id)
    WHERE external_subscription_id IS NOT NULL
  DO UPDATE
  SET customer_id = EXCLUDED.customer_id,
      plan_id = EXCLUDED.plan_id,
      status = EXCLUDED.status,
      current_period_start = NULL,
      current_period_end = NULL,
      cancel_at_period_end = false,
      canceled_at = NULL;

  RETURN 'applied';
END;
$$;

COMMENT ON FUNCTION public.create_billing_provisional_subscription(uuid, uuid, text) IS
  'Server-only Mercado Pago checkout write. Persists a pending-preapproval subscription as incomplete with the selected Iroko plan; it does not create a provider event or paid period.';

REVOKE ALL ON FUNCTION public.create_billing_provisional_subscription(uuid, uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_billing_provisional_subscription(uuid, uuid, text)
  TO service_role;

COMMIT;
