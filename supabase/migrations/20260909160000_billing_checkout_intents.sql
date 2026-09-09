-- Durable coordination for Mercado Pago's non-idempotent preapproval POST.
BEGIN;

CREATE TABLE billing.checkout_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
  plan_id uuid NOT NULL REFERENCES billing.plans(id) ON DELETE RESTRICT,
  provider text NOT NULL CHECK (NULLIF(btrim(provider), '') IS NOT NULL),
  status text NOT NULL CHECK (status IN (
    'reserved', 'pending', 'confirmed', 'canceled', 'failed', 'needs_review'
  )),
  external_subscription_id text,
  checkout_url text,
  lease_expires_at timestamptz,
  failure_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT checkout_intents_external_subscription_nonempty
    CHECK (external_subscription_id IS NULL OR NULLIF(btrim(external_subscription_id), '') IS NOT NULL),
  CONSTRAINT checkout_intents_checkout_url_bounded
    CHECK (checkout_url IS NULL OR (char_length(checkout_url) <= 2048 AND checkout_url ~ '^https://')),
  CONSTRAINT checkout_intents_failure_code_bounded
    CHECK (failure_code IS NULL OR char_length(failure_code) <= 100)
);

CREATE UNIQUE INDEX checkout_intents_open_account_provider_unique
  ON billing.checkout_intents (account_id, provider)
  WHERE status IN ('reserved', 'pending', 'needs_review');

CREATE UNIQUE INDEX checkout_intents_provider_remote_unique
  ON billing.checkout_intents (provider, external_subscription_id)
  WHERE external_subscription_id IS NOT NULL;

CREATE INDEX checkout_intents_account_created_idx
  ON billing.checkout_intents (account_id, created_at DESC);

CREATE INDEX checkout_intents_plan_id_idx
  ON billing.checkout_intents (plan_id);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON billing.checkout_intents
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

ALTER TABLE billing.checkout_intents ENABLE ROW LEVEL SECURITY;
CREATE POLICY billing_checkout_intents_deny_all
  ON billing.checkout_intents AS RESTRICTIVE USING (false) WITH CHECK (false);
REVOKE ALL ON TABLE billing.checkout_intents FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE billing.checkout_intents TO service_role;

CREATE OR REPLACE FUNCTION private.classify_existing_billing_checkout_intents()
RETURNS integer
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_inserted integer;
BEGIN
  WITH candidates AS (
    SELECT
      customer.account_id,
      subscription.plan_id,
      subscription.provider,
      subscription.external_subscription_id,
      subscription.created_at,
      row_number() OVER (
        PARTITION BY customer.account_id, subscription.provider
        ORDER BY subscription.created_at DESC, subscription.id DESC
      ) AS position
    FROM billing.subscriptions AS subscription
    INNER JOIN billing.customers AS customer ON customer.id = subscription.customer_id
    WHERE subscription.status = 'incomplete'
      AND subscription.provider = 'mercadopago'
      AND subscription.external_subscription_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM billing.checkout_intents AS existing
        WHERE existing.provider = subscription.provider
          AND existing.external_subscription_id = subscription.external_subscription_id
      )
  )
  INSERT INTO billing.checkout_intents (
    account_id, plan_id, provider, status, external_subscription_id, failure_code, created_at
  )
  SELECT
    account_id,
    plan_id,
    provider,
    CASE WHEN position = 1 THEN 'needs_review' ELSE 'failed' END,
    external_subscription_id,
    CASE
      WHEN position = 1 THEN 'preexisting_incomplete_requires_review'
      ELSE 'preexisting_duplicate_incomplete'
    END,
    created_at
  FROM candidates
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$$;

REVOKE ALL ON FUNCTION private.classify_existing_billing_checkout_intents() FROM PUBLIC;
SELECT private.classify_existing_billing_checkout_intents();

CREATE OR REPLACE FUNCTION private.attach_billing_checkout_remote(
  p_intent_id uuid,
  p_external_subscription_id text,
  p_checkout_url text
)
RETURNS text
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_intent billing.checkout_intents%ROWTYPE;
  v_customer_id uuid;
  v_existing_account_id uuid;
  v_existing_plan_id uuid;
  v_subscription_status billing.subscription_status;
BEGIN
  IF NULLIF(btrim(p_external_subscription_id), '') IS NULL THEN
    RAISE EXCEPTION 'billing_required_external_subscription_id_missing';
  END IF;
  IF p_checkout_url IS NOT NULL
    AND (char_length(p_checkout_url) > 2048 OR p_checkout_url !~ '^https://') THEN
    RAISE EXCEPTION 'billing_checkout_url_invalid';
  END IF;

  SELECT * INTO v_intent
  FROM billing.checkout_intents
  WHERE id = p_intent_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'billing_checkout_intent_not_found'; END IF;
  IF v_intent.status NOT IN ('reserved', 'pending', 'needs_review') THEN
    RAISE EXCEPTION 'billing_checkout_intent_not_attachable';
  END IF;
  IF v_intent.external_subscription_id IS NOT NULL
    AND v_intent.external_subscription_id <> btrim(p_external_subscription_id) THEN
    RAISE EXCEPTION 'billing_checkout_remote_identity_mismatch';
  END IF;

  SELECT customer.account_id, subscription.plan_id
  INTO v_existing_account_id, v_existing_plan_id
  FROM billing.subscriptions AS subscription
  INNER JOIN billing.customers AS customer ON customer.id = subscription.customer_id
  WHERE subscription.provider = v_intent.provider
    AND subscription.external_subscription_id = btrim(p_external_subscription_id);
  IF v_existing_account_id IS NOT NULL
    AND (v_existing_account_id <> v_intent.account_id OR v_existing_plan_id <> v_intent.plan_id) THEN
    RAISE EXCEPTION 'billing_checkout_remote_identity_already_claimed';
  END IF;

  INSERT INTO billing.customers (account_id, provider)
  VALUES (v_intent.account_id, v_intent.provider)
  ON CONFLICT (account_id, provider) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_customer_id;

  INSERT INTO billing.subscriptions (
    customer_id, plan_id, status, provider, external_subscription_id
  ) VALUES (
    v_customer_id, v_intent.plan_id, 'incomplete', v_intent.provider,
    btrim(p_external_subscription_id)
  )
  ON CONFLICT (provider, external_subscription_id)
    WHERE external_subscription_id IS NOT NULL
  DO NOTHING;

  SELECT status INTO v_subscription_status
  FROM billing.subscriptions
  WHERE provider = v_intent.provider
    AND external_subscription_id = btrim(p_external_subscription_id);

  UPDATE billing.checkout_intents
  SET external_subscription_id = btrim(p_external_subscription_id),
      checkout_url = COALESCE(p_checkout_url, checkout_url),
      lease_expires_at = NULL,
      failure_code = NULL,
      status = CASE
        WHEN v_subscription_status IN ('active', 'trialing', 'past_due', 'paused') THEN 'confirmed'
        WHEN v_subscription_status IN ('canceled', 'unpaid') THEN 'canceled'
        ELSE 'pending'
      END
  WHERE id = p_intent_id;

  RETURN 'attached';
END;
$$;

REVOKE ALL ON FUNCTION private.attach_billing_checkout_remote(uuid, text, text) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.reserve_billing_checkout(
  p_account_id uuid,
  p_plan_id uuid,
  p_provider text
)
RETURNS TABLE(action text, intent_id uuid, url text)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_intent billing.checkout_intents%ROWTYPE;
  v_provider text := NULLIF(btrim(p_provider), '');
BEGIN
  IF v_provider IS NULL THEN RAISE EXCEPTION 'billing_provider_missing'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.accounts WHERE id = p_account_id) THEN
    RAISE EXCEPTION 'billing_account_not_found';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM billing.plans WHERE id = p_plan_id AND is_active) THEN
    RAISE EXCEPTION 'billing_plan_not_found';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_account_id::text || ':' || v_provider, 0));
  SELECT * INTO v_intent
  FROM billing.checkout_intents
  WHERE account_id = p_account_id
    AND provider = v_provider
    AND status IN ('reserved', 'pending', 'needs_review')
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    IF v_intent.plan_id <> p_plan_id THEN
      RETURN QUERY SELECT 'needs_review'::text, v_intent.id, NULL::text;
    ELSIF v_intent.status = 'pending' AND v_intent.checkout_url IS NOT NULL THEN
      RETURN QUERY SELECT 'resume'::text, v_intent.id, v_intent.checkout_url;
    ELSIF v_intent.status = 'reserved'
      AND v_intent.lease_expires_at IS NOT NULL
      AND v_intent.lease_expires_at > now() THEN
      RETURN QUERY SELECT 'processing'::text, v_intent.id, NULL::text;
    ELSE
      IF v_intent.status = 'reserved' THEN
        UPDATE billing.checkout_intents
        SET status = 'needs_review', lease_expires_at = NULL,
            failure_code = 'creation_lease_expired'
        WHERE id = v_intent.id;
      END IF;
      RETURN QUERY SELECT 'needs_review'::text, v_intent.id, NULL::text;
    END IF;
    RETURN;
  END IF;

  INSERT INTO billing.checkout_intents (
    account_id, plan_id, provider, status, lease_expires_at
  ) VALUES (
    p_account_id, p_plan_id, v_provider, 'reserved', now() + interval '2 minutes'
  ) RETURNING * INTO v_intent;

  RETURN QUERY SELECT 'create'::text, v_intent.id, NULL::text;
END;
$$;

CREATE OR REPLACE FUNCTION public.attach_billing_checkout_remote(
  p_intent_id uuid,
  p_external_subscription_id text,
  p_checkout_url text
)
RETURNS text
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.attach_billing_checkout_remote(
    p_intent_id, p_external_subscription_id, p_checkout_url
  );
$$;

CREATE OR REPLACE FUNCTION public.mark_billing_checkout_failed(
  p_intent_id uuid,
  p_failure_code text,
  p_outcome_unknown boolean
)
RETURNS text
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_status text;
BEGIN
  IF NULLIF(btrim(p_failure_code), '') IS NULL OR char_length(p_failure_code) > 100 THEN
    RAISE EXCEPTION 'billing_checkout_failure_code_invalid';
  END IF;
  UPDATE billing.checkout_intents
  SET status = CASE WHEN p_outcome_unknown THEN 'needs_review' ELSE 'failed' END,
      failure_code = btrim(p_failure_code),
      lease_expires_at = NULL
  WHERE id = p_intent_id
    AND status IN ('reserved', 'pending', 'needs_review')
  RETURNING status INTO v_status;
  IF v_status IS NULL THEN RAISE EXCEPTION 'billing_checkout_intent_not_open'; END IF;
  RETURN v_status;
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_billing_checkout_reference(
  p_external_reference uuid,
  p_external_subscription_id text
)
RETURNS TABLE(account_id uuid, checkout_intent_id uuid)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_intent billing.checkout_intents%ROWTYPE;
  v_account_id uuid;
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
        v_intent.id, p_external_subscription_id, NULL
      );
    END IF;
    RETURN QUERY SELECT v_intent.account_id, v_intent.id;
    RETURN;
  END IF;

  -- Compatibility path for pre-intent preapprovals: an account UUID is
  -- accepted only when the same remote subscription already exists locally.
  SELECT customer.account_id INTO v_account_id
  FROM billing.subscriptions AS subscription
  INNER JOIN billing.customers AS customer ON customer.id = subscription.customer_id
  WHERE customer.account_id = p_external_reference
    AND subscription.provider = 'mercadopago'
    AND subscription.external_subscription_id = btrim(p_external_subscription_id);

  IF v_account_id IS NOT NULL THEN
    RETURN QUERY SELECT v_account_id, NULL::uuid;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION private.sync_billing_checkout_intent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.external_subscription_id IS NULL THEN RETURN NEW; END IF;
  UPDATE billing.checkout_intents
  SET status = CASE
        WHEN NEW.status IN ('active', 'trialing', 'past_due', 'paused') THEN 'confirmed'
        WHEN NEW.status IN ('canceled', 'unpaid') THEN 'canceled'
        WHEN status IN ('confirmed', 'canceled') THEN status
        ELSE 'pending'
      END,
      lease_expires_at = NULL,
      failure_code = NULL
  WHERE provider = NEW.provider
    AND external_subscription_id = NEW.external_subscription_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_billing_checkout_intent
  AFTER INSERT OR UPDATE OF status, external_subscription_id
  ON billing.subscriptions
  FOR EACH ROW EXECUTE FUNCTION private.sync_billing_checkout_intent();

COMMENT ON TABLE billing.checkout_intents IS
  'Durable account/provider reservation for one hosted checkout creation attempt; stores no payer email, token or raw provider payload.';
COMMENT ON FUNCTION public.reserve_billing_checkout(uuid, uuid, text) IS
  'Service-only atomic claim/resume operation. An expired creation lease becomes needs_review and never authorizes another provider POST.';
COMMENT ON FUNCTION public.attach_billing_checkout_remote(uuid, text, text) IS
  'Service-only atomic attachment of provider identity, hosted URL and provisional subscription.';
COMMENT ON FUNCTION public.mark_billing_checkout_failed(uuid, text, boolean) IS
  'Service-only classification of deterministic failure versus unknown remote outcome.';
COMMENT ON FUNCTION public.resolve_billing_checkout_reference(uuid, text) IS
  'Service-only resolver for intent references and exact pre-intent account/subscription pairs.';

REVOKE ALL ON FUNCTION public.reserve_billing_checkout(uuid, uuid, text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.attach_billing_checkout_remote(uuid, text, text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_billing_checkout_failed(uuid, text, boolean)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.resolve_billing_checkout_reference(uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_billing_checkout(uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.attach_billing_checkout_remote(uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_billing_checkout_failed(uuid, text, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.resolve_billing_checkout_reference(uuid, text) TO service_role;

COMMIT;
