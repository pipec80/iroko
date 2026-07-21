


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


CREATE SCHEMA IF NOT EXISTS "audit";


ALTER SCHEMA "audit" OWNER TO "postgres";


CREATE TYPE "audit"."action_type" AS ENUM (
    'create',
    'update',
    'delete',
    'login',
    'logout',
    'invite',
    'role_change',
    'subscription_change',
    'payment',
    'export'
);


ALTER TYPE "audit"."action_type" OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "audit"."logs" (
    "id" bigint NOT NULL,
    "actor_id" "uuid",
    "actor_type" "text" DEFAULT 'user'::"text",
    "action" "audit"."action_type" NOT NULL,
    "resource_type" "text" NOT NULL,
    "resource_id" "text",
    "account_id" "uuid",
    "old_data" "jsonb",
    "new_data" "jsonb",
    "ip_address" "inet",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "impersonator_id" "uuid"
);


ALTER TABLE "audit"."logs" OWNER TO "postgres";

COMMENT ON COLUMN "audit"."logs"."impersonator_id" IS 'Populated by C2 (impersonation) when an admin acts on behalf of another user. NULL for every row until then — added now (F3-C1) so the platform audit RPC ships complete on day one.';


ALTER TABLE "audit"."logs" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "audit"."logs_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE OR REPLACE VIEW "audit"."v_recent_activity" AS
 SELECT "a"."id",
    "a"."actor_id",
    "a"."actor_type",
    "a"."action",
    "a"."resource_type",
    "a"."resource_id",
    "a"."account_id",
    "a"."old_data",
    "a"."new_data",
    "a"."ip_address",
    "a"."user_agent",
    "a"."created_at",
    "pr"."display_name" AS "actor_name",
    "pr"."avatar_url"
   FROM ("audit"."logs" "a"
     LEFT JOIN "public"."profiles" "pr" ON (("pr"."id" = "a"."actor_id")))
  ORDER BY "a"."created_at" DESC;


ALTER VIEW "audit"."v_recent_activity" OWNER TO "postgres";


ALTER TABLE ONLY "audit"."logs"
    ADD CONSTRAINT "logs_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_audit_account_resource" ON "audit"."logs" USING "btree" ("account_id", "resource_type", "created_at" DESC);



CREATE INDEX "idx_audit_actor" ON "audit"."logs" USING "btree" ("actor_id", "created_at" DESC);



CREATE INDEX "idx_audit_created_brin" ON "audit"."logs" USING "brin" ("created_at");



CREATE INDEX IF NOT EXISTS "idx_audit_action"
  ON "audit"."logs" ("action", "created_at" DESC);



CREATE OR REPLACE TRIGGER "audit_logs_immutable" BEFORE DELETE OR UPDATE ON "audit"."logs" FOR EACH ROW EXECUTE FUNCTION "private"."deny_mutation"();



CREATE POLICY "audit_logs_deny_all" ON "audit"."logs" AS RESTRICTIVE USING (false) WITH CHECK (false);



ALTER TABLE "audit"."logs" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "audit" TO "service_role";

GRANT SELECT, INSERT ON "audit"."logs" TO "service_role";
GRANT USAGE ON SEQUENCE "audit"."logs_id_seq" TO "service_role";


-- ============================================================================
-- Audit Log Viewer (F2-2G)
-- ============================================================================
-- Exposes audit.v_recent_activity to the account's owner/admin only, with
-- keyset pagination (created_at, id) and optional action/resource filters.
-- private.list_account_audit_logs does the query with no auth check — it is
-- REVOKEd from everyone and only reachable through the public wrapper below,
-- which performs the authorization check first.
-- ============================================================================

-- The `audit` schema previously only granted USAGE to service_role. Using
-- audit.action_type as a parameter type on a function callable by
-- `authenticated` requires that role to resolve the type name when binding
-- arguments (independent of the function being SECURITY DEFINER, which only
-- affects privileges inside the function body, not the caller's parameter
-- binding). This does NOT grant any data access — audit.logs stays fully
-- locked down by its RESTRICTIVE deny-all policy and table-level grants.
GRANT USAGE ON SCHEMA audit TO authenticated;

CREATE OR REPLACE FUNCTION private.list_account_audit_logs(
  p_account_id        uuid,
  p_limit             integer,
  p_cursor_created_at timestamptz,
  p_cursor_id         bigint,
  p_action            audit.action_type,
  p_resource_type     text
)
RETURNS TABLE (
  id            bigint,
  actor_id      uuid,
  actor_name    text,
  avatar_url    text,
  action        audit.action_type,
  resource_type text,
  resource_id   text,
  created_at    timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    v.id, v.actor_id, v.actor_name, v.avatar_url, v.action, v.resource_type, v.resource_id, v.created_at
  FROM audit.v_recent_activity v
  WHERE v.account_id = p_account_id
    AND (p_action IS NULL OR v.action = p_action)
    AND (p_resource_type IS NULL OR v.resource_type = p_resource_type)
    AND (
      p_cursor_created_at IS NULL
      OR v.created_at < p_cursor_created_at
      OR (v.created_at = p_cursor_created_at AND v.id < p_cursor_id)
    )
  ORDER BY v.created_at DESC, v.id DESC
  LIMIT p_limit
$$;

COMMENT ON FUNCTION private.list_account_audit_logs IS
  'Unauthorized worker for the audit log viewer (F2-2G). Never call directly — use public.get_account_audit_logs, which checks owner/admin membership first.';

REVOKE EXECUTE ON FUNCTION private.list_account_audit_logs(
  uuid, integer, timestamptz, bigint, audit.action_type, text
) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.get_account_audit_logs(
  p_account_id        uuid,
  p_limit             integer DEFAULT 20,
  p_cursor_created_at timestamptz DEFAULT NULL,
  p_cursor_id         bigint DEFAULT NULL,
  p_action            audit.action_type DEFAULT NULL,
  p_resource_type     text DEFAULT NULL
)
RETURNS TABLE (
  id            bigint,
  actor_id      uuid,
  actor_name    text,
  avatar_url    text,
  action        audit.action_type,
  resource_type text,
  resource_id   text,
  created_at    timestamptz
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role public.membership_role;
BEGIN
  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 100 THEN
    RAISE EXCEPTION 'invalid_limit';
  END IF;

  v_role := private.get_user_role(p_account_id, (SELECT auth.uid()));

  -- v_role IS NULL means the caller has no membership row at all on this
  -- account. `NOT IN` with NULL evaluates to NULL, and `IF NULL THEN` is
  -- false in PL/pgSQL — so the NULL case must be checked explicitly or a
  -- complete outsider would silently pass this gate.
  IF v_role IS NULL OR v_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  RETURN QUERY
  SELECT * FROM private.list_account_audit_logs(
    p_account_id, p_limit, p_cursor_created_at, p_cursor_id, p_action, p_resource_type
  );
END;
$$;

COMMENT ON FUNCTION public.get_account_audit_logs IS
  'Paginated audit log for an account, restricted to owner/admin members (F2-2G).';

GRANT EXECUTE ON FUNCTION public.get_account_audit_logs(
  uuid, integer, timestamptz, bigint, audit.action_type, text
) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_account_audit_logs(
  uuid, integer, timestamptz, bigint, audit.action_type, text
) FROM PUBLIC;

-- ============================================================================
-- Platform-wide (cross-account) audit log viewer (F3-C1)
-- ============================================================================
-- Same worker/wrapper split as get_account_audit_logs above, but scoped to
-- the whole platform instead of one account, restricted to platform_admins
-- via private.assert_platform_admin(), and exposing impersonator_id
-- (populated starting C2).

CREATE OR REPLACE FUNCTION private.list_platform_audit_logs(
  p_limit             integer,
  p_cursor_created_at timestamptz,
  p_cursor_id         bigint,
  p_account_id        uuid,
  p_actor_id          uuid,
  p_action            audit.action_type,
  p_resource_type     text
)
RETURNS TABLE (
  id             bigint,
  actor_id       uuid,
  actor_name     text,
  impersonator_id uuid,
  account_id     uuid,
  action         audit.action_type,
  resource_type  text,
  resource_id    text,
  created_at     timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT v.id, v.actor_id, v.actor_name, l.impersonator_id, v.account_id,
         v.action, v.resource_type, v.resource_id, v.created_at
  FROM audit.v_recent_activity v
  JOIN audit.logs l ON l.id = v.id
  WHERE (p_account_id IS NULL OR v.account_id = p_account_id)
    AND (p_actor_id IS NULL OR v.actor_id = p_actor_id)
    AND (p_action IS NULL OR v.action = p_action)
    AND (p_resource_type IS NULL OR v.resource_type = p_resource_type)
    AND (
      p_cursor_created_at IS NULL
      OR v.created_at < p_cursor_created_at
      OR (v.created_at = p_cursor_created_at AND v.id < p_cursor_id)
    )
  ORDER BY v.created_at DESC, v.id DESC
  LIMIT p_limit
$$;

COMMENT ON FUNCTION private.list_platform_audit_logs IS
  'Unauthorized worker for the platform-wide (cross-account) audit log viewer (F3-C1). Never call directly — use public.get_platform_audit_logs, which asserts platform_admin first.';

REVOKE ALL ON FUNCTION private.list_platform_audit_logs(
  integer, timestamptz, bigint, uuid, uuid, audit.action_type, text
) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.get_platform_audit_logs(
  p_limit             integer DEFAULT 20,
  p_cursor_created_at timestamptz DEFAULT NULL,
  p_cursor_id         bigint DEFAULT NULL,
  p_account_id        uuid DEFAULT NULL,
  p_actor_id          uuid DEFAULT NULL,
  p_action            audit.action_type DEFAULT NULL,
  p_resource_type     text DEFAULT NULL
)
RETURNS TABLE (
  id             bigint,
  actor_id       uuid,
  actor_name     text,
  impersonator_id uuid,
  account_id     uuid,
  action         audit.action_type,
  resource_type  text,
  resource_id    text,
  created_at     timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM private.assert_platform_admin();

  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 100 THEN
    RAISE EXCEPTION 'invalid_limit';
  END IF;

  RETURN QUERY
  SELECT * FROM private.list_platform_audit_logs(
    p_limit, p_cursor_created_at, p_cursor_id, p_account_id, p_actor_id, p_action, p_resource_type
  );
END;
$$;

COMMENT ON FUNCTION public.get_platform_audit_logs IS
  'Cross-account paginated audit log, restricted to platform_admins (F3-C1). Exposes impersonator_id (populated starting C2).';

GRANT EXECUTE ON FUNCTION public.get_platform_audit_logs(
  integer, timestamptz, bigint, uuid, uuid, audit.action_type, text
) TO authenticated;

REVOKE ALL ON FUNCTION public.get_platform_audit_logs(
  integer, timestamptz, bigint, uuid, uuid, audit.action_type, text
) FROM PUBLIC;



