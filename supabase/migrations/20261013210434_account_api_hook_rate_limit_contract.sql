-- Plan 012.3: preserve hook ACL and counter semantics; fix PostgREST contract.
CREATE OR REPLACE FUNCTION "public"."check_request"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_headers json    := current_setting('request.headers', true)::json;
  v_method  text    := current_setting('request.method', true);
  v_xff     text;
  v_ip_str  text;
  v_ip      inet;
  v_window  timestamptz;
  v_total   integer;
  v_now     timestamptz;
BEGIN
  -- GET/HEAD run on read replicas and never reach this hook.
  IF v_method IN ('GET', 'HEAD') OR v_method IS NULL THEN
    RETURN;
  END IF;

  -- The durable admission RPC has its own IP/account budgets. Exempt only the
  -- authenticated backend POST, never all service-role traffic.
  IF v_method = 'POST'
     AND current_setting('request.path', true) = '/rpc/admit_account_api_request'
     AND (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role' THEN
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

  -- Local/CI Supabase stacks route through Kong even without Cloudflare in
  -- front, and Kong sets X-Forwarded-For to the connecting Docker-network
  -- peer — private/loopback ranges can never reach here from real internet
  -- traffic, so exempting them preserves the original "local dev is exempt"
  -- intent without weakening production enforcement.
  IF v_ip <<= '10.0.0.0/8'::inet
     OR v_ip <<= '172.16.0.0/12'::inet
     OR v_ip <<= '192.168.0.0/16'::inet
     OR v_ip <<= '127.0.0.0/8'::inet
     OR v_ip = '::1'::inet THEN
    RETURN;
  END IF;

  -- A single lock spans all minute buckets for this IP, including rollover.
  PERFORM pg_advisory_xact_lock(12012301, hashtext(host(v_ip)));
  v_now := clock_timestamp();
  v_window := date_trunc('minute', v_now);

  BEGIN
    INSERT INTO private.rate_limit_counters (ip, window_start, count)
    VALUES (v_ip, v_window, 1)
    ON CONFLICT (ip, window_start)
    DO UPDATE SET count = private.rate_limit_counters.count + 1;
  EXCEPTION WHEN read_only_sql_transaction THEN
    RETURN;
  END;

  SELECT COALESCE(SUM(count), 0) INTO v_total
  FROM private.rate_limit_counters
  WHERE ip = v_ip
    AND window_start >= date_trunc('minute', v_now) - INTERVAL '4 minutes';

  IF v_total > 100 THEN
    RAISE SQLSTATE 'PGRST' USING
      message = json_build_object(
        'code',    '429',
        'message', 'Too many requests',
        'hint',    'Maximum 100 write requests per 5 minutes per IP')::text,
      detail = json_build_object(
        'status',      429,
        'status_text', 'Too Many Requests',
        'headers',     json_build_object())::text;
  END IF;
END;
$$;
NOTIFY pgrst, 'reload schema';
