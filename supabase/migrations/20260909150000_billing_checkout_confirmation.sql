-- Billing checkout return confirmation: exact, authorized, tenant-scoped lookup.

CREATE OR REPLACE FUNCTION public.get_billing_checkout_confirmation(
  p_account_id uuid,
  p_external_subscription_id text
)
RETURNS TABLE(
  state text,
  external_subscription_id text,
  status billing.subscription_status
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_external_subscription_id text := NULLIF(btrim(p_external_subscription_id), '');
  v_status billing.subscription_status;
BEGIN
  PERFORM private.assert_account_admin(p_account_id);

  IF v_external_subscription_id IS NOT NULL THEN
    SELECT subscription.status
    INTO v_status
    FROM billing.subscriptions AS subscription
    INNER JOIN billing.customers AS customer ON customer.id = subscription.customer_id
    WHERE customer.account_id = p_account_id
      AND subscription.provider = 'mercadopago'
      AND subscription.external_subscription_id = v_external_subscription_id
    LIMIT 1;
  END IF;

  RETURN QUERY
  SELECT
    CASE
      WHEN v_status = 'incomplete' THEN 'pending'
      WHEN v_status IN ('active', 'trialing', 'past_due', 'paused') THEN 'confirmed'
      WHEN v_status IN ('canceled', 'unpaid') THEN 'failed'
      ELSE 'not_found'
    END,
    COALESCE(v_external_subscription_id, p_external_subscription_id),
    v_status;
END;
$$;

ALTER FUNCTION public.get_billing_checkout_confirmation(uuid, text) OWNER TO postgres;

COMMENT ON FUNCTION public.get_billing_checkout_confirmation(uuid, text) IS
  'Returns the state of one exact Mercado Pago subscription in an owner/admin account. '
  'IDs outside the account are indistinguishable from missing IDs.';

REVOKE ALL ON FUNCTION public.get_billing_checkout_confirmation(uuid, text)
  FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_billing_checkout_confirmation(uuid, text)
  TO authenticated;
