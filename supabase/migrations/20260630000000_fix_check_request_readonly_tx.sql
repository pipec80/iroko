-- Fix: check_request() v2 omitió el handler de read_only_sql_transaction (25006).
-- PostgREST v12+ ejecuta RPCs STABLE en transacción read-only incluso via POST.
-- El INSERT en rate_limit_counters lanza 25006 → error 405 en el cliente.
-- Patrón idéntico al fix original (20260610033405).

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
