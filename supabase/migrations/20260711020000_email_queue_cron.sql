-- ============================================================================
-- Jobs/colas: cron que dispara el worker de email_queue (F2-2F)
-- ============================================================================
-- Mismo patrón que process-webhook-deliveries (2D): un cron corre cada minuto
-- y llama a pg_net contra un endpoint HTTP. La función tiene verify_jwt=false
-- (config.toml) porque solo la invoca este cron interno, no requiere JWT.
--
-- URL local: host.docker.internal:54321 (puerto [api] de config.toml) es el
-- único formato confirmado en este repo (ver el ejemplo comentado de
-- auth.hook.send_email en config.toml) para llegar a una Edge Function local
-- desde el contenedor de Postgres.
--
-- CAVEAT DE PRODUCCIÓN (documentado, no resuelto — YAGNI para un patrón de
-- referencia): esta URL solo resuelve en local. Al desplegar a un proyecto
-- real hay que actualizarla a mano (Studio SQL editor o una migración de
-- seguimiento) a la URL real de la Edge Function del proyecto.
-- ============================================================================

SELECT cron.schedule(
  'process-email-queue',
  '* * * * *',
  $$SELECT net.http_post(
      url := 'http://host.docker.internal:54321/functions/v1/process-email-queue',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      timeout_milliseconds := 20000
    );$$
);
