


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


CREATE SCHEMA IF NOT EXISTS "private";


ALTER SCHEMA "private" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."apply_updated_at_trigger"("table_name" "regclass") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  EXECUTE format(
    'CREATE TRIGGER set_updated_at BEFORE UPDATE ON %s
     FOR EACH ROW EXECUTE FUNCTION private.set_updated_at()',
    table_name
  );
END;
$$;


ALTER FUNCTION "private"."apply_updated_at_trigger"("table_name" "regclass") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."deny_mutation"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  RAISE EXCEPTION 'Mutations not allowed on append-only table %', TG_TABLE_NAME;
END;
$$;


ALTER FUNCTION "private"."deny_mutation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."get_user_role"("p_account_id" "uuid", "p_user_id" "uuid") RETURNS "public"."membership_role"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT role FROM public.accounts_memberships
  WHERE account_id = p_account_id AND user_id = p_user_id;
$$;


ALTER FUNCTION "private"."get_user_role"("p_account_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."handle_new_profile"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_account_id uuid;
  v_base_slug text;
  v_slug text;
  v_attempt int := 0;
BEGIN
  RAISE LOG 'handle_new_profile: creating personal account for user_id=%', NEW.id;

  v_base_slug := private.slugify(COALESCE(NEW.display_name, NEW.id::text));
  v_slug := v_base_slug;

  -- Retry up to 5 times with a short uid suffix if the slug is taken.
  WHILE EXISTS (SELECT 1 FROM public.accounts WHERE slug = v_slug) LOOP
    v_attempt := v_attempt + 1;
    IF v_attempt > 5 THEN
      -- Final fallback: fully qualify with the user UUID.
      v_slug := v_base_slug || '-' || replace(NEW.id::text, '-', '');
      EXIT;
    END IF;
    v_slug := v_base_slug || '-' || substring(replace(NEW.id::text, '-', '') FROM 1 FOR 6 + v_attempt);
  END LOOP;

  INSERT INTO public.accounts (id, type, name, slug, created_by)
  VALUES (
    NEW.id,
    'personal',
    COALESCE(NEW.display_name, 'Personal'),
    v_slug,
    NEW.id
  )
  RETURNING id INTO v_account_id;

  INSERT INTO public.accounts_memberships (account_id, user_id, role)
  VALUES (v_account_id, NEW.id, 'owner');

  RETURN NEW;
END;
$$;


ALTER FUNCTION "private"."handle_new_profile"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  RAISE LOG 'handle_new_user: creating profile for user_id=%', NEW.id;

  INSERT INTO public.profiles (id, given_name, family_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'given_name',
    NEW.raw_user_meta_data ->> 'family_name',
    NEW.raw_user_meta_data ->> 'avatar_url'
  );

  RETURN NEW;
END;
$$;


ALTER FUNCTION "private"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table', 'partitioned table')
  LOOP
    IF cmd.schema_name IS NOT NULL
       AND cmd.schema_name IN ('public')
       AND cmd.schema_name NOT IN ('pg_catalog', 'information_schema')
       AND cmd.schema_name NOT LIKE 'pg_toast%'
       AND cmd.schema_name NOT LIKE 'pg_temp%'
    THEN
      BEGIN
        EXECUTE format(
          'ALTER TABLE IF EXISTS %s ENABLE ROW LEVEL SECURITY',
          cmd.object_identity
        );
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
    ELSE
      RAISE LOG 'rls_auto_enable: skip % (schema: %)',
        cmd.object_identity, cmd.schema_name;
    END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "private"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "private"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."slugify"("text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE STRICT
    SET "search_path" TO ''
    AS $_$
  SELECT lower(
    regexp_replace(
      regexp_replace($1, '[^a-zA-Z0-9\s-]', '', 'g'),
      '\s+', '-', 'g'
    )
  );
$_$;


ALTER FUNCTION "private"."slugify"("text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."user_is_member"("p_account_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.accounts_memberships
    WHERE account_id = p_account_id AND user_id = p_user_id
  );
$$;


ALTER FUNCTION "private"."user_is_member"("p_account_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."validate_profile_locale_timezone"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  -- Validar locale: formato BCP47 básico (es, en, es-CL, en-US, etc.)
  IF NEW.locale IS NOT NULL
     AND NEW.locale !~ '^[a-z]{2,3}(-[A-Z]{2})?$' THEN
    RAISE EXCEPTION 'locale inválido: %. Formato esperado: es, en, es-CL, en-US', NEW.locale
      USING ERRCODE = 'check_violation';
  END IF;

  -- Validar timezone: debe existir en la base de datos de zonas horarias de PostgreSQL
  IF NEW.timezone IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_timezone_names WHERE name = NEW.timezone
     ) THEN
    RAISE EXCEPTION 'timezone inválido: %. Usar nombres IANA (ej: America/Santiago, Europe/Madrid)', NEW.timezone
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "private"."validate_profile_locale_timezone"() OWNER TO "postgres";

REVOKE ALL ON FUNCTION "private"."validate_profile_locale_timezone"() FROM PUBLIC;


CREATE OR REPLACE FUNCTION "private"."enforce_single_owner_per_account"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND OLD.role = 'owner'
     AND NEW.role != 'owner' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.accounts_memberships
      WHERE account_id = NEW.account_id
        AND role = 'owner'
        AND user_id != NEW.user_id
    ) THEN
      RAISE EXCEPTION 'No se puede degradar al único owner de la cuenta %', NEW.account_id
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' AND OLD.role = 'owner' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.accounts_memberships
      WHERE account_id = OLD.account_id
        AND role = 'owner'
        AND user_id != OLD.user_id
    ) THEN
      RAISE EXCEPTION 'No se puede eliminar al único owner de la cuenta %', OLD.account_id
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "private"."enforce_single_owner_per_account"() OWNER TO "postgres";

REVOKE ALL ON FUNCTION "private"."enforce_single_owner_per_account"() FROM PUBLIC;


CREATE OR REPLACE FUNCTION "private"."track_membership_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_action text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'joined';
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'removed';
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.role = NEW.role THEN
      RETURN NEW;
    END IF;
    v_action := CASE
      WHEN OLD.role = 'viewer'  AND NEW.role IN ('member','admin','owner') THEN 'role_upgraded'
      WHEN OLD.role = 'member'  AND NEW.role IN ('admin','owner')          THEN 'role_upgraded'
      WHEN OLD.role = 'admin'   AND NEW.role = 'owner'                    THEN 'role_upgraded'
      ELSE 'role_downgraded'
    END;
  END IF;

  INSERT INTO public.memberships_history (
    account_id, user_id, role, action, actor_id, metadata
  ) VALUES (
    COALESCE(NEW.account_id, OLD.account_id),
    COALESCE(NEW.user_id,    OLD.user_id),
    COALESCE(NEW.role,       OLD.role),
    v_action,
    auth.uid(),
    jsonb_build_object(
      'old_role', OLD.role,
      'new_role', NEW.role
    )
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "private"."track_membership_changes"() OWNER TO "postgres";

REVOKE ALL ON FUNCTION "private"."track_membership_changes"() FROM PUBLIC;


CREATE OR REPLACE FUNCTION "private"."audit_log"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_action      audit.action_type;
  v_account_id  uuid;
  v_resource_id text;
  v_row         jsonb;
  v_impersonator_id uuid;
BEGIN
  v_action := CASE TG_OP
    WHEN 'INSERT' THEN 'create'
    WHEN 'UPDATE' THEN 'update'
    WHEN 'DELETE' THEN 'delete'
  END::audit.action_type;

  v_row := to_jsonb(COALESCE(NEW, OLD));

  BEGIN
    v_account_id := (v_row ->> 'account_id')::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_account_id := NULL;
  END;

  IF v_account_id IS NULL AND TG_TABLE_NAME = 'profiles' THEN
    v_account_id := (v_row ->> 'id')::uuid;
  END IF;

  v_resource_id := COALESCE(v_row ->> 'id', v_row ->> 'account_id', '');

  -- F3-C2: si la sesión actual está impersonando a alguien, el claim
  -- impersonated_by trae el id del admin real — se guarda acá sin tocar
  -- actor_id (que sigue siendo auth.uid(), el target, para que RLS y el
  -- visor por cuenta se comporten exactamente igual que sin impersonation).
  v_impersonator_id := NULLIF(
    ((SELECT auth.jwt()) -> 'app_metadata' ->> 'impersonated_by'), ''
  )::uuid;

  INSERT INTO audit.logs (
    actor_id,
    action,
    resource_type,
    resource_id,
    account_id,
    old_data,
    new_data,
    ip_address,
    user_agent,
    impersonator_id
  ) VALUES (
    auth.uid(),
    v_action,
    TG_TABLE_NAME,
    v_resource_id,
    v_account_id,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    NULLIF(
      trim(split_part(
        COALESCE(current_setting('request.headers', true)::json->>'x-forwarded-for', ''),
        ',', 1
      )),
      ''
    )::inet,
    current_setting('request.headers', true)::json->>'user-agent',
    v_impersonator_id
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "private"."audit_log"() OWNER TO "postgres";

REVOKE ALL ON FUNCTION "private"."audit_log"() FROM PUBLIC;


SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "private"."rate_limits" (
    "ip" "inet" NOT NULL,
    "request_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "private"."rate_limits" OWNER TO "postgres";


CREATE INDEX "idx_rate_limits_ip_request_at" ON "private"."rate_limits" USING "btree" ("ip", "request_at" DESC);


CREATE TABLE IF NOT EXISTS "private"."rate_limit_counters" (
    "ip"           "inet"        NOT NULL,
    "window_start" timestamptz   NOT NULL,
    "count"        integer       NOT NULL DEFAULT 1,
    CONSTRAINT "rate_limit_counters_pkey" PRIMARY KEY ("ip", "window_start")
);


ALTER TABLE "private"."rate_limit_counters" OWNER TO "postgres";


CREATE INDEX IF NOT EXISTS "idx_rate_limit_counters_ip_window"
  ON "private"."rate_limit_counters" ("ip", "window_start" DESC);


CREATE OR REPLACE FUNCTION "private"."cancel_overdue_mercadopago_subscriptions"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  UPDATE billing.subscriptions
  SET status = 'canceled', canceled_at = now()
  WHERE provider = 'mercadopago'
    AND cancel_at_period_end = true
    AND current_period_end < now()
    AND status <> 'canceled';
END;
$$;


ALTER FUNCTION "private"."cancel_overdue_mercadopago_subscriptions"() OWNER TO "postgres";


COMMENT ON FUNCTION "private"."cancel_overdue_mercadopago_subscriptions"() IS 'Cierra localmente suscripciones MercadoPago vencidas y marcadas para cancelar (F2-2A-providers). No llama a la API de MercadoPago.';


CREATE OR REPLACE FUNCTION "private"."get_account_plan_row"("p_account_id" "uuid") RETURNS TABLE("features" "jsonb", "limits" "jsonb", "slug" "text")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  RETURN QUERY
  SELECT COALESCE(p.features, '{}'::jsonb), COALESCE(p.limits, '{}'::jsonb), p.slug
  FROM billing.subscriptions s
  JOIN billing.customers c ON c.id = s.customer_id
  JOIN billing.plans p ON p.id = s.plan_id
  WHERE c.account_id = p_account_id
    AND s.status IN ('active', 'trialing')
  ORDER BY s.created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY
    SELECT COALESCE(p.features, '{}'::jsonb), COALESCE(p.limits, '{}'::jsonb), p.slug
    FROM billing.plans p
    WHERE p.slug = 'free'
    ORDER BY p."interval"
    LIMIT 1;
  END IF;
END;
$$;


ALTER FUNCTION "private"."get_account_plan_row"("p_account_id" "uuid") OWNER TO "postgres";

COMMENT ON FUNCTION "private"."get_account_plan_row"("p_account_id" "uuid") IS 'Features+limits+slug del plan efectivo (sub activa → fallback free). Interno, sin check de membership (3H-1.5).';

REVOKE ALL ON FUNCTION "private"."get_account_plan_row"("p_account_id" "uuid") FROM PUBLIC;


CREATE OR REPLACE FUNCTION "private"."get_account_limit"("p_account_id" "uuid", "p_key" "text") RETURNS integer
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT (r.limits ->> p_key)::integer
  FROM private.get_account_plan_row(p_account_id) r;
$$;


ALTER FUNCTION "private"."get_account_limit"("p_account_id" "uuid", "p_key" "text") OWNER TO "postgres";

COMMENT ON FUNCTION "private"."get_account_limit"("p_account_id" "uuid", "p_key" "text") IS 'Límite numérico del plan efectivo; NULL = ilimitado/ausente (F3-3H-1).';

REVOKE ALL ON FUNCTION "private"."get_account_limit"("p_account_id" "uuid", "p_key" "text") FROM PUBLIC;


CREATE OR REPLACE FUNCTION "private"."account_has_feature"("p_account_id" "uuid", "p_key" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT COALESCE((r.features ->> p_key)::boolean, false)
  FROM private.get_account_plan_row(p_account_id) r;
$$;


ALTER FUNCTION "private"."account_has_feature"("p_account_id" "uuid", "p_key" "text") OWNER TO "postgres";

COMMENT ON FUNCTION "private"."account_has_feature"("p_account_id" "uuid", "p_key" "text") IS 'Feature booleana del plan efectivo; ausente = false (F3-3H-1).';

REVOKE ALL ON FUNCTION "private"."account_has_feature"("p_account_id" "uuid", "p_key" "text") FROM PUBLIC;


CREATE OR REPLACE FUNCTION "private"."within_plan_limit"("p_account_id" "uuid", "p_key" "text", "p_current" bigint, "p_increment" integer DEFAULT 1) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT private.get_account_limit(p_account_id, p_key) IS NULL
      OR (p_current + p_increment) <= private.get_account_limit(p_account_id, p_key);
$$;


ALTER FUNCTION "private"."within_plan_limit"("p_account_id" "uuid", "p_key" "text", "p_current" bigint, "p_increment" integer) OWNER TO "postgres";

COMMENT ON FUNCTION "private"."within_plan_limit"("p_account_id" "uuid", "p_key" "text", "p_current" bigint, "p_increment" integer) IS 'True si (current+increment) respeta el límite del plan; límite ausente = ilimitado. p_current es bigint porque count(*) devuelve bigint (3H-1.5).';

REVOKE ALL ON FUNCTION "private"."within_plan_limit"("p_account_id" "uuid", "p_key" "text", "p_current" bigint, "p_increment" integer) FROM PUBLIC;


-- ============================================================================
-- Super-admin back-office guard functions (F3-C1)
-- ============================================================================
-- authenticated previously had no USAGE on schema private (nothing there was
-- ever called directly by that role — only from SECURITY DEFINER wrappers,
-- which run as their owner and don't need it). is_platform_admin/
-- assert_platform_admin are explicitly meant to be callable directly by
-- authenticated (inside a future RLS policy "OR private.is_platform_admin()"
-- in C2/C3), which requires resolving the schema-qualified name — hence
-- USAGE, same rationale as `GRANT USAGE ON SCHEMA audit TO authenticated` in
-- audit.sql (F2-2G). This does NOT expose any other private.* object — each
-- function still needs its own explicit GRANT EXECUTE.
GRANT USAGE ON SCHEMA "private" TO "authenticated";

CREATE OR REPLACE FUNCTION "private"."is_platform_admin"("p_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT EXISTS(SELECT 1 FROM public.platform_admins WHERE user_id = p_user_id);
$$;


ALTER FUNCTION "private"."is_platform_admin"("p_user_id" "uuid") OWNER TO "postgres";

COMMENT ON FUNCTION "private"."is_platform_admin"("p_user_id" "uuid") IS 'True si p_user_id está en la whitelist platform_admins (F3-C1). Usable dentro de policies RLS via GRANT a authenticated — en C1 ninguna policy lo usa todavía (preparado para C2/C3).';

REVOKE ALL ON FUNCTION "private"."is_platform_admin"("p_user_id" "uuid") FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "private"."is_platform_admin"("p_user_id" "uuid") TO "authenticated";


CREATE OR REPLACE FUNCTION "private"."assert_platform_admin"() RETURNS "void"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  IF NOT private.is_platform_admin((SELECT auth.uid())) THEN
    RAISE EXCEPTION 'not_platform_admin' USING ERRCODE = '42501';
  END IF;

  -- Defense in depth: the *real* aal of this session (set by GoTrue itself),
  -- not app_metadata.mfa_enrolled (which only means a factor exists — not
  -- that this particular session passed the challenge).
  IF (SELECT auth.jwt() ->> 'aal') IS DISTINCT FROM 'aal2' THEN
    RAISE EXCEPTION 'mfa_required' USING ERRCODE = '42501';
  END IF;
END;
$$;


ALTER FUNCTION "private"."assert_platform_admin"() OWNER TO "postgres";

COMMENT ON FUNCTION "private"."assert_platform_admin"() IS 'Llamar al inicio de todo RPC del back-office de super-admin. Rechaza no-admins (not_platform_admin) y sesiones sin aal2 real (mfa_required), aunque el claim JWT diga mfa_enrolled=true (F3-C1).';

REVOKE ALL ON FUNCTION "private"."assert_platform_admin"() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "private"."assert_platform_admin"() TO "authenticated";


CREATE OR REPLACE FUNCTION private.assert_impersonation_target_valid(p_target_user_id uuid)
RETURNS void
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_target_user_id = (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'cannot_impersonate_self' USING ERRCODE = '42501';
  END IF;
  IF private.is_platform_admin(p_target_user_id) THEN
    RAISE EXCEPTION 'cannot_impersonate_admin' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_target_user_id) THEN
    RAISE EXCEPTION 'target_not_found' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

COMMENT ON FUNCTION private.assert_impersonation_target_valid(uuid) IS
  'Bloquea auto-impersonación y target=admin, valida que el target exista (F3-C2). Llamar desde begin_impersonation_session.';

REVOKE ALL ON FUNCTION private.assert_impersonation_target_valid(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.assert_impersonation_target_valid(uuid) TO authenticated;


