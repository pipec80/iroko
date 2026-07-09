-- ============================================================================
-- ESPEJO de supabase/migrations/20260708110000_webhooks.sql (F2-2D)
-- El diff declarativo está deshabilitado en Windows: este archivo documenta el
-- estado final; la fuente de verdad ejecutable es la migración versionada.
-- ============================================================================
-- ============================================================================
-- Webhooks salientes (F2-2D)
-- ============================================================================
-- Endpoints por cuenta + log de entregas. Emisión: triggers de dominio llaman
-- private.emit_webhook_event(), que inserta una delivery 'pending' por endpoint
-- suscrito. Un trigger sobre webhook_deliveries dispara net.http_post con firma
-- HMAC-SHA256 (header X-Iroko-Signature sobre "timestamp.body"). La conciliación
-- de respuestas y los retries viven en private.process_webhook_deliveries()
-- (migración del cron, 20260708120000).
--
-- NOTE: migración escrita a mano (db diff deshabilitado en Windows);
-- supabase/schemas/webhooks.sql se actualiza como espejo en el mismo commit.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE TYPE public.webhook_delivery_status AS ENUM ('pending', 'success', 'failed', 'exhausted');

-- ============================================================================
-- Catálogo de eventos (único lugar a tocar cuando 2A agregue subscription.*)
-- ============================================================================

CREATE OR REPLACE FUNCTION private.webhook_event_catalog()
RETURNS text[]
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT ARRAY[
    'member.invited', 'member.joined', 'member.removed', 'account.updated',
    'subscription.created', 'subscription.updated', 'subscription.canceled'
  ]
$$;

COMMENT ON FUNCTION private.webhook_event_catalog() IS
  'Catálogo canónico de eventos de webhook (F2-2D/2A-core). Debe coincidir con WEBHOOK_EVENT_TYPES en src/lib/validation/webhooks.ts.';
REVOKE EXECUTE ON FUNCTION private.webhook_event_catalog() FROM PUBLIC;

-- ============================================================================
-- Tablas
-- ============================================================================

CREATE TABLE public.webhook_endpoints (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  uuid        NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  url         text        NOT NULL CHECK (url ~ '^https://'),
  description text        CHECK (char_length(description) <= 200),
  secret      text        NOT NULL,
  events      text[]      NOT NULL CHECK (array_length(events, 1) >= 1),
  enabled     boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.webhook_endpoints IS
  'Endpoints de webhook por cuenta (F2-2D). El secret firma cada entrega (HMAC-SHA256) y se muestra una única vez al crear. Gestionado solo vía RPCs.';
COMMENT ON COLUMN public.webhook_endpoints.url IS
  'Destino HTTPS. Validación anti-SSRF superficial en la capa Zod; el CHECK solo garantiza https://.';
COMMENT ON COLUMN public.webhook_endpoints.secret IS
  'whsec_… generado server-side. Nunca se expone en list_*; solo en el RETURNING de create.';
COMMENT ON COLUMN public.webhook_endpoints.events IS
  'Eventos suscritos; subset de private.webhook_event_catalog(), validado en los RPCs.';

CREATE INDEX idx_webhook_endpoints_account ON public.webhook_endpoints (account_id, created_at DESC);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.webhook_endpoints
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

CREATE TABLE public.webhook_deliveries (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id      uuid        NOT NULL REFERENCES public.webhook_endpoints(id) ON DELETE CASCADE,
  account_id       uuid        NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  event_type       text        NOT NULL,
  payload          jsonb       NOT NULL DEFAULT '{}'::jsonb,
  status           public.webhook_delivery_status NOT NULL DEFAULT 'pending',
  attempts         int         NOT NULL DEFAULT 0,
  next_retry_at    timestamptz,
  request_id       bigint,
  last_status_code int,
  last_error       text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  delivered_at     timestamptz
);

COMMENT ON TABLE public.webhook_deliveries IS
  'Log de entregas de webhooks (F2-2D). pending=enviada esperando respuesta; failed=reintentará (backoff 1m/5m/30m); exhausted=agotó los 4 intentos.';
COMMENT ON COLUMN public.webhook_deliveries.payload IS
  'Solo el campo data del evento; el envelope (id/type/created_at/account_id) se arma al enviar.';
COMMENT ON COLUMN public.webhook_deliveries.request_id IS
  'ID devuelto por net.http_post; correlaciona con net._http_response en process_webhook_deliveries().';

CREATE INDEX idx_webhook_deliveries_endpoint ON public.webhook_deliveries (endpoint_id, created_at DESC);
CREATE INDEX idx_webhook_deliveries_account  ON public.webhook_deliveries (account_id, created_at DESC);
CREATE INDEX idx_webhook_deliveries_open     ON public.webhook_deliveries (status, next_retry_at)
  WHERE status IN ('pending', 'failed');

ALTER TABLE public.webhook_endpoints  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.webhook_endpoints  FROM authenticated, anon;
REVOKE ALL ON public.webhook_deliveries FROM authenticated, anon;

-- ============================================================================
-- Emisión
-- ============================================================================

CREATE OR REPLACE FUNCTION private.emit_webhook_event(
  p_account_id uuid,
  p_event_type text,
  p_data       jsonb
)
RETURNS void
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
  INSERT INTO public.webhook_deliveries (endpoint_id, account_id, event_type, payload)
  SELECT e.id, p_account_id, p_event_type, COALESCE(p_data, '{}'::jsonb)
  FROM public.webhook_endpoints e
  WHERE e.account_id = p_account_id
    AND e.enabled
    AND p_event_type = ANY(e.events);
$$;

COMMENT ON FUNCTION private.emit_webhook_event(uuid, text, jsonb) IS
  'Punto de enchufe de eventos (F2-2D): una delivery pending por endpoint suscrito+enabled. 2A lo llamará para subscription.*.';
REVOKE EXECUTE ON FUNCTION private.emit_webhook_event(uuid, text, jsonb) FROM PUBLIC;

-- ============================================================================
-- Envío vía pg_net
-- ============================================================================

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
  'Encola el POST firmado en pg_net e incrementa attempts. Llamada por el trigger de INSERT y por los retries del cron.';
REVOKE EXECUTE ON FUNCTION private.send_webhook_delivery(uuid) FROM PUBLIC;

CREATE OR REPLACE FUNCTION private.trg_send_webhook_delivery()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM private.send_webhook_delivery(NEW.id);
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION private.trg_send_webhook_delivery() FROM PUBLIC;

CREATE TRIGGER webhook_deliveries_send
  AFTER INSERT ON public.webhook_deliveries
  FOR EACH ROW EXECUTE FUNCTION private.trg_send_webhook_delivery();

-- ============================================================================
-- Triggers de dominio (catálogo v1)
-- ============================================================================

CREATE OR REPLACE FUNCTION private.webhooks_emit_member_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM private.emit_webhook_event(NEW.account_id, 'member.joined',
      jsonb_build_object('user_id', NEW.user_id, 'role', NEW.role));
    RETURN NEW;
  END IF;
  PERFORM private.emit_webhook_event(OLD.account_id, 'member.removed',
    jsonb_build_object('user_id', OLD.user_id, 'role', OLD.role));
  RETURN OLD;
END;
$$;

REVOKE EXECUTE ON FUNCTION private.webhooks_emit_member_events() FROM PUBLIC;

CREATE TRIGGER webhooks_member_events
  AFTER INSERT OR DELETE ON public.accounts_memberships
  FOR EACH ROW EXECUTE FUNCTION private.webhooks_emit_member_events();

CREATE OR REPLACE FUNCTION private.webhooks_emit_invitation_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM private.emit_webhook_event(NEW.account_id, 'member.invited',
    jsonb_build_object('email', NEW.email, 'role', NEW.role, 'invited_by', NEW.invited_by));
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION private.webhooks_emit_invitation_event() FROM PUBLIC;

CREATE TRIGGER webhooks_invitation_event
  AFTER INSERT ON public.invitations
  FOR EACH ROW EXECUTE FUNCTION private.webhooks_emit_invitation_event();

CREATE OR REPLACE FUNCTION private.webhooks_emit_account_updated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.name IS DISTINCT FROM NEW.name OR OLD.slug IS DISTINCT FROM NEW.slug THEN
    PERFORM private.emit_webhook_event(NEW.id, 'account.updated',
      jsonb_build_object('name', NEW.name, 'slug', NEW.slug));
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION private.webhooks_emit_account_updated() FROM PUBLIC;

CREATE TRIGGER webhooks_account_updated
  AFTER UPDATE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION private.webhooks_emit_account_updated();

-- ============================================================================
-- RPCs de administración
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
BEGIN
  PERFORM private.assert_account_admin(p_account_id);
  IF p_url IS NULL OR p_url !~ '^https://' THEN
    RAISE EXCEPTION 'invalid_url';
  END IF;
  IF p_events IS NULL OR array_length(p_events, 1) IS NULL
     OR NOT (p_events <@ private.webhook_event_catalog()) THEN
    RAISE EXCEPTION 'invalid_events';
  END IF;
  IF (SELECT count(*) FROM public.webhook_endpoints e
      WHERE e.account_id = p_account_id) >= 10 THEN
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
  'Crea un endpoint de webhook (owner/admin). Devuelve el signing secret UNA única vez. Máx 10 endpoints por cuenta.';

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
  IF p_url IS NULL OR p_url !~ '^https://' THEN
    RAISE EXCEPTION 'invalid_url';
  END IF;
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

COMMENT ON FUNCTION public.update_webhook_endpoint(uuid, text, text[], boolean, text) IS
  'Actualiza URL, descripción, eventos y enabled de un endpoint (owner/admin).';

CREATE OR REPLACE FUNCTION public.delete_webhook_endpoint(p_endpoint_id uuid)
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
  DELETE FROM public.webhook_endpoints WHERE id = p_endpoint_id;
END;
$$;

COMMENT ON FUNCTION public.delete_webhook_endpoint(uuid) IS
  'Elimina un endpoint y (cascade) su historial de entregas (owner/admin).';

CREATE OR REPLACE FUNCTION public.list_webhook_endpoints(p_account_id uuid)
RETURNS TABLE (
  id          uuid,
  url         text,
  description text,
  events      text[],
  enabled     boolean,
  created_at  timestamptz,
  updated_at  timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM private.assert_account_admin(p_account_id);
  RETURN QUERY
  SELECT e.id, e.url, e.description, e.events, e.enabled, e.created_at, e.updated_at
  FROM public.webhook_endpoints e
  WHERE e.account_id = p_account_id
  ORDER BY e.created_at DESC;
END;
$$;

COMMENT ON FUNCTION public.list_webhook_endpoints(uuid) IS
  'Lista endpoints de la cuenta (owner/admin). Nunca expone secret.';

CREATE OR REPLACE FUNCTION public.list_webhook_deliveries(
  p_account_id        uuid,
  p_endpoint_id       uuid DEFAULT NULL,
  p_limit             integer DEFAULT 20,
  p_cursor_created_at timestamptz DEFAULT NULL,
  p_cursor_id         uuid DEFAULT NULL
)
RETURNS TABLE (
  id               uuid,
  endpoint_id      uuid,
  event_type       text,
  status           public.webhook_delivery_status,
  attempts         int,
  last_status_code int,
  last_error       text,
  created_at       timestamptz,
  delivered_at     timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 100 THEN
    RAISE EXCEPTION 'invalid_limit';
  END IF;
  PERFORM private.assert_account_admin(p_account_id);
  RETURN QUERY
  SELECT d.id, d.endpoint_id, d.event_type, d.status, d.attempts,
         d.last_status_code, d.last_error, d.created_at, d.delivered_at
  FROM public.webhook_deliveries d
  WHERE d.account_id = p_account_id
    AND (p_endpoint_id IS NULL OR d.endpoint_id = p_endpoint_id)
    AND (
      p_cursor_created_at IS NULL
      OR d.created_at < p_cursor_created_at
      OR (d.created_at = p_cursor_created_at AND d.id < p_cursor_id)
    )
  ORDER BY d.created_at DESC, d.id DESC
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION public.list_webhook_deliveries(uuid, uuid, integer, timestamptz, uuid) IS
  'Log de entregas paginado por keyset (created_at, id), filtrable por endpoint (owner/admin).';

-- ============================================================================
-- Grants
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.create_webhook_endpoint(uuid, text, text[], text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_webhook_endpoint(uuid, text, text[], boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_webhook_endpoint(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_webhook_endpoints(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_webhook_deliveries(uuid, uuid, integer, timestamptz, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.create_webhook_endpoint(uuid, text, text[], text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_webhook_endpoint(uuid, text, text[], boolean, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_webhook_endpoint(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.list_webhook_endpoints(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.list_webhook_deliveries(uuid, uuid, integer, timestamptz, uuid) FROM PUBLIC;

-- ============================================================================
-- ESPEJO de supabase/migrations/20260708120000_webhooks_cron.sql (F2-2D)
-- ============================================================================
-- ============================================================================
-- Webhooks: conciliación de respuestas + retries (F2-2D)
-- ============================================================================
-- pg_net es async: http_post encola y la respuesta aparece en net._http_response.
-- Este job (cada minuto):
--   1. pending con respuesta → success (2xx) o failed (backoff 1m/5m/30m).
--   2. pending sin respuesta hace >10 min (TTL/limpieza de pg_net) → failed.
--   3. failed con attempts >= 4 → exhausted (intento inicial + 3 retries).
--   4. failed con next_retry_at vencido → re-envía vía send_webhook_delivery.
--
-- El cron.schedule es DML: no lo captura el diff declarativo, por eso esta
-- migración es versionada a mano (precedente: hard_delete_cron_job). El espejo
-- de la función vive en supabase/schemas/webhooks.sql.
-- ============================================================================

CREATE OR REPLACE FUNCTION private.process_webhook_deliveries()
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_retry uuid;
BEGIN
  -- 1. Conciliar respuestas recibidas
  UPDATE public.webhook_deliveries d
  SET status           = CASE WHEN r.status_code BETWEEN 200 AND 299
                              THEN 'success' ELSE 'failed'
                         END::public.webhook_delivery_status,
      last_status_code = r.status_code,
      last_error       = CASE WHEN r.error_msg IS NOT NULL THEN left(r.error_msg, 500)
                              WHEN r.status_code NOT BETWEEN 200 AND 299 THEN 'http_' || r.status_code
                              ELSE NULL
                         END,
      delivered_at     = CASE WHEN r.status_code BETWEEN 200 AND 299 THEN now() END,
      next_retry_at    = CASE WHEN r.status_code BETWEEN 200 AND 299 THEN NULL
                              ELSE now() + (CASE d.attempts
                                              WHEN 1 THEN interval '1 minute'
                                              WHEN 2 THEN interval '5 minutes'
                                              ELSE interval '30 minutes'
                                            END)
                         END
  FROM net._http_response r
  WHERE d.request_id = r.id AND d.status = 'pending';

  -- 2. pending huérfanas (sin fila de respuesta y request viejo) → failed
  UPDATE public.webhook_deliveries d
  SET status        = 'failed',
      last_error    = 'no_response',
      next_retry_at = now() + (CASE d.attempts
                                 WHEN 1 THEN interval '1 minute'
                                 WHEN 2 THEN interval '5 minutes'
                                 ELSE interval '30 minutes'
                               END)
  WHERE d.status = 'pending'
    AND d.request_id IS NOT NULL
    AND d.created_at < now() - interval '10 minutes'
    AND NOT EXISTS (SELECT 1 FROM net._http_response r WHERE r.id = d.request_id);

  -- 3. Agotadas: intento inicial + 3 retries = 4 attempts
  UPDATE public.webhook_deliveries
  SET status = 'exhausted', next_retry_at = NULL
  WHERE status = 'failed' AND attempts >= 4;

  -- 4. Re-enviar retries vencidos (send incrementa attempts y repone pending)
  FOR v_retry IN
    SELECT d.id FROM public.webhook_deliveries d
    WHERE d.status = 'failed' AND d.attempts < 4 AND d.next_retry_at <= now()
    ORDER BY d.next_retry_at
    LIMIT 50
  LOOP
    PERFORM private.send_webhook_delivery(v_retry);
  END LOOP;
END;
$$;

COMMENT ON FUNCTION private.process_webhook_deliveries() IS
  'Job pg_cron por minuto (F2-2D): concilia net._http_response y reintenta fallidos con backoff 1m/5m/30m; tras 4 intentos marca exhausted.';
REVOKE EXECUTE ON FUNCTION private.process_webhook_deliveries() FROM PUBLIC;

SELECT cron.schedule(
  'process-webhook-deliveries',
  '* * * * *',
  $$ SELECT private.process_webhook_deliveries() $$
);
