-- ============================================================================
-- Plan 002: el cron de process-email-queue apuntaba a un host local
-- (host.docker.internal:54321), inalcanzable desde Supabase Cloud, y no
-- enviaba ninguna credencial — cualquiera que descubriera la URL de la Edge
-- Function podía invocarla.
--
-- Patrón oficial de Supabase para pg_cron → Edge Function (ver "Scheduling
-- Edge Functions" / "Automatic embeddings" en sus docs): la URL del proyecto
-- se guarda en Vault, nunca en una migración versionada, porque difiere por
-- entorno. Local se siembra en supabase/seed.sql
-- (http://api.supabase.internal:8000, el alias de red interno del CLI).
-- Cloud requiere un paso manual único en el SQL Editor del proyecto — ver
-- docs/exec-plans/active/002-email-worker-cloud.md.
--
-- Autenticación: las secret keys nuevas de Supabase (sb_secret_...) no son
-- JWT — pg_net no puede mandarlas como Authorization: Bearer, y verify_jwt
-- las rechazaría igual. En vez de adoptar ese sistema (dependencia nueva,
-- disponibilidad no confirmada en el proyecto Cloud), seguimos el mismo
-- patrón que ya usa este repo para webhooks salientes (Vault + header
-- propio, ver webhook_secrets_vault.sql): un secreto compartido, generado
-- una vez, guardado en Vault y también como secret de la Edge Function
-- (`supabase secrets set`), enviado en un header custom y comparado en
-- private.send_webhook_delivery equivalente aquí: process-email-queue/handler.ts.
-- verify_jwt sigue en false (config.toml) — la Edge Function valida el
-- secreto ella misma.
-- ============================================================================

CREATE OR REPLACE FUNCTION private.project_url()
RETURNS text
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url';
$$;

REVOKE ALL ON FUNCTION private.project_url() FROM PUBLIC;

COMMENT ON FUNCTION private.project_url() IS
  'URL base del proyecto (local o Cloud), leída desde Vault — nunca hardcodeada en una migración porque difiere por entorno. Sembrada en supabase/seed.sql (local) o a mano en Cloud (SQL Editor, ver docs/exec-plans/active/002-email-worker-cloud.md).';

CREATE OR REPLACE FUNCTION private.email_worker_secret()
RETURNS text
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_worker_secret';
$$;

REVOKE ALL ON FUNCTION private.email_worker_secret() FROM PUBLIC;

COMMENT ON FUNCTION private.email_worker_secret() IS
  'Secreto compartido que autentica al cron ante process-email-queue (header X-Cron-Secret). Mismo valor debe estar seteado como secret de la Edge Function vía `supabase secrets set`. Sembrado en supabase/seed.sql (local) o a mano en Cloud.';

-- ── Observabilidad: cron.job_run_details solo confirma que net.http_post
-- encoló el request, no que el worker respondió 2xx (falso positivo ya
-- documentado en el problema original de este plan). pg_net no etiqueta
-- net._http_response con la URL que la originó, y ambos crons de este repo
-- (este y process_webhook_deliveries) comparten esa tabla — sin guardar el
-- request_id no hay forma de saber cuál respuesta es de cuál. A diferencia
-- de webhook_deliveries (una fila por entrega, con retries), acá basta con
-- la ÚLTIMA invocación: pgmq ya reintenta a nivel de mensaje (visibility
-- timeout) y archiva al agotar intentos — lo único que falta vigilar es si
-- el worker en sí está respondiendo. Fila única (patrón singleton).
CREATE TABLE private.email_worker_last_invocation (
  id         boolean PRIMARY KEY DEFAULT true,
  request_id bigint,
  invoked_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT email_worker_last_invocation_single_row CHECK (id)
);

CREATE OR REPLACE FUNCTION private.email_worker_health()
RETURNS TABLE(invoked_at timestamptz, status_code integer, error_msg text, timed_out boolean)
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT i.invoked_at, r.status_code, r.error_msg, r.timed_out
  FROM private.email_worker_last_invocation i
  LEFT JOIN net._http_response r ON r.id = i.request_id
  WHERE i.id = true;
$$;

REVOKE ALL ON FUNCTION private.email_worker_health() FROM PUBLIC;

COMMENT ON FUNCTION private.email_worker_health() IS
  'Estado de la última invocación real del worker (status HTTP, no solo si pg_net encoló el request). NULL en status_code/error_msg/timed_out = la respuesta de pg_net aún no llegó (normal justo después de invocar) o nunca se guardó un request_id.';

-- Reemplaza el cron original: URL resuelta por entorno + header de auth,
-- guardando el request_id para que email_worker_health() pueda leerlo.
SELECT cron.schedule(
  'process-email-queue',
  '* * * * *',
  $$
  INSERT INTO private.email_worker_last_invocation (id, request_id, invoked_at)
  VALUES (
    true,
    net.http_post(
      url := private.project_url() || '/functions/v1/process-email-queue',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'X-Cron-Secret', private.email_worker_secret()
      ),
      timeout_milliseconds := 20000
    ),
    now()
  )
  ON CONFLICT (id) DO UPDATE
    SET request_id = EXCLUDED.request_id, invoked_at = EXCLUDED.invoked_at;
  $$
);
