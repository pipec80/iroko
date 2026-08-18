-- pg-delta (motor de diff declarativo experimental de Supabase) valida los
-- cuerpos de función al hacer CREATE FUNCTION (check_function_bodies=on) y
-- fallaba acá porque pgmq.q_email_queue/pgmq.a_email_queue no existen como
-- objetos declarativos — los crea pgmq.create('email_queue') en runtime
-- (migración 20260711000000_pgmq_email_queue.sql), no un archivo de
-- supabase/schemas/. SQL dinámico evita esa validación compile-time sin
-- cambiar el comportamiento (misma firma, mismo resultado). No es una
-- necesidad hoy — el proyecto sigue con migración a mano + espejo, no
-- pg-delta — pero deja la función lista si en algún momento se adopta ese
-- flujo.

CREATE OR REPLACE FUNCTION private.email_worker_health()
RETURNS TABLE(
  invoked_at           timestamptz,
  status_code          integer,
  error_msg            text,
  timed_out            boolean,
  queue_length         bigint,
  oldest_msg_age_sec   integer,
  dead_lettered_recent bigint
)
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
DECLARE
  v_queue_length         bigint;
  v_oldest_msg_age_sec   integer;
  v_dead_lettered_recent bigint;
BEGIN
  EXECUTE
    'SELECT count(*), extract(epoch FROM (now() - min(enqueued_at)))::integer '
    || 'FROM pgmq.q_email_queue'
  INTO v_queue_length, v_oldest_msg_age_sec;

  EXECUTE 'SELECT count(*) FROM pgmq.a_email_queue WHERE archived_at > $1'
  INTO v_dead_lettered_recent
  USING now() - interval '24 hours';

  RETURN QUERY
  SELECT
    i.invoked_at,
    r.status_code,
    r.error_msg,
    r.timed_out,
    v_queue_length,
    v_oldest_msg_age_sec,
    v_dead_lettered_recent
  FROM private.email_worker_last_invocation i
  LEFT JOIN net._http_response r ON r.id = i.request_id
  WHERE i.id = true;
END;
$$;
