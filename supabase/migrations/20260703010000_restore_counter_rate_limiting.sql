-- ============================================================================
-- Migration: restore counter-based rate limiting (keeps trusted-IP resolution)
-- ============================================================================
-- Regression fix:
--   20260702000002 (rate_limit_trusted_ip) hardened the client-IP resolution
--   but rewrote check_request() from the OLD 20260609190000 implementation —
--   silently reverting the per-minute-counter redesign of 20260625400000 back
--   to the INSERT-per-request pattern on private.rate_limits (the exact write
--   hotspot the redesign eliminated: ≤5 active rows per IP vs. 1 row per write
--   request).
--
--   Functional behavior was unaffected (same 100/5min limit, 25006 handler
--   present, old cleanup cron still prunes private.rate_limits), so this is a
--   performance-only regression.
--
--   This migration merges both improvements — the definitive version:
--     • per-minute counters on private.rate_limit_counters (20260625400000)
--     • trusted IP: cf-connecting-ip, fallback last X-Forwarded-For hop
--       (20260702000002)
--     • read_only_sql_transaction (25006) skip for STABLE RPCs via POST
--     • grants: anon + authenticated (PostgREST pre-request runs as the
--       request role) and service_role (Management API path, 20260610195816)
--
--   Matches supabase/schemas/public.sql, which already documents this merged
--   version as the intended state.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_request()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_headers json    := current_setting('request.headers', true)::json;
  v_method  text    := current_setting('request.method', true);
  v_xff     text;
  v_ip_str  text;
  v_ip      inet;
  v_window  timestamptz;
  v_total   integer;
BEGIN
  -- GET/HEAD run on read replicas and never reach this hook.
  IF v_method IN ('GET', 'HEAD') OR v_method IS NULL THEN
    RETURN;
  END IF;

  -- 1. Cloudflare's un-spoofable client IP (single value, set by the edge).
  v_ip_str := v_headers ->> 'cf-connecting-ip';

  -- 2. Fall back to the LAST X-Forwarded-For hop (added by the closest trusted
  --    proxy — the client can prepend entries but cannot control the tail).
  IF v_ip_str IS NULL OR v_ip_str = '' THEN
    v_xff := v_headers ->> 'x-forwarded-for';
    IF v_xff IS NOT NULL AND v_xff <> '' THEN
      v_ip_str := trim(split_part(v_xff, ',', array_length(string_to_array(v_xff, ','), 1)));
    END IF;
  END IF;

  -- No trustworthy IP (local dev without a proxy) → exempt.
  IF v_ip_str IS NULL OR v_ip_str = '' THEN
    RETURN;
  END IF;

  -- Parse defensively; a malformed header must not error out the request.
  BEGIN
    v_ip := trim(v_ip_str)::inet;
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
    -- PostgREST runs STABLE RPCs in a read-only transaction even via POST.
    -- Reads don't need rate limiting — skip silently.
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
GRANT EXECUTE ON FUNCTION public.check_request() TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.check_request() IS
  'Hook db_pre_request registrado en el rol authenticator. Limita POST/PUT/PATCH/DELETE '
  'a 100 peticiones por IP en 5 minutos usando contadores por ventana de 1 minuto '
  '(private.rate_limit_counters, ≤5 filas activas por IP). GET/HEAD exentos. IP resuelta '
  'desde CF-Connecting-IP (no falsificable) o el último hop de X-Forwarded-For. '
  'RPCs STABLE via POST corren en tx read-only — el upsert se saltea en ese contexto.';

NOTIFY pgrst, 'reload config';
