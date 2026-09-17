-- Return an exact service-only subscription correlation for Mercado Pago anomaly ingress.
BEGIN;

DROP FUNCTION IF EXISTS public.resolve_billing_checkout_reference(uuid, text);

CREATE FUNCTION public.resolve_billing_checkout_reference(
  p_external_reference uuid,
  p_external_subscription_id text
) RETURNS TABLE(account_id uuid, checkout_intent_id uuid, subscription_id uuid)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_intent billing.checkout_intents%ROWTYPE;
  v_account_id uuid;
  v_subscription_id uuid;
BEGIN
  IF NULLIF(btrim(p_external_subscription_id), '') IS NULL THEN
    RAISE EXCEPTION 'billing_required_external_subscription_id_missing';
  END IF;

  SELECT * INTO v_intent
  FROM billing.checkout_intents
  WHERE id = p_external_reference
    AND provider = 'mercadopago'
  FOR UPDATE;

  IF FOUND THEN
    IF v_intent.external_subscription_id IS NOT NULL
      AND v_intent.external_subscription_id <> btrim(p_external_subscription_id) THEN
      RAISE EXCEPTION 'billing_checkout_remote_identity_mismatch';
    END IF;
    IF v_intent.external_subscription_id IS NULL THEN
      PERFORM private.attach_billing_checkout_remote(
        v_intent.id,
        p_external_subscription_id,
        NULL
      );
    END IF;

    SELECT subscription.id INTO v_subscription_id
    FROM billing.subscriptions AS subscription
    INNER JOIN billing.customers AS customer ON customer.id = subscription.customer_id
    WHERE customer.account_id = v_intent.account_id
      AND subscription.provider = 'mercadopago'
      AND subscription.external_subscription_id = btrim(p_external_subscription_id);

    IF v_subscription_id IS NOT NULL THEN
      RETURN QUERY SELECT v_intent.account_id, v_intent.id, v_subscription_id;
    END IF;
    RETURN;
  END IF;

  SELECT customer.account_id, subscription.id
  INTO v_account_id, v_subscription_id
  FROM billing.subscriptions AS subscription
  INNER JOIN billing.customers AS customer ON customer.id = subscription.customer_id
  WHERE customer.account_id = p_external_reference
    AND subscription.provider = 'mercadopago'
    AND subscription.external_subscription_id = btrim(p_external_subscription_id);

  IF v_account_id IS NOT NULL AND v_subscription_id IS NOT NULL THEN
    RETURN QUERY SELECT v_account_id, NULL::uuid, v_subscription_id;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.resolve_billing_checkout_reference(uuid, text) IS
  'Service-only resolver for intent references and exact pre-intent account/subscription pairs.';

REVOKE ALL ON FUNCTION public.resolve_billing_checkout_reference(uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_billing_checkout_reference(uuid, text) TO service_role;

COMMIT;
