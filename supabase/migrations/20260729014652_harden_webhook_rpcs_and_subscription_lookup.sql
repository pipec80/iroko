-- ============================================================================
-- Security hardening: direct webhook RPC calls and subscription lookup
-- ============================================================================
-- Zod remains useful for UX, but PostgREST callers can bypass it. Enforce
-- destination safety in the database too. DNS rebinding still belongs to the
-- egress layer that resolves and sends the request.

CREATE OR REPLACE FUNCTION private.assert_safe_webhook_url(p_url text)
RETURNS void
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
  v_authority text;
  v_host      text;
  v_ip        inet;
BEGIN
  IF p_url IS NULL OR char_length(p_url) > 2000 THEN
    RAISE EXCEPTION 'unsafe_webhook_url';
  END IF;
  v_authority := substring(p_url FROM '^https://([^/?#]+)');
  IF v_authority IS NULL OR v_authority LIKE '%@%' OR v_authority LIKE '[%' THEN
    RAISE EXCEPTION 'unsafe_webhook_url';
  END IF;
  IF v_authority !~ '^([A-Za-z0-9.-]+)(:[0-9]{1,5})?$' THEN
    RAISE EXCEPTION 'unsafe_webhook_url';
  END IF;
  v_host := lower(trim(trailing '.' FROM split_part(v_authority, ':', 1)));
  IF v_host = '' OR v_host IN ('localhost', 'localhost.localdomain')
     OR v_host LIKE '%.localhost'
     OR v_host LIKE '%.local'
     OR v_host LIKE '%.internal'
     OR v_host ~ '^[0-9]+$' THEN
    RAISE EXCEPTION 'unsafe_webhook_url';
  END IF;
  IF v_host ~ '^[0-9.]+$' THEN
    BEGIN
      v_ip := v_host::inet;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'unsafe_webhook_url';
    END;
    IF v_ip <<= ANY (ARRAY[
      '0.0.0.0/8'::inet, '10.0.0.0/8'::inet, '100.64.0.0/10'::inet,
      '127.0.0.0/8'::inet, '169.254.0.0/16'::inet, '172.16.0.0/12'::inet,
      '192.0.0.0/24'::inet, '192.0.2.0/24'::inet, '192.168.0.0/16'::inet,
      '198.18.0.0/15'::inet, '198.51.100.0/24'::inet, '203.0.113.0/24'::inet,
      '224.0.0.0/4'::inet, '240.0.0.0/4'::inet
    ]) THEN
      RAISE EXCEPTION 'unsafe_webhook_url';
    END IF;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION private.assert_safe_webhook_url(text) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.create_webhook_endpoint(
  p_account_id  uuid,
  p_url         text,
  p_events      text[],
  p_description text DEFAULT NULL
)
RETURNS TABLE (id uuid, secret text)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_id        uuid;
  v_secret    text;
  v_secret_id uuid;
BEGIN
  PERFORM private.assert_account_admin(p_account_id);
  PERFORM private.assert_safe_webhook_url(p_url);
  IF p_events IS NULL OR array_length(p_events, 1) IS NULL
     OR NOT (p_events <@ private.webhook_event_catalog()) THEN
    RAISE EXCEPTION 'invalid_events';
  END IF;

  IF NOT private.account_has_feature(p_account_id, 'webhooks_enabled') THEN
    RAISE EXCEPTION 'feature_not_in_plan';
  END IF;
  IF NOT private.within_plan_limit(p_account_id, 'webhook_endpoints_max',
      (SELECT count(*) FROM public.webhook_endpoints e WHERE e.account_id = p_account_id)) THEN
    RAISE EXCEPTION 'endpoint_limit_reached';
  END IF;

  v_id := gen_random_uuid();
  v_secret := 'whsec_' || translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/=', '-_');
  v_secret_id := vault.create_secret(v_secret, 'webhook_endpoint:' || v_id::text);

  INSERT INTO public.webhook_endpoints (id, account_id, url, description, events, secret_id)
  VALUES (
    v_id,
    p_account_id,
    p_url,
    NULLIF(btrim(COALESCE(p_description, '')), ''),
    p_events,
    v_secret_id
  );

  id := v_id;
  secret := v_secret;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_webhook_endpoint(
  p_endpoint_id uuid,
  p_url         text,
  p_events      text[],
  p_enabled     boolean,
  p_description text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_account_id uuid;
BEGIN
  SELECT e.account_id INTO v_account_id
  FROM public.webhook_endpoints e WHERE e.id = p_endpoint_id;
  IF v_account_id IS NULL THEN
    RAISE EXCEPTION 'not_found';
  END IF;
  PERFORM private.assert_account_admin(v_account_id);
  PERFORM private.assert_safe_webhook_url(p_url);
  IF p_events IS NULL OR array_length(p_events, 1) IS NULL
     OR NOT (p_events <@ private.webhook_event_catalog()) THEN
    RAISE EXCEPTION 'invalid_events';
  END IF;

  UPDATE public.webhook_endpoints
  SET url         = p_url,
      description = NULLIF(btrim(COALESCE(p_description, '')), ''),
      events      = p_events,
      enabled     = COALESCE(p_enabled, enabled)
  WHERE id = p_endpoint_id;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."get_account_id_by_external_subscription"("p_external_subscription_id" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_account_id uuid;
BEGIN
  SELECT c.account_id INTO v_account_id
  FROM billing.subscriptions s
  JOIN billing.customers c ON c.id = s.customer_id
  WHERE s.external_subscription_id = p_external_subscription_id
  LIMIT 1;

  IF v_account_id IS NULL THEN
    RETURN NULL;
  END IF;

  PERFORM private.assert_account_admin(v_account_id);
  RETURN v_account_id;
END;
$$;

COMMENT ON FUNCTION public.get_account_id_by_external_subscription(text) IS 'Resuelve accountId a partir del id de suscripción del proveedor para cancelación diferida. Solo owner/admin de la cuenta; NULL si no hay match.';
