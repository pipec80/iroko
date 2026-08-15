


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."account_type" AS ENUM (
    'personal',
    'team'
);


ALTER TYPE "public"."account_type" OWNER TO "postgres";


CREATE TYPE "public"."invitation_status" AS ENUM (
    'pending',
    'accepted',
    'revoked',
    'expired'
);


ALTER TYPE "public"."invitation_status" OWNER TO "postgres";


CREATE TYPE "public"."membership_role" AS ENUM (
    'owner',
    'admin',
    'member',
    'viewer'
);


ALTER TYPE "public"."membership_role" OWNER TO "postgres";


CREATE TYPE "public"."project_status" AS ENUM (
    'active',
    'paused',
    'draft'
);


ALTER TYPE "public"."project_status" OWNER TO "postgres";


CREATE TYPE "public"."project_type" AS ENUM (
    'docs',
    'automation',
    'agent'
);


ALTER TYPE "public"."project_type" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."accept_invitation"("p_token" "text") RETURNS TABLE("account_id" "uuid", "invited_by" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_invitation public.invitations%ROWTYPE;
  v_user_id    uuid := (SELECT auth.uid());
  v_token_hash text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Hashear el token recibido antes de buscar (nunca comparar plaintext)
  v_token_hash := encode(extensions.digest(p_token, 'sha256'), 'hex');

  SELECT * INTO v_invitation
  FROM public.invitations
  WHERE token_hash = v_token_hash
    AND status = 'pending'
    AND expires_at > now();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;

  INSERT INTO public.accounts_memberships (account_id, user_id, role, invited_by)
  VALUES (v_invitation.account_id, v_user_id, v_invitation.role, v_invitation.invited_by)
  ON CONFLICT DO NOTHING;

  UPDATE public.invitations
  SET status = 'accepted', updated_at = now()
  WHERE id = v_invitation.id;

  -- Plan 009: entrar al team al que te invitaron es el resultado esperado del
  -- flujo. Antes dependía del fallback del hook JWT, así que ocurría o no
  -- según si el usuario había hecho switch_account() alguna vez.
  UPDATE public.profiles
  SET active_account_id = v_invitation.account_id
  WHERE id = v_user_id;

  RETURN QUERY SELECT v_invitation.account_id, v_invitation.invited_by;
END;
$$;


ALTER FUNCTION "public"."accept_invitation"("p_token" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."accept_invitation"("p_token" "text") IS 'Accepts an invitation by token, creates the membership and switches the caller''s active account to that team. Returns the inviter''s user id (nullable) so the caller can notify them. Callers must call supabase.auth.refreshSession() afterward for the JWT to pick up the new active account. SECURITY DEFINER: mutates invitations+memberships (direct write revoked). Uses auth.uid().';



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


ALTER FUNCTION "public"."check_request"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_request"() IS 'Hook db_pre_request registrado en el rol authenticator. Limita POST/PUT/PATCH/DELETE a 100 peticiones por IP en 5 minutos. GET/HEAD están exentos. IP resuelta desde CF-Connecting-IP (Cloudflare, no falsificable) o, si falta, desde el último hop de X-Forwarded-For (tampoco falsificable por el cliente). Umbral ajustable en producción según la carga real.';



CREATE OR REPLACE FUNCTION "public"."consume_recovery_code"("p_code" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_hash    TEXT;
  v_id      UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  v_hash := encode(extensions.digest(upper(trim(p_code)), 'sha256'), 'hex');

  UPDATE public.auth_recovery_codes
     SET used_at = now()
   WHERE user_id = v_user_id
     AND code_hash = v_hash
     AND used_at IS NULL
   RETURNING id INTO v_id;

  RETURN v_id IS NOT NULL;
END;
$$;


ALTER FUNCTION "public"."consume_recovery_code"("p_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."count_unused_recovery_codes"() RETURNS integer
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_count   INT;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN 0;
  END IF;

  SELECT count(*)::int INTO v_count
    FROM public.auth_recovery_codes
   WHERE user_id = v_user_id AND used_at IS NULL;

  RETURN v_count;
END;
$$;


ALTER FUNCTION "public"."count_unused_recovery_codes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."custom_access_token_hook"("event" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_user_id    uuid := (event ->> 'user_id')::uuid;
  v_account_id uuid;
  v_role       text;
  v_has_mfa    boolean;
  v_onboarding_completed boolean;
  v_imp_admin  uuid;
  v_imp_exp    timestamptz;
  v_claims     jsonb := event -> 'claims';
  v_app_meta   jsonb := COALESCE(v_claims -> 'app_metadata', '{}'::jsonb);
BEGIN
  -- Bloque 1: preferir la preferencia persistida del usuario (switch_account),
  -- solo si sigue siendo una membership válida (no la dejó, no se borró).
  SELECT m.account_id, m.role::text
  INTO v_account_id, v_role
  FROM public.profiles p
  JOIN public.accounts_memberships m
    ON m.account_id = p.active_account_id AND m.user_id = p.id
  WHERE p.id = v_user_id;

  -- Fallback: comportamiento original (membership más reciente).
  IF v_account_id IS NULL THEN
    SELECT m.account_id, m.role::text
    INTO v_account_id, v_role
    FROM public.accounts_memberships m
    WHERE m.user_id = v_user_id
    -- Secondary sort by account_id DESC ensures deterministic results when timestamps are identical (e.g. in same-transaction pgTAP tests)
    ORDER BY m.created_at DESC, m.account_id DESC
    LIMIT 1;
  END IF;

  IF v_account_id IS NOT NULL THEN
    v_app_meta := v_app_meta
      || jsonb_build_object('account_id', v_account_id)
      || jsonb_build_object('role', v_role);
  END IF;

  -- Does the user have at least one verified MFA factor? The edge guard uses
  -- this to force aal2 before granting access to protected routes.
  SELECT EXISTS (
    SELECT 1
    FROM auth.mfa_factors f
    WHERE f.user_id = v_user_id
      AND f.status = 'verified'
  ) INTO v_has_mfa;

  v_app_meta := v_app_meta || jsonb_build_object('mfa_enrolled', v_has_mfa);

  -- F3-C4: onboarding gate — el edge guard fuerza el wizard mientras esté en false.
  -- COALESCE fail-open: si no hay fila de profile, nunca trabar a nadie fuera de /dashboard.
  SELECT p.onboarding_completed INTO v_onboarding_completed
  FROM public.profiles p WHERE p.id = v_user_id;

  v_app_meta := v_app_meta || jsonb_build_object(
    'onboarding_completed', COALESCE(v_onboarding_completed, true)
  );

  -- F3-C1: mirror platform_admins membership into the JWT so the edge proxy
  -- can gate /dashboard/admin without a DB round trip. Every RPC still
  -- re-checks private.is_platform_admin() against the table directly.
  v_app_meta := v_app_meta || jsonb_build_object(
    'is_platform_admin', private.is_platform_admin(v_user_id)
  );

  -- F3-C2: si hay una sesión de impersonation activa DONDE este usuario es
  -- el target, mintear quién lo está impersonando y hasta cuándo. El edge
  -- (middleware.ts) usa esto para el banner y el cap de 30 min; ningún RPC
  -- confía en esto para autorización (RLS ve auth.uid() real, siempre).
  SELECT admin_id, expires_at
  INTO v_imp_admin, v_imp_exp
  FROM public.impersonation_sessions
  WHERE target_user_id = v_user_id AND ended_at IS NULL
  LIMIT 1;

  IF v_imp_admin IS NOT NULL THEN
    v_app_meta := v_app_meta
      || jsonb_build_object('impersonated_by', v_imp_admin)
      || jsonb_build_object('impersonation_expires_at', v_imp_exp);
  END IF;

  v_claims := jsonb_set(v_claims, '{app_metadata}', v_app_meta, true);
  RETURN jsonb_set(event, '{claims}', v_claims, true);
END;
$$;


ALTER FUNCTION "public"."custom_access_token_hook"("event" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."custom_access_token_hook"("event" "jsonb") IS 'Supabase Auth custom_access_token hook. Writes app_metadata.account_id + app_metadata.role from the user''s default membership, app_metadata.mfa_enrolled (true when a verified MFA factor exists), app_metadata.onboarding_completed (F3-C4, mirrors public.profiles.onboarding_completed, fail-open true), app_metadata.is_platform_admin (F3-C1, mirrors public.platform_admins), and app_metadata.impersonated_by/impersonation_expires_at when the user is currently being impersonated (F3-C2). SECURITY DEFINER.';



CREATE OR REPLACE FUNCTION "public"."generate_recovery_codes"() RETURNS "text"[]
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_user_id  UUID := (SELECT auth.uid());
  v_alphabet TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_codes    TEXT[] := ARRAY[]::TEXT[];
  v_code     TEXT;
  v_part1    TEXT;
  v_part2    TEXT;
  v_byte     INT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  DELETE FROM public.auth_recovery_codes WHERE user_id = v_user_id;

  FOR i IN 1..10 LOOP
    v_part1 := '';
    v_part2 := '';
    FOR j IN 1..4 LOOP
      v_byte := get_byte(extensions.gen_random_bytes(1), 0) % length(v_alphabet);
      v_part1 := v_part1 || substr(v_alphabet, v_byte + 1, 1);
      v_byte := get_byte(extensions.gen_random_bytes(1), 0) % length(v_alphabet);
      v_part2 := v_part2 || substr(v_alphabet, v_byte + 1, 1);
    END LOOP;
    v_code := v_part1 || '-' || v_part2;

    INSERT INTO public.auth_recovery_codes (user_id, code_hash)
    VALUES (
      v_user_id,
      encode(extensions.digest(v_code, 'sha256'), 'hex')
    );

    v_codes := v_codes || v_code;
  END LOOP;

  RETURN v_codes;
END;
$$;


ALTER FUNCTION "public"."generate_recovery_codes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_account_subscription"("p_account_id" "uuid") RETURNS TABLE("plan_name" "text", "plan_slug" "text", "status" "billing"."subscription_status", "current_period_end" timestamp with time zone, "cancel_at_period_end" boolean, "features" "jsonb")
    LANGUAGE "plpgsql" VOLATILE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  IF NOT private.user_is_member(p_account_id, (SELECT auth.uid())) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  RETURN QUERY
    SELECT p.name, p.slug, s.status, s.current_period_end, s.cancel_at_period_end, p.features
    FROM billing.subscriptions s
    JOIN billing.customers c ON c.id = s.customer_id
    JOIN billing.plans p ON p.id = s.plan_id
    WHERE c.account_id = p_account_id
      AND s.status IN ('active', 'trialing')
    ORDER BY s.created_at DESC
    LIMIT 1;
END;
$$;


ALTER FUNCTION "public"."get_account_subscription"("p_account_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_account_subscription"("p_account_id" "uuid") IS 'Returns the current subscription summary for an account the user belongs to. SECURITY DEFINER: reads billing.* (schema not exposed to authenticated). Uses private.user_is_member() for access control.';



CREATE OR REPLACE FUNCTION "public"."get_active_plans"() RETURNS TABLE("slug" "text", "name" "text", "description" "text", "interval" "billing"."plan_interval", "price" integer, "currency" character, "trial_days" integer, "features" "jsonb", "limits" "jsonb")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT slug, name, description, "interval", price, currency, trial_days, features, limits
  FROM billing.plans
  WHERE is_active = true
  ORDER BY sort_order ASC;
$$;


ALTER FUNCTION "public"."get_active_plans"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_active_plans"() IS 'Public pricing endpoint. SECURITY DEFINER so anon can read plans without exposing the billing.plans table. Intentional exposure to anon+authenticated.';


CREATE OR REPLACE FUNCTION "public"."get_account_entitlements"("p_account_id" "uuid") RETURNS TABLE("plan_slug" "text", "features" "jsonb", "limits" "jsonb")
    LANGUAGE "plpgsql" VOLATILE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  IF NOT private.user_is_member(p_account_id, (SELECT auth.uid())) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT r.slug, r.features, r.limits
  FROM private.get_account_plan_row(p_account_id) r;
END;
$$;


ALTER FUNCTION "public"."get_account_entitlements"("p_account_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_account_entitlements"("p_account_id" "uuid") IS 'Features+limits del plan efectivo de la cuenta (F2-2A-core). Fallback a Free sin suscripción. Callable por cualquier miembro: gobierna uso, no administración. Delega en private.get_account_plan_row (3H-1.5).';


CREATE OR REPLACE FUNCTION "public"."get_billing_overview"("p_account_id" "uuid") RETURNS TABLE("plan_slug" "text", "plan_name" "text", "plan_interval" "billing"."plan_interval", "status" "billing"."subscription_status", "current_period_end" timestamp with time zone, "cancel_at_period_end" boolean, "trial_end" timestamp with time zone, "provider" "text", "external_subscription_id" "text")
    LANGUAGE "plpgsql" VOLATILE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  PERFORM private.assert_account_admin(p_account_id);
  RETURN QUERY
  SELECT p.slug, p.name, p."interval", s.status, s.current_period_end,
         s.cancel_at_period_end, s.trial_end, s.provider, s.external_subscription_id
  FROM billing.subscriptions s
  JOIN billing.customers c ON c.id = s.customer_id
  JOIN billing.plans p ON p.id = s.plan_id
  WHERE c.account_id = p_account_id
    AND s.status IN ('active', 'trialing', 'past_due', 'paused')
  ORDER BY s.created_at DESC
  LIMIT 1;
END;
$$;


ALTER FUNCTION "public"."get_billing_overview"("p_account_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_billing_overview"("p_account_id" "uuid") IS 'Suscripción vigente de la cuenta para la UI de billing (owner/admin), incluyendo provider + external_subscription_id para poder cancelar contra el adapter real. Vacío si nunca se suscribió.';


CREATE OR REPLACE FUNCTION "public"."get_plan_provider_id"("p_slug" "text", "p_interval" "billing"."plan_interval", "p_provider" "text") RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT provider_ids->>p_provider
  FROM billing.plans
  WHERE slug = p_slug AND "interval" = p_interval
  LIMIT 1;
$$;


ALTER FUNCTION "public"."get_plan_provider_id"("p_slug" "text", "p_interval" "billing"."plan_interval", "p_provider" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_plan_provider_id"("p_slug" "text", "p_interval" "billing"."plan_interval", "p_provider" "text") IS 'Resuelve el ID específico del proveedor (price_id de Stripe, preapproval_plan_id de MercadoPago) para un plan+interval. Lectura pública de metadata de planes (F2-2A-providers).';


CREATE OR REPLACE FUNCTION "public"."get_account_id_by_external_subscription"("p_external_subscription_id" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_account_id uuid;
BEGIN
  SELECT c.account_id INTO v_account_id
  FROM billing.subscriptions s
  JOIN billing.customers c ON c.id = s.customer_id
  WHERE s.external_subscription_id = p_external_subscription_id
  LIMIT 1;

  IF v_account_id IS NULL THEN
    RETURN NULL;
  END IF;

  PERFORM private.assert_account_admin(v_account_id);
  RETURN v_account_id;
END;
$$;


ALTER FUNCTION "public"."get_account_id_by_external_subscription"("p_external_subscription_id" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_account_id_by_external_subscription"("p_external_subscription_id" "text") IS 'Resuelve accountId a partir del id de suscripción del proveedor para cancelación diferida. Solo owner/admin de la cuenta; NULL si no hay match.';


CREATE OR REPLACE FUNCTION "public"."broadcast_alert_email"("p_subject" "text", "p_body" "text") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_count integer := 0;
  v_row record;
BEGIN
  PERFORM private.assert_platform_admin();

  IF p_subject IS NULL OR length(trim(p_subject)) = 0 THEN
    RAISE EXCEPTION 'subject_required';
  END IF;
  IF p_body IS NULL OR length(trim(p_body)) = 0 THEN
    RAISE EXCEPTION 'body_required';
  END IF;

  FOR v_row IN
    SELECT am.account_id, u.email
    FROM public.accounts_memberships am
    JOIN auth.users u ON u.id = am.user_id
    WHERE am.role = 'owner'
  LOOP
    PERFORM pgmq.send('email_queue', jsonb_build_object(
      'accountId', v_row.account_id,
      'email', v_row.email,
      'subject', p_subject,
      'body', p_body
    ));
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;


ALTER FUNCTION "public"."broadcast_alert_email"("p_subject" "text", "p_body" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."broadcast_alert_email"("p_subject" "text", "p_body" "text") IS 'Encola un email de alerta en pgmq.email_queue para cada owner de cuenta (F2-2F). Gateado a platform_admin (F3-C6).';


CREATE OR REPLACE FUNCTION "public"."list_account_invoices"("p_account_id" "uuid", "p_limit" integer DEFAULT 10, "p_cursor_created_at" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_cursor_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("id" "uuid", "number" "text", "status" "billing"."invoice_status", "currency" character, "total" integer, "amount_paid" integer, "hosted_url" "text", "pdf_url" "text", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" VOLATILE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 100 THEN
    RAISE EXCEPTION 'invalid_limit';
  END IF;
  PERFORM private.assert_account_admin(p_account_id);
  RETURN QUERY
  SELECT i.id, i.number, i.status, i.currency, i.total, i.amount_paid,
         i.hosted_url, i.pdf_url, i.created_at
  FROM billing.invoices i
  JOIN billing.customers c ON c.id = i.customer_id
  WHERE c.account_id = p_account_id
    AND (
      p_cursor_created_at IS NULL
      OR i.created_at < p_cursor_created_at
      OR (i.created_at = p_cursor_created_at AND i.id < p_cursor_id)
    )
  ORDER BY i.created_at DESC, i.id DESC
  LIMIT p_limit;
END;
$$;


ALTER FUNCTION "public"."list_account_invoices"("p_account_id" "uuid", "p_limit" integer, "p_cursor_created_at" timestamp with time zone, "p_cursor_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."list_account_invoices"("p_account_id" "uuid", "p_limit" integer, "p_cursor_created_at" timestamp with time zone, "p_cursor_id" "uuid") IS 'Facturas de la cuenta paginadas por keyset (owner/admin).';


CREATE OR REPLACE FUNCTION "public"."apply_subscription_event"("p_account_id" "uuid", "p_plan_slug" "text", "p_interval" "billing"."plan_interval", "p_status" "billing"."subscription_status", "p_external_subscription_id" "text", "p_external_event_id" "text", "p_event_type" "text", "p_current_period_start" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_current_period_end" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_cancel_at_period_end" boolean DEFAULT false, "p_trial_end" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_invoice" "jsonb" DEFAULT NULL::"jsonb", "p_provider" "text" DEFAULT 'mock'::"text") RETURNS "text"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
DECLARE
  v_customer_id     uuid;
  v_plan_id         uuid;
  v_subscription_id uuid;
BEGIN
  -- Idempotencia: si el evento externo ya se procesó, no-op.
  INSERT INTO billing.events (event_type, provider, external_event_id, payload, processed_at)
  VALUES (p_event_type, p_provider, p_external_event_id, COALESCE(p_invoice, '{}'::jsonb), now())
  ON CONFLICT (external_event_id) DO NOTHING;
  IF NOT FOUND THEN
    RETURN 'duplicate';
  END IF;

  SELECT id INTO v_plan_id FROM billing.plans
  WHERE slug = p_plan_slug AND "interval" = p_interval LIMIT 1;
  IF v_plan_id IS NULL THEN
    RAISE EXCEPTION 'plan_not_found';
  END IF;

  -- Upsert del customer (account_id UNIQUE).
  INSERT INTO billing.customers (account_id, provider)
  VALUES (p_account_id, p_provider)
  ON CONFLICT (account_id) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_customer_id;

  -- Upsert de la suscripción por external_subscription_id.
  SELECT id INTO v_subscription_id FROM billing.subscriptions
  WHERE external_subscription_id = p_external_subscription_id;

  IF v_subscription_id IS NULL THEN
    INSERT INTO billing.subscriptions (
      customer_id, plan_id, status, current_period_start, current_period_end,
      cancel_at_period_end, trial_end, provider, external_subscription_id)
    VALUES (
      v_customer_id, v_plan_id, p_status, p_current_period_start, p_current_period_end,
      COALESCE(p_cancel_at_period_end, false), p_trial_end, p_provider, p_external_subscription_id)
    RETURNING id INTO v_subscription_id;
  ELSE
    UPDATE billing.subscriptions
    SET plan_id = v_plan_id, status = p_status,
        current_period_start = p_current_period_start,
        current_period_end = p_current_period_end,
        cancel_at_period_end = COALESCE(p_cancel_at_period_end, cancel_at_period_end),
        trial_end = p_trial_end
    WHERE id = v_subscription_id;
  END IF;

  -- Invoice opcional (invoice_paid).
  IF p_invoice IS NOT NULL AND p_event_type = 'invoice_paid' THEN
    INSERT INTO billing.invoices (
      customer_id, subscription_id, status, currency, total, amount_paid,
      period_start, period_end, paid_at)
    VALUES (
      v_customer_id, v_subscription_id, 'paid',
      COALESCE(p_invoice->>'currency', 'USD'),
      COALESCE((p_invoice->>'amountPaid')::int, 0),
      COALESCE((p_invoice->>'amountPaid')::int, 0),
      (p_invoice->>'periodStart')::timestamptz,
      (p_invoice->>'periodEnd')::timestamptz,
      now());
  END IF;

  -- Emitir el evento saliente (2D). Mapea el tipo interno → nombre del catálogo.
  PERFORM private.emit_webhook_event(
    p_account_id,
    CASE p_event_type
      WHEN 'subscription_created'  THEN 'subscription.created'
      WHEN 'subscription_canceled' THEN 'subscription.canceled'
      ELSE 'subscription.updated'
    END,
    jsonb_build_object('plan_slug', p_plan_slug, 'status', p_status,
                       'cancel_at_period_end', COALESCE(p_cancel_at_period_end, false)));

  RETURN 'applied';
END;
$$;


ALTER FUNCTION "public"."apply_subscription_event"("p_account_id" "uuid", "p_plan_slug" "text", "p_interval" "billing"."plan_interval", "p_status" "billing"."subscription_status", "p_external_subscription_id" "text", "p_external_event_id" "text", "p_event_type" "text", "p_current_period_start" timestamp with time zone, "p_current_period_end" timestamp with time zone, "p_cancel_at_period_end" boolean, "p_trial_end" timestamp with time zone, "p_invoice" "jsonb", "p_provider" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."apply_subscription_event"("p_account_id" "uuid", "p_plan_slug" "text", "p_interval" "billing"."plan_interval", "p_status" "billing"."subscription_status", "p_external_subscription_id" "text", "p_external_event_id" "text", "p_event_type" "text", "p_current_period_start" timestamp with time zone, "p_current_period_end" timestamp with time zone, "p_cancel_at_period_end" boolean, "p_trial_end" timestamp with time zone, "p_invoice" "jsonb", "p_provider" "text") IS 'Persiste un evento de suscripción resuelto (idempotente por external_event_id), graba el provider real, y emite subscription.* a los webhooks salientes. Solo service_role (F2-2A-providers).';



CREATE OR REPLACE FUNCTION "public"."get_my_account_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT account_id
  FROM public.accounts_memberships
  WHERE user_id = (SELECT auth.uid())
  ORDER BY created_at DESC
  LIMIT 1;
$$;


ALTER FUNCTION "public"."get_my_account_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_accounts"() RETURNS TABLE("account_id" "uuid", "name" "text", "slug" "text", "type" "public"."account_type", "logo_url" "text", "role" "public"."membership_role", "website" "text", "country" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT a.id, a.name, a.slug, a.type, a.logo_url, m.role, a.website, a.country
  FROM public.accounts a
  JOIN public.accounts_memberships m ON m.account_id = a.id
  WHERE m.user_id = (SELECT auth.uid())
    AND a.deleted_at IS NULL;
$$;


ALTER FUNCTION "public"."get_my_accounts"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_my_accounts"() IS 'Returns accounts the current user belongs to. SECURITY DEFINER: reads accounts_memberships (direct SELECT revoked). Uses auth.uid() internally.';


CREATE OR REPLACE FUNCTION "public"."set_account_logo"("p_account_id" "uuid", "p_path" "text" DEFAULT NULL::"text") RETURNS void
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  PERFORM private.assert_account_admin(p_account_id);

  UPDATE public.accounts
  SET logo_url = p_path
  WHERE id = p_account_id;
END;
$$;


ALTER FUNCTION "public"."set_account_logo"("p_account_id" "uuid", "p_path" "text") OWNER TO "postgres";

COMMENT ON FUNCTION "public"."set_account_logo"("p_account_id" "uuid", "p_path" "text") IS 'Setea (o quita, omitiendo p_path) el logo_url de la cuenta. Owner/admin únicamente vía private.assert_account_admin (F3-3H-2).';



CREATE OR REPLACE FUNCTION "public"."rename_account"("p_account_id" "uuid", "p_name" "text") RETURNS void
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  PERFORM private.assert_account_admin(p_account_id);

  UPDATE public.accounts
  SET name = p_name, updated_at = now()
  WHERE id = p_account_id;
END;
$$;


ALTER FUNCTION "public"."rename_account"("p_account_id" "uuid", "p_name" "text") OWNER TO "postgres";

COMMENT ON FUNCTION "public"."rename_account"("p_account_id" "uuid", "p_name" "text") IS 'Renombra la cuenta. Owner/admin únicamente vía private.assert_account_admin (F3-C4).';



CREATE OR REPLACE FUNCTION "public"."update_account_info"("p_account_id" "uuid", "p_name" "text", "p_slug" "text", "p_website" "text" DEFAULT NULL::"text", "p_country" "text" DEFAULT NULL::"text") RETURNS void
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  PERFORM private.assert_account_admin(p_account_id);

  IF btrim(p_name) = '' OR char_length(p_name) > 100 THEN
    RAISE EXCEPTION 'invalid_name';
  END IF;

  IF p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' OR char_length(p_slug) > 60 THEN
    RAISE EXCEPTION 'invalid_slug';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.accounts WHERE slug = p_slug AND id != p_account_id
  ) THEN
    RAISE EXCEPTION 'slug_taken';
  END IF;

  UPDATE public.accounts
  SET name = p_name,
      slug = p_slug,
      website = NULLIF(btrim(p_website), ''),
      country = NULLIF(btrim(p_country), ''),
      updated_at = now()
  WHERE id = p_account_id;
END;
$$;


ALTER FUNCTION "public"."update_account_info"("p_account_id" "uuid", "p_name" "text", "p_slug" "text", "p_website" "text", "p_country" "text") OWNER TO "postgres";

COMMENT ON FUNCTION "public"."update_account_info"("p_account_id" "uuid", "p_name" "text", "p_slug" "text", "p_website" "text", "p_country" "text") IS 'Actualiza name/slug/website/country de la cuenta. Owner/admin únicamente vía private.assert_account_admin. Website/country vacíos se guardan como NULL.';



CREATE OR REPLACE FUNCTION "public"."invite_members"("p_account_id" "uuid", "p_emails" "text"[], "p_role" "public"."membership_role" DEFAULT 'member'::"public"."membership_role") RETURNS TABLE("email" "text", "token" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_caller_role public.membership_role;
  v_account_type public.account_type;
  v_email       text;
  v_norm_email  text;
  v_raw_token   text;
  v_token_hash  text;
BEGIN
  -- Plan 009: las cuentas personales son 1:1 con su usuario (el trigger
  -- enforce_single_owner_per_account ya lo asumía); colaborar define a un team.
  SELECT type INTO v_account_type
  FROM public.accounts
  WHERE id = p_account_id AND deleted_at IS NULL;

  IF v_account_type IS DISTINCT FROM 'team' THEN
    RAISE EXCEPTION 'not_a_team';
  END IF;

  SELECT role INTO v_caller_role
  FROM public.accounts_memberships
  WHERE account_id = p_account_id AND user_id = (SELECT auth.uid());

  IF v_caller_role IS NULL OR v_caller_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'Only owner or admin can invite members';
  END IF;

  IF p_role = 'owner' THEN
    RAISE EXCEPTION 'Cannot invite as owner';
  END IF;

  IF array_length(p_emails, 1) > 20 THEN
    RAISE EXCEPTION 'Maximum 20 emails per batch';
  END IF;

  IF NOT private.within_plan_limit(p_account_id, 'seats_max',
      (SELECT count(*) FROM public.accounts_memberships m WHERE m.account_id = p_account_id),
      array_length(p_emails, 1)) THEN
    RAISE EXCEPTION 'seat_limit_reached';
  END IF;

  FOREACH v_email IN ARRAY p_emails LOOP
    v_norm_email := lower(trim(v_email));
    v_raw_token  := encode(extensions.gen_random_bytes(32), 'hex');
    v_token_hash := encode(extensions.digest(v_raw_token, 'sha256'), 'hex');

    BEGIN
      INSERT INTO public.invitations (account_id, email, role, invited_by, token_hash)
      VALUES (p_account_id, v_norm_email, p_role, (SELECT auth.uid()), v_token_hash);
      email := v_norm_email;
      token := v_raw_token;
      RETURN NEXT;
    EXCEPTION WHEN unique_violation THEN
      NULL;
    END;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."invite_members"("p_account_id" "uuid", "p_emails" "text"[], "p_role" "public"."membership_role") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."invite_members"("p_account_id" "uuid", "p_emails" "text"[], "p_role" "public"."membership_role") IS 'Crea invitaciones y retorna (email, token) pares. El token en texto plano se retorna UNA SOLA VEZ para enviarse por email. Solo el hash se almacena en BD. Rechaza cuentas que no sean type=team (Plan 009: Personal es 1:1) y rechaza si members actuales + invitados excede seats_max del plan (F3-3H-1).';



CREATE OR REPLACE FUNCTION "public"."list_my_sessions"() RETURNS TABLE("id" "uuid", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "not_after" timestamp with time zone, "user_agent" "text", "ip" "text", "aal" "text")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_uid uuid := (SELECT auth.uid());
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    s.id,
    s.created_at,
    s.updated_at,
    s.not_after,
    s.user_agent,
    s.ip::text,
    s.aal::text
  FROM auth.sessions s
  WHERE s.user_id = v_uid
  ORDER BY s.updated_at DESC NULLS LAST;
END;
$$;


ALTER FUNCTION "public"."list_my_sessions"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."list_my_sessions"() IS 'Returns the caller''s active sessions from auth.sessions. SECURITY DEFINER because auth schema is not granted to authenticated; the function filters by auth.uid() so leaking other users is impossible.';



CREATE OR REPLACE FUNCTION "public"."list_team_members"("p_account_id" "uuid") RETURNS TABLE("user_id" "uuid", "email" "text", "display_name" "text", "given_name" "text", "family_name" "text", "avatar_url" "text", "role" "text", "status" "text", "joined_at" timestamp with time zone)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  -- Verify caller is a member of this account
  IF NOT EXISTS (
    SELECT 1 FROM public.accounts_memberships am
    WHERE am.account_id = p_account_id AND am.user_id = (SELECT auth.uid())
  ) THEN
    RAISE EXCEPTION 'Not a member of this account';
  END IF;

  -- Wrap in subquery to avoid PL/pgSQL variable name collision
  -- between RETURNS TABLE columns and table columns
  RETURN QUERY
  SELECT
    sub.user_id,
    sub.email,
    sub.display_name,
    sub.given_name,
    sub.family_name,
    sub.avatar_url,
    sub.role,
    sub.status,
    sub.joined_at
  FROM (
    -- Active members
    SELECT
      m.user_id,
      u.email::text,
      p.display_name,
      p.given_name,
      p.family_name,
      p.avatar_url,
      m.role::text AS role,
      'active'::text AS status,
      m.created_at AS joined_at
    FROM public.accounts_memberships m
    JOIN public.profiles p ON p.id = m.user_id
    JOIN auth.users u ON u.id = m.user_id
    WHERE m.account_id = p_account_id

    UNION ALL

    -- Pending invitations
    SELECT
      NULL::uuid AS user_id,
      i.email,
      NULL::text AS display_name,
      NULL::text AS given_name,
      NULL::text AS family_name,
      NULL::text AS avatar_url,
      i.role::text AS role,
      'pending'::text AS status,
      i.created_at AS joined_at
    FROM public.invitations i
    WHERE i.account_id = p_account_id
      AND i.status = 'pending'
      AND i.expires_at > now()
  ) sub
  ORDER BY sub.joined_at ASC;
END;
$$;


ALTER FUNCTION "public"."list_team_members"("p_account_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."list_team_members"("p_account_id" "uuid") IS 'Lists all active members and pending invitations for an account. SECURITY DEFINER: reads memberships + profiles + auth.users + invitations. Validates caller membership. Used by the team management page.';



CREATE OR REPLACE FUNCTION "public"."remove_member"("p_account_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_caller_role public.membership_role;
  v_target_role public.membership_role;
BEGIN
  -- Check caller role
  SELECT role INTO v_caller_role
  FROM public.accounts_memberships
  WHERE account_id = p_account_id AND user_id = (SELECT auth.uid());

  IF v_caller_role IS NULL OR v_caller_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'Only owner or admin can remove members';
  END IF;

  -- Cannot remove yourself
  IF p_user_id = (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Cannot remove yourself. Use leave team instead.';
  END IF;

  -- Check target role — cannot remove owner
  SELECT role INTO v_target_role
  FROM public.accounts_memberships
  WHERE account_id = p_account_id AND user_id = p_user_id;

  IF v_target_role IS NULL THEN
    RAISE EXCEPTION 'User is not a member of this account';
  END IF;

  IF v_target_role = 'owner' THEN
    RAISE EXCEPTION 'Cannot remove the account owner';
  END IF;

  -- Admin cannot remove another admin (only owner can)
  IF v_caller_role = 'admin' AND v_target_role = 'admin' THEN
    RAISE EXCEPTION 'Only the owner can remove an admin';
  END IF;

  DELETE FROM public.accounts_memberships
  WHERE account_id = p_account_id AND user_id = p_user_id;

  RETURN true;
END;
$$;


ALTER FUNCTION "public"."remove_member"("p_account_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."remove_member"("p_account_id" "uuid", "p_user_id" "uuid") IS 'Removes a member from an account. Only owner/admin can remove. Owner cannot be removed. Admin cannot remove another admin. Cannot remove yourself (use leave team flow).';


CREATE OR REPLACE FUNCTION "public"."switch_account"("p_account_id" "uuid")
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT private.user_is_member(p_account_id, (SELECT auth.uid())) THEN
    RAISE EXCEPTION 'not_a_member';
  END IF;

  UPDATE public.profiles
  SET active_account_id = p_account_id
  WHERE id = (SELECT auth.uid());
END;
$$;

ALTER FUNCTION "public"."switch_account"("p_account_id" "uuid") OWNER TO "postgres";

GRANT EXECUTE ON FUNCTION public.switch_account(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.switch_account(uuid) FROM PUBLIC, anon;

COMMENT ON FUNCTION public.switch_account(uuid) IS
  'Sets the caller''s active_account_id after validating membership. The JWT '
  'hook picks this up on the next token refresh — callers must call '
  'supabase.auth.refreshSession() afterward (Bloque 1).';


CREATE OR REPLACE FUNCTION "public"."create_team"("p_name" "text")
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid         uuid := (SELECT auth.uid());
  v_team_count  integer;
  v_base_slug   text;
  v_slug        text;
  v_account_id  uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF btrim(p_name) = '' OR char_length(p_name) > 100 THEN
    RAISE EXCEPTION 'invalid_name';
  END IF;

  -- La Personal account tiene id = user id (invariante de handle_new_profile);
  -- el límite de Teams se mide contra el plan de esa cuenta.
  SELECT count(*) INTO v_team_count
  FROM public.accounts_memberships m
  JOIN public.accounts a ON a.id = m.account_id
  WHERE m.user_id = v_uid AND m.role = 'owner' AND a.type = 'team' AND a.deleted_at IS NULL;

  IF NOT private.within_plan_limit(v_uid, 'teams_max', v_team_count, 1) THEN
    RAISE EXCEPTION 'team_limit_reached';
  END IF;

  v_base_slug := private.slugify(p_name);
  v_slug := private.generate_unique_slug(v_base_slug);

  INSERT INTO public.accounts (type, name, slug, created_by)
  VALUES ('team', p_name, v_slug, v_uid)
  RETURNING id INTO v_account_id;

  INSERT INTO public.accounts_memberships (account_id, user_id, role)
  VALUES (v_account_id, v_uid, 'owner');

  UPDATE public.profiles SET active_account_id = v_account_id WHERE id = v_uid;

  RETURN v_account_id;
END;
$$;

ALTER FUNCTION "public"."create_team"("p_name" "text") OWNER TO "postgres";

GRANT EXECUTE ON FUNCTION public.create_team(text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.create_team(text) FROM PUBLIC, anon;

COMMENT ON FUNCTION public.create_team(text) IS
  'Creates a Team account (caller = owner), gated by the teams_max entitlement '
  'evaluated against the caller''s Personal account plan. Sets the new team as '
  'active — callers must call supabase.auth.refreshSession() afterward (Bloque 1).';


CREATE OR REPLACE FUNCTION "public"."replace_robot_config"("p_account_id" "uuid", "p_routines" "jsonb", "p_contacts" "jsonb", "p_memories" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_uid uuid := (SELECT auth.uid());
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  IF NOT private.user_is_member(p_account_id, v_uid) THEN
    RAISE EXCEPTION 'not_a_member' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.robot_routines WHERE account_id = p_account_id;
  DELETE FROM public.robot_contacts WHERE account_id = p_account_id;
  DELETE FROM public.robot_memories WHERE account_id = p_account_id;

  INSERT INTO public.robot_routines (account_id, time, activity_type, description, message)
  SELECT
    p_account_id,
    (r ->> 'time')::time,
    COALESCE(NULLIF(r ->> 'activity_type', ''), 'General'),
    COALESCE(r ->> 'description', ''),
    COALESCE(r ->> 'message', '')
  FROM jsonb_array_elements(COALESCE(p_routines, '[]'::jsonb)) AS r;

  INSERT INTO public.robot_contacts (account_id, name, relationship, phone, priority)
  SELECT
    p_account_id,
    COALESCE(NULLIF(c ->> 'name', ''), 'Desconocido'),
    COALESCE(c ->> 'relationship', ''),
    COALESCE(c ->> 'phone', ''),
    COALESCE((c ->> 'priority')::int, 1)
  FROM jsonb_array_elements(COALESCE(p_contacts, '[]'::jsonb)) AS c;

  INSERT INTO public.robot_memories (account_id, entity, name, key_fact)
  SELECT
    p_account_id,
    COALESCE(NULLIF(m ->> 'entity', ''), 'General'),
    COALESCE(m ->> 'name', ''),
    COALESCE(m ->> 'key_fact', '')
  FROM jsonb_array_elements(COALESCE(p_memories, '[]'::jsonb)) AS m;
END;
$$;


ALTER FUNCTION "public"."replace_robot_config"("p_account_id" "uuid", "p_routines" "jsonb", "p_contacts" "jsonb", "p_memories" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."replace_robot_config"("p_account_id" "uuid", "p_routines" "jsonb", "p_contacts" "jsonb", "p_memories" "jsonb") IS 'Atomically replaces a tenant''s robot routines/contacts/memories in a single transaction. SECURITY DEFINER with an internal membership check. Prevents the partial-write data loss of the previous delete-then-insert client flow.';



CREATE OR REPLACE FUNCTION "public"."request_account_deletion"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_uid uuid := (SELECT auth.uid());
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  UPDATE public.profiles
  SET
    deleted_at       = now(),
    pending_deletion = true,
    updated_at       = now()
  WHERE id = v_uid;

  UPDATE public.accounts
  SET deleted_at = now(), updated_at = now()
  WHERE created_by = v_uid AND type = 'personal' AND deleted_at IS NULL;
END;
$$;


ALTER FUNCTION "public"."request_account_deletion"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."request_account_deletion"() IS 'Marca el perfil + account personal del caller como soft-deleted. SECURITY DEFINER: authenticated no tiene UPDATE en accounts (revocado en migration 040000). El ownership se verifica con (SELECT auth.uid()). El job pg_cron hard-delete-old-accounts elimina tras 90 días. Next.js debe llamar supabase.auth.signOut() después de esta función.';



CREATE OR REPLACE FUNCTION "public"."revoke_my_session"("p_session_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_uid uuid := (SELECT auth.uid());
  v_deleted int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  DELETE FROM auth.sessions WHERE id = p_session_id AND user_id = v_uid;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  IF v_deleted = 0 THEN
    RAISE EXCEPTION 'session_not_found' USING ERRCODE = 'P0002';
  END IF;
END;
$$;


ALTER FUNCTION "public"."revoke_my_session"("p_session_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."revoke_my_session"("p_session_id" "uuid") IS 'Deletes one auth.sessions row if it belongs to the caller. SECURITY DEFINER because auth schema is not granted to authenticated; ownership is enforced by the WHERE clause.';


SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "given_name" "text",
    "family_name" "text",
    "display_name" "text" GENERATED ALWAYS AS (COALESCE((("given_name" || ' '::"text") || "family_name"), "given_name", "family_name")) STORED,
    "avatar_url" "text",
    "locale" "text" DEFAULT 'es'::"text",
    "timezone" "text" DEFAULT 'America/Santiago'::"text",
    "phone_number" "text",
    "onboarding_completed" boolean DEFAULT false,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone,
    "birth_date" "date",
    "bio" "text",
    "website_url" "text",
    "company" "text",
    "pending_deletion" boolean DEFAULT false NOT NULL,
    "analytics_consent" boolean,
    "active_account_id" "uuid",
    CONSTRAINT "profiles_bio_check" CHECK (("char_length"("bio") <= 500)),
    CONSTRAINT "profiles_company_check" CHECK (("char_length"("company") <= 100)),
    CONSTRAINT "profiles_website_url_check" CHECK (("char_length"("website_url") <= 255))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."profiles"."birth_date" IS 'OIDC birthdate claim — stored as date, not exposed in JWT.';



COMMENT ON COLUMN "public"."profiles"."bio" IS 'Short user bio, max 500 chars.';



COMMENT ON COLUMN "public"."profiles"."website_url" IS 'Personal or professional website URL.';



COMMENT ON COLUMN "public"."profiles"."company" IS 'Company or organization name.';



COMMENT ON COLUMN "public"."profiles"."analytics_consent" IS 'Synced from the cookie_consent.analytics cookie whenever AnalyticsProvider observes it for a logged-in user. NULL = never synced. Lets captureServer() (e.g. billing webhooks, which carry no browser cookie) check consent without one.';



CREATE OR REPLACE FUNCTION "public"."update_my_profile"("p_given_name" "text" DEFAULT NULL::"text", "p_family_name" "text" DEFAULT NULL::"text", "p_locale" "text" DEFAULT NULL::"text", "p_timezone" "text" DEFAULT NULL::"text", "p_phone_number" "text" DEFAULT NULL::"text", "p_avatar_url" "text" DEFAULT NULL::"text", "p_birth_date" "text" DEFAULT NULL::"text", "p_bio" "text" DEFAULT NULL::"text", "p_website_url" "text" DEFAULT NULL::"text", "p_company" "text" DEFAULT NULL::"text") RETURNS "public"."profiles"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
DECLARE
  v_uid  uuid := (SELECT auth.uid());
  v_row  public.profiles;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  UPDATE public.profiles
  SET
    given_name   = COALESCE(p_given_name,   given_name),
    family_name  = COALESCE(p_family_name,  family_name),
    locale       = COALESCE(p_locale,       locale),
    timezone     = COALESCE(p_timezone,     timezone),
    phone_number = COALESCE(p_phone_number, phone_number),
    avatar_url   = COALESCE(p_avatar_url,   avatar_url),
    -- Clearable fields: NULL = keep, '' = set NULL, 'value' = update
    birth_date   = CASE WHEN p_birth_date  IS NULL THEN birth_date  ELSE NULLIF(p_birth_date,  '')::date END,
    bio          = CASE WHEN p_bio         IS NULL THEN bio          ELSE NULLIF(p_bio,         '')       END,
    website_url  = CASE WHEN p_website_url IS NULL THEN website_url  ELSE NULLIF(p_website_url, '')       END,
    company      = CASE WHEN p_company     IS NULL THEN company      ELSE NULLIF(p_company,     '')       END,
    updated_at   = now()
  WHERE id = v_uid AND deleted_at IS NULL
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile_not_found' USING ERRCODE = 'P0002';
  END IF;

  RETURN v_row;
END;
$$;


ALTER FUNCTION "public"."update_my_profile"("p_given_name" "text", "p_family_name" "text", "p_locale" "text", "p_timezone" "text", "p_phone_number" "text", "p_avatar_url" "text", "p_birth_date" "text", "p_bio" "text", "p_website_url" "text", "p_company" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_my_profile"("p_given_name" "text", "p_family_name" "text", "p_locale" "text", "p_timezone" "text", "p_phone_number" "text", "p_avatar_url" "text", "p_birth_date" "text", "p_bio" "text", "p_website_url" "text", "p_company" "text") IS 'Self-update editable profile fields. SECURITY INVOKER — RLS enforces auth.uid()=id. Pass NULL to keep a field unchanged. Pass empty string to clear a nullable field.';



CREATE OR REPLACE FUNCTION "public"."complete_onboarding"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_uid uuid := (SELECT auth.uid());
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  UPDATE public.profiles
  SET onboarding_completed = true, updated_at = now()
  WHERE id = v_uid AND deleted_at IS NULL;
END;
$$;


ALTER FUNCTION "public"."complete_onboarding"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."complete_onboarding"() IS 'Marca el onboarding wizard como completado para el usuario que llama (F3-C4).';



CREATE TABLE IF NOT EXISTS "public"."accounts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "type" "public"."account_type" DEFAULT 'team'::"public"."account_type" NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "logo_url" "text",
    "billing_email" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone,
    "website" "text",
    "country" "text"
);


ALTER TABLE "public"."accounts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."accounts_memberships" (
    "account_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."membership_role" DEFAULT 'member'::"public"."membership_role" NOT NULL,
    "invited_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."accounts_memberships" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."platform_admins" (
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."platform_admins" OWNER TO "postgres";

COMMENT ON TABLE "public"."platform_admins" IS 'Whitelist de super-admins de la plataforma (back-office F3). Sin UI de auto-alta: solo se puebla a mano via SQL/Studio. RLS deny-all total — el acceso pasa por private.* que ya validan is_platform_admin() del caller.';

ALTER TABLE ONLY "public"."platform_admins"
    ADD CONSTRAINT "platform_admins_pkey" PRIMARY KEY ("user_id");

ALTER TABLE ONLY "public"."platform_admins"
    ADD CONSTRAINT "platform_admins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE "public"."platform_admins" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform_admins_deny_all" ON "public"."platform_admins" FOR ALL TO "authenticated", "anon" USING (false) WITH CHECK (false);

REVOKE ALL ON TABLE "public"."platform_admins" FROM "anon";
REVOKE ALL ON TABLE "public"."platform_admins" FROM "authenticated";


CREATE TABLE public.impersonation_sessions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason         text NOT NULL,
  started_at     timestamptz NOT NULL DEFAULT now(),
  expires_at     timestamptz NOT NULL,
  ended_at       timestamptz,
  ended_reason   text,
  ip_address     inet,
  user_agent     text,
  CONSTRAINT impersonation_target_not_admin CHECK (admin_id <> target_user_id)
);

COMMENT ON TABLE public.impersonation_sessions IS
  'Registro de sesiones "ver como" de super-admin (F3-C2). Cap duro de 30 min via expires_at. RLS deny-all — el acceso pasa por los RPCs begin_/end_impersonation_session.';

CREATE UNIQUE INDEX idx_impersonation_one_active_per_admin
  ON public.impersonation_sessions (admin_id) WHERE ended_at IS NULL;

CREATE INDEX idx_impersonation_active_target
  ON public.impersonation_sessions (target_user_id) WHERE ended_at IS NULL;

ALTER TABLE public.impersonation_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "impersonation_sessions_deny_all" ON public.impersonation_sessions
  FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);

REVOKE ALL ON public.impersonation_sessions FROM anon, authenticated;

CREATE TRIGGER impersonation_sessions_immutable_core
  BEFORE UPDATE OF admin_id, target_user_id, reason, started_at
  ON public.impersonation_sessions
  FOR EACH ROW EXECUTE FUNCTION private.deny_mutation();


CREATE TABLE IF NOT EXISTS "public"."auth_recovery_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "code_hash" "text" NOT NULL,
    "used_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."auth_recovery_codes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "account_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "content" "text" DEFAULT ''::"text" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    CONSTRAINT "documents_content_max_size" CHECK (("octet_length"("content") <= 10485760))
);


ALTER TABLE "public"."documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "account_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "role" "public"."membership_role" DEFAULT 'member'::"public"."membership_role" NOT NULL,
    "token_hash" "text" NOT NULL,
    "status" "public"."invitation_status" DEFAULT 'pending'::"public"."invitation_status",
    "invited_by" "uuid",
    "expires_at" timestamp with time zone DEFAULT ("now"() + '7 days'::interval),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."invitations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."projects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "account_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text",
    "status" "public"."project_status" DEFAULT 'active'::"public"."project_status" NOT NULL,
    "color" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone,
    "type" "public"."project_type" DEFAULT 'docs'::"public"."project_type" NOT NULL
);


ALTER TABLE "public"."projects" OWNER TO "postgres";


ALTER TABLE ONLY "public"."accounts_memberships"
    ADD CONSTRAINT "accounts_memberships_pkey" PRIMARY KEY ("account_id", "user_id");



ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "accounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "accounts_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "accounts_slug_format" CHECK (("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::"text"));



ALTER TABLE ONLY "public"."auth_recovery_codes"
    ADD CONSTRAINT "auth_recovery_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_pkey" PRIMARY KEY ("id");



-- invitations_account_id_email_key eliminado: reemplazado por idx_invitations_pending_unique (índice parcial)



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_account_id_slug_key" UNIQUE ("account_id", "slug");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_accounts_created_by" ON "public"."accounts" USING "btree" ("created_by");



CREATE INDEX "idx_accounts_slug" ON "public"."accounts" USING "btree" ("slug") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_accounts_type" ON "public"."accounts" USING "btree" ("type") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_documents_account_id" ON "public"."documents" USING "btree" ("account_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_documents_created_by" ON "public"."documents" USING "btree" ("created_by");



CREATE INDEX "idx_documents_project_id" ON "public"."documents" USING "btree" ("project_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_invitations_account_id" ON "public"."invitations" USING "btree" ("account_id");



CREATE INDEX "idx_invitations_invited_by" ON "public"."invitations" USING "btree" ("invited_by");



CREATE UNIQUE INDEX IF NOT EXISTS "idx_invitations_token_hash_pending"
  ON "public"."invitations" ("token_hash")
  WHERE ("status" = 'pending'::"public"."invitation_status");



CREATE UNIQUE INDEX IF NOT EXISTS "idx_invitations_pending_unique"
  ON "public"."invitations" ("account_id", "email")
  WHERE "status" = 'pending'::"public"."invitation_status";



CREATE INDEX "idx_memberships_invited_by" ON "public"."accounts_memberships" USING "btree" ("invited_by");



CREATE INDEX "idx_memberships_user_id" ON "public"."accounts_memberships" USING "btree" ("user_id");



CREATE INDEX "idx_projects_account_id" ON "public"."projects" USING "btree" ("account_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_projects_created_by" ON "public"."projects" USING "btree" ("created_by");



CREATE INDEX "idx_projects_status" ON "public"."projects" USING "btree" ("status") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_recovery_codes_user_id" ON "public"."auth_recovery_codes" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "on_profile_created" AFTER INSERT ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "private"."handle_new_profile"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."accounts" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."accounts_memberships" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."documents" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."invitations" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_profiles_validate_locale_timezone"
  BEFORE INSERT OR UPDATE OF "locale", "timezone"
  ON "public"."profiles"
  FOR EACH ROW
  EXECUTE FUNCTION "private"."validate_profile_locale_timezone"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."projects" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE TRIGGER "trg_enforce_account_owner"
  BEFORE UPDATE OF "role" OR DELETE
  ON "public"."accounts_memberships"
  FOR EACH ROW
  EXECUTE FUNCTION "private"."enforce_single_owner_per_account"();



ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "accounts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."accounts_memberships"
    ADD CONSTRAINT "accounts_memberships_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."accounts_memberships"
    ADD CONSTRAINT "accounts_memberships_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."accounts_memberships"
    ADD CONSTRAINT "accounts_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."auth_recovery_codes"
    ADD CONSTRAINT "auth_recovery_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_active_account_id_fkey" FOREIGN KEY ("active_account_id")
    REFERENCES "public"."accounts"("id") ON DELETE SET NULL;


CREATE INDEX "idx_profiles_active_account_id" ON "public"."profiles" USING "btree" ("active_account_id");


ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



CREATE POLICY "Accounts: lectura para miembros" ON "public"."accounts" FOR SELECT TO "authenticated" USING ((("deleted_at" IS NULL) AND ( SELECT "private"."user_is_member"("accounts"."id", ( SELECT "auth"."uid"() AS "uid")) AS "user_is_member")));



CREATE POLICY "Accounts: update por owner/admin" ON "public"."accounts" FOR UPDATE TO "authenticated" USING ((( SELECT "private"."get_user_role"("accounts"."id", ( SELECT "auth"."uid"() AS "uid")) AS "get_user_role") = ANY (ARRAY['owner'::"public"."membership_role", 'admin'::"public"."membership_role"])));



CREATE POLICY "Invitations: crear owner/admin" ON "public"."invitations" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "private"."get_user_role"("invitations"."account_id", ( SELECT "auth"."uid"() AS "uid")) AS "get_user_role") = ANY (ARRAY['owner'::"public"."membership_role", 'admin'::"public"."membership_role"])));



CREATE POLICY "Invitations: lectura miembros" ON "public"."invitations" FOR SELECT TO "authenticated" USING (( SELECT "private"."user_is_member"("invitations"."account_id", ( SELECT "auth"."uid"() AS "uid")) AS "user_is_member"));



CREATE POLICY "Memberships: actualizar owner/admin" ON "public"."accounts_memberships" FOR UPDATE TO "authenticated" USING ((( SELECT "private"."get_user_role"("accounts_memberships"."account_id", ( SELECT "auth"."uid"() AS "uid")) AS "get_user_role") = ANY (ARRAY['owner'::"public"."membership_role", 'admin'::"public"."membership_role"]))) WITH CHECK ((( SELECT "private"."get_user_role"("accounts_memberships"."account_id", ( SELECT "auth"."uid"() AS "uid")) AS "get_user_role") = ANY (ARRAY['owner'::"public"."membership_role", 'admin'::"public"."membership_role"])));



CREATE POLICY "Memberships: eliminar owner/admin" ON "public"."accounts_memberships" FOR DELETE TO "authenticated" USING ((( SELECT "private"."get_user_role"("accounts_memberships"."account_id", ( SELECT "auth"."uid"() AS "uid")) AS "get_user_role") = ANY (ARRAY['owner'::"public"."membership_role", 'admin'::"public"."membership_role"])));



CREATE POLICY "Memberships: insertar owner/admin" ON "public"."accounts_memberships" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "private"."get_user_role"("accounts_memberships"."account_id", ( SELECT "auth"."uid"() AS "uid")) AS "get_user_role") = ANY (ARRAY['owner'::"public"."membership_role", 'admin'::"public"."membership_role"])));



CREATE POLICY "Memberships: lectura miembros" ON "public"."accounts_memberships" FOR SELECT TO "authenticated" USING (( SELECT "private"."user_is_member"("accounts_memberships"."account_id", ( SELECT "auth"."uid"() AS "uid")) AS "user_is_member"));



CREATE POLICY "Profiles: lectura propia" ON "public"."profiles" FOR SELECT TO "authenticated" USING ((("id" = ( SELECT "auth"."uid"() AS "uid")) AND ("deleted_at" IS NULL)));

COMMENT ON POLICY "Profiles: lectura propia" ON "public"."profiles" IS 'Self-read only. Teammate display_name/avatar_url is exposed via the SECURITY DEFINER RPC public.list_team_members (membership-checked), never by a direct REST read. Prevents cross-tenant PII enumeration.';



CREATE POLICY "Profiles: update propio" ON "public"."profiles" FOR UPDATE TO "authenticated" USING ((("id" = ( SELECT "auth"."uid"() AS "uid")) AND ("deleted_at" IS NULL))) WITH CHECK ((("id" = ( SELECT "auth"."uid"() AS "uid")) AND ("deleted_at" IS NULL)));



CREATE POLICY "Users can delete their own recovery codes" ON "public"."auth_recovery_codes" FOR DELETE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can insert their own recovery codes" ON "public"."auth_recovery_codes" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can mark their own recovery codes as used" ON "public"."auth_recovery_codes" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can view their own recovery codes" ON "public"."auth_recovery_codes" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



ALTER TABLE "public"."accounts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."accounts_memberships" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "editors_can_create_documents" ON "public"."documents" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "private"."get_user_role"("documents"."account_id", ( SELECT "auth"."uid"() AS "uid")) AS "get_user_role") = ANY (ARRAY['owner'::"public"."membership_role", 'admin'::"public"."membership_role", 'member'::"public"."membership_role"])));



CREATE POLICY "editors_can_create_projects" ON "public"."projects" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "private"."get_user_role"("projects"."account_id", ( SELECT "auth"."uid"() AS "uid")) AS "get_user_role") = ANY (ARRAY['owner'::"public"."membership_role", 'admin'::"public"."membership_role", 'member'::"public"."membership_role"])));



CREATE POLICY "editors_can_update_documents" ON "public"."documents" FOR UPDATE TO "authenticated" USING ((( SELECT "private"."get_user_role"("documents"."account_id", ( SELECT "auth"."uid"() AS "uid")) AS "get_user_role") = ANY (ARRAY['owner'::"public"."membership_role", 'admin'::"public"."membership_role", 'member'::"public"."membership_role"]))) WITH CHECK ((( SELECT "private"."get_user_role"("documents"."account_id", ( SELECT "auth"."uid"() AS "uid")) AS "get_user_role") = ANY (ARRAY['owner'::"public"."membership_role", 'admin'::"public"."membership_role", 'member'::"public"."membership_role"])));



CREATE POLICY "editors_can_update_projects" ON "public"."projects" FOR UPDATE TO "authenticated" USING ((( SELECT "private"."get_user_role"("projects"."account_id", ( SELECT "auth"."uid"() AS "uid")) AS "get_user_role") = ANY (ARRAY['owner'::"public"."membership_role", 'admin'::"public"."membership_role", 'member'::"public"."membership_role"]))) WITH CHECK ((( SELECT "private"."get_user_role"("projects"."account_id", ( SELECT "auth"."uid"() AS "uid")) AS "get_user_role") = ANY (ARRAY['owner'::"public"."membership_role", 'admin'::"public"."membership_role", 'member'::"public"."membership_role"])));



ALTER TABLE "public"."auth_recovery_codes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."documents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invitations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "members_can_view_documents" ON "public"."documents" FOR SELECT TO "authenticated" USING ((("deleted_at" IS NULL) AND "private"."user_is_member"("account_id", ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "members_can_view_projects" ON "public"."projects" FOR SELECT TO "authenticated" USING ((("deleted_at" IS NULL) AND "private"."user_is_member"("account_id", ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "owners_can_delete_documents" ON "public"."documents" FOR DELETE TO "authenticated" USING ((( SELECT "private"."get_user_role"("documents"."account_id", ( SELECT "auth"."uid"() AS "uid")) AS "get_user_role") = 'owner'::"public"."membership_role"));



CREATE POLICY "owners_can_delete_projects" ON "public"."projects" FOR DELETE TO "authenticated" USING ((( SELECT "private"."get_user_role"("projects"."account_id", ( SELECT "auth"."uid"() AS "uid")) AS "get_user_role") = 'owner'::"public"."membership_role"));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."projects" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";
GRANT USAGE ON SCHEMA "public" TO "supabase_auth_admin";



REVOKE ALL ON FUNCTION "public"."accept_invitation"("p_token" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."accept_invitation"("p_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."accept_invitation"("p_token" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."check_request"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."check_request"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_request"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."complete_onboarding"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."complete_onboarding"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."consume_recovery_code"("p_code" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."consume_recovery_code"("p_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."consume_recovery_code"("p_code" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."count_unused_recovery_codes"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."count_unused_recovery_codes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."count_unused_recovery_codes"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."custom_access_token_hook"("event" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."custom_access_token_hook"("event" "jsonb") TO "service_role";
GRANT ALL ON FUNCTION "public"."custom_access_token_hook"("event" "jsonb") TO "supabase_auth_admin";

-- The hook runs as its owner (postgres) via SECURITY DEFINER and must read the
-- verified-factor status from the auth schema.
GRANT SELECT ON TABLE "auth"."mfa_factors" TO "supabase_auth_admin";



REVOKE ALL ON FUNCTION "public"."generate_recovery_codes"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."generate_recovery_codes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_recovery_codes"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_account_subscription"("p_account_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_account_subscription"("p_account_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_account_subscription"("p_account_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_active_plans"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_active_plans"() TO "service_role";
GRANT ALL ON FUNCTION "public"."get_active_plans"() TO "anon";



REVOKE ALL ON FUNCTION "public"."get_account_entitlements"("p_account_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_account_entitlements"("p_account_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."get_billing_overview"("p_account_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_billing_overview"("p_account_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."get_plan_provider_id"("p_slug" "text", "p_interval" "billing"."plan_interval", "p_provider" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_plan_provider_id"("p_slug" "text", "p_interval" "billing"."plan_interval", "p_provider" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."get_account_id_by_external_subscription"("p_external_subscription_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_account_id_by_external_subscription"("p_external_subscription_id" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."broadcast_alert_email"("p_subject" "text", "p_body" "text") FROM PUBLIC;
REVOKE ALL ON FUNCTION "public"."broadcast_alert_email"("p_subject" "text", "p_body" "text") FROM "anon";
GRANT ALL ON FUNCTION "public"."broadcast_alert_email"("p_subject" "text", "p_body" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."list_account_invoices"("p_account_id" "uuid", "p_limit" integer, "p_cursor_created_at" timestamp with time zone, "p_cursor_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."list_account_invoices"("p_account_id" "uuid", "p_limit" integer, "p_cursor_created_at" timestamp with time zone, "p_cursor_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."apply_subscription_event"("p_account_id" "uuid", "p_plan_slug" "text", "p_interval" "billing"."plan_interval", "p_status" "billing"."subscription_status", "p_external_subscription_id" "text", "p_external_event_id" "text", "p_event_type" "text", "p_current_period_start" timestamp with time zone, "p_current_period_end" timestamp with time zone, "p_cancel_at_period_end" boolean, "p_trial_end" timestamp with time zone, "p_invoice" "jsonb", "p_provider" "text") FROM PUBLIC;
REVOKE ALL ON FUNCTION "public"."apply_subscription_event"("p_account_id" "uuid", "p_plan_slug" "text", "p_interval" "billing"."plan_interval", "p_status" "billing"."subscription_status", "p_external_subscription_id" "text", "p_external_event_id" "text", "p_event_type" "text", "p_current_period_start" timestamp with time zone, "p_current_period_end" timestamp with time zone, "p_cancel_at_period_end" boolean, "p_trial_end" timestamp with time zone, "p_invoice" "jsonb", "p_provider" "text") FROM "authenticated";
REVOKE ALL ON FUNCTION "public"."apply_subscription_event"("p_account_id" "uuid", "p_plan_slug" "text", "p_interval" "billing"."plan_interval", "p_status" "billing"."subscription_status", "p_external_subscription_id" "text", "p_external_event_id" "text", "p_event_type" "text", "p_current_period_start" timestamp with time zone, "p_current_period_end" timestamp with time zone, "p_cancel_at_period_end" boolean, "p_trial_end" timestamp with time zone, "p_invoice" "jsonb", "p_provider" "text") FROM "anon";
GRANT ALL ON FUNCTION "public"."apply_subscription_event"("p_account_id" "uuid", "p_plan_slug" "text", "p_interval" "billing"."plan_interval", "p_status" "billing"."subscription_status", "p_external_subscription_id" "text", "p_external_event_id" "text", "p_event_type" "text", "p_current_period_start" timestamp with time zone, "p_current_period_end" timestamp with time zone, "p_cancel_at_period_end" boolean, "p_trial_end" timestamp with time zone, "p_invoice" "jsonb", "p_provider" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_my_account_id"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_my_account_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_account_id"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_my_accounts"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_my_accounts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_accounts"() TO "service_role";


REVOKE ALL ON FUNCTION "public"."set_account_logo"("p_account_id" "uuid", "p_path" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_account_logo"("p_account_id" "uuid", "p_path" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."invite_members"("p_account_id" "uuid", "p_emails" "text"[], "p_role" "public"."membership_role") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."invite_members"("p_account_id" "uuid", "p_emails" "text"[], "p_role" "public"."membership_role") TO "authenticated";
GRANT ALL ON FUNCTION "public"."invite_members"("p_account_id" "uuid", "p_emails" "text"[], "p_role" "public"."membership_role") TO "service_role";



REVOKE ALL ON FUNCTION "public"."list_my_sessions"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."list_my_sessions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."list_my_sessions"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."list_team_members"("p_account_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."list_team_members"("p_account_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."list_team_members"("p_account_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."remove_member"("p_account_id" "uuid", "p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."remove_member"("p_account_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."remove_member"("p_account_id" "uuid", "p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."rename_account"("p_account_id" "uuid", "p_name" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rename_account"("p_account_id" "uuid", "p_name" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."update_account_info"("p_account_id" "uuid", "p_name" "text", "p_slug" "text", "p_website" "text", "p_country" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_account_info"("p_account_id" "uuid", "p_name" "text", "p_slug" "text", "p_website" "text", "p_country" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."replace_robot_config"("p_account_id" "uuid", "p_routines" "jsonb", "p_contacts" "jsonb", "p_memories" "jsonb") FROM PUBLIC;
REVOKE ALL ON FUNCTION "public"."replace_robot_config"("p_account_id" "uuid", "p_routines" "jsonb", "p_contacts" "jsonb", "p_memories" "jsonb") FROM "anon";
GRANT ALL ON FUNCTION "public"."replace_robot_config"("p_account_id" "uuid", "p_routines" "jsonb", "p_contacts" "jsonb", "p_memories" "jsonb") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."request_account_deletion"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."request_account_deletion"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."request_account_deletion"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."revoke_my_session"("p_session_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."revoke_my_session"("p_session_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."revoke_my_session"("p_session_id" "uuid") TO "service_role";



GRANT MAINTAIN ON TABLE "public"."profiles" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_my_profile"("p_given_name" "text", "p_family_name" "text", "p_locale" "text", "p_timezone" "text", "p_phone_number" "text", "p_avatar_url" "text", "p_birth_date" "text", "p_bio" "text", "p_website_url" "text", "p_company" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_my_profile"("p_given_name" "text", "p_family_name" "text", "p_locale" "text", "p_timezone" "text", "p_phone_number" "text", "p_avatar_url" "text", "p_birth_date" "text", "p_bio" "text", "p_website_url" "text", "p_company" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_my_profile"("p_given_name" "text", "p_family_name" "text", "p_locale" "text", "p_timezone" "text", "p_phone_number" "text", "p_avatar_url" "text", "p_birth_date" "text", "p_bio" "text", "p_website_url" "text", "p_company" "text") TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."accounts" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."accounts_memberships" TO "authenticated";
GRANT ALL ON TABLE "public"."accounts_memberships" TO "service_role";
GRANT SELECT ON TABLE "public"."accounts_memberships" TO "supabase_auth_admin";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."auth_recovery_codes" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."auth_recovery_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."auth_recovery_codes" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."documents" TO "anon";
GRANT ALL ON TABLE "public"."documents" TO "authenticated";
GRANT ALL ON TABLE "public"."documents" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."invitations" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."projects" TO "anon";
GRANT ALL ON TABLE "public"."projects" TO "authenticated";
GRANT ALL ON TABLE "public"."projects" TO "service_role";



-- memberships_history: append-only audit trail (SOC2 CC6.2, CC6.3)
CREATE TABLE IF NOT EXISTS "public"."memberships_history" (
  "id"          bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "account_id"  uuid        NOT NULL,
  "user_id"     uuid        NOT NULL,
  "role"        "public"."membership_role" NOT NULL,
  "action"      text        NOT NULL,
  "actor_id"    uuid,
  "metadata"    jsonb       DEFAULT '{}',
  "created_at"  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "memberships_history_action_check"
    CHECK ("action" IN ('joined', 'left', 'removed', 'role_upgraded', 'role_downgraded', 'invited'))
);

ALTER TABLE "public"."memberships_history" OWNER TO "postgres";

CREATE INDEX "idx_memberships_history_account"
  ON "public"."memberships_history" ("account_id", "created_at" DESC);

CREATE INDEX "idx_memberships_history_user"
  ON "public"."memberships_history" ("user_id", "created_at" DESC);

CREATE INDEX "idx_memberships_history_created_brin"
  ON "public"."memberships_history" USING BRIN ("created_at");

CREATE OR REPLACE TRIGGER "memberships_history_immutable"
  BEFORE DELETE OR UPDATE ON "public"."memberships_history"
  FOR EACH ROW EXECUTE FUNCTION "private"."deny_mutation"();

CREATE TRIGGER "trg_memberships_history"
  AFTER INSERT OR UPDATE OF "role" OR DELETE
  ON "public"."accounts_memberships"
  FOR EACH ROW
  EXECUTE FUNCTION "private"."track_membership_changes"();



CREATE TRIGGER "trg_profiles_audit"
  AFTER INSERT OR UPDATE OR DELETE ON "public"."profiles"
  FOR EACH ROW EXECUTE FUNCTION "private"."audit_log"();

CREATE TRIGGER "trg_accounts_audit"
  AFTER INSERT OR UPDATE OR DELETE ON "public"."accounts"
  FOR EACH ROW EXECUTE FUNCTION "private"."audit_log"();

CREATE TRIGGER "trg_memberships_audit"
  AFTER INSERT OR UPDATE OR DELETE ON "public"."accounts_memberships"
  FOR EACH ROW EXECUTE FUNCTION "private"."audit_log"();

CREATE TRIGGER "trg_invitations_audit"
  AFTER INSERT OR UPDATE OR DELETE ON "public"."invitations"
  FOR EACH ROW EXECUTE FUNCTION "private"."audit_log"();

CREATE TRIGGER "trg_projects_audit"
  AFTER INSERT OR UPDATE OR DELETE ON "public"."projects"
  FOR EACH ROW EXECUTE FUNCTION "private"."audit_log"();

CREATE TRIGGER "trg_documents_audit"
  AFTER INSERT OR UPDATE OR DELETE ON "public"."documents"
  FOR EACH ROW EXECUTE FUNCTION "private"."audit_log"();

ALTER TABLE "public"."memberships_history" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "memberships_history_deny_all"
  ON "public"."memberships_history" AS RESTRICTIVE
  USING (false)
  WITH CHECK (false);

REVOKE SELECT, INSERT, UPDATE, DELETE ON "public"."memberships_history" FROM "anon", "authenticated";
GRANT ALL ON TABLE "public"."memberships_history" TO "service_role";


ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT UPDATE ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT UPDATE ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT UPDATE ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "service_role";


-- ============================================================================
-- Super-admin back-office (F3-C1)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.admin_list_accounts(
  p_search              text DEFAULT NULL,
  p_limit               integer DEFAULT 20,
  p_cursor_created_at   timestamptz DEFAULT NULL,
  p_cursor_id           uuid DEFAULT NULL
)
RETURNS TABLE (
  account_id           uuid,
  name                 text,
  slug                 text,
  type                 public.account_type,
  owner_id             uuid,
  owner_email          text,
  plan_slug            text,
  subscription_status  billing.subscription_status,
  member_count         integer,
  created_at           timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM private.assert_platform_admin();

  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 100 THEN
    RAISE EXCEPTION 'invalid_limit';
  END IF;

  RETURN QUERY
  SELECT a.id, a.name, a.slug, a.type, u.id, u.email::text,
         p.slug, s.status,
         (SELECT count(*)::int FROM public.accounts_memberships m WHERE m.account_id = a.id),
         a.created_at
  FROM public.accounts a
  LEFT JOIN public.accounts_memberships om ON om.account_id = a.id AND om.role = 'owner'
  LEFT JOIN auth.users u ON u.id = om.user_id
  LEFT JOIN billing.customers c ON c.account_id = a.id
  LEFT JOIN billing.subscriptions s ON s.customer_id = c.id
    AND s.status IN ('active', 'trialing', 'past_due', 'paused')
  LEFT JOIN billing.plans p ON p.id = s.plan_id
  WHERE a.deleted_at IS NULL
    AND (p_search IS NULL OR a.name ILIKE '%' || p_search || '%' OR a.slug ILIKE '%' || p_search || '%')
    AND (
      p_cursor_created_at IS NULL
      OR a.created_at < p_cursor_created_at
      OR (a.created_at = p_cursor_created_at AND a.id < p_cursor_id)
    )
  ORDER BY a.created_at DESC, a.id DESC
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION public.admin_list_accounts IS
  'Lista de cuentas con owner + estado de suscripción para el back-office de super-admin (F3-C1, "caso call-center"). owner_id agregado en F3-C2 (necesario para impersonation). Restringido a platform_admins.';

GRANT EXECUTE ON FUNCTION public.admin_list_accounts(
  text, integer, timestamptz, uuid
) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_list_accounts(
  text, integer, timestamptz, uuid
) FROM PUBLIC;


-- ============================================================================
-- Impersonation "Ver como" (F3-C2)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.begin_impersonation_session(
  p_target_user_id uuid, p_reason text
)
RETURNS public.impersonation_sessions
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_row public.impersonation_sessions;
BEGIN
  PERFORM private.assert_platform_admin();

  IF p_reason IS NULL OR length(trim(p_reason)) < 3 THEN
    RAISE EXCEPTION 'reason_required';
  END IF;

  PERFORM private.assert_impersonation_target_valid(p_target_user_id);

  INSERT INTO public.impersonation_sessions (admin_id, target_user_id, reason, expires_at)
  VALUES ((SELECT auth.uid()), p_target_user_id, p_reason, now() + interval '30 minutes')
  RETURNING * INTO v_row;

  INSERT INTO audit.logs (actor_id, action, resource_type, resource_id, new_data)
  VALUES (
    (SELECT auth.uid()), 'impersonate_start', 'impersonation_sessions', v_row.id::text,
    jsonb_build_object('target_user_id', p_target_user_id, 'reason', p_reason)
  );

  RETURN v_row;
END;
$$;

COMMENT ON FUNCTION public.begin_impersonation_session(uuid, text) IS
  'Abre una sesión de "ver como" (F3-C2). Solo platform_admin, aal2. Falla si ya hay una sesión activa para este admin (índice único) o si el target no es válido.';

GRANT EXECUTE ON FUNCTION public.begin_impersonation_session(uuid, text) TO authenticated;
REVOKE ALL ON FUNCTION public.begin_impersonation_session(uuid, text) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.end_impersonation_session(
  p_session_id uuid, p_reason text DEFAULT 'manual'
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_admin_id uuid;
BEGIN
  -- Invocable por el propio admin (con su sesión ya restaurada) o por un
  -- contexto sin auth.uid() (service_role, para el cierre automático por
  -- expiración vía el route handler dedicado) — nunca por un tercer admin.
  SELECT admin_id INTO v_admin_id FROM public.impersonation_sessions WHERE id = p_session_id;

  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'session_not_found';
  END IF;

  IF (SELECT auth.uid()) IS NOT NULL AND (SELECT auth.uid()) <> v_admin_id THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  UPDATE public.impersonation_sessions
  SET ended_at = now(), ended_reason = p_reason
  WHERE id = p_session_id AND ended_at IS NULL;

  INSERT INTO audit.logs (actor_id, action, resource_type, resource_id, new_data)
  VALUES (
    v_admin_id, 'impersonate_end', 'impersonation_sessions', p_session_id::text,
    jsonb_build_object('reason', p_reason)
  );
END;
$$;

COMMENT ON FUNCTION public.end_impersonation_session(uuid, text) IS
  'Cierra una sesión de "ver como" (F3-C2). Solo el admin dueño, o sin auth.uid() (cierre automático por expiración). Idempotente: la segunda llamada no encuentra filas ended_at IS NULL para actualizar y no falla.';

GRANT EXECUTE ON FUNCTION public.end_impersonation_session(uuid, text) TO authenticated;
REVOKE ALL ON FUNCTION public.end_impersonation_session(uuid, text) FROM PUBLIC;








-- ============================================================================
-- Comentarios completos de tablas F1/F3 (agregados 2026-07-24, QA de usuario)
-- Espejo de supabase/migrations/20260724210000_comments_public_schema.sql
-- ============================================================================
-- Completa comentarios (COMMENT ON TABLE/COLUMN/INDEX) faltantes en el schema
-- public. Mismo criterio que 20260724200000_comments_billing_schema.sql: solo
-- metadata, ninguna estructura ni dato cambia. Cubre las tablas de fundación
-- F1 que nunca recibieron documentación in-DB, y completa los huecos de
-- columnas "genéricas" (id/created_at/updated_at) en tablas de F3 que solo
-- comentaron sus columnas de negocio.

-- ============================================================================
-- public.accounts
-- ============================================================================
COMMENT ON TABLE public.accounts IS
  'Tenant del multi-tenancy (F1). Cada usuario tiene exactamente una cuenta type=personal (id = profiles.id, creada por private.handle_new_profile); type=team se crea a pedido. Todo recurso de negocio cuelga de una account_id.';
COMMENT ON COLUMN public.accounts.id IS
  'Clave primaria UUID. Para cuentas personales, es IGUAL a profiles.id/auth.users.id por convención (no por FK formal) -- ver private.handle_new_profile().';
COMMENT ON COLUMN public.accounts.type IS
  'personal (1:1 con un usuario, sin transferencia de ownership posible) o team (multi-usuario, con owner(s)).';
COMMENT ON COLUMN public.accounts.name IS
  'Nombre mostrado de la cuenta/organización.';
COMMENT ON COLUMN public.accounts.slug IS
  'Identificador único en URLs, autogenerado a partir de name (private.slugify) con sufijo de desambiguación si hay colisión.';
COMMENT ON COLUMN public.accounts.logo_url IS
  'Path relativo dentro del bucket org-assets. NULL = sin logo (fallback a iniciales en la UI).';
COMMENT ON COLUMN public.accounts.billing_email IS
  'Email de contacto para facturación, independiente del email de auth del owner.';
COMMENT ON COLUMN public.accounts.metadata IS
  'jsonb libre para datos auxiliares que no ameritan columna propia.';
COMMENT ON COLUMN public.accounts.created_by IS
  'Usuario que creó la cuenta. ON DELETE SET NULL: la cuenta sobrevive si ese usuario se borra.';
COMMENT ON COLUMN public.accounts.created_at IS
  'Timestamp de creación (inmutable).';
COMMENT ON COLUMN public.accounts.updated_at IS
  'Timestamp de última modificación.';
COMMENT ON COLUMN public.accounts.deleted_at IS
  'NULL = activa. Soft-delete: se setea en request_account_deletion()/delete_my_account(); el hard-delete real corre 90 días después vía cron hard-delete-old-accounts.';

COMMENT ON INDEX public.accounts_slug_key IS
  'El slug es único en toda la plataforma (namespace global de URLs).';
COMMENT ON INDEX public.idx_accounts_created_by IS
  'Soporte del FK created_by.';
COMMENT ON INDEX public.idx_accounts_slug IS
  'Lookup de cuenta por slug (resolución de rutas /org/{slug}).';
COMMENT ON INDEX public.idx_accounts_type IS
  'Soporte de queries que filtran por type (ej. cron hard-delete-old-accounts, listados de admin).';

-- ============================================================================
-- public.accounts_memberships
-- ============================================================================
COMMENT ON TABLE public.accounts_memberships IS
  'Relación N:M usuario-cuenta con rol (F1). Es la tabla de RBAC del multi-tenancy: RLS y RPCs de negocio verifican membership+role acá, no en accounts directo.';
COMMENT ON COLUMN public.accounts_memberships.account_id IS
  'Cuenta de la membership. Parte de la PK compuesta (account_id, user_id).';
COMMENT ON COLUMN public.accounts_memberships.user_id IS
  'Usuario miembro. Parte de la PK compuesta (account_id, user_id).';
COMMENT ON COLUMN public.accounts_memberships.role IS
  'owner, admin o member. El trigger enforce_single_owner_per_account impide dejar una cuenta type=team sin owner.';
COMMENT ON COLUMN public.accounts_memberships.invited_by IS
  'Usuario que invitó a este miembro. NULL si no vino de una invitación (ej. el creador de la cuenta).';
COMMENT ON COLUMN public.accounts_memberships.created_at IS
  'Timestamp en que el usuario se unió a la cuenta (inmutable).';
COMMENT ON COLUMN public.accounts_memberships.updated_at IS
  'Timestamp de última modificación (ej. cambio de rol).';

COMMENT ON INDEX public.idx_memberships_invited_by IS
  'Soporte del FK invited_by.';
COMMENT ON INDEX public.idx_memberships_user_id IS
  'Soporte de "cuentas a las que pertenece este usuario" (ej. get_my_accounts()).';

-- ============================================================================
-- public.profiles
-- ============================================================================
COMMENT ON TABLE public.profiles IS
  'Perfil de usuario 1:1 con auth.users (F1) -- separa datos editables por el propio usuario de la tabla auth.users, que no es accesible directo por authenticated.';
COMMENT ON COLUMN public.profiles.id IS
  'Clave primaria, igual a auth.users.id (FK ON DELETE CASCADE).';
COMMENT ON COLUMN public.profiles.given_name IS
  'Nombre de pila.';
COMMENT ON COLUMN public.profiles.family_name IS
  'Apellido.';
COMMENT ON COLUMN public.profiles.display_name IS
  'Columna generada (given_name || '' '' || family_name, con fallback a cualquiera de los dos) -- no se escribe directo.';
COMMENT ON COLUMN public.profiles.avatar_url IS
  'Path relativo dentro del bucket avatars. NULL = sin avatar (fallback a iniciales).';
COMMENT ON COLUMN public.profiles.locale IS
  'Idioma preferido (en/es/pt/fr). Valida contra src/i18n/routing-config.ts vía trigger.';
COMMENT ON COLUMN public.profiles.timezone IS
  'Zona horaria IANA (ej. America/Santiago). Valida contra pg_timezone_names vía trigger.';
COMMENT ON COLUMN public.profiles.phone_number IS
  'Teléfono en formato E.164, opcional.';
COMMENT ON COLUMN public.profiles.onboarding_completed IS
  'false = el edge gate redirige al wizard de /dashboard/onboarding (F3-C4). Claim espejado en el JWT vía custom_access_token_hook.';
COMMENT ON COLUMN public.profiles.metadata IS
  'jsonb libre para datos auxiliares. Excluido explícitamente de export_my_data() (puede contener datos internos, no solo del usuario).';
COMMENT ON COLUMN public.profiles.created_at IS
  'Timestamp de creación (inmutable).';
COMMENT ON COLUMN public.profiles.updated_at IS
  'Timestamp de última modificación.';
COMMENT ON COLUMN public.profiles.deleted_at IS
  'NULL = activo. Soft-delete GDPR, ver accounts.deleted_at (mismo ciclo de vida de 90 días).';
COMMENT ON COLUMN public.profiles.birth_date IS
  'Fecha de nacimiento, opcional. Campo clearable: '''' (string vacío) limpia el valor, NULL lo deja sin cambios en update_my_profile().';
COMMENT ON COLUMN public.profiles.bio IS
  'Biografía corta, máx 500 caracteres. Campo clearable, ver birth_date.';
COMMENT ON COLUMN public.profiles.website_url IS
  'URL del sitio personal, máx 255 caracteres. Campo clearable, ver birth_date.';
COMMENT ON COLUMN public.profiles.company IS
  'Empresa/organización declarada por el usuario, máx 100 caracteres. Campo clearable, ver birth_date.';
COMMENT ON COLUMN public.profiles.pending_deletion IS
  'true = marcado para hard-delete GDPR (Art. 17). Consumido por el cron purge-deleted-identities (F3-C3) a los 90 días de deleted_at.';

COMMENT ON INDEX public.idx_profiles_pending_deletion IS
  'Soporte del cron purge-deleted-identities: filtra perfiles pendientes de purga por fecha.';

-- ============================================================================
-- public.projects
-- ============================================================================
COMMENT ON TABLE public.projects IS
  'Recurso de ejemplo del vertical de demo (F1) -- ilustra el patrón account_id + RLS + soft-delete que cualquier recurso de negocio real debería seguir.';
COMMENT ON COLUMN public.projects.id IS
  'Clave primaria UUID generada automáticamente.';
COMMENT ON COLUMN public.projects.account_id IS
  'Cuenta dueña del proyecto.';
COMMENT ON COLUMN public.projects.name IS
  'Nombre del proyecto.';
COMMENT ON COLUMN public.projects.slug IS
  'Identificador único dentro de la cuenta (UNIQUE junto con account_id), usado en URLs.';
COMMENT ON COLUMN public.projects.description IS
  'Descripción libre, opcional.';
COMMENT ON COLUMN public.projects.status IS
  'Estado del ciclo de vida del proyecto (ej. active/archived).';
COMMENT ON COLUMN public.projects.color IS
  'Color de acento para diferenciarlo visualmente en la UI (hex o token), opcional.';
COMMENT ON COLUMN public.projects.metadata IS
  'jsonb libre para datos auxiliares que no ameritan columna propia.';
COMMENT ON COLUMN public.projects.created_by IS
  'Usuario que creó el proyecto. ON DELETE SET NULL: el proyecto sobrevive si ese usuario se borra.';
COMMENT ON COLUMN public.projects.created_at IS
  'Timestamp de creación (inmutable).';
COMMENT ON COLUMN public.projects.updated_at IS
  'Timestamp de última modificación.';
COMMENT ON COLUMN public.projects.deleted_at IS
  'NULL = activo. Soft-delete del recurso.';
COMMENT ON COLUMN public.projects.type IS
  'Tipo de proyecto (ej. docs) -- distingue variantes del recurso de ejemplo.';

COMMENT ON INDEX public.idx_projects_account_id IS
  'Soporte del FK account_id: listar proyectos de una cuenta.';
COMMENT ON INDEX public.idx_projects_created_by IS
  'Soporte del FK created_by.';
COMMENT ON INDEX public.idx_projects_status IS
  'Soporte de queries filtrando por status (ej. solo proyectos activos).';
COMMENT ON INDEX public.projects_account_id_slug_key IS
  'El slug del proyecto es único dentro de su cuenta (no globalmente).';

-- ============================================================================
-- public.documents
-- ============================================================================
COMMENT ON TABLE public.documents IS
  'Recurso de ejemplo del vertical de demo (F1), hijo de projects -- mismo propósito ilustrativo que projects.';
COMMENT ON COLUMN public.documents.id IS
  'Clave primaria UUID generada automáticamente.';
COMMENT ON COLUMN public.documents.project_id IS
  'Proyecto dueño del documento.';
COMMENT ON COLUMN public.documents.account_id IS
  'Cuenta dueña del documento (denormalizado desde project_id para simplificar RLS sin join).';
COMMENT ON COLUMN public.documents.name IS
  'Nombre del documento.';
COMMENT ON COLUMN public.documents.description IS
  'Descripción libre, opcional.';
COMMENT ON COLUMN public.documents.content IS
  'Contenido del documento. Límite de 10MB (CHECK documents_content_max_size).';
COMMENT ON COLUMN public.documents.created_by IS
  'Usuario que creó el documento. ON DELETE SET NULL: el documento sobrevive si ese usuario se borra.';
COMMENT ON COLUMN public.documents.created_at IS
  'Timestamp de creación (inmutable).';
COMMENT ON COLUMN public.documents.updated_at IS
  'Timestamp de última modificación.';
COMMENT ON COLUMN public.documents.deleted_at IS
  'NULL = activo. Soft-delete del recurso.';

COMMENT ON INDEX public.idx_documents_account_id IS
  'Soporte del FK account_id (y de RLS, que filtra por cuenta sin pasar por project_id).';
COMMENT ON INDEX public.idx_documents_created_by IS
  'Soporte del FK created_by.';
COMMENT ON INDEX public.idx_documents_project_id IS
  'Soporte del FK project_id: listar documentos de un proyecto.';

-- ============================================================================
-- public.invitations
-- ============================================================================
COMMENT ON TABLE public.invitations IS
  'Invitaciones pendientes a una cuenta type=team (F1). token_hash es el único secreto compartido con el invitado -- el token en claro nunca se persiste.';
COMMENT ON COLUMN public.invitations.id IS
  'Clave primaria UUID generada automáticamente.';
COMMENT ON COLUMN public.invitations.account_id IS
  'Cuenta a la que se invita.';
COMMENT ON COLUMN public.invitations.email IS
  'Email del invitado. No requiere que ya tenga cuenta en la plataforma.';
COMMENT ON COLUMN public.invitations.role IS
  'Rol que tendrá el invitado al aceptar (member por defecto).';
COMMENT ON COLUMN public.invitations.token_hash IS
  'Hash del token de invitación enviado por email. El token en claro solo existe en el link, nunca en DB.';
COMMENT ON COLUMN public.invitations.status IS
  'pending/accepted/expired/revoked -- ciclo de vida de la invitación.';
COMMENT ON COLUMN public.invitations.invited_by IS
  'Usuario que envió la invitación. ON DELETE SET NULL: la invitación sobrevive si ese usuario se borra.';
COMMENT ON COLUMN public.invitations.expires_at IS
  'Vencimiento de la invitación, 7 días desde su creación por defecto.';
COMMENT ON COLUMN public.invitations.created_at IS
  'Timestamp de creación (inmutable).';
COMMENT ON COLUMN public.invitations.updated_at IS
  'Timestamp de última modificación (ej. al aceptar/expirar).';

COMMENT ON INDEX public.idx_invitations_account_id IS
  'Soporte del FK account_id: listar invitaciones de una cuenta.';
COMMENT ON INDEX public.idx_invitations_invited_by IS
  'Soporte del FK invited_by.';
COMMENT ON INDEX public.idx_invitations_pending_unique IS
  'Evita invitaciones duplicadas: un mismo email no puede tener más de una invitación pending activa por cuenta.';
COMMENT ON INDEX public.idx_invitations_token_hash_pending IS
  'Lookup rápido del token al aceptar una invitación, acotado a las que siguen pending.';

-- ============================================================================
-- public.memberships_history
-- ============================================================================
COMMENT ON TABLE public.memberships_history IS
  'Log append-only de cambios de membership (F1, SOC2 CC6.2/CC6.3) -- auditoría de quién entró/salió/cambió de rol en una cuenta, independiente de audit.logs.';
COMMENT ON COLUMN public.memberships_history.id IS
  'Identity autoincremental (cursor de orden interno).';
COMMENT ON COLUMN public.memberships_history.account_id IS
  'Cuenta donde ocurrió el cambio.';
COMMENT ON COLUMN public.memberships_history.user_id IS
  'Usuario afectado por el cambio (el miembro, no quien lo ejecutó).';
COMMENT ON COLUMN public.memberships_history.role IS
  'Rol del usuario en el momento del evento.';
COMMENT ON COLUMN public.memberships_history.action IS
  'Tipo de evento: joined/left/removed/role_upgraded/role_downgraded/invited.';
COMMENT ON COLUMN public.memberships_history.actor_id IS
  'Usuario que ejecutó la acción (puede ser distinto de user_id, ej. un admin removiendo a otro miembro). NULL si fue automático.';
COMMENT ON COLUMN public.memberships_history.metadata IS
  'jsonb libre para contexto adicional del evento.';
COMMENT ON COLUMN public.memberships_history.created_at IS
  'Timestamp del evento (inmutable, append-only).';

COMMENT ON INDEX public.idx_memberships_history_account IS
  'Soporte de "historial de membership de una cuenta", ordenado por fecha.';
COMMENT ON INDEX public.idx_memberships_history_user IS
  'Soporte de "historial de membership de un usuario", ordenado por fecha.';
COMMENT ON INDEX public.idx_memberships_history_created_brin IS
  'Índice BRIN: created_at crece de forma monótona en una tabla append-only, más liviano que un B-tree para rangos de fecha.';

-- ============================================================================
-- public.auth_recovery_codes
-- ============================================================================
COMMENT ON TABLE public.auth_recovery_codes IS
  'Códigos de recuperación de un solo uso para MFA (F1) -- se generan de a 10 al habilitar 2FA, cada uno se consume una vez si el usuario pierde su dispositivo TOTP.';
COMMENT ON COLUMN public.auth_recovery_codes.id IS
  'Clave primaria UUID generada automáticamente.';
COMMENT ON COLUMN public.auth_recovery_codes.user_id IS
  'Usuario dueño del código.';
COMMENT ON COLUMN public.auth_recovery_codes.code_hash IS
  'Hash del código. El código en claro solo se muestra una vez, al generarlo.';
COMMENT ON COLUMN public.auth_recovery_codes.used_at IS
  'NULL = código disponible. Se setea al consumirlo -- cada código es de un solo uso.';
COMMENT ON COLUMN public.auth_recovery_codes.created_at IS
  'Timestamp de generación (inmutable). generate_recovery_codes() borra el lote anterior antes de crear uno nuevo.';

COMMENT ON INDEX public.idx_recovery_codes_user_id IS
  'Soporte del FK user_id: contar/listar los códigos de un usuario.';

-- ============================================================================
-- Huecos de columnas genéricas en tablas de F3 (ya tenían comentarios de
-- negocio, faltaban las columnas "genéricas" id/created_at/etc).
-- ============================================================================

COMMENT ON COLUMN public.api_keys.id IS
  'Clave primaria UUID generada automáticamente.';
COMMENT ON COLUMN public.api_keys.account_id IS
  'Cuenta dueña de la clave.';
COMMENT ON COLUMN public.api_keys.created_by IS
  'Usuario que creó la clave. ON DELETE SET NULL: la clave sobrevive si ese usuario se borra.';
COMMENT ON COLUMN public.api_keys.created_at IS
  'Timestamp de creación (inmutable).';

COMMENT ON COLUMN public.impersonation_sessions.id IS
  'Clave primaria UUID generada automáticamente.';
COMMENT ON COLUMN public.impersonation_sessions.admin_id IS
  'Platform admin que inicia la impersonation.';
COMMENT ON COLUMN public.impersonation_sessions.target_user_id IS
  'Usuario impersonado ("ver como").';
COMMENT ON COLUMN public.impersonation_sessions.reason IS
  'Motivo de la impersonation, ingresado por el admin (mínimo 3 caracteres), queda en audit.logs.';
COMMENT ON COLUMN public.impersonation_sessions.started_at IS
  'Timestamp de inicio de la sesión (inmutable).';
COMMENT ON COLUMN public.impersonation_sessions.expires_at IS
  'Cap duro de 30 minutos desde started_at, chequeado en el edge contra el claim impersonation_expires_at.';
COMMENT ON COLUMN public.impersonation_sessions.ended_at IS
  'NULL = sesión activa. Se setea al salir (manual, expiración, o cierre forzado).';
COMMENT ON COLUMN public.impersonation_sessions.ended_reason IS
  'Cómo terminó: manual/expired/etc.';
COMMENT ON COLUMN public.impersonation_sessions.ip_address IS
  'IP del admin al iniciar la sesión, para auditoría.';
COMMENT ON COLUMN public.impersonation_sessions.user_agent IS
  'User-Agent del admin al iniciar la sesión, para auditoría.';

COMMENT ON COLUMN public.platform_admins.user_id IS
  'Usuario en la whitelist de super-admins. PK y FK a auth.users (ON DELETE CASCADE).';
COMMENT ON COLUMN public.platform_admins.created_at IS
  'Timestamp del alta en la whitelist (inmutable).';

COMMENT ON COLUMN public.webhook_endpoints.id IS
  'Clave primaria UUID generada automáticamente.';
COMMENT ON COLUMN public.webhook_endpoints.account_id IS
  'Cuenta dueña del endpoint.';
COMMENT ON COLUMN public.webhook_endpoints.description IS
  'Descripción libre del endpoint, opcional (máx 200 caracteres).';
COMMENT ON COLUMN public.webhook_endpoints.enabled IS
  'false = el endpoint no recibe entregas nuevas (pausado), sin borrarlo.';
COMMENT ON COLUMN public.webhook_endpoints.created_at IS
  'Timestamp de creación (inmutable).';
COMMENT ON COLUMN public.webhook_endpoints.updated_at IS
  'Timestamp de última modificación.';

COMMENT ON COLUMN public.webhook_deliveries.id IS
  'Clave primaria UUID generada automáticamente.';
COMMENT ON COLUMN public.webhook_deliveries.endpoint_id IS
  'Endpoint destino de esta entrega.';
COMMENT ON COLUMN public.webhook_deliveries.account_id IS
  'Cuenta dueña de la entrega (denormalizado desde endpoint_id para simplificar RLS).';
COMMENT ON COLUMN public.webhook_deliveries.event_type IS
  'Evento que originó esta entrega, subset de private.webhook_event_catalog().';
COMMENT ON COLUMN public.webhook_deliveries.status IS
  'pending/success/failed/exhausted -- ver comentario de tabla para el ciclo de reintentos.';
COMMENT ON COLUMN public.webhook_deliveries.attempts IS
  'Cantidad de intentos de entrega realizados hasta ahora.';
COMMENT ON COLUMN public.webhook_deliveries.next_retry_at IS
  'Próximo intento programado (backoff 1m/5m/30m). NULL si no hay reintento pendiente.';
COMMENT ON COLUMN public.webhook_deliveries.last_status_code IS
  'Código HTTP de la última respuesta recibida del endpoint destino.';
COMMENT ON COLUMN public.webhook_deliveries.last_error IS
  'Mensaje de error del último intento fallido, para debug.';
COMMENT ON COLUMN public.webhook_deliveries.created_at IS
  'Timestamp de creación de la entrega (inmutable).';
COMMENT ON COLUMN public.webhook_deliveries.delivered_at IS
  'Timestamp en que se confirmó la entrega exitosa. NULL si todavía no se entregó.';

-- Columnas genéricas faltantes en las tablas del vertical de ejemplo "robot"
-- (F1, ya tenían comentarios de negocio en sus columnas específicas).
COMMENT ON COLUMN public.robot_routines.id IS
  'Clave primaria UUID generada automáticamente.';
COMMENT ON COLUMN public.robot_routines.account_id IS
  'Cuenta dueña de la rutina.';
COMMENT ON COLUMN public.robot_routines.description IS
  'Descripción libre de la rutina, opcional (distinta de message, que es lo que el robot dice en voz alta).';
COMMENT ON COLUMN public.robot_routines.created_at IS
  'Timestamp de creación (inmutable).';
COMMENT ON COLUMN public.robot_routines.updated_at IS
  'Timestamp de última modificación.';

COMMENT ON COLUMN public.robot_contacts.id IS
  'Clave primaria UUID generada automáticamente.';
COMMENT ON COLUMN public.robot_contacts.account_id IS
  'Cuenta dueña del contacto.';
COMMENT ON COLUMN public.robot_contacts.name IS
  'Nombre del contacto.';
COMMENT ON COLUMN public.robot_contacts.relationship IS
  'Relación con el usuario (ej. Hijo, Médico), opcional.';
COMMENT ON COLUMN public.robot_contacts.phone IS
  'Teléfono del contacto.';
COMMENT ON COLUMN public.robot_contacts.created_at IS
  'Timestamp de creación (inmutable).';
COMMENT ON COLUMN public.robot_contacts.updated_at IS
  'Timestamp de última modificación.';

COMMENT ON COLUMN public.robot_memories.id IS
  'Clave primaria UUID generada automáticamente.';
COMMENT ON COLUMN public.robot_memories.account_id IS
  'Cuenta dueña del recuerdo.';
COMMENT ON COLUMN public.robot_memories.name IS
  'Nombre propio de la entidad (ej. el nombre del nieto, la mascota).';
COMMENT ON COLUMN public.robot_memories.created_at IS
  'Timestamp de creación (inmutable).';
COMMENT ON COLUMN public.robot_memories.updated_at IS
  'Timestamp de última modificación.';

-- ============================================================================
-- Índices sin comentario en flags.sql (tablas ya documentadas por completo,
-- solo faltaban estos dos)
-- ============================================================================
COMMENT ON INDEX public.feature_flags_name_key IS
  'El slug del flag es único en todo el catálogo.';
COMMENT ON INDEX public.feature_flag_overrides_flag_account_key IS
  'Un mismo flag tiene como máximo un override por cuenta.';
COMMENT ON INDEX public.idx_feature_flag_overrides_account_flag IS
  'Soporte de private.resolve_flag(): lookup de overrides por cuenta+flag.';

-- ============================================================================
-- Índices restantes sin comentario en tablas ya documentadas (F2/F3) --
-- ninguna de estas tablas tenía sus índices cubiertos todavía.
-- ============================================================================

COMMENT ON INDEX public.idx_announcements_created_at IS
  'Historial ordenado por fecha desc, para la carga inicial de la campana.';
COMMENT ON INDEX public.idx_announcements_created_by IS
  'Soporte del FK created_by.';

COMMENT ON INDEX public.api_keys_key_hash_key IS
  'Lookup O(1) del hash de la clave en verify_api_key() -- es el índice crítico de performance de autenticación por API key.';
COMMENT ON INDEX public.idx_api_keys_account_created IS
  'Soporte de "listar claves de una cuenta" ordenado por fecha.';
COMMENT ON INDEX public.idx_api_keys_created_by IS
  'Soporte del FK created_by.';

COMMENT ON INDEX public.idx_impersonation_active_target IS
  'Soporte de "¿este usuario está siendo impersonado ahora mismo?" -- parcial, solo sesiones sin ended_at.';
COMMENT ON INDEX public.idx_impersonation_one_active_per_admin IS
  'UNIQUE parcial: un admin no puede tener más de una sesión de impersonation activa a la vez.';

COMMENT ON INDEX public.idx_notifications_user_created IS
  'Soporte del listado principal de la campana: notificaciones de un usuario ordenadas por fecha.';
COMMENT ON INDEX public.idx_notifications_user_unread IS
  'Índice parcial (solo read_at IS NULL) para el conteo rápido del badge de no-leídas.';

COMMENT ON INDEX public.idx_robot_contacts_account_id IS
  'Soporte del FK account_id: listar contactos de una cuenta.';
COMMENT ON INDEX public.idx_robot_contacts_priority IS
  'Soporte de ordenar los contactos por prioridad de llamada en emergencia.';
COMMENT ON INDEX public.idx_robot_memories_account_id IS
  'Soporte del FK account_id: listar recuerdos de una cuenta.';
COMMENT ON INDEX public.idx_robot_memories_entity IS
  'Soporte de filtrar recuerdos por tipo de entidad (ej. todos los de tipo Nieto).';
COMMENT ON INDEX public.idx_robot_routines_account_id IS
  'Soporte del FK account_id: listar rutinas de una cuenta.';

COMMENT ON INDEX public.idx_webhook_deliveries_account IS
  'Soporte de "listar entregas de una cuenta" ordenado por fecha.';
COMMENT ON INDEX public.idx_webhook_deliveries_endpoint IS
  'Soporte de "listar entregas de un endpoint" ordenado por fecha.';
COMMENT ON INDEX public.idx_webhook_deliveries_open IS
  'Índice parcial (solo status pending/failed) para que el worker de reintentos no escanee entregas ya cerradas.';
COMMENT ON INDEX public.idx_webhook_endpoints_account IS
  'Soporte de "listar endpoints de una cuenta" ordenado por fecha.';
