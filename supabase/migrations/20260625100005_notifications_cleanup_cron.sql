-- Limpieza diaria de notificaciones antiguas.
-- Retención: notificaciones leídas → 30 días; todas → 90 días.
-- La tabla notifications crece indefinidamente sin TTL.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-read-notifications') THEN
    PERFORM cron.schedule(
      'cleanup-read-notifications',
      '30 3 * * *',
      $cmd$
        DELETE FROM public.notifications
        WHERE read_at IS NOT NULL
          AND read_at < now() - INTERVAL '30 days';
      $cmd$
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-old-notifications') THEN
    PERFORM cron.schedule(
      'cleanup-old-notifications',
      '45 3 * * *',
      $cmd$
        DELETE FROM public.notifications
        WHERE created_at < now() - INTERVAL '90 days';
      $cmd$
    );
  END IF;
END $$;
