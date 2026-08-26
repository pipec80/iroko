


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
    "external_event_id" "text" NOT NULL,
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
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "provider" "text" NOT NULL
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


CREATE TABLE IF NOT EXISTS "billing"."payment_attempts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider" "text" NOT NULL,
    "subscription_id" "uuid",
    "invoice_id" "uuid",
    "external_payment_id" "text",
    "external_invoice_id" "text",
    "status" "text" NOT NULL,
    "amount" integer,
    "currency" character(3),
    "failure_code" "text",
    "failure_message" "text",
    "attempted_at" timestamp with time zone NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "payment_attempts_status_check" CHECK (("status" = ANY (ARRAY['failed'::"text", 'paid'::"text", 'recovered'::"text"])))
);


ALTER TABLE "billing"."payment_attempts" OWNER TO "postgres";


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
    "provider_ids" "jsonb" DEFAULT '{}'::"jsonb",
    "sort_order" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "billing"."plans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "billing"."provider_prices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "plan_id" "uuid" NOT NULL,
    "provider" "text" NOT NULL,
    "external_price_id" "text",
    "currency" character(3) NOT NULL,
    "amount" integer NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "provider_prices_amount_check" CHECK (("amount" >= 0)),
    CONSTRAINT "provider_prices_plan_provider_currency_key" UNIQUE ("plan_id", "provider", "currency")
);


ALTER TABLE "billing"."provider_prices" OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "billing"."assert_provider_price_matches_plan"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_plan_price integer;
BEGIN
  SELECT price INTO v_plan_price
  FROM billing.plans
  WHERE id = NEW.plan_id;

  IF NEW.currency = 'USD' AND NEW.amount <> v_plan_price THEN
    RAISE EXCEPTION 'provider_price_amount_mismatch: plan price is %, provider price is %',
      v_plan_price, NEW.amount;
  END IF;

  RETURN NEW;
END;
$$;


ALTER TABLE ONLY "billing"."customers"
    ADD CONSTRAINT "customers_account_provider_key" UNIQUE ("account_id", "provider");



ALTER TABLE ONLY "billing"."customers"
    ADD CONSTRAINT "customers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "billing"."customers"
    ADD CONSTRAINT "customers_provider_external_id_key" UNIQUE ("provider", "external_id");



ALTER TABLE ONLY "billing"."events"
    ADD CONSTRAINT "events_provider_external_event_key" UNIQUE ("provider", "external_event_id");



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


ALTER TABLE ONLY "billing"."payment_attempts"
    ADD CONSTRAINT "payment_attempts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "billing"."plans"
    ADD CONSTRAINT "plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "billing"."plans"
    ADD CONSTRAINT "plans_slug_interval_key" UNIQUE ("slug", "interval");



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


CREATE UNIQUE INDEX "payment_attempts_provider_payment_unique" ON "billing"."payment_attempts" USING "btree" ("provider", "external_payment_id") WHERE ("external_payment_id" IS NOT NULL);


CREATE INDEX "payment_attempts_invoice_id_idx" ON "billing"."payment_attempts" USING "btree" ("invoice_id");


CREATE INDEX "payment_attempts_subscription_id_idx" ON "billing"."payment_attempts" USING "btree" ("subscription_id");


CREATE UNIQUE INDEX "provider_prices_external_id_unique" ON "billing"."provider_prices" USING "btree" ("provider", "external_price_id") WHERE ("external_price_id" IS NOT NULL);



CREATE INDEX "idx_subscription_items_subscription" ON "billing"."subscription_items" USING "btree" ("subscription_id");



CREATE INDEX "idx_subscriptions_customer" ON "billing"."subscriptions" USING "btree" ("customer_id");



CREATE INDEX "idx_subscriptions_plan" ON "billing"."subscriptions" USING "btree" ("plan_id");



CREATE INDEX "idx_subscriptions_status" ON "billing"."subscriptions" USING "btree" ("status") WHERE ("status" = 'active'::"billing"."subscription_status");


CREATE UNIQUE INDEX "invoices_provider_external_id_unique" ON "billing"."invoices" USING "btree" ("provider", "external_invoice_id") WHERE ("external_invoice_id" IS NOT NULL);


CREATE UNIQUE INDEX "subscriptions_provider_external_id_unique" ON "billing"."subscriptions" USING "btree" ("provider", "external_subscription_id") WHERE ("external_subscription_id" IS NOT NULL);



CREATE OR REPLACE TRIGGER "billing_events_immutable" BEFORE DELETE OR UPDATE ON "billing"."events" FOR EACH ROW EXECUTE FUNCTION "private"."deny_mutation"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "billing"."customers" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "billing"."invoices" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "billing"."payment_methods" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "billing"."plans" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();


CREATE OR REPLACE TRIGGER "provider_prices_amount_coherence" BEFORE INSERT OR UPDATE ON "billing"."provider_prices" FOR EACH ROW EXECUTE FUNCTION "billing"."assert_provider_price_matches_plan"();


CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "billing"."provider_prices" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



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


ALTER TABLE ONLY "billing"."payment_attempts"
    ADD CONSTRAINT "payment_attempts_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "billing"."invoices"("id") ON DELETE SET NULL;


ALTER TABLE ONLY "billing"."payment_attempts"
    ADD CONSTRAINT "payment_attempts_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "billing"."subscriptions"("id") ON DELETE SET NULL;


ALTER TABLE ONLY "billing"."provider_prices"
    ADD CONSTRAINT "provider_prices_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "billing"."plans"("id") ON DELETE CASCADE;



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


CREATE POLICY "billing_payment_attempts_deny_all" ON "billing"."payment_attempts" AS RESTRICTIVE USING (false) WITH CHECK (false);



CREATE POLICY "billing_plans_deny_all" ON "billing"."plans" AS RESTRICTIVE USING (false) WITH CHECK (false);


CREATE POLICY "billing_provider_prices_deny_all" ON "billing"."provider_prices" AS RESTRICTIVE USING (false) WITH CHECK (false);



CREATE POLICY "billing_subscription_items_deny_all" ON "billing"."subscription_items" AS RESTRICTIVE USING (false) WITH CHECK (false);



CREATE POLICY "billing_subscriptions_deny_all" ON "billing"."subscriptions" AS RESTRICTIVE USING (false) WITH CHECK (false);



ALTER TABLE "billing"."customers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "billing"."events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "billing"."invoice_line_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "billing"."invoices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "billing"."payment_methods" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "billing"."payment_attempts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "billing"."plans" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "billing"."provider_prices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "billing"."subscription_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "billing"."subscriptions" ENABLE ROW LEVEL SECURITY;


-- USAGE en el schema (F2-2A-core): PostgREST necesita resolver los tipos
-- billing.* (enums) usados en las firmas de las RPCs de public.*. No expone
-- las tablas: siguen siendo RLS deny-all y sin GRANT de fila.
GRANT USAGE ON SCHEMA "billing" TO "anon", "authenticated", "service_role";




-- ============================================================================
-- Comentarios completos de tablas F1/F2 (agregados 2026-07-24, QA de usuario)
-- Espejo de supabase/migrations/20260724200000_comments_billing_schema.sql
-- ============================================================================
-- Completa comentarios (COMMENT ON TABLE/COLUMN/INDEX) faltantes en el schema
-- billing. Estas tablas son de la fundación F1/F2 y nunca recibieron
-- documentación in-DB, a diferencia de las tablas de F3 en adelante. QA del
-- usuario detectó el gap comparando billing/public contra los módulos
-- recientes (notifications, webhooks, api-keys, flags), que sí la tienen.
-- Solo metadata (COMMENT), no cambia ninguna estructura ni dato.

-- ============================================================================
-- billing.customers
-- ============================================================================
COMMENT ON TABLE billing.customers IS
  'Customer identity for one Iroko account at one payment provider. An account may have one identity per provider.';
COMMENT ON COLUMN billing.customers.id IS
  'Clave primaria UUID generada automáticamente.';
COMMENT ON COLUMN billing.customers.account_id IS
  'Owning account. Unique together with provider so one account may use multiple payment providers.';
COMMENT ON COLUMN billing.customers.provider IS
  'Payment provider that owns this customer identity, such as mock, stripe, or mercadopago.';
COMMENT ON COLUMN billing.customers.external_id IS
  'ID del customer en el proveedor externo (ej. cus_xxx de Stripe). UNIQUE junto con provider.';
COMMENT ON COLUMN billing.customers.created_at IS
  'Timestamp de creación (inmutable).';
COMMENT ON COLUMN billing.customers.updated_at IS
  'Timestamp de última modificación.';

COMMENT ON INDEX billing.customers_account_provider_key IS
  'Ensures one customer identity per account and provider.';
COMMENT ON INDEX billing.customers_provider_external_id_key IS
  'Evita duplicar el mismo customer externo (idempotencia de webhooks del proveedor).';

-- ============================================================================
-- billing.events
-- ============================================================================
COMMENT ON TABLE billing.events IS
  'Log append-only de eventos de webhook de los proveedores de pago (F2-2A). Fuente de verdad para reconciliación/debug; processed_at marca si ya se aplicó al estado de billing.';
COMMENT ON COLUMN billing.events.id IS
  'Identity autoincremental (no UUID: solo se usa como cursor de orden interno, nunca se expone).';
COMMENT ON COLUMN billing.events.customer_id IS
  'Customer al que pertenece el evento. ON DELETE SET NULL: preserva el evento (auditoría fiscal) si el customer se purga.';
COMMENT ON COLUMN billing.events.event_type IS
  'Tipo de evento tal como lo nombra el proveedor (ej. ''invoice.paid'', ''customer.subscription.updated'').';
COMMENT ON COLUMN billing.events.provider IS
  'Payment provider that emitted the event, such as mock, stripe, or mercadopago.';
COMMENT ON COLUMN billing.events.external_event_id IS
  'Provider event identifier. Unique together with provider to reject duplicate deliveries safely.';
COMMENT ON COLUMN billing.events.payload IS
  'Payload crudo del webhook, tal como lo envió el proveedor -- sin transformar.';
COMMENT ON COLUMN billing.events.processed_at IS
  'NULL = todavía no aplicado al estado de billing (subscriptions/invoices/etc). Se setea al procesar exitosamente.';
COMMENT ON COLUMN billing.events.created_at IS
  'Timestamp de recepción del webhook (inmutable).';

COMMENT ON INDEX billing.events_provider_external_event_key IS
  'Provider-scoped idempotency: one provider event is reduced at most once.';
COMMENT ON INDEX billing.idx_billing_events_created_brin IS
  'Índice BRIN: created_at crece de forma monótona en una tabla append-only, más liviano que un B-tree para rangos de fecha.';
COMMENT ON INDEX billing.idx_billing_events_customer IS
  'Soporte de FK: lookup de eventos por customer.';
COMMENT ON INDEX billing.idx_billing_events_type IS
  'Soporte de queries filtrando/agrupando por event_type (dashboards, debug).';

-- ============================================================================
-- billing.plans
-- ============================================================================
COMMENT ON TABLE billing.plans IS
  'Catálogo de planes de suscripción (F2-2A). features/limits controlan gates de la app (feature flags por plan, límites numéricos) -- ver private.resolve_flag() en flags.sql.';
COMMENT ON COLUMN billing.plans.id IS
  'Clave primaria UUID generada automáticamente.';
COMMENT ON COLUMN billing.plans.slug IS
  'Identificador legible y estable del plan (ej. ''free'', ''pro''). UNIQUE junto con interval.';
COMMENT ON COLUMN billing.plans.name IS
  'Nombre mostrado al usuario (ej. "Pro").';
COMMENT ON COLUMN billing.plans.description IS
  'Descripción corta mostrada en la página de precios.';
COMMENT ON COLUMN billing.plans.interval IS
  'Periodicidad de facturación: month o year.';
COMMENT ON COLUMN billing.plans.price IS
  'Precio en centavos de la moneda indicada en currency (evita floats para dinero).';
COMMENT ON COLUMN billing.plans.currency IS
  'Código ISO 4217 de 3 letras (ej. USD).';
COMMENT ON COLUMN billing.plans.trial_days IS
  'Días de prueba gratuita al suscribirse. 0 = sin trial.';
COMMENT ON COLUMN billing.plans.features IS
  'jsonb de feature flags habilitadas por este plan (ej. {"webhooks_enabled": true}) -- tercer nivel de prioridad en private.resolve_flag().';
COMMENT ON COLUMN billing.plans.limits IS
  'jsonb de límites numéricos del plan (ej. {"api_keys_max": 5, "seats_max": 10}), consumido por private.get_account_limit().';
COMMENT ON COLUMN billing.plans.provider_ids IS
  'jsonb con el price/plan id de cada proveedor externo (ej. {"stripe": "price_xxx", "mercadopago": "..."}), para no hardcodear IDs de proveedor en la app.';
COMMENT ON COLUMN billing.plans.sort_order IS
  'Orden de despliegue en la página de precios (ascendente).';
COMMENT ON COLUMN billing.plans.is_active IS
  'false = plan retirado/oculto, ya no ofrecible a clientes nuevos (las suscripciones existentes lo siguen usando).';
COMMENT ON COLUMN billing.plans.created_at IS
  'Timestamp de creación (inmutable).';
COMMENT ON COLUMN billing.plans.updated_at IS
  'Timestamp de última modificación.';

COMMENT ON INDEX billing.plans_slug_interval_key IS
  'Un plan lógico (slug) tiene como máximo una fila por periodicidad (month/year).';

-- ============================================================================
-- billing.subscriptions
-- ============================================================================
COMMENT ON TABLE billing.subscriptions IS
  'Suscripción activa/histórica de un customer a un plan (F2-2A). status refleja el estado real del proveedor externo, sincronizado vía billing.events.';
COMMENT ON COLUMN billing.subscriptions.id IS
  'Clave primaria UUID generada automáticamente.';
COMMENT ON COLUMN billing.subscriptions.customer_id IS
  'Customer dueño de la suscripción.';
COMMENT ON COLUMN billing.subscriptions.plan_id IS
  'Plan contratado.';
COMMENT ON COLUMN billing.subscriptions.status IS
  'Estado del ciclo de vida (trialing/active/past_due/canceled/etc), espejo del estado real en el proveedor.';
COMMENT ON COLUMN billing.subscriptions.current_period_start IS
  'Inicio del ciclo de facturación actual.';
COMMENT ON COLUMN billing.subscriptions.current_period_end IS
  'Fin del ciclo de facturación actual -- fecha del próximo cobro/renovación.';
COMMENT ON COLUMN billing.subscriptions.cancel_at_period_end IS
  'true = el usuario canceló pero conserva acceso hasta current_period_end (no es un borrado inmediato).';
COMMENT ON COLUMN billing.subscriptions.canceled_at IS
  'Timestamp en que se solicitó la cancelación (distinto de cuándo deja de tener efecto).';
COMMENT ON COLUMN billing.subscriptions.trial_start IS
  'Inicio del período de prueba, si lo tuvo.';
COMMENT ON COLUMN billing.subscriptions.trial_end IS
  'Fin del período de prueba; a partir de acá se cobra.';
COMMENT ON COLUMN billing.subscriptions.provider IS
  'Payment provider that manages this subscription, such as mock, stripe, or mercadopago.';
COMMENT ON COLUMN billing.subscriptions.external_subscription_id IS
  'Provider subscription identifier. Unique together with provider when present.';
COMMENT ON COLUMN billing.subscriptions.metadata IS
  'jsonb libre para datos auxiliares del proveedor que no ameritan columna propia.';
COMMENT ON COLUMN billing.subscriptions.created_at IS
  'Timestamp de creación (inmutable).';
COMMENT ON COLUMN billing.subscriptions.updated_at IS
  'Timestamp de última modificación.';

COMMENT ON INDEX billing.idx_subscriptions_customer IS
  'Soporte de FK: lookup de suscripciones por customer.';
COMMENT ON INDEX billing.idx_subscriptions_plan IS
  'Soporte de FK: lookup de suscripciones por plan (ej. reportes de adopción).';
COMMENT ON INDEX billing.idx_subscriptions_status IS
  'Soporte de queries filtrando por estado (ej. listar todas las active/trialing).';

-- ============================================================================
-- billing.subscription_items
-- ============================================================================
COMMENT ON TABLE billing.subscription_items IS
  'Líneas de una suscripción (F2-2A) -- soporta suscripciones con más de un ítem (ej. flat fee + usage-based). La mayoría de los planes tienen un solo ítem.';
COMMENT ON COLUMN billing.subscription_items.id IS
  'Clave primaria UUID generada automáticamente.';
COMMENT ON COLUMN billing.subscription_items.subscription_id IS
  'Suscripción a la que pertenece este ítem.';
COMMENT ON COLUMN billing.subscription_items.description IS
  'Descripción del ítem tal como aparece en la factura.';
COMMENT ON COLUMN billing.subscription_items.type IS
  'Tipo de cobro del ítem: flat (monto fijo) o usage-based.';
COMMENT ON COLUMN billing.subscription_items.quantity IS
  'Cantidad del ítem (ej. asientos, unidades de uso).';
COMMENT ON COLUMN billing.subscription_items.unit_price IS
  'Precio unitario en centavos.';
COMMENT ON COLUMN billing.subscription_items.currency IS
  'Código ISO 4217 de 3 letras.';
COMMENT ON COLUMN billing.subscription_items.created_at IS
  'Timestamp de creación (inmutable).';
COMMENT ON COLUMN billing.subscription_items.updated_at IS
  'Timestamp de última modificación.';

COMMENT ON INDEX billing.idx_subscription_items_subscription IS
  'Soporte de FK: listar los ítems de una suscripción.';

-- ============================================================================
-- billing.invoices
-- ============================================================================
COMMENT ON TABLE billing.invoices IS
  'Facturas emitidas por el proveedor de pago (F2-2A) -- espejo de solo lectura, nunca se generan facturas desde esta app.';
COMMENT ON COLUMN billing.invoices.id IS
  'Clave primaria UUID generada automáticamente.';
COMMENT ON COLUMN billing.invoices.customer_id IS
  'Customer facturado.';
COMMENT ON COLUMN billing.invoices.subscription_id IS
  'Suscripción que originó la factura. NULL si es un cargo one-off.';
COMMENT ON COLUMN billing.invoices.provider IS
  'Payment provider that issued the invoice. External invoice identity is scoped by this provider.';
COMMENT ON COLUMN billing.invoices.number IS
  'Número de factura legible asignado por el proveedor (para mostrar al usuario).';
COMMENT ON COLUMN billing.invoices.status IS
  'Estado de la factura (draft/open/paid/void/uncollectible), espejo del proveedor.';
COMMENT ON COLUMN billing.invoices.currency IS
  'Código ISO 4217 de 3 letras.';
COMMENT ON COLUMN billing.invoices.subtotal IS
  'Subtotal antes de impuestos, en centavos.';
COMMENT ON COLUMN billing.invoices.tax IS
  'Monto de impuestos, en centavos.';
COMMENT ON COLUMN billing.invoices.total IS
  'Total a pagar (subtotal + tax), en centavos.';
COMMENT ON COLUMN billing.invoices.amount_paid IS
  'Monto efectivamente pagado hasta el momento, en centavos.';
COMMENT ON COLUMN billing.invoices.period_start IS
  'Inicio del período que cubre esta factura.';
COMMENT ON COLUMN billing.invoices.period_end IS
  'Fin del período que cubre esta factura.';
COMMENT ON COLUMN billing.invoices.paid_at IS
  'Timestamp en que se confirmó el pago. NULL = todavía impaga.';
COMMENT ON COLUMN billing.invoices.external_invoice_id IS
  'ID de la factura en el proveedor externo.';
COMMENT ON COLUMN billing.invoices.hosted_url IS
  'URL alojada por el proveedor donde el usuario puede ver/pagar la factura.';
COMMENT ON COLUMN billing.invoices.pdf_url IS
  'URL del PDF descargable de la factura, generado por el proveedor.';
COMMENT ON COLUMN billing.invoices.created_at IS
  'Timestamp de creación (inmutable).';
COMMENT ON COLUMN billing.invoices.updated_at IS
  'Timestamp de última modificación (ej. al cambiar de estado).';

COMMENT ON INDEX billing.invoices_number_key IS
  'El número de factura es único por proveedor.';
COMMENT ON INDEX billing.idx_invoices_customer_date IS
  'Soporte de list_account_invoices(): historial de facturas de un customer ordenado por fecha.';
COMMENT ON INDEX billing.idx_invoices_subscription IS
  'Soporte de FK: facturas de una suscripción.';

-- ============================================================================
-- billing.invoice_line_items
-- ============================================================================
COMMENT ON TABLE billing.invoice_line_items IS
  'Líneas de detalle de una factura (F2-2A) -- espejo de solo lectura de lo que factura el proveedor.';
COMMENT ON COLUMN billing.invoice_line_items.id IS
  'Clave primaria UUID generada automáticamente.';
COMMENT ON COLUMN billing.invoice_line_items.invoice_id IS
  'Factura a la que pertenece esta línea.';
COMMENT ON COLUMN billing.invoice_line_items.description IS
  'Descripción de la línea tal como la muestra el proveedor (ej. "Plan Pro -- Ago 2026").';
COMMENT ON COLUMN billing.invoice_line_items.quantity IS
  'Cantidad facturada en esta línea.';
COMMENT ON COLUMN billing.invoice_line_items.unit_price IS
  'Precio unitario en centavos.';
COMMENT ON COLUMN billing.invoice_line_items.amount IS
  'Monto total de la línea (quantity * unit_price, salvo ajustes del proveedor), en centavos.';
COMMENT ON COLUMN billing.invoice_line_items.created_at IS
  'Timestamp de creación (inmutable).';

COMMENT ON INDEX billing.idx_invoice_line_items_invoice IS
  'Soporte de FK: listar las líneas de una factura.';

-- ============================================================================
-- billing.payment_methods
-- ============================================================================
COMMENT ON TABLE billing.payment_methods IS
  'Métodos de pago guardados de un customer (F2-2A) -- solo metadata no sensible (marca, últimos 4 dígitos); el dato completo de la tarjeta vive únicamente en el proveedor.';
COMMENT ON COLUMN billing.payment_methods.id IS
  'Clave primaria UUID generada automáticamente.';
COMMENT ON COLUMN billing.payment_methods.customer_id IS
  'Customer dueño del método de pago.';
COMMENT ON COLUMN billing.payment_methods.type IS
  'Tipo de método de pago (ej. card).';
COMMENT ON COLUMN billing.payment_methods.provider IS
  'Proveedor que custodia el método de pago real: ''stripe'' o ''mercadopago''.';
COMMENT ON COLUMN billing.payment_methods.external_id IS
  'ID del método de pago en el proveedor externo.';
COMMENT ON COLUMN billing.payment_methods.brand IS
  'Marca de la tarjeta (ej. visa, mastercard), solo para mostrar un ícono en la UI.';
COMMENT ON COLUMN billing.payment_methods.last_four IS
  'Últimos 4 dígitos de la tarjeta, para identificarla en la UI sin exponer el número completo.';
COMMENT ON COLUMN billing.payment_methods.exp_month IS
  'Mes de expiración de la tarjeta (1-12).';
COMMENT ON COLUMN billing.payment_methods.exp_year IS
  'Año de expiración de la tarjeta (4 dígitos).';
COMMENT ON COLUMN billing.payment_methods.is_default IS
  'true = método de pago usado por defecto en el próximo cobro.';
COMMENT ON COLUMN billing.payment_methods.created_at IS
  'Timestamp de creación (inmutable).';
COMMENT ON COLUMN billing.payment_methods.updated_at IS
  'Timestamp de última modificación.';

COMMENT ON INDEX billing.idx_payment_methods_customer IS
  'Soporte de FK: métodos de pago de un customer.';

-- ============================================================================
-- billing.v_mrr_by_plan (vista de reporting)
-- ============================================================================
COMMENT ON VIEW billing.v_mrr_by_plan IS
  'MRR (revenue mensual recurrente) agregado por plan, normalizando suscripciones anuales a su equivalente mensual. Solo lectura, para dashboards internos.';
COMMENT ON COLUMN billing.v_mrr_by_plan.plan_name IS
  'Nombre del plan (billing.plans.name).';
COMMENT ON COLUMN billing.v_mrr_by_plan.slug IS
  'Slug del plan (billing.plans.slug).';
COMMENT ON COLUMN billing.v_mrr_by_plan.interval IS
  'Periodicidad de facturación del plan.';
COMMENT ON COLUMN billing.v_mrr_by_plan.active_count IS
  'Cantidad de suscripciones activas/trialing de este plan.';
COMMENT ON COLUMN billing.v_mrr_by_plan.mrr_cents IS
  'Revenue mensual recurrente en centavos (suscripciones anuales divididas entre 12).';
COMMENT ON COLUMN billing.v_mrr_by_plan.currency IS
  'Moneda del monto mrr_cents.';
