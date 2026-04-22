# SaaS Boilerplate — Schema Fundacional sobre Supabase

Template vendible: el comprador solo enchufar su producto/servicio. Inspirado en Makerkit pero con mejoras enterprise.

---

## Contexto

- **Workspace:** `C:\_PROYECTOS_DOCKERS\SaaSBoilerplate` (vacío, desde cero)
- **Supabase:** Proyecto NUEVO en org `zgrouplabs` (tú lo creas manualmente)
- **UI:** Diseño en Stitch — "Retail Intelligence Dashboard" (14 screens, design system definido)
- **Next.js:** Se agrega después, de a poco
- **Referencia:** Makerkit (accounts, memberships, billing_customers, subscriptions)

---

## Decisiones Arquitectónicas

### Schema Separation (vs Makerkit todo en `public`)

| Schema    | Propósito                                    | Expuesto vía API? |
| --------- | -------------------------------------------- | ----------------- |
| `public`  | Profiles, accounts, memberships, invitations | ✅ PostgREST      |
| `billing` | Plans, subscriptions, invoices, payments     | ❌ Solo RPCs      |
| `audit`   | Logs inmutables                              | ❌ Solo admin     |
| `private` | Funciones SECURITY DEFINER                   | ❌ Nunca          |

> **Mejora vs Makerkit:** Billing aislado del API público previene exposición accidental de datos financieros.

### Profiles OIDC-Compliant

Campos basados en [OpenID Connect Standard Claims](https://openid.net/specs/openid-connect-core-1_0.html#StandardClaims):

| Campo DB       | OIDC Claim     | Tipo                   |
| -------------- | -------------- | ---------------------- |
| `id`           | `sub`          | `uuid PK → auth.users` |
| `given_name`   | `given_name`   | `text`                 |
| `family_name`  | `family_name`  | `text`                 |
| `display_name` | `name`         | `text GENERATED`       |
| `avatar_url`   | `picture`      | `text`                 |
| `locale`       | `locale`       | `text` (BCP47)         |
| `timezone`     | `zoneinfo`     | `text` (IANA)          |
| `phone_number` | `phone_number` | `text`                 |

> **¿Por qué OIDC?** Compatibilidad directa con SSO (Cognito, Auth0, Okta, Google). Si migras proveedor de auth, los campos mapean 1:1.

### Slug: ¿Para qué sirve?

Un `slug` es un identificador URL-safe único (`mi-empresa` en `/org/mi-empresa`). Se usa para:

- URLs legibles: `/dashboard/org/acme-corp` vs `/dashboard/org/550e8400-e29b`
- SEO-friendly
- API endpoints: `GET /api/orgs/acme-corp`
- Generado automáticamente del nombre, editable por el owner

### `metadata jsonb` vs columnas explícitas

| Aspecto          | `metadata jsonb`  | Columnas explícitas        |
| ---------------- | ----------------- | -------------------------- |
| **Queries**      | Lento (full scan) | Rápido (índice B-tree)     |
| **Validación**   | Runtime (app)     | DB-level (NOT NULL, CHECK) |
| **Indexación**   | GIN (parcial)     | B-tree (completo)          |
| **Esquema**      | Flexible          | Rígido                     |
| **BI/Reporting** | Difícil           | Directo                    |

**Decisión:** Columnas explícitas para todo campo conocido. `metadata jsonb` SOLO para extensiones del cliente (datos que no conocemos hoy). Siempre con `DEFAULT '{}'::jsonb`.

---

## Schema Completo — 16 Migraciones

### Migración 001: Extensions & Schemas

```sql
-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto" SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "moddatetime" SCHEMA extensions;

-- Schemas
CREATE SCHEMA IF NOT EXISTS billing;
CREATE SCHEMA IF NOT EXISTS audit;
CREATE SCHEMA IF NOT EXISTS private;

-- Revocar acceso público a schemas internos
REVOKE ALL ON SCHEMA billing FROM public, anon, authenticated;
REVOKE ALL ON SCHEMA audit FROM public, anon, authenticated;
REVOKE ALL ON SCHEMA private FROM public, anon, authenticated;

-- Grants controlados
GRANT USAGE ON SCHEMA billing TO authenticated;
GRANT USAGE ON SCHEMA audit TO service_role;
```

### Migración 002: Enum Types

```sql
CREATE TYPE public.account_type AS ENUM ('personal', 'team');
CREATE TYPE public.membership_role AS ENUM ('owner', 'admin', 'member', 'viewer');
CREATE TYPE public.invitation_status AS ENUM ('pending', 'accepted', 'revoked', 'expired');
CREATE TYPE billing.plan_interval AS ENUM ('month', 'year', 'one_time');
CREATE TYPE billing.subscription_status AS ENUM (
  'trialing', 'active', 'past_due', 'canceled', 'paused', 'unpaid', 'incomplete'
);
CREATE TYPE billing.invoice_status AS ENUM ('draft', 'open', 'paid', 'void', 'uncollectible');
CREATE TYPE billing.payment_method_type AS ENUM ('card', 'bank_transfer', 'wallet', 'other');
CREATE TYPE audit.action_type AS ENUM (
  'create', 'update', 'delete', 'login', 'logout', 'invite', 'role_change',
  'subscription_change', 'payment', 'export'
);
```

### Migración 003: Helper Functions

```sql
-- Auto-update updated_at
CREATE OR REPLACE FUNCTION private.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Slugify helper
CREATE OR REPLACE FUNCTION private.slugify(text)
RETURNS text LANGUAGE sql IMMUTABLE STRICT AS $$
  SELECT lower(regexp_replace(regexp_replace($1, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'));
$$;

-- Macro para aplicar trigger updated_at
CREATE OR REPLACE FUNCTION private.apply_updated_at_trigger(table_name regclass)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE format(
    'CREATE TRIGGER set_updated_at BEFORE UPDATE ON %s
     FOR EACH ROW EXECUTE FUNCTION private.set_updated_at()',
    table_name
  );
END;
$$;
```

### Migración 004: Profiles (OIDC-Compliant)

```sql
CREATE TABLE public.profiles (
  id            uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  given_name    text,
  family_name   text,
  display_name  text GENERATED ALWAYS AS (
    COALESCE(given_name || ' ' || family_name, given_name, family_name)
  ) STORED,
  avatar_url    text,
  locale        text DEFAULT 'es',
  timezone      text DEFAULT 'America/Santiago',
  phone_number  text,
  onboarding_completed boolean DEFAULT false,
  metadata      jsonb DEFAULT '{}'::jsonb,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),
  deleted_at    timestamptz   -- soft delete
);

SELECT private.apply_updated_at_trigger('public.profiles');

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION private.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
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

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION private.handle_new_user();
```

### Migración 005: Accounts (Multi-tenant core)

```sql
CREATE TABLE public.accounts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type            public.account_type NOT NULL DEFAULT 'team',
  name            text NOT NULL,
  slug            text UNIQUE NOT NULL,
  logo_url        text,
  billing_email   text,
  metadata        jsonb DEFAULT '{}'::jsonb,
  created_by      uuid REFERENCES public.profiles(id),
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  deleted_at      timestamptz
);

CREATE INDEX idx_accounts_slug ON public.accounts(slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_accounts_type ON public.accounts(type) WHERE deleted_at IS NULL;
SELECT private.apply_updated_at_trigger('public.accounts');

-- Auto-create personal account on profile creation
CREATE OR REPLACE FUNCTION private.handle_new_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  account_id uuid;
BEGIN
  INSERT INTO public.accounts (id, type, name, slug, created_by)
  VALUES (NEW.id, 'personal', COALESCE(NEW.display_name, 'Personal'),
          private.slugify(COALESCE(NEW.display_name, NEW.id::text)), NEW.id)
  RETURNING id INTO account_id;

  INSERT INTO public.accounts_memberships (account_id, user_id, role)
  VALUES (account_id, NEW.id, 'owner');

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION private.handle_new_profile();
```

### Migración 006: Memberships & Invitations

```sql
CREATE TABLE public.accounts_memberships (
  account_id  uuid REFERENCES public.accounts(id) ON DELETE CASCADE,
  user_id     uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  role        public.membership_role NOT NULL DEFAULT 'member',
  invited_by  uuid REFERENCES public.profiles(id),
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  PRIMARY KEY (account_id, user_id)
);

SELECT private.apply_updated_at_trigger('public.accounts_memberships');

CREATE TABLE public.invitations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  email       text NOT NULL,
  role        public.membership_role NOT NULL DEFAULT 'member',
  token       text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status      public.invitation_status DEFAULT 'pending',
  invited_by  uuid REFERENCES public.profiles(id),
  expires_at  timestamptz DEFAULT now() + interval '7 days',
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  UNIQUE(account_id, email)
);

CREATE INDEX idx_invitations_token ON public.invitations(token) WHERE status = 'pending';
SELECT private.apply_updated_at_trigger('public.invitations');
```

### Migración 007: Billing Plans

```sql
CREATE TABLE billing.plans (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text UNIQUE NOT NULL,
  name            text NOT NULL,
  description     text,
  interval        billing.plan_interval NOT NULL DEFAULT 'month',
  price           integer NOT NULL DEFAULT 0,  -- centavos
  currency        char(3) NOT NULL DEFAULT 'USD',
  trial_days      integer DEFAULT 0,
  features        jsonb DEFAULT '{}'::jsonb,    -- feature flags
  limits          jsonb DEFAULT '{}'::jsonb,    -- quotas
  sort_order      integer DEFAULT 0,
  is_active       boolean DEFAULT true,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

SELECT private.apply_updated_at_trigger('billing.plans');
```

### Migración 008: Billing Customers & Subscriptions

```sql
CREATE TABLE billing.customers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id      uuid UNIQUE NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  provider        text NOT NULL DEFAULT 'stripe',
  external_id     text,   -- stripe customer_id / mercadopago payer_id
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  UNIQUE(provider, external_id)
);

SELECT private.apply_updated_at_trigger('billing.customers');

CREATE TABLE billing.subscriptions (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id             uuid NOT NULL REFERENCES billing.customers(id) ON DELETE CASCADE,
  plan_id                 uuid NOT NULL REFERENCES billing.plans(id),
  status                  billing.subscription_status NOT NULL DEFAULT 'trialing',
  current_period_start    timestamptz,
  current_period_end      timestamptz,
  cancel_at_period_end    boolean DEFAULT false,
  canceled_at             timestamptz,
  trial_start             timestamptz,
  trial_end               timestamptz,
  provider                text NOT NULL DEFAULT 'stripe',
  external_subscription_id text,
  metadata                jsonb DEFAULT '{}'::jsonb,
  created_at              timestamptz DEFAULT now(),
  updated_at              timestamptz DEFAULT now()
);

CREATE INDEX idx_subscriptions_customer ON billing.subscriptions(customer_id);
CREATE INDEX idx_subscriptions_status ON billing.subscriptions(status) WHERE status = 'active';
SELECT private.apply_updated_at_trigger('billing.subscriptions');

CREATE TABLE billing.subscription_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES billing.subscriptions(id) ON DELETE CASCADE,
  description     text NOT NULL,
  type            text NOT NULL DEFAULT 'flat', -- flat, per_seat, metered
  quantity        integer DEFAULT 1,
  unit_price      integer NOT NULL DEFAULT 0,   -- centavos
  currency        char(3) DEFAULT 'USD',
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);
```

### Migración 009: Payment Methods

```sql
CREATE TABLE billing.payment_methods (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id     uuid NOT NULL REFERENCES billing.customers(id) ON DELETE CASCADE,
  type            billing.payment_method_type NOT NULL DEFAULT 'card',
  provider        text NOT NULL DEFAULT 'stripe',
  external_id     text,
  brand           text,       -- visa, mastercard
  last_four       char(4),
  exp_month       smallint,
  exp_year        smallint,
  is_default      boolean DEFAULT false,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);
```

### Migración 010: Invoices

```sql
CREATE TABLE billing.invoices (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id         uuid NOT NULL REFERENCES billing.customers(id),
  subscription_id     uuid REFERENCES billing.subscriptions(id),
  number              text UNIQUE,
  status              billing.invoice_status DEFAULT 'draft',
  currency            char(3) NOT NULL DEFAULT 'USD',
  subtotal            integer DEFAULT 0,
  tax                 integer DEFAULT 0,
  total               integer DEFAULT 0,
  amount_paid         integer DEFAULT 0,
  period_start        timestamptz,
  period_end          timestamptz,
  paid_at             timestamptz,
  external_invoice_id text,
  hosted_url          text,
  pdf_url             text,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

CREATE TABLE billing.invoice_line_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id  uuid NOT NULL REFERENCES billing.invoices(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity    integer DEFAULT 1,
  unit_price  integer NOT NULL,
  amount      integer NOT NULL,
  created_at  timestamptz DEFAULT now()
);
```

### Migración 011: Billing Events (Event Sourcing)

```sql
CREATE TABLE billing.events (
  id                bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_id       uuid REFERENCES billing.customers(id),
  event_type        text NOT NULL,
  provider          text NOT NULL DEFAULT 'stripe',
  external_event_id text UNIQUE, -- idempotency key
  payload           jsonb NOT NULL DEFAULT '{}'::jsonb,
  processed_at      timestamptz,
  created_at        timestamptz DEFAULT now()
);

CREATE INDEX idx_billing_events_type ON billing.events(event_type);
CREATE INDEX idx_billing_events_customer ON billing.events(customer_id);

-- Append-only: bloquear UPDATE/DELETE
CREATE OR REPLACE FUNCTION private.deny_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Mutations not allowed on append-only table %', TG_TABLE_NAME;
END;
$$;

CREATE TRIGGER billing_events_immutable
  BEFORE UPDATE OR DELETE ON billing.events
  FOR EACH ROW EXECUTE FUNCTION private.deny_mutation();
```

### Migración 012: Audit Logs

```sql
CREATE TABLE audit.logs (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id      uuid,
  actor_type    text DEFAULT 'user', -- user, system, webhook
  action        audit.action_type NOT NULL,
  resource_type text NOT NULL,
  resource_id   text,
  account_id    uuid,
  old_data      jsonb,
  new_data      jsonb,
  ip_address    inet,
  user_agent    text,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX idx_audit_actor ON audit.logs(actor_id);
CREATE INDEX idx_audit_resource ON audit.logs(resource_type, resource_id);
CREATE INDEX idx_audit_account ON audit.logs(account_id);
CREATE INDEX idx_audit_created ON audit.logs(created_at);

-- Append-only
CREATE TRIGGER audit_logs_immutable
  BEFORE UPDATE OR DELETE ON audit.logs
  FOR EACH ROW EXECUTE FUNCTION private.deny_mutation();
```

### Migración 013: RLS Policies

```sql
-- Helper function (SECURITY DEFINER para evitar recursión)
CREATE OR REPLACE FUNCTION private.get_user_role(p_account_id uuid, p_user_id uuid)
RETURNS public.membership_role
LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  SELECT role FROM public.accounts_memberships
  WHERE account_id = p_account_id AND user_id = p_user_id;
$$;

CREATE OR REPLACE FUNCTION private.user_is_member(p_account_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.accounts_memberships
    WHERE account_id = p_account_id AND user_id = p_user_id
  );
$$;

-- PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles: lectura pública" ON public.profiles
  FOR SELECT USING (deleted_at IS NULL);
CREATE POLICY "Profiles: update propio" ON public.profiles
  FOR UPDATE USING (id = (SELECT auth.uid()));

-- ACCOUNTS
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Accounts: lectura para miembros" ON public.accounts
  FOR SELECT USING (
    deleted_at IS NULL AND
    private.user_is_member(id, (SELECT auth.uid()))
  );
CREATE POLICY "Accounts: update por owner/admin" ON public.accounts
  FOR UPDATE USING (
    private.get_user_role(id, (SELECT auth.uid())) IN ('owner', 'admin')
  );

-- MEMBERSHIPS
ALTER TABLE public.accounts_memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Memberships: lectura miembros" ON public.accounts_memberships
  FOR SELECT USING (
    private.user_is_member(account_id, (SELECT auth.uid()))
  );
CREATE POLICY "Memberships: gestión owner/admin" ON public.accounts_memberships
  FOR ALL USING (
    private.get_user_role(account_id, (SELECT auth.uid())) IN ('owner', 'admin')
  );

-- INVITATIONS
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Invitations: lectura miembros" ON public.invitations
  FOR SELECT USING (
    private.user_is_member(account_id, (SELECT auth.uid()))
  );
CREATE POLICY "Invitations: crear owner/admin" ON public.invitations
  FOR INSERT WITH CHECK (
    private.get_user_role(account_id, (SELECT auth.uid())) IN ('owner', 'admin')
  );
```

### Migración 014: RPCs Públicas

```sql
-- Obtener mis cuentas con rol
CREATE OR REPLACE FUNCTION public.get_my_accounts()
RETURNS TABLE(
  account_id uuid, name text, slug text, type public.account_type,
  logo_url text, role public.membership_role
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT a.id, a.name, a.slug, a.type, a.logo_url, m.role
  FROM public.accounts a
  JOIN public.accounts_memberships m ON m.account_id = a.id
  WHERE m.user_id = (SELECT auth.uid()) AND a.deleted_at IS NULL;
$$;

-- Aceptar invitación
CREATE OR REPLACE FUNCTION public.accept_invitation(p_token text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_invitation public.invitations%ROWTYPE;
  v_user_id uuid := (SELECT auth.uid());
BEGIN
  SELECT * INTO v_invitation FROM public.invitations
  WHERE token = p_token AND status = 'pending' AND expires_at > now();

  IF NOT FOUND THEN RAISE EXCEPTION 'Invalid or expired invitation'; END IF;

  INSERT INTO public.accounts_memberships (account_id, user_id, role, invited_by)
  VALUES (v_invitation.account_id, v_user_id, v_invitation.role, v_invitation.invited_by)
  ON CONFLICT DO NOTHING;

  UPDATE public.invitations SET status = 'accepted', updated_at = now()
  WHERE id = v_invitation.id;

  RETURN v_invitation.account_id;
END;
$$;

-- Obtener suscripción activa de una cuenta
CREATE OR REPLACE FUNCTION public.get_account_subscription(p_account_id uuid)
RETURNS TABLE(
  plan_name text, plan_slug text, status billing.subscription_status,
  current_period_end timestamptz, cancel_at_period_end boolean, features jsonb
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT p.name, p.slug, s.status, s.current_period_end, s.cancel_at_period_end, p.features
  FROM billing.subscriptions s
  JOIN billing.customers c ON c.id = s.customer_id
  JOIN billing.plans p ON p.id = s.plan_id
  WHERE c.account_id = p_account_id AND s.status IN ('active', 'trialing')
  ORDER BY s.created_at DESC LIMIT 1;
$$;
```

### Migración 015: BI Views

```sql
-- MRR por plan
CREATE OR REPLACE VIEW billing.v_mrr_by_plan AS
SELECT p.name AS plan_name, p.slug, COUNT(*) AS active_count,
  SUM(p.price) AS mrr_cents, p.currency
FROM billing.subscriptions s
JOIN billing.plans p ON p.id = s.plan_id
WHERE s.status = 'active'
GROUP BY p.id, p.name, p.slug, p.currency;

-- Activity feed por cuenta
CREATE OR REPLACE VIEW audit.v_recent_activity AS
SELECT a.*, pr.display_name AS actor_name, pr.avatar_url
FROM audit.logs a
LEFT JOIN public.profiles pr ON pr.id = a.actor_id
ORDER BY a.created_at DESC;
```

### Migración 016: Seed Plans

```sql
INSERT INTO billing.plans (slug, name, description, interval, price, currency, trial_days, features, limits, sort_order)
VALUES
  ('free', 'Free', 'Para empezar', 'month', 0, 'USD', 0,
   '{"max_members": 1, "api_access": false}'::jsonb,
   '{"max_projects": 3}'::jsonb, 0),
  ('starter', 'Starter', 'Para equipos pequeños', 'month', 2900, 'USD', 14,
   '{"max_members": 5, "api_access": true}'::jsonb,
   '{"max_projects": 10}'::jsonb, 1),
  ('pro', 'Pro', 'Para empresas en crecimiento', 'month', 7900, 'USD', 14,
   '{"max_members": 25, "api_access": true, "priority_support": true}'::jsonb,
   '{"max_projects": -1}'::jsonb, 2),
  ('enterprise', 'Enterprise', 'Soluciones a medida', 'month', 0, 'USD', 30,
   '{"max_members": -1, "api_access": true, "priority_support": true, "sso": true}'::jsonb,
   '{"max_projects": -1}'::jsonb, 3);
```

---

## Scorecard de Calidad — Cómo Validamos

| Área               | Target | Cómo se verifica                                                |
| ------------------ | ------ | --------------------------------------------------------------- |
| **Modelado**       | 9/10   | Revisar normalización, no hay redundancia, FKs correctas        |
| **Seguridad**      | 9/10   | `get_advisors` security post-migración, RLS en TODAS las tablas |
| **Escalabilidad**  | 8/10   | Índices parciales, append-only con bigint identity              |
| **Extensibilidad** | 9/10   | `metadata jsonb` en puntos de extensión, schemas separados      |
| **Enterprise**     | 9/10   | Audit append-only, soft delete, OIDC profiles, event sourcing   |

### Verificación automatizada:

1. `get_advisors(security)` → debe retornar 0 issues críticos
2. `get_advisors(performance)` → validar índices
3. Query: `SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename NOT IN (SELECT tablename FROM pg_tables WHERE rowsecurity=true)` → debe dar 0 filas

---

## Entregables para el Workspace

```
C:\_PROYECTOS_DOCKERS\SaaSBoilerplate\
├── supabase/
│   └── migrations/
│       ├── 001_extensions_and_schemas.sql
│       ├── 002_enum_types.sql
│       ├── ... (016 archivos)
│       └── 016_seed_default_plans.sql
├── docs/
│   ├── SCHEMA.md          ← Diagrama ER + descripción
│   ├── RLS_POLICIES.md    ← Políticas documentadas
│   └── BILLING_FLOW.md    ← Flujo de suscripción
└── README.md
```

---

## Verificación Post-Deploy

1. Crear usuario → verificar auto-create profile + personal account
2. Crear team account → verificar slug generation
3. Invitar miembro → verificar token + accept flow
4. Crear suscripción → verificar billing customer linkage
5. `get_advisors` security + performance
6. Query de RLS coverage (todas las tablas públicas protegidas)
