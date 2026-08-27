-- ============================================================================
-- Billing Core v2: provider-scoped identity and price catalog
-- ============================================================================
-- Replaces global billing identifiers with provider-scoped constraints and
-- adds the provider price/payment-attempt persistence required by the v2
-- reducer. Written manually: supabase db diff is unsupported on Windows.
--
-- The legacy apply_subscription_event RPC remains compatible until the v2
-- reducer replaces its callers, so this migration is safe to deploy on its
-- own without breaking the current checkout/webhook path.
-- ============================================================================

BEGIN;

ALTER TABLE billing.customers
  DROP CONSTRAINT IF EXISTS customers_account_id_key;

ALTER TABLE billing.customers
  ADD CONSTRAINT customers_account_provider_key UNIQUE (account_id, provider);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM billing.events WHERE external_event_id IS NULL) THEN
    RAISE EXCEPTION 'billing_event_external_id_backfill_required';
  END IF;
END;
$$;

ALTER TABLE billing.events
  DROP CONSTRAINT IF EXISTS events_external_event_id_key;

ALTER TABLE billing.events
  ALTER COLUMN external_event_id SET NOT NULL;

ALTER TABLE billing.events
  ADD CONSTRAINT events_provider_external_event_key UNIQUE (provider, external_event_id);

CREATE UNIQUE INDEX subscriptions_provider_external_id_unique
  ON billing.subscriptions (provider, external_subscription_id)
  WHERE external_subscription_id IS NOT NULL;

ALTER TABLE billing.invoices
  ADD COLUMN provider text;

UPDATE billing.invoices AS invoice
SET provider = subscription.provider
FROM billing.subscriptions AS subscription
WHERE invoice.subscription_id = subscription.id
  AND invoice.provider IS NULL;

UPDATE billing.invoices AS invoice
SET provider = customer.provider
FROM billing.customers AS customer
WHERE invoice.customer_id = customer.id
  AND invoice.provider IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM billing.invoices WHERE provider IS NULL) THEN
    RAISE EXCEPTION 'billing_invoice_provider_backfill_failed';
  END IF;
END;
$$;

ALTER TABLE billing.invoices
  ALTER COLUMN provider SET NOT NULL;

CREATE UNIQUE INDEX invoices_provider_external_id_unique
  ON billing.invoices (provider, external_invoice_id)
  WHERE external_invoice_id IS NOT NULL;

CREATE TABLE billing.provider_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES billing.plans(id) ON DELETE CASCADE,
  provider text NOT NULL,
  external_price_id text,
  currency char(3) NOT NULL,
  amount integer NOT NULL CHECK (amount >= 0),
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT provider_prices_plan_provider_currency_key UNIQUE (plan_id, provider, currency)
);

CREATE UNIQUE INDEX provider_prices_external_id_unique
  ON billing.provider_prices (provider, external_price_id)
  WHERE external_price_id IS NOT NULL;

CREATE TABLE billing.payment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  subscription_id uuid REFERENCES billing.subscriptions(id) ON DELETE SET NULL,
  invoice_id uuid REFERENCES billing.invoices(id) ON DELETE SET NULL,
  external_payment_id text,
  external_invoice_id text,
  status text NOT NULL CHECK (status IN ('failed', 'paid', 'recovered')),
  amount integer,
  currency char(3),
  failure_code text,
  failure_message text,
  attempted_at timestamptz NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX payment_attempts_provider_payment_unique
  ON billing.payment_attempts (provider, external_payment_id)
  WHERE external_payment_id IS NOT NULL;

CREATE OR REPLACE FUNCTION billing.assert_provider_price_matches_plan()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_plan_price integer;
BEGIN
  SELECT price INTO v_plan_price
  FROM billing.plans
  WHERE id = NEW.plan_id;

  IF NEW.currency = 'USD' AND NEW.amount <> v_plan_price THEN
    RAISE EXCEPTION 'provider_price_amount_mismatch: plan price is %, provider price is %',
      v_plan_price, NEW.amount;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER provider_prices_amount_coherence
  BEFORE INSERT OR UPDATE ON billing.provider_prices
  FOR EACH ROW EXECUTE FUNCTION billing.assert_provider_price_matches_plan();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON billing.provider_prices
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

INSERT INTO billing.provider_prices (
  plan_id,
  provider,
  external_price_id,
  currency,
  amount
)
SELECT
  plan.id,
  provider_mapping.provider,
  provider_mapping.external_price_id,
  plan.currency,
  plan.price
FROM billing.plans AS plan
CROSS JOIN LATERAL jsonb_each_text(plan.provider_ids)
  AS provider_mapping(provider, external_price_id)
WHERE provider_mapping.external_price_id IS NOT NULL
  AND provider_mapping.external_price_id <> ''
ON CONFLICT (plan_id, provider, currency) DO UPDATE
SET external_price_id = EXCLUDED.external_price_id,
    amount = EXCLUDED.amount,
    updated_at = now();

ALTER TABLE billing.provider_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing.payment_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY billing_provider_prices_deny_all
  ON billing.provider_prices AS RESTRICTIVE
  USING (false) WITH CHECK (false);

CREATE POLICY billing_payment_attempts_deny_all
  ON billing.payment_attempts AS RESTRICTIVE
  USING (false) WITH CHECK (false);

-- Compatibility bridge: the existing application calls this RPC until the
-- typed reducer is introduced. Its persistence now obeys the v2 provider
-- namespaces even though it retains the legacy broad parameter shape.
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
  p_invoice                  jsonb DEFAULT NULL,
  p_provider                 text DEFAULT 'mock'
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
  INSERT INTO billing.events (event_type, provider, external_event_id, payload, processed_at)
  VALUES (p_event_type, p_provider, p_external_event_id, COALESCE(p_invoice, '{}'::jsonb), now())
  ON CONFLICT (provider, external_event_id) DO NOTHING;
  IF NOT FOUND THEN
    RETURN 'duplicate';
  END IF;

  SELECT id INTO v_plan_id
  FROM billing.plans
  WHERE slug = p_plan_slug AND "interval" = p_interval
  LIMIT 1;
  IF v_plan_id IS NULL THEN
    RAISE EXCEPTION 'plan_not_found';
  END IF;

  INSERT INTO billing.customers (account_id, provider)
  VALUES (p_account_id, p_provider)
  ON CONFLICT (account_id, provider) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_customer_id;

  SELECT id INTO v_subscription_id
  FROM billing.subscriptions
  WHERE provider = p_provider
    AND external_subscription_id = p_external_subscription_id;

  IF v_subscription_id IS NULL THEN
    INSERT INTO billing.subscriptions (
      customer_id, plan_id, status, current_period_start, current_period_end,
      cancel_at_period_end, trial_end, provider, external_subscription_id
    )
    VALUES (
      v_customer_id, v_plan_id, p_status, p_current_period_start, p_current_period_end,
      COALESCE(p_cancel_at_period_end, false), p_trial_end, p_provider, p_external_subscription_id
    )
    RETURNING id INTO v_subscription_id;
  ELSE
    UPDATE billing.subscriptions
    SET plan_id = v_plan_id,
        status = p_status,
        current_period_start = p_current_period_start,
        current_period_end = p_current_period_end,
        cancel_at_period_end = COALESCE(p_cancel_at_period_end, cancel_at_period_end),
        trial_end = p_trial_end
    WHERE id = v_subscription_id;
  END IF;

  IF p_invoice IS NOT NULL AND p_event_type = 'invoice_paid' THEN
    INSERT INTO billing.invoices (
      customer_id, subscription_id, provider, status, currency, total, amount_paid,
      period_start, period_end, paid_at
    )
    VALUES (
      v_customer_id, v_subscription_id, p_provider, 'paid',
      COALESCE(p_invoice->>'currency', 'USD'),
      COALESCE((p_invoice->>'amountPaid')::integer, 0),
      COALESCE((p_invoice->>'amountPaid')::integer, 0),
      (p_invoice->>'periodStart')::timestamptz,
      (p_invoice->>'periodEnd')::timestamptz,
      now()
    );
  END IF;

  PERFORM private.emit_webhook_event(
    p_account_id,
    CASE p_event_type
      WHEN 'subscription_created' THEN 'subscription.created'
      WHEN 'subscription_canceled' THEN 'subscription.canceled'
      ELSE 'subscription.updated'
    END,
    jsonb_build_object(
      'plan_slug', p_plan_slug,
      'status', p_status,
      'cancel_at_period_end', COALESCE(p_cancel_at_period_end, false)
    )
  );

  RETURN 'applied';
END;
$$;

COMMENT ON FUNCTION public.apply_subscription_event(
  uuid, text, billing.plan_interval, billing.subscription_status, text, text,
  text, timestamptz, timestamptz, boolean, timestamptz, jsonb, text
) IS
  'Compatibility bridge during Billing Core v2: legacy broad event persistence, now provider-scoped. Replaced by narrow reducer RPCs before production certification.';

REVOKE EXECUTE ON FUNCTION public.apply_subscription_event(
  uuid, text, billing.plan_interval, billing.subscription_status, text, text,
  text, timestamptz, timestamptz, boolean, timestamptz, jsonb, text
) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.apply_subscription_event(
  uuid, text, billing.plan_interval, billing.subscription_status, text, text,
  text, timestamptz, timestamptz, boolean, timestamptz, jsonb, text
) TO service_role;

COMMIT;
