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
