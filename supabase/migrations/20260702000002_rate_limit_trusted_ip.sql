-- ============================================================================
-- Migration: harden check_request() client-IP resolution against spoofing
-- ============================================================================
-- Security fix (rate-limit evasion / victim framing):
--   The previous check_request() derived the client IP from the FIRST element
--   of X-Forwarded-For:
--       split_part(headers->>'x-forwarded-for', ',', 1)
--   That leftmost value is attacker-controlled: a client can pre-set
--   X-Forwarded-For before it reaches the trusted proxy. Consequences:
--     • Evasion — rotate the header to spread writes across "IPs" and never
--       hit the 100/5min ceiling.
--     • Framing — pin another user's IP to exhaust their bucket (cheap DoS).
--
--   Fix: prefer Cloudflare's CF-Connecting-IP (Supabase's Data API sits behind
--   Cloudflare; this header is set by the edge and overwrites any client value).
--   Fall back to the LAST X-Forwarded-For hop — appended by the closest trusted
--   proxy and therefore not client-forgeable. Local/dev (no proxy headers) stays
--   exempt, exactly as before. On failure to resolve a trustworthy IP we exempt
--   the request (fail-open on identity) rather than bucket everyone together.
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
  v_count   integer;
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

GRANT EXECUTE ON FUNCTION public.check_request() TO anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_request() FROM PUBLIC;

COMMENT ON FUNCTION public.check_request() IS
  'db_pre_request hook on authenticator. Limits POST/PUT/PATCH/DELETE to 100 '
  'requests per client IP in 5 minutes. Client IP is resolved from the '
  'un-spoofable cf-connecting-ip header, falling back to the last X-Forwarded-For '
  'hop; requests without a trustworthy IP (local dev) are exempt. GET/HEAD exempt.';

NOTIFY pgrst, 'reload config';
