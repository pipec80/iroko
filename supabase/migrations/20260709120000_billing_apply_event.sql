-- ============================================================================
-- Billing: aplicar evento de suscripción (F2-2A-core)
-- ============================================================================
-- Escritura atómica del webhook handler: idempotencia por billing.events
-- (external_event_id UNIQUE), upsert de customer+subscription, invoice opcional,
-- y emisión del evento subscription.* a los webhooks salientes (2D). Solo
-- service_role: lo invoca el route handler con el admin client.
-- El mapeo evento→estado ya lo decidió la máquina de estados en TS; esta RPC
-- persiste esa decisión (p_status ya viene resuelto).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.apply_subscription_event(
  p_account_id               uuid,
  p_plan_slug                text,
  p_interval                 billing.plan_interval,
  p_status                   billing.subscription_status,
  p_external_subscription_id text,
  p_external_event_id        text,
  p_event_type               text,
  p_current_period_start     timestamptz DEFAULT NULL,
  p_current_period_end       timestamptz DEFAULT NULL,
  p_cancel_at_period_end     boolean DEFAULT false,
  p_trial_end                timestamptz DEFAULT NULL,
  p_invoice                  jsonb DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_customer_id     uuid;
  v_plan_id         uuid;
  v_subscription_id uuid;
BEGIN
  -- Idempotencia: si el evento externo ya se procesó, no-op.
  INSERT INTO billing.events (event_type, provider, external_event_id, payload, processed_at)
  VALUES (p_event_type, 'mock', p_external_event_id, COALESCE(p_invoice, '{}'::jsonb), now())
  ON CONFLICT (external_event_id) DO NOTHING;
  IF NOT FOUND THEN
    RETURN 'duplicate';
  END IF;

  SELECT id INTO v_plan_id FROM billing.plans
  WHERE slug = p_plan_slug AND "interval" = p_interval LIMIT 1;
  IF v_plan_id IS NULL THEN
    RAISE EXCEPTION 'plan_not_found';
  END IF;

  -- Upsert del customer (account_id UNIQUE).
  INSERT INTO billing.customers (account_id, provider)
  VALUES (p_account_id, 'mock')
  ON CONFLICT (account_id) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_customer_id;

  -- Upsert de la suscripción por external_subscription_id.
  SELECT id INTO v_subscription_id FROM billing.subscriptions
  WHERE external_subscription_id = p_external_subscription_id;

  IF v_subscription_id IS NULL THEN
    INSERT INTO billing.subscriptions (
      customer_id, plan_id, status, current_period_start, current_period_end,
      cancel_at_period_end, trial_end, provider, external_subscription_id)
    VALUES (
      v_customer_id, v_plan_id, p_status, p_current_period_start, p_current_period_end,
      COALESCE(p_cancel_at_period_end, false), p_trial_end, 'mock', p_external_subscription_id)
    RETURNING id INTO v_subscription_id;
  ELSE
    UPDATE billing.subscriptions
    SET plan_id = v_plan_id, status = p_status,
        current_period_start = p_current_period_start,
        current_period_end = p_current_period_end,
        cancel_at_period_end = COALESCE(p_cancel_at_period_end, cancel_at_period_end),
        trial_end = p_trial_end
    WHERE id = v_subscription_id;
  END IF;

  -- Invoice opcional (invoice_paid).
  IF p_invoice IS NOT NULL AND p_event_type = 'invoice_paid' THEN
    INSERT INTO billing.invoices (
      customer_id, subscription_id, status, currency, total, amount_paid,
      period_start, period_end, paid_at)
    VALUES (
      v_customer_id, v_subscription_id, 'paid',
      COALESCE(p_invoice->>'currency', 'USD'),
      COALESCE((p_invoice->>'amountPaid')::int, 0),
      COALESCE((p_invoice->>'amountPaid')::int, 0),
      (p_invoice->>'periodStart')::timestamptz,
      (p_invoice->>'periodEnd')::timestamptz,
      now());
  END IF;

  -- Emitir el evento saliente (2D). Mapea el tipo interno → nombre del catálogo.
  PERFORM private.emit_webhook_event(
    p_account_id,
    CASE p_event_type
      WHEN 'subscription_created'  THEN 'subscription.created'
      WHEN 'subscription_canceled' THEN 'subscription.canceled'
      ELSE 'subscription.updated'
    END,
    jsonb_build_object('plan_slug', p_plan_slug, 'status', p_status,
                       'cancel_at_period_end', COALESCE(p_cancel_at_period_end, false)));

  RETURN 'applied';
END;
$$;

COMMENT ON FUNCTION public.apply_subscription_event(uuid, text, billing.plan_interval, billing.subscription_status, text, text, text, timestamptz, timestamptz, boolean, timestamptz, jsonb) IS
  'Persiste un evento de suscripción resuelto (idempotente por external_event_id) y emite subscription.* a los webhooks salientes. Solo service_role (F2-2A-core).';

GRANT EXECUTE ON FUNCTION public.apply_subscription_event(uuid, text, billing.plan_interval, billing.subscription_status, text, text, text, timestamptz, timestamptz, boolean, timestamptz, jsonb) TO service_role;
REVOKE EXECUTE ON FUNCTION public.apply_subscription_event(uuid, text, billing.plan_interval, billing.subscription_status, text, text, text, timestamptz, timestamptz, boolean, timestamptz, jsonb) FROM PUBLIC, authenticated, anon;
