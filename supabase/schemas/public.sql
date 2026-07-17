


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


CREATE OR REPLACE FUNCTION "public"."accept_invitation"("p_token" "text") RETURNS "uuid"
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

  RETURN v_invitation.account_id;
END;
$$;


ALTER FUNCTION "public"."accept_invitation"("p_token" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."accept_invitation"("p_token" "text") IS 'Accepts an invitation by token and creates the membership. SECURITY DEFINER: mutates invitations+memberships (direct write revoked). Uses auth.uid().';



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
  v_claims     jsonb := event -> 'claims';
  v_app_meta   jsonb := COALESCE(v_claims -> 'app_metadata', '{}'::jsonb);
BEGIN
  -- Pick the user's default membership (most recently created).
  SELECT m.account_id, m.role::text
  INTO v_account_id, v_role
  FROM public.accounts_memberships m
  WHERE m.user_id = v_user_id
  ORDER BY m.created_at DESC
  LIMIT 1;

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

  v_claims := jsonb_set(v_claims, '{app_metadata}', v_app_meta, true);
  RETURN jsonb_set(event, '{claims}', v_claims, true);
END;
$$;


ALTER FUNCTION "public"."custom_access_token_hook"("event" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."custom_access_token_hook"("event" "jsonb") IS 'Supabase Auth custom_access_token hook. Writes app_metadata.account_id + app_metadata.role from the user''s default membership, and app_metadata.mfa_enrolled (true when a verified MFA factor exists) so the edge proxy can enforce aal2 for MFA users. SECURITY DEFINER.';



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
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
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
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
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
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
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
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT c.account_id
  FROM billing.subscriptions s
  JOIN billing.customers c ON c.id = s.customer_id
  WHERE s.external_subscription_id = p_external_subscription_id
  LIMIT 1;
$$;


ALTER FUNCTION "public"."get_account_id_by_external_subscription"("p_external_subscription_id" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_account_id_by_external_subscription"("p_external_subscription_id" "text") IS 'Resuelve accountId a partir del id de suscripción del proveedor (F2-2A-providers, cancelación diferida de MercadoPago). NULL si no hay match.';


CREATE OR REPLACE FUNCTION "public"."broadcast_alert_email"("p_subject" "text", "p_body" "text") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_count integer := 0;
  v_row record;
BEGIN
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


COMMENT ON FUNCTION "public"."broadcast_alert_email"("p_subject" "text", "p_body" "text") IS 'Encola un email de alerta en pgmq.email_queue para cada owner de cuenta (F2-2F). Sin gate de admin todavía — F3 agrega platform_admin real.';


CREATE OR REPLACE FUNCTION "public"."list_account_invoices"("p_account_id" "uuid", "p_limit" integer DEFAULT 10, "p_cursor_created_at" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_cursor_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("id" "uuid", "number" "text", "status" "billing"."invoice_status", "currency" character, "total" integer, "amount_paid" integer, "hosted_url" "text", "pdf_url" "text", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
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


CREATE OR REPLACE FUNCTION "public"."get_my_accounts"() RETURNS TABLE("account_id" "uuid", "name" "text", "slug" "text", "type" "public"."account_type", "logo_url" "text", "role" "public"."membership_role")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT a.id, a.name, a.slug, a.type, a.logo_url, m.role
  FROM public.accounts a
  JOIN public.accounts_memberships m ON m.account_id = a.id
  WHERE m.user_id = (SELECT auth.uid())
    AND a.deleted_at IS NULL;
$$;


ALTER FUNCTION "public"."get_my_accounts"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_my_accounts"() IS 'Returns accounts the current user belongs to. SECURITY DEFINER: reads accounts_memberships (direct SELECT revoked). Uses auth.uid() internally.';


CREATE OR REPLACE FUNCTION "public"."set_account_logo"("p_account_id" "uuid", "p_path" "text") RETURNS void
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

COMMENT ON FUNCTION "public"."set_account_logo"("p_account_id" "uuid", "p_path" "text") IS 'Setea (o quita, con p_path NULL) el logo_url de la cuenta. Owner/admin únicamente vía private.assert_account_admin (F3-3H-2).';



CREATE OR REPLACE FUNCTION "public"."invite_members"("p_account_id" "uuid", "p_emails" "text"[], "p_role" "public"."membership_role" DEFAULT 'member'::"public"."membership_role") RETURNS TABLE("email" "text", "token" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_caller_role public.membership_role;
  v_email       text;
  v_norm_email  text;
  v_raw_token   text;
  v_token_hash  text;
BEGIN
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


COMMENT ON FUNCTION "public"."invite_members"("p_account_id" "uuid", "p_emails" "text"[], "p_role" "public"."membership_role") IS 'Crea invitaciones y retorna (email, token) pares. El token en texto plano se retorna UNA SOLA VEZ para enviarse por email. Solo el hash se almacena en BD. Rechaza si members actuales + invitados excede seats_max del plan (F3-3H-1).';



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
    CONSTRAINT "profiles_bio_check" CHECK (("char_length"("bio") <= 500)),
    CONSTRAINT "profiles_company_check" CHECK (("char_length"("company") <= 100)),
    CONSTRAINT "profiles_website_url_check" CHECK (("char_length"("website_url") <= 255))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."profiles"."birth_date" IS 'OIDC birthdate claim — stored as date, not exposed in JWT.';



COMMENT ON COLUMN "public"."profiles"."bio" IS 'Short user bio, max 500 chars.';



COMMENT ON COLUMN "public"."profiles"."website_url" IS 'Personal or professional website URL.';



COMMENT ON COLUMN "public"."profiles"."company" IS 'Company or organization name.';



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
    "deleted_at" timestamp with time zone
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


CREATE POLICY "admins_can_create_documents" ON "public"."documents" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "private"."get_user_role"("documents"."account_id", ( SELECT "auth"."uid"() AS "uid")) AS "get_user_role") = ANY (ARRAY['owner'::"public"."membership_role", 'admin'::"public"."membership_role"])));



CREATE POLICY "admins_can_create_projects" ON "public"."projects" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "private"."get_user_role"("projects"."account_id", ( SELECT "auth"."uid"() AS "uid")) AS "get_user_role") = ANY (ARRAY['owner'::"public"."membership_role", 'admin'::"public"."membership_role"])));



CREATE POLICY "admins_can_update_documents" ON "public"."documents" FOR UPDATE TO "authenticated" USING ((( SELECT "private"."get_user_role"("documents"."account_id", ( SELECT "auth"."uid"() AS "uid")) AS "get_user_role") = ANY (ARRAY['owner'::"public"."membership_role", 'admin'::"public"."membership_role"]))) WITH CHECK ((( SELECT "private"."get_user_role"("documents"."account_id", ( SELECT "auth"."uid"() AS "uid")) AS "get_user_role") = ANY (ARRAY['owner'::"public"."membership_role", 'admin'::"public"."membership_role"])));



CREATE POLICY "admins_can_update_projects" ON "public"."projects" FOR UPDATE TO "authenticated" USING ((( SELECT "private"."get_user_role"("projects"."account_id", ( SELECT "auth"."uid"() AS "uid")) AS "get_user_role") = ANY (ARRAY['owner'::"public"."membership_role", 'admin'::"public"."membership_role"]))) WITH CHECK ((( SELECT "private"."get_user_role"("projects"."account_id", ( SELECT "auth"."uid"() AS "uid")) AS "get_user_role") = ANY (ARRAY['owner'::"public"."membership_role", 'admin'::"public"."membership_role"])));



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







