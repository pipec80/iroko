-- Rediseño del rate limiting: reemplaza el patrón INSERT-por-request (hotspot de escritura)
-- con contadores por ventana de 1 minuto. Máximo 5 filas activas por IP en cualquier momento.

-- ─────────────────────────────────────────────────────────────────
-- Nueva tabla de contadores
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS private.rate_limit_counters (
  ip           inet        NOT NULL,
  window_start timestamptz NOT NULL,
  count        integer     NOT NULL DEFAULT 1,
  PRIMARY KEY (ip, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_counters_ip_window
  ON private.rate_limit_counters (ip, window_start DESC);

-- ─────────────────────────────────────────────────────────────────
-- Función rediseñada: 1 upsert + aggregate sobre máx 5 filas
-- ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.check_request()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_method  text := current_setting('request.method', true);
  v_ip_str  text;
  v_ip      inet;
  v_window  timestamptz;
  v_total   integer;
BEGIN
  IF v_method IN ('GET', 'HEAD') OR v_method IS NULL THEN
    RETURN;
  END IF;

  v_ip_str := trim(split_part(
    COALESCE(current_setting('request.headers', true)::json->>'x-forwarded-for', ''),
    ',', 1
  ));

  IF v_ip_str = '' THEN
    RETURN;
  END IF;

  BEGIN
    v_ip := v_ip_str::inet;
  EXCEPTION WHEN OTHERS THEN
    RETURN;
  END;

  v_window := date_trunc('minute', now());

  BEGIN
    INSERT INTO private.rate_limit_counters (ip, window_start, count)
    VALUES (v_ip, v_window, 1)
    ON CONFLICT (ip, window_start)
    DO UPDATE SET count = private.rate_limit_counters.count + 1;
  EXCEPTION WHEN read_only_sql_transaction THEN
    -- PostgREST ejecuta RPCs STABLE en tx read-only incluso via POST.
    -- Las lecturas no necesitan rate limiting — saltar silenciosamente.
    RETURN;
  END;

  SELECT COALESCE(SUM(count), 0) INTO v_total
  FROM private.rate_limit_counters
  WHERE ip = v_ip
    AND window_start >= date_trunc('minute', now()) - INTERVAL '4 minutes';

  IF v_total > 100 THEN
    RAISE SQLSTATE 'PGRST' USING
      message = json_build_object(
        'code',    '429',
        'message', 'Too many requests',
        'hint',    'Maximum 100 write requests per 5 minutes per IP')::text,
      detail = json_build_object(
        'status',      429,
        'status_text', 'Too Many Requests')::text;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.check_request() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_request() TO anon, authenticated;

ALTER ROLE authenticator SET pgrst.db_pre_request = 'public.check_request';
NOTIFY pgrst, 'reload config';

-- ─────────────────────────────────────────────────────────────────
-- Reemplazar cron job de cleanup
-- ─────────────────────────────────────────────────────────────────

SELECT cron.unschedule('cleanup-rate-limits');

SELECT cron.schedule(
  'cleanup-rate-limits',
  '*/5 * * * *',
  $cmd$
    DELETE FROM private.rate_limit_counters
    WHERE window_start < date_trunc('minute', now()) - INTERVAL '9 minutes';
    DELETE FROM private.rate_limits
    WHERE request_at < now() - INTERVAL '10 minutes';
  $cmd$
);

COMMENT ON TABLE private.rate_limit_counters IS
  'Contadores de requests por IP por ventana de 1 minuto. '
  'Máximo 5 filas activas por IP (ventana de 5 minutos). '
  'Reemplaza el patrón INSERT-por-request de private.rate_limits.';
