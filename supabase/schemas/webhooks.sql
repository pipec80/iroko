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
-- suscrito. Las definiciones históricas de abajo se sustituyen al final por
-- 012.2: trigger queue-only, tickets DNS y claim/complete con lease para Node.
-- La migración 012.2 pone pending históricos en cuarentena y limpia request_id
-- de failed históricos, conservando intentos/backoff para su reintento por Node.
-- Node es el único transporte de clientes; pg_net solo despierta al worker
-- fijo del operador. HMAC-SHA256 firma exactamente "timestamp.body" en claim.
--
-- NOTE: migración escrita a mano (db diff deshabilitado en Windows);
-- supabase/schemas/webhooks.sql se actualiza como espejo en el mismo commit.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

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

-- Defense in depth for direct PostgREST calls. The final egress layer must
-- still prevent DNS rebinding when resolving public hostnames.
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

-- ============================================================================
-- Tablas
-- ============================================================================

CREATE TABLE public.webhook_endpoints (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  uuid        NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  url         text        NOT NULL CHECK (url ~ '^https://'),
  description text        CHECK (char_length(description) <= 200),
  secret_id   uuid        NOT NULL,
  events      text[]      NOT NULL CHECK (array_length(events, 1) >= 1),
  enabled     boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0)
);

COMMENT ON TABLE public.webhook_endpoints IS
  'Endpoints de webhook por cuenta (F2-2D). El secret firma cada entrega (HMAC-SHA256) y se muestra una única vez al crear. Gestionado solo vía RPCs.';
COMMENT ON COLUMN public.webhook_endpoints.url IS
  'Destino HTTPS. Validación anti-SSRF superficial en la capa Zod; el CHECK solo garantiza https://.';
COMMENT ON COLUMN public.webhook_endpoints.secret_id IS
  'Referencia a vault.secrets — el signing secret HMAC vive cifrado en Vault, nunca en texto plano (F3-3H-3).';
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
  delivered_at     timestamptz,
  lease_token uuid,
  lease_owner uuid,
  lease_expires_at timestamptz
);

COMMENT ON TABLE public.webhook_deliveries IS
  'Log de entregas de webhooks (F2-2D). pending=trabajo pendiente o leased; failed=reintentará (backoff 1m/5m/30m); exhausted=agotó los 4 intentos.';
COMMENT ON COLUMN public.webhook_deliveries.payload IS
  'Solo el campo data del evento; el envelope (id/type/created_at/account_id) se arma al enviar.';
COMMENT ON COLUMN public.webhook_deliveries.request_id IS
  'Legacy pg_net request ID retained for historical completed deliveries; new Node work does not set it.';

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
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 UPDATE public.webhook_deliveries d SET status='exhausted',last_error='feature_not_in_plan',next_retry_at=NULL
 WHERE d.id=p_delivery_id AND NOT private.account_has_feature(d.account_id,'webhooks_enabled');
END; $$;

COMMENT ON FUNCTION private.send_webhook_delivery(uuid) IS
  'Encola el POST firmado en pg_net e incrementa attempts. Lee el secret desde vault.decrypted_secrets (F3-3H-3) — ningún rol de API tiene grant sobre Vault. Sin la feature webhooks_enabled, marca exhausted sin llamar pg_net (F3-3H-1).';
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
 p_account_id uuid,p_url text,p_events text[],p_description text DEFAULT NULL
) RETURNS TABLE(id uuid,secret text) LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM private.assert_account_admin(p_account_id);
 PERFORM private.assert_safe_webhook_url(p_url);
 IF p_events IS NULL OR array_length(p_events,1) IS NULL OR NOT(p_events<@private.webhook_event_catalog()) THEN RAISE EXCEPTION 'invalid_events'; END IF;
 IF NOT private.account_has_feature(p_account_id,'webhooks_enabled') THEN RAISE EXCEPTION 'feature_not_in_plan'; END IF;
 RAISE EXCEPTION 'webhook_validation_required';
END; $$;

COMMENT ON FUNCTION public.create_webhook_endpoint(uuid, text, text[], text) IS
  'Crea un endpoint de webhook (owner/admin). El signing secret se guarda en Vault (secret_id) y se devuelve en claro UNA única vez. Feature y límite según el plan de la cuenta (F3-3H-1/3H-1.5, secreto en Vault desde F3-3H-3).';

CREATE OR REPLACE FUNCTION public.update_webhook_endpoint(
 p_endpoint_id uuid,p_url text,p_events text[],p_enabled boolean,p_description text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_account uuid;
BEGIN
 SELECT account_id INTO v_account FROM public.webhook_endpoints WHERE id=p_endpoint_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;
 PERFORM private.assert_account_admin(v_account);
 PERFORM private.assert_safe_webhook_url(p_url);
 IF NOT private.account_has_feature(v_account,'webhooks_enabled') THEN RAISE EXCEPTION 'feature_not_in_plan'; END IF;
 RAISE EXCEPTION 'webhook_validation_required';
END; $$;

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
  'Elimina un endpoint y (cascade) su historial de entregas (owner/admin). Borra también el secret asociado en Vault, sin huérfanos (F3-3H-3).';

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
VOLATILE
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
VOLATILE
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
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_url text;v_secret text;
BEGIN
 SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name='webhook_worker_url';
 SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE name='webhook_worker_secret';
 IF v_url IS NULL OR v_secret IS NULL OR v_secret='' THEN RETURN; END IF;
 -- Operator-owned exact route, never an endpoint/customer-supplied destination.
 IF v_url !~ '^https://[A-Za-z0-9.-]+(:[0-9]{1,5})?/api/internal/webhooks/worker$' THEN RETURN; END IF;
 PERFORM private.assert_safe_webhook_url(v_url);
 PERFORM net.http_post(url:=v_url,body:='{}'::jsonb,headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||v_secret),timeout_milliseconds:=45000);
END; $$;

COMMENT ON FUNCTION private.process_webhook_deliveries() IS
  'Job pg_cron por minuto (F2-2D): concilia net._http_response y reintenta fallidos con backoff 1m/5m/30m; tras 4 intentos marca exhausted.';
REVOKE EXECUTE ON FUNCTION private.process_webhook_deliveries() FROM PUBLIC;

SELECT cron.schedule(
  'process-webhook-deliveries',
  '* * * * *',
  $$ SELECT private.process_webhook_deliveries() $$
);


-- Mirror of 20261009180000_webhook_safe_node_delivery.sql.
-- Historical queue quarantine is migration-only DML.
CREATE TABLE private.webhook_url_validations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  operation text NOT NULL CHECK (operation IN ('create','update')),
  endpoint_id uuid REFERENCES public.webhook_endpoints(id) ON DELETE CASCADE,
  expected_version bigint,
  canonical_url text NOT NULL,
  policy_version integer NOT NULL DEFAULT 1 CHECK (policy_version = 1),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now()+interval '60 seconds',
  validated_at timestamptz,
  consumed_at timestamptz,
  CHECK ((operation='create' AND endpoint_id IS NULL AND expected_version IS NULL)
      OR (operation='update' AND endpoint_id IS NOT NULL AND expected_version IS NOT NULL))
);
CREATE INDEX webhook_url_validations_actor ON private.webhook_url_validations(actor_id,created_at);
CREATE INDEX webhook_url_validations_account ON private.webhook_url_validations(account_id,created_at);
CREATE INDEX webhook_url_validations_created ON private.webhook_url_validations(created_at);
CREATE INDEX webhook_url_validations_endpoint ON private.webhook_url_validations(endpoint_id);
ALTER TABLE private.webhook_url_validations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.webhook_url_validations FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION private.assert_webhook_validation_context(
 p_account_id uuid,p_actor_id uuid,p_operation text,p_endpoint_id uuid,p_expected_version bigint
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_version bigint; v_role public.membership_role;
BEGIN
 v_role:=private.get_user_role(p_account_id,p_actor_id);
 IF p_actor_id IS NULL OR v_role IS NULL OR v_role NOT IN ('owner','admin') THEN
   RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501';
 END IF;
 IF NOT private.account_has_feature(p_account_id,'webhooks_enabled') THEN RAISE EXCEPTION 'feature_not_in_plan'; END IF;
 IF p_operation='update' THEN
   SELECT e.version INTO v_version FROM public.webhook_endpoints e WHERE e.id=p_endpoint_id AND e.account_id=p_account_id;
   IF v_version IS NULL THEN RAISE EXCEPTION 'not_found'; END IF;
   IF p_expected_version IS NULL OR v_version<>p_expected_version THEN RAISE EXCEPTION 'webhook_version_conflict'; END IF;
 ELSIF p_operation IS DISTINCT FROM 'create' OR p_endpoint_id IS NOT NULL OR p_expected_version IS NOT NULL THEN
   RAISE EXCEPTION 'invalid_webhook_validation';
 END IF;
END; $$;
REVOKE ALL ON FUNCTION private.assert_webhook_validation_context(uuid,uuid,text,uuid,bigint) FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.reserve_webhook_url_validation(
 p_account_id uuid,p_actor_id uuid,p_operation text,p_endpoint_id uuid DEFAULT NULL,
 p_expected_version bigint DEFAULT NULL,p_canonical_url text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_id uuid;
BEGIN
 -- Account then actor gives one deterministic order across all reservations.
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('webhook-account:'||p_account_id::text,0));
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('webhook-actor:'||p_actor_id::text,0));
 PERFORM private.assert_webhook_validation_context(p_account_id,p_actor_id,p_operation,p_endpoint_id,p_expected_version);
 -- Capacity is checked before Node receives a reservation and performs DNS.
 -- Updates do not allocate another endpoint; create rechecks on consumption.
 IF p_operation='create' AND NOT private.within_plan_limit(p_account_id,'webhook_endpoints_max',
   (SELECT count(*) FROM public.webhook_endpoints e WHERE e.account_id=p_account_id)) THEN
   RAISE EXCEPTION 'endpoint_limit_reached';
 END IF;
 PERFORM private.assert_safe_webhook_url(p_canonical_url);
 -- Reservations also maintain expiry when no delivery worker is configured.
 -- Preserve the complete last minute, including consumed proofs, for budgets.
 DELETE FROM private.webhook_url_validations WHERE id IN (
 SELECT id FROM private.webhook_url_validations
 WHERE expires_at<now() AND created_at<now()-interval '1 minute'
 ORDER BY created_at LIMIT 1000);
 IF (SELECT count(*) FROM private.webhook_url_validations WHERE actor_id=p_actor_id AND created_at>now()-interval '1 minute')>=20
 OR (SELECT count(*) FROM private.webhook_url_validations WHERE account_id=p_account_id AND created_at>now()-interval '1 minute')>=100
 OR (SELECT count(*) FROM private.webhook_url_validations WHERE actor_id=p_actor_id AND expires_at>now() AND consumed_at IS NULL)>=10
 OR (SELECT count(*) FROM private.webhook_url_validations WHERE account_id=p_account_id AND expires_at>now() AND consumed_at IS NULL)>=100 THEN
   RAISE EXCEPTION 'webhook_validation_rate_limited';
 END IF;
 INSERT INTO private.webhook_url_validations(account_id,actor_id,operation,endpoint_id,expected_version,canonical_url)
 VALUES(p_account_id,p_actor_id,p_operation,p_endpoint_id,p_expected_version,p_canonical_url) RETURNING id INTO v_id;
 RETURN v_id;
END; $$;

CREATE OR REPLACE FUNCTION public.issue_webhook_url_validation(p_reservation_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v private.webhook_url_validations%ROWTYPE;
BEGIN
 SELECT * INTO v FROM private.webhook_url_validations WHERE id=p_reservation_id FOR UPDATE;
 IF NOT FOUND OR v.expires_at<=now() OR v.validated_at IS NOT NULL OR v.consumed_at IS NOT NULL OR v.policy_version<>1 THEN RAISE EXCEPTION 'invalid_webhook_validation'; END IF;
 PERFORM private.assert_webhook_validation_context(v.account_id,v.actor_id,v.operation,v.endpoint_id,v.expected_version);
 PERFORM private.assert_safe_webhook_url(v.canonical_url);
 UPDATE private.webhook_url_validations SET validated_at=now() WHERE id=v.id;
 RETURN v.id;
END; $$;

CREATE OR REPLACE FUNCTION private.consume_webhook_url_validation(
 p_ticket uuid,p_account_id uuid,p_operation text,p_endpoint_id uuid,p_expected_version bigint,p_url text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v private.webhook_url_validations%ROWTYPE;
BEGIN
 SELECT * INTO v FROM private.webhook_url_validations WHERE id=p_ticket FOR UPDATE;
 IF NOT FOUND OR v.actor_id IS DISTINCT FROM (SELECT auth.uid()) OR v.account_id IS DISTINCT FROM p_account_id
 OR v.operation IS DISTINCT FROM p_operation OR v.endpoint_id IS DISTINCT FROM p_endpoint_id
 OR v.expected_version IS DISTINCT FROM p_expected_version OR v.canonical_url IS DISTINCT FROM p_url
 OR v.expires_at<=now() OR v.validated_at IS NULL OR v.consumed_at IS NOT NULL OR v.policy_version<>1 THEN
   RAISE EXCEPTION 'invalid_webhook_validation';
 END IF;
 PERFORM private.assert_webhook_validation_context(v.account_id,v.actor_id,v.operation,v.endpoint_id,v.expected_version);
 UPDATE private.webhook_url_validations SET consumed_at=now() WHERE id=v.id;
END; $$;
REVOKE ALL ON FUNCTION private.consume_webhook_url_validation(uuid,uuid,text,uuid,bigint,text) FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.create_webhook_endpoint_validated(
  p_account_id  uuid,
  p_url         text,
  p_events      text[],
  p_description text,
  p_validation_ticket uuid
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
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('webhook-account:'||p_account_id::text,0));
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

  PERFORM private.consume_webhook_url_validation(p_validation_ticket,p_account_id,'create',NULL,NULL,p_url);
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


CREATE OR REPLACE FUNCTION public.update_webhook_endpoint_validated(
  p_endpoint_id uuid,
  p_url         text,
  p_events      text[],
  p_enabled     boolean,
  p_description text,
  p_expected_version bigint,
  p_validation_ticket uuid
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
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('webhook-account:'||v_account_id::text,0));
  PERFORM private.assert_account_admin(v_account_id);
  PERFORM 1 FROM public.webhook_endpoints WHERE id=p_endpoint_id FOR UPDATE;
  PERFORM private.assert_safe_webhook_url(p_url);
  IF p_events IS NULL OR array_length(p_events, 1) IS NULL
     OR NOT (p_events <@ private.webhook_event_catalog()) THEN
    RAISE EXCEPTION 'invalid_events';
  END IF;

  PERFORM private.consume_webhook_url_validation(p_validation_ticket,v_account_id,'update',p_endpoint_id,p_expected_version,p_url);
  UPDATE public.webhook_endpoints
  SET version     = version+1,
      url         = p_url,
      description = NULLIF(btrim(COALESCE(p_description, '')), ''),
      events      = p_events,
      enabled     = COALESCE(p_enabled, enabled)
  WHERE id = p_endpoint_id;
END;
$$;


-- Deliberate protocol migration: tokenless RPCs fail instead of bypassing DNS.



-- Only queue state is touched inside domain transactions. No DNS/network here.

REVOKE ALL ON FUNCTION private.send_webhook_delivery(uuid) FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.claim_webhook_deliveries(
 p_worker_id uuid,p_batch_size integer,p_visibility_seconds integer
) RETURNS TABLE(delivery_id uuid,lease_token uuid,endpoint_version bigint,canonical_url text,body_text text,headers jsonb,attempt integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v record; v_token uuid; v_body text; v_ts text; v_attempt integer;
BEGIN
 IF p_worker_id IS NULL OR p_batch_size IS NULL OR p_batch_size<1 OR p_batch_size>5 OR p_visibility_seconds IS DISTINCT FROM 60 THEN RAISE EXCEPTION 'invalid_webhook_claim'; END IF;
 -- A crash already consumed its claimed attempt. Recovery waits its backoff.
 UPDATE public.webhook_deliveries d
 SET status=CASE WHEN d.attempts>=4 THEN 'exhausted'::public.webhook_delivery_status ELSE 'failed'::public.webhook_delivery_status END,
 last_error='lease_expired',next_retry_at=CASE WHEN d.attempts>=4 THEN NULL ELSE now()+CASE d.attempts WHEN 1 THEN interval '60 seconds' WHEN 2 THEN interval '300 seconds' ELSE interval '1800 seconds' END END,
 lease_token=NULL,lease_owner=NULL,lease_expires_at=NULL
 WHERE d.lease_expires_at<=now() AND d.lease_token IS NOT NULL;
 UPDATE public.webhook_deliveries d SET status='exhausted',last_error=CASE WHEN NOT e.enabled THEN 'endpoint_disabled' ELSE 'feature_not_in_plan' END,
 next_retry_at=NULL,lease_token=NULL,lease_owner=NULL,lease_expires_at=NULL
 FROM public.webhook_endpoints e WHERE e.id=d.endpoint_id AND d.status IN ('pending','failed')
 AND d.lease_token IS NULL AND (NOT e.enabled OR NOT private.account_has_feature(d.account_id,'webhooks_enabled'));
 FOR v IN
 SELECT d.*,e.url,e.version,vs.decrypted_secret AS signing_secret
 FROM public.webhook_deliveries d JOIN public.webhook_endpoints e ON e.id=d.endpoint_id
 JOIN vault.decrypted_secrets vs ON vs.id=e.secret_id
 WHERE d.status IN ('pending','failed') AND d.lease_token IS NULL AND d.request_id IS NULL
 AND d.attempts<4 AND (d.next_retry_at IS NULL OR d.next_retry_at<=now())
 AND e.enabled AND private.account_has_feature(d.account_id,'webhooks_enabled')
 ORDER BY COALESCE(d.next_retry_at,d.created_at),d.id LIMIT p_batch_size FOR UPDATE OF d SKIP LOCKED
 LOOP
  v_token:=gen_random_uuid();v_attempt:=v.attempts+1;v_ts:=extract(epoch FROM now())::bigint::text;
  v_body:=jsonb_build_object('id',v.id,'type',v.event_type,'created_at',v.created_at,'account_id',v.account_id,'data',v.payload)::text;
  UPDATE public.webhook_deliveries d SET attempts=v_attempt,status='pending',lease_token=v_token,lease_owner=p_worker_id,lease_expires_at=now()+interval '60 seconds',next_retry_at=NULL WHERE d.id=v.id;
  delivery_id:=v.id;lease_token:=v_token;endpoint_version:=v.version;canonical_url:=v.url;body_text:=v_body;attempt:=v_attempt;
  headers:=jsonb_build_object('Content-Type','application/json','X-Iroko-Event',v.event_type,'X-Iroko-Delivery-Id',v.id::text,'X-Iroko-Timestamp',v_ts,'X-Iroko-Signature','sha256='||encode(extensions.hmac(v_ts||'.'||v_body,v.signing_secret,'sha256'),'hex'));
  RETURN NEXT;
 END LOOP;
 -- Keep the full last-minute reservation history for durable rate accounting.
 DELETE FROM private.webhook_url_validations WHERE id IN (
 SELECT id FROM private.webhook_url_validations WHERE expires_at<now() AND created_at<now()-interval '1 minute' ORDER BY created_at LIMIT 1000);
END; $$;

CREATE OR REPLACE FUNCTION public.complete_webhook_delivery(
 p_delivery_id uuid,p_lease_token uuid,p_outcome text,p_http_status integer DEFAULT NULL,p_error_code text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v public.webhook_deliveries%ROWTYPE;
BEGIN
 SELECT * INTO v FROM public.webhook_deliveries WHERE id=p_delivery_id FOR UPDATE;
 IF NOT FOUND OR v.lease_token IS DISTINCT FROM p_lease_token OR p_lease_token IS NULL OR v.lease_expires_at<=now() THEN RAISE EXCEPTION 'stale_webhook_lease'; END IF;
 IF p_outcome IS NULL OR p_outcome NOT IN ('success','retryable','rejected')
 OR (p_http_status IS NOT NULL AND p_http_status NOT BETWEEN 100 AND 599)
 OR (p_outcome='success' AND (p_http_status IS NULL OR p_http_status NOT BETWEEN 200 AND 299 OR p_error_code IS NOT NULL))
 OR (p_outcome<>'success' AND (p_error_code IS NULL OR p_error_code NOT IN ('dns_failed','dns_timeout','unsafe_destination','invalid_url','tls_failed','redirect_denied','response_too_large','request_timeout','network_failed','http_failed','worker_failed','lease_expired','feature_not_in_plan','endpoint_disabled'))) THEN RAISE EXCEPTION 'invalid_webhook_outcome'; END IF;
 UPDATE public.webhook_deliveries SET
 status=CASE WHEN p_outcome='success' THEN 'success'::public.webhook_delivery_status WHEN p_outcome='rejected' OR attempts>=4 THEN 'exhausted'::public.webhook_delivery_status ELSE 'failed'::public.webhook_delivery_status END,
 last_status_code=p_http_status,last_error=p_error_code,
 delivered_at=CASE WHEN p_outcome='success' THEN now() ELSE NULL END,
 next_retry_at=CASE WHEN p_outcome='retryable' AND attempts<4 THEN now()+CASE attempts WHEN 1 THEN interval '60 seconds' WHEN 2 THEN interval '300 seconds' ELSE interval '1800 seconds' END ELSE NULL END,
 lease_token=NULL,lease_owner=NULL,lease_expires_at=NULL WHERE id=p_delivery_id;
END; $$;


REVOKE ALL ON FUNCTION private.process_webhook_deliveries() FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION public.reserve_webhook_url_validation(uuid,uuid,text,uuid,bigint,text),public.issue_webhook_url_validation(uuid),public.claim_webhook_deliveries(uuid,integer,integer),public.complete_webhook_delivery(uuid,uuid,text,integer,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.reserve_webhook_url_validation(uuid,uuid,text,uuid,bigint,text),public.issue_webhook_url_validation(uuid),public.claim_webhook_deliveries(uuid,integer,integer),public.complete_webhook_delivery(uuid,uuid,text,integer,text) TO service_role;
REVOKE ALL ON FUNCTION public.create_webhook_endpoint_validated(uuid,text,text[],text,uuid),public.update_webhook_endpoint_validated(uuid,text,text[],boolean,text,bigint,uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.create_webhook_endpoint_validated(uuid,text,text[],text,uuid),public.update_webhook_endpoint_validated(uuid,text,text[],boolean,text,bigint,uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.create_webhook_endpoint(uuid,text,text[],text),public.update_webhook_endpoint(uuid,text,text[],boolean,text) FROM PUBLIC,anon;
COMMENT ON FUNCTION private.send_webhook_delivery(uuid) IS 'Queue-only business trigger feature gate. Node owns final DNS, pinned TLS and delivery.';
COMMENT ON FUNCTION private.process_webhook_deliveries() IS 'Existing cron definition wakes only the operator-configured authenticated Node worker. No configuration means no egress.';
