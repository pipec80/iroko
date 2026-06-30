


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
  IF pg_trigger_depth() > 0 THEN
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

  INSERT INTO audit.logs (
    actor_id,
    action,
    resource_type,
    resource_id,
    account_id,
    old_data,
    new_data,
    ip_address,
    user_agent
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
    current_setting('request.headers', true)::json->>'user-agent'
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




