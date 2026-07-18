-- ============================================================================
-- F3-3H-3: mueve el signing secret de webhooks a Supabase Vault (cifrado, sin
-- grant a ningún rol de API). Reemplaza public.webhook_endpoints.secret
-- (texto plano) por secret_id (referencia a vault.secrets).
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;

ALTER TABLE public.webhook_endpoints ADD COLUMN secret_id uuid;

-- Migrar filas existentes (solo relevante fuera de local/dev limpio): cada
-- secret en texto plano pasa a Vault antes de eliminar la columna.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT id, secret FROM public.webhook_endpoints WHERE secret_id IS NULL LOOP
    UPDATE public.webhook_endpoints
    SET secret_id = vault.create_secret(r.secret, 'webhook_endpoint:' || r.id::text)
    WHERE id = r.id;
  END LOOP;
END $$;

ALTER TABLE public.webhook_endpoints ALTER COLUMN secret_id SET NOT NULL;
ALTER TABLE public.webhook_endpoints DROP COLUMN secret;

COMMENT ON COLUMN public.webhook_endpoints.secret_id IS
  'Referencia a vault.secrets — el signing secret HMAC vive cifrado en Vault, nunca en texto plano (F3-3H-3).';

-- ── create_webhook_endpoint: genera y guarda el secret en Vault ────────────
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

COMMENT ON FUNCTION public.create_webhook_endpoint(uuid, text, text[], text) IS
  'Crea un endpoint de webhook (owner/admin). El signing secret se guarda en Vault (secret_id) y se devuelve en claro UNA única vez. Feature y límite según el plan de la cuenta (F3-3H-1/3H-1.5, secreto en Vault desde F3-3H-3).';

-- ── send_webhook_delivery: firma leyendo vault.decrypted_secrets ───────────
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
  SELECT d.id, d.event_type, d.account_id, d.payload, d.created_at, e.url,
         vs.decrypted_secret AS secret
  INTO v
  FROM public.webhook_deliveries d
  JOIN public.webhook_endpoints e ON e.id = d.endpoint_id
  JOIN vault.decrypted_secrets vs ON vs.id = e.secret_id
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
  'Encola el POST firmado en pg_net e incrementa attempts. Lee el secret desde vault.decrypted_secrets (F3-3H-3) — ningún rol de API tiene grant sobre Vault. Sin la feature webhooks_enabled, marca exhausted sin llamar pg_net (F3-3H-1).';

-- ── delete_webhook_endpoint: limpia también el secret de Vault ─────────────
CREATE OR REPLACE FUNCTION public.delete_webhook_endpoint(p_endpoint_id uuid)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_account_id uuid;
  v_secret_id  uuid;
BEGIN
  SELECT e.account_id, e.secret_id INTO v_account_id, v_secret_id
  FROM public.webhook_endpoints e WHERE e.id = p_endpoint_id;
  IF v_account_id IS NULL THEN
    RAISE EXCEPTION 'not_found';
  END IF;
  PERFORM private.assert_account_admin(v_account_id);
  DELETE FROM public.webhook_endpoints WHERE id = p_endpoint_id;
  DELETE FROM vault.secrets WHERE id = v_secret_id;
END;
$$;

COMMENT ON FUNCTION public.delete_webhook_endpoint(uuid) IS
  'Borra el endpoint (owner/admin) y su secret asociado en Vault, sin huérfanos (F3-3H-3).';
