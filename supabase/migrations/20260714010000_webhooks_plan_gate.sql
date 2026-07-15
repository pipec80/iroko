-- ============================================================================
-- Webhooks: límites y feature desde el plan, gate de entrega (F3-3H-1)
-- ============================================================================
-- Reemplaza el límite hardcodeado (10) por webhook_endpoints_max del plan y
-- agrega feature gate webhooks_enabled en creación Y entrega (decisión de
-- diseño 2026-07-13: downgrade corta la entrega; los endpoints no se borran).
-- NOTE: migración a mano; espejo en supabase/schemas/webhooks.sql mismo commit.
-- ============================================================================

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
  v_max integer;
BEGIN
  PERFORM private.assert_account_admin(p_account_id);
  IF p_url IS NULL OR p_url !~ '^https://' THEN
    RAISE EXCEPTION 'invalid_url';
  END IF;
  IF p_events IS NULL OR array_length(p_events, 1) IS NULL
     OR NOT (p_events <@ private.webhook_event_catalog()) THEN
    RAISE EXCEPTION 'invalid_events';
  END IF;

  IF NOT private.account_has_feature(p_account_id, 'webhooks_enabled') THEN
    RAISE EXCEPTION 'feature_not_in_plan';
  END IF;
  v_max := private.get_account_limit(p_account_id, 'webhook_endpoints_max');
  IF v_max IS NOT NULL AND (SELECT count(*) FROM public.webhook_endpoints e
      WHERE e.account_id = p_account_id) >= v_max THEN
    RAISE EXCEPTION 'endpoint_limit_reached';
  END IF;

  RETURN QUERY
  INSERT INTO public.webhook_endpoints (account_id, url, description, events, secret)
  VALUES (
    p_account_id,
    p_url,
    NULLIF(btrim(COALESCE(p_description, '')), ''),
    p_events,
    'whsec_' || translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/=', '-_')
  )
  RETURNING webhook_endpoints.id, webhook_endpoints.secret;
END;
$$;

COMMENT ON FUNCTION public.create_webhook_endpoint(uuid, text, text[], text) IS
  'Crea un endpoint de webhook (owner/admin). Devuelve el signing secret UNA única vez. Feature y límite según el plan de la cuenta (F3-3H-1).';

CREATE OR REPLACE FUNCTION private.send_webhook_delivery(p_delivery_id uuid)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v         record;
  v_body    text;
  v_ts      text;
  v_request bigint;
BEGIN
  SELECT d.id, d.event_type, d.account_id, d.payload, d.created_at, e.url, e.secret
  INTO v
  FROM public.webhook_deliveries d
  JOIN public.webhook_endpoints e ON e.id = d.endpoint_id
  WHERE d.id = p_delivery_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Gate de entrega (F3-3H-1): plan sin webhooks → no se llama pg_net.
  IF NOT private.account_has_feature(v.account_id, 'webhooks_enabled') THEN
    UPDATE public.webhook_deliveries
    SET status = 'exhausted', last_error = 'feature_not_in_plan', next_retry_at = NULL
    WHERE id = p_delivery_id;
    RETURN;
  END IF;

  v_ts   := extract(epoch FROM now())::bigint::text;
  v_body := jsonb_build_object(
    'id',         v.id,
    'type',       v.event_type,
    'created_at', v.created_at,
    'account_id', v.account_id,
    'data',       v.payload
  )::text;

  -- Firma sobre "timestamp.body" (previene replay). El receptor recomputa
  -- HMAC-SHA256 del mismo string con su whsec_ y compara en tiempo constante.
  v_request := net.http_post(
    url     := v.url,
    body    := v_body::jsonb,
    headers := jsonb_build_object(
      'Content-Type',        'application/json',
      'X-Iroko-Event',       v.event_type,
      'X-Iroko-Delivery-Id', v.id::text,
      'X-Iroko-Timestamp',   v_ts,
      'X-Iroko-Signature',   'sha256=' || encode(extensions.hmac(v_ts || '.' || v_body, v.secret, 'sha256'), 'hex')
    ),
    timeout_milliseconds := 5000
  );

  UPDATE public.webhook_deliveries
  SET request_id = v_request, attempts = attempts + 1, status = 'pending'
  WHERE id = p_delivery_id;
END;
$$;

COMMENT ON FUNCTION private.send_webhook_delivery(uuid) IS
  'Encola el POST firmado en pg_net e incrementa attempts. Llamada por el trigger de INSERT y por los retries del cron. Sin la feature webhooks_enabled, marca exhausted sin llamar pg_net (F3-3H-1).';
REVOKE EXECUTE ON FUNCTION private.send_webhook_delivery(uuid) FROM PUBLIC;
