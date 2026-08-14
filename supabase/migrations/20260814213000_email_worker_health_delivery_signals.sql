-- ============================================================================
-- Plan 009 / PR 1 — Cierra el punto ciego del health check del email worker.
--
-- PROBLEMA
-- private.email_worker_health() solo expone el status HTTP de la invocación de
-- la edge function. El worker devuelve 200 aunque Resend rechace todos los
-- envíos: en process-email-queue/handler.ts:80-84 un fetch no-ok simplemente
-- no borra el mensaje de la cola, y la función igual responde
-- 200 {"processed":0}. Resultado: nightly en verde con cero emails entregados
-- — el mismo fallo que el Plan 002 quiso cerrar ("el cron dice éxito pero el
-- worker nunca respondió"), un nivel más abajo.
--
-- POR QUÉ NO ALCANZA MIRAR LA PROFUNDIDAD DE LA COLA
-- Con VISIBILITY_TIMEOUT_SECONDS=60 y MAX_READ_COUNT=5 (handler.ts:6-8), un
-- mensaje que Resend rechaza NO se queda en la cola: a los ~5 minutos el
-- worker lo archiva (handler.ts:56-58) y queue_length vuelve a 0. Un check de
-- profundidad diría "sano" justo mientras se pierde cada email.
--
-- SEÑALES QUE SE AGREGAN
--   queue_length         → mensajes pendientes ahora mismo.
--   oldest_msg_age_sec   → detecta cola atascada (worker caído). El cron corre
--                          cada minuto, así que un mensaje de varios minutos
--                          ya es anomalía.
--   dead_lettered_recent → detecta worker vivo pero entregas fallando. Es la
--                          señal que cierra el punto ciego.
--
-- Sobre dead_lettered_recent: el worker SOLO archiva tras agotar reintentos
-- (los envíos exitosos se borran con queue.delete, handler.ts:81). Por eso
-- toda fila reciente en pgmq.a_email_queue es una entrega fallida, y no hace
-- falta duplicar MAX_READ_COUNT acá. La ventana es de 24h para alinearse con
-- la cadencia del nightly: una ventana más corta dejaría pasar fallos
-- ocurridos entre corridas.
--
-- Se usan las tablas de pgmq en vez de pgmq.metrics() a propósito:
-- metrics() es VOLATILE y obligaría a bajar esta función de STABLE a VOLATILE.
--
-- Espejo en supabase/schemas/private.sql y public.sql. De paso se agregan al
-- espejo project_url() y email_worker_secret(), que quedaron fuera cuando se
-- escribió 20260810190000_email_worker_url_and_auth.sql (drift detectado al
-- preparar esta migración).
-- ============================================================================

-- El tipo de retorno cambia, así que CREATE OR REPLACE no basta.
DROP FUNCTION IF EXISTS public.get_email_worker_health();
DROP FUNCTION IF EXISTS private.email_worker_health();

CREATE FUNCTION private.email_worker_health()
RETURNS TABLE(
  invoked_at           timestamptz,
  status_code          integer,
  error_msg            text,
  timed_out            boolean,
  queue_length         bigint,
  oldest_msg_age_sec   integer,
  dead_lettered_recent bigint
)
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT
    i.invoked_at,
    r.status_code,
    r.error_msg,
    r.timed_out,
    (SELECT count(*) FROM pgmq.q_email_queue),
    (SELECT extract(epoch FROM (now() - min(q.enqueued_at)))::integer
       FROM pgmq.q_email_queue q),
    (SELECT count(*) FROM pgmq.a_email_queue a
      WHERE a.archived_at > now() - interval '24 hours')
  FROM private.email_worker_last_invocation i
  LEFT JOIN net._http_response r ON r.id = i.request_id
  WHERE i.id = true;
$$;

ALTER FUNCTION private.email_worker_health() OWNER TO postgres;
REVOKE ALL ON FUNCTION private.email_worker_health() FROM PUBLIC;

COMMENT ON FUNCTION private.email_worker_health() IS
  'Estado de la última invocación real del worker (status HTTP, no solo si '
  'pg_net encoló el request) más señales de entrega: profundidad de la cola, '
  'antigüedad del mensaje más viejo, y mensajes dead-lettered en las últimas '
  '24h. NULL en status_code/error_msg/timed_out = la respuesta de pg_net aún '
  'no llegó (normal justo después de invocar) o nunca se guardó un request_id. '
  'dead_lettered_recent > 0 significa que el worker corre pero el proveedor de '
  'email está rechazando: el status HTTP por sí solo no lo detecta.';


CREATE FUNCTION public.get_email_worker_health()
RETURNS TABLE(
  invoked_at           timestamptz,
  status_code          integer,
  error_msg            text,
  timed_out            boolean,
  queue_length         bigint,
  oldest_msg_age_sec   integer,
  dead_lettered_recent bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT * FROM private.email_worker_health();
$$;

ALTER FUNCTION public.get_email_worker_health() OWNER TO postgres;

-- Solo service_role — es detalle operativo interno (estado del worker de
-- email), no algo que anon/authenticated deban poder consultar.
REVOKE ALL ON FUNCTION public.get_email_worker_health() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_email_worker_health() TO service_role;

COMMENT ON FUNCTION public.get_email_worker_health() IS
  'Wrapper de solo lectura sobre private.email_worker_health() para el smoke '
  'check nightly de Cloud (AUD-025). service_role only.';
