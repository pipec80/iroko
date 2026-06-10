-- Fix: check_request() fallaba con 25006 (read_only_sql_transaction) cuando
-- PostgREST llamaba RPCs STABLE via POST. PostgREST v12+ ejecuta funciones
-- STABLE en transacción read-only incluso para POST; el INSERT del hook falla.
-- Solución: capturar read_only_sql_transaction y saltar silenciosamente
-- (las lecturas no necesitan rate limiting via esta tabla).

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
  IF v_method IN ('GET', 'HEAD') OR v_method IS NULL THEN
    RETURN;
  END IF;

  IF v_ip_str IS NULL OR v_ip_str = '' THEN
    RETURN;
  END IF;

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

  BEGIN
    INSERT INTO private.rate_limits (ip) VALUES (v_ip);
  EXCEPTION WHEN read_only_sql_transaction THEN
    -- PostgREST ejecuta RPCs STABLE en transacción read-only incluso via POST.
    -- Las lecturas no requieren rate limiting — saltar silenciosamente.
    RETURN;
  END;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_request() TO anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_request() FROM PUBLIC;

COMMENT ON FUNCTION public.check_request() IS
  'Hook db_pre_request registrado en el rol authenticator. Limita POST/PUT/PATCH/DELETE '
  'a 100 peticiones por IP en 5 minutos. GET/HEAD están exentos. '
  'IP extraída de X-Forwarded-For. RPCs STABLE via POST corren en tx read-only — '
  'el INSERT se saltea silenciosamente en ese contexto.';
