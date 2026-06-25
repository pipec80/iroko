


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


CREATE SCHEMA IF NOT EXISTS "billing";


ALTER SCHEMA "billing" OWNER TO "postgres";


CREATE TYPE "billing"."invoice_status" AS ENUM (
    'draft',
    'open',
    'paid',
    'void',
    'uncollectible'
);


ALTER TYPE "billing"."invoice_status" OWNER TO "postgres";


CREATE TYPE "billing"."payment_method_type" AS ENUM (
    'card',
    'bank_transfer',
    'wallet',
    'other'
);


ALTER TYPE "billing"."payment_method_type" OWNER TO "postgres";


CREATE TYPE "billing"."plan_interval" AS ENUM (
    'month',
    'year',
    'one_time'
);


ALTER TYPE "billing"."plan_interval" OWNER TO "postgres";


CREATE TYPE "billing"."subscription_status" AS ENUM (
    'trialing',
    'active',
    'past_due',
    'canceled',
    'paused',
    'unpaid',
    'incomplete'
);


ALTER TYPE "billing"."subscription_status" OWNER TO "postgres";


CREATE TYPE "billing"."subscription_item_type" AS ENUM (
    'flat',
    'per_seat',
    'metered',
    'tiered'
);


ALTER TYPE "billing"."subscription_item_type" OWNER TO "postgres";

COMMENT ON TYPE "billing"."subscription_item_type" IS
  'Modelo de precio de un item de suscripción: flat=precio fijo, per_seat=por usuario, '
  'metered=por uso, tiered=escalado por volumen.';

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "billing"."customers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "account_id" "uuid" NOT NULL,
    "provider" "text" DEFAULT 'stripe'::"text" NOT NULL,
    "external_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "billing"."customers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "billing"."events" (
    "id" bigint NOT NULL,
    "customer_id" "uuid",
    "event_type" "text" NOT NULL,
    "provider" "text" DEFAULT 'stripe'::"text" NOT NULL,
    "external_event_id" "text",
    "payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "processed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "billing"."events" OWNER TO "postgres";


ALTER TABLE "billing"."events" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "billing"."events_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "billing"."invoice_line_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "invoice_id" "uuid" NOT NULL,
    "description" "text" NOT NULL,
    "quantity" integer DEFAULT 1,
    "unit_price" integer NOT NULL,
    "amount" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "billing"."invoice_line_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "billing"."invoices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "subscription_id" "uuid",
    "number" "text",
    "status" "billing"."invoice_status" DEFAULT 'draft'::"billing"."invoice_status",
    "currency" character(3) DEFAULT 'USD'::"bpchar" NOT NULL,
    "subtotal" integer DEFAULT 0,
    "tax" integer DEFAULT 0,
    "total" integer DEFAULT 0,
    "amount_paid" integer DEFAULT 0,
    "period_start" timestamp with time zone,
    "period_end" timestamp with time zone,
    "paid_at" timestamp with time zone,
    "external_invoice_id" "text",
    "hosted_url" "text",
    "pdf_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "billing"."invoices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "billing"."payment_methods" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "type" "billing"."payment_method_type" DEFAULT 'card'::"billing"."payment_method_type" NOT NULL,
    "provider" "text" DEFAULT 'stripe'::"text" NOT NULL,
    "external_id" "text",
    "brand" "text",
    "last_four" character(4),
    "exp_month" smallint,
    "exp_year" smallint,
    "is_default" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "billing"."payment_methods" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "billing"."plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "interval" "billing"."plan_interval" DEFAULT 'month'::"billing"."plan_interval" NOT NULL,
    "price" integer DEFAULT 0 NOT NULL,
    "currency" character(3) DEFAULT 'USD'::"bpchar" NOT NULL,
    "trial_days" integer DEFAULT 0,
    "features" "jsonb" DEFAULT '{}'::"jsonb",
    "limits" "jsonb" DEFAULT '{}'::"jsonb",
    "sort_order" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "billing"."plans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "billing"."subscription_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "subscription_id" "uuid" NOT NULL,
    "description" "text" NOT NULL,
    "type" "billing"."subscription_item_type" DEFAULT 'flat'::"billing"."subscription_item_type" NOT NULL,
    "quantity" integer DEFAULT 1,
    "unit_price" integer DEFAULT 0 NOT NULL,
    "currency" character(3) DEFAULT 'USD'::"bpchar",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "billing"."subscription_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "billing"."subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "plan_id" "uuid" NOT NULL,
    "status" "billing"."subscription_status" DEFAULT 'trialing'::"billing"."subscription_status" NOT NULL,
    "current_period_start" timestamp with time zone,
    "current_period_end" timestamp with time zone,
    "cancel_at_period_end" boolean DEFAULT false,
    "canceled_at" timestamp with time zone,
    "trial_start" timestamp with time zone,
    "trial_end" timestamp with time zone,
    "provider" "text" DEFAULT 'stripe'::"text" NOT NULL,
    "external_subscription_id" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "billing"."subscriptions" OWNER TO "postgres";


CREATE OR REPLACE VIEW "billing"."v_mrr_by_plan" AS
 SELECT "p"."name" AS "plan_name",
    "p"."slug",
    "p"."interval",
    "count"(*) AS "active_count",
    "sum"(
      CASE "p"."interval"
        WHEN 'month'    THEN "p"."price"
        WHEN 'year'     THEN "p"."price" / 12
        WHEN 'one_time' THEN 0
        ELSE 0
      END
    ) AS "mrr_cents",
    "p"."currency"
   FROM ("billing"."subscriptions" "s"
     JOIN "billing"."plans" "p" ON (("p"."id" = "s"."plan_id")))
  WHERE ("s"."status" = 'active'::"billing"."subscription_status")
  GROUP BY "p"."id", "p"."name", "p"."slug", "p"."interval", "p"."currency";


ALTER VIEW "billing"."v_mrr_by_plan" OWNER TO "postgres";


ALTER TABLE ONLY "billing"."customers"
    ADD CONSTRAINT "customers_account_id_key" UNIQUE ("account_id");



ALTER TABLE ONLY "billing"."customers"
    ADD CONSTRAINT "customers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "billing"."customers"
    ADD CONSTRAINT "customers_provider_external_id_key" UNIQUE ("provider", "external_id");



ALTER TABLE ONLY "billing"."events"
    ADD CONSTRAINT "events_external_event_id_key" UNIQUE ("external_event_id");



ALTER TABLE ONLY "billing"."events"
    ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "billing"."invoice_line_items"
    ADD CONSTRAINT "invoice_line_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "billing"."invoices"
    ADD CONSTRAINT "invoices_number_key" UNIQUE ("number");



ALTER TABLE ONLY "billing"."invoices"
    ADD CONSTRAINT "invoices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "billing"."payment_methods"
    ADD CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "billing"."plans"
    ADD CONSTRAINT "plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "billing"."plans"
    ADD CONSTRAINT "plans_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "billing"."subscription_items"
    ADD CONSTRAINT "subscription_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "billing"."subscriptions"
    ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_billing_events_created_brin" ON "billing"."events" USING "brin" ("created_at");



CREATE INDEX "idx_billing_events_customer" ON "billing"."events" USING "btree" ("customer_id");



CREATE INDEX "idx_billing_events_type" ON "billing"."events" USING "btree" ("event_type");



CREATE INDEX "idx_invoice_line_items_invoice" ON "billing"."invoice_line_items" USING "btree" ("invoice_id");



CREATE INDEX "idx_invoices_customer_date" ON "billing"."invoices" USING "btree" ("customer_id", "created_at" DESC);



CREATE INDEX "idx_invoices_subscription" ON "billing"."invoices" USING "btree" ("subscription_id");



CREATE INDEX "idx_payment_methods_customer" ON "billing"."payment_methods" USING "btree" ("customer_id");



CREATE INDEX "idx_subscription_items_subscription" ON "billing"."subscription_items" USING "btree" ("subscription_id");



CREATE INDEX "idx_subscriptions_customer" ON "billing"."subscriptions" USING "btree" ("customer_id");



CREATE INDEX "idx_subscriptions_plan" ON "billing"."subscriptions" USING "btree" ("plan_id");



CREATE INDEX "idx_subscriptions_status" ON "billing"."subscriptions" USING "btree" ("status") WHERE ("status" = 'active'::"billing"."subscription_status");



CREATE OR REPLACE TRIGGER "billing_events_immutable" BEFORE DELETE OR UPDATE ON "billing"."events" FOR EACH ROW EXECUTE FUNCTION "private"."deny_mutation"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "billing"."customers" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "billing"."invoices" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "billing"."payment_methods" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "billing"."plans" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "billing"."subscriptions" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



ALTER TABLE ONLY "billing"."customers"
    ADD CONSTRAINT "customers_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "billing"."events"
    ADD CONSTRAINT "events_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "billing"."customers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "billing"."invoice_line_items"
    ADD CONSTRAINT "invoice_line_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "billing"."invoices"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "billing"."invoices"
    ADD CONSTRAINT "invoices_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "billing"."customers"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "billing"."invoices"
    ADD CONSTRAINT "invoices_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "billing"."subscriptions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "billing"."payment_methods"
    ADD CONSTRAINT "payment_methods_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "billing"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "billing"."subscription_items"
    ADD CONSTRAINT "subscription_items_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "billing"."subscriptions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "billing"."subscriptions"
    ADD CONSTRAINT "subscriptions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "billing"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "billing"."subscriptions"
    ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "billing"."plans"("id");



CREATE POLICY "billing_customers_deny_all" ON "billing"."customers" AS RESTRICTIVE USING (false) WITH CHECK (false);



CREATE POLICY "billing_events_deny_all" ON "billing"."events" AS RESTRICTIVE USING (false) WITH CHECK (false);



CREATE POLICY "billing_invoice_line_items_deny_all" ON "billing"."invoice_line_items" AS RESTRICTIVE USING (false) WITH CHECK (false);



CREATE POLICY "billing_invoices_deny_all" ON "billing"."invoices" AS RESTRICTIVE USING (false) WITH CHECK (false);



CREATE POLICY "billing_payment_methods_deny_all" ON "billing"."payment_methods" AS RESTRICTIVE USING (false) WITH CHECK (false);



CREATE POLICY "billing_plans_deny_all" ON "billing"."plans" AS RESTRICTIVE USING (false) WITH CHECK (false);



CREATE POLICY "billing_subscription_items_deny_all" ON "billing"."subscription_items" AS RESTRICTIVE USING (false) WITH CHECK (false);



CREATE POLICY "billing_subscriptions_deny_all" ON "billing"."subscriptions" AS RESTRICTIVE USING (false) WITH CHECK (false);



ALTER TABLE "billing"."customers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "billing"."events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "billing"."invoice_line_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "billing"."invoices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "billing"."payment_methods" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "billing"."plans" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "billing"."subscription_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "billing"."subscriptions" ENABLE ROW LEVEL SECURITY;



