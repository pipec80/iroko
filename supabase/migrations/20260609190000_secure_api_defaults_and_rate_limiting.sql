-- ============================================================================
-- Migration: Secure API defaults + rate limiting
-- ============================================================================
-- Basado en: https://supabase.com/docs/guides/api/securing-your-api
--
-- PARTE 1 — Default privileges
--   Migration 013 ya revocó EXECUTE ON FUNCTIONS de public y anon.
--   Faltaba revocar tablas, secuencias, y los roles authenticated/service_role.
--   Estos cambios son forward-only: las tablas existentes conservan los grants
--   que recibieron en el momento de su creación; solo afectan objetos futuros.
--
-- PARTE 2 — Grants explícitos de clarificación
--   public.projects: dependía del default de Supabase para authenticated.
--   public.auth_recovery_codes: authenticated no debe tener acceso directo.
--
-- PARTE 3 — Rate limiting vía pgrst.db_pre_request
--   Limita a 100 peticiones de escritura (POST/PUT/PATCH/DELETE) por IP
--   en una ventana de 5 minutos. GET/HEAD están exentos (corren en réplicas
--   de solo lectura y no pueden disparar el hook).
--   La tabla private.rate_limits no es accesible vía Data API.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- PARTE 1: Default privileges — nuevas tablas/funciones/secuencias en public
--          no se exponen automáticamente en la Data API
-- ---------------------------------------------------------------------------

-- Tablas futuras: ningún rol externo obtiene acceso por defecto
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES FROM anon, authenticated, service_role;

-- Funciones futuras: completa la revocación ya iniciada en migration 013
-- (que solo cubría public y anon)
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM authenticated, service_role;

-- Secuencias futuras (UUIDs no aplican, pero cumple la recomendación del doc
-- para proyectos que puedan agregar columnas serial/bigserial)
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE USAGE, SELECT ON SEQUENCES FROM anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- PARTE 2: Grants explícitos — clarificar intención y sobrevivir el cambio
-- ---------------------------------------------------------------------------

-- projects: authenticated accede via REST + RLS. Actualmente dependía del
-- default de Supabase (aplicado al momento de crear la tabla). Hacerlo
-- explícito garantiza que el grant subsiste independientemente de los defaults.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;

-- auth_recovery_codes: acceso únicamente vía RPCs SECURITY DEFINER.
-- Revocar el acceso directo evita que el REST API bypasee la capa RPC.
-- Los RPCs (generate/consume/count_unused_recovery_codes) corren como postgres
-- y pueden acceder a la tabla sin necesitar el grant en authenticated.
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.auth_recovery_codes FROM authenticated;

-- ---------------------------------------------------------------------------
-- PARTE 3: Rate limiting — tabla en private (no accesible vía Data API)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS private.rate_limits (
  ip         inet        NOT NULL,
  request_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_ip_request_at
  ON private.rate_limits (ip, request_at DESC);

-- ---------------------------------------------------------------------------
-- Función db_pre_request
-- Se ejecuta antes de cada petición a la Data API como el rol del request
-- (anon o authenticated). SECURITY DEFINER para poder escribir en private.*
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.check_request()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_method text := current_setting('request.method', true);
  v_ip_str text := split_part(
    current_setting('request.headers', true)::json->>'x-forwarded-for',
    ',', 1
  );
  v_ip     inet;
  v_count  integer;
BEGIN
  -- GET y HEAD corren en réplicas de solo lectura y no disparan este hook.
  -- Incluimos el NULL check por entornos locales sin proxy.
  IF v_method IN ('GET', 'HEAD') OR v_method IS NULL THEN
    RETURN;
  END IF;

  -- Sin X-Forwarded-For no hay IP confiable — exentar (entorno local sin proxy)
  IF v_ip_str IS NULL OR v_ip_str = '' THEN
    RETURN;
  END IF;

  -- Parsear la IP con manejo de headers malformados
  BEGIN
    v_ip := trim(v_ip_str)::inet;
  EXCEPTION WHEN OTHERS THEN
    RETURN;
  END;

  SELECT count(*)::integer INTO v_count
  FROM private.rate_limits
  WHERE ip = v_ip
    AND request_at > now() - INTERVAL '5 minutes';

  IF v_count >= 100 THEN
    RAISE SQLSTATE 'PGRST' USING
      message = json_build_object(
        'code',    '429',
        'message', 'Too many requests',
        'hint',    'Maximum 100 write requests per 5 minutes per IP')::text,
      detail = json_build_object(
        'status',      429,
        'status_text', 'Too Many Requests')::text;
  END IF;

  INSERT INTO private.rate_limits (ip) VALUES (v_ip);
END;
$$;

-- PostgREST cambia al rol del request antes de llamar al pre-request hook,
-- por lo que tanto anon como authenticated necesitan EXECUTE.
GRANT EXECUTE ON FUNCTION public.check_request() TO anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_request() FROM PUBLIC;

COMMENT ON FUNCTION public.check_request() IS
  'Hook db_pre_request registrado en el rol authenticator. Limita POST/PUT/PATCH/DELETE '
  'a 100 peticiones por IP en 5 minutos. GET/HEAD están exentos. '
  'IP extraída de X-Forwarded-For. Umbral ajustable en producción según la carga real.';

-- Registrar el hook en authenticator (rol de conexión de PostgREST)
ALTER ROLE authenticator
  SET pgrst.db_pre_request = 'public.check_request';

NOTIFY pgrst, 'reload config';

-- ---------------------------------------------------------------------------
-- pg_cron: limpiar entradas antiguas de rate_limits cada 5 minutos
-- Ventana de retención: 10 minutos (2× la ventana de rate limiting)
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-rate-limits') THEN
    PERFORM cron.schedule(
      'cleanup-rate-limits',
      '*/5 * * * *',
      $cmd$
        DELETE FROM private.rate_limits
        WHERE request_at < now() - INTERVAL '10 minutes';
      $cmd$
    );
  END IF;
END $$;
