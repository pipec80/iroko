


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
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "audit"."logs" OWNER TO "postgres";


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




