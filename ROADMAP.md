# ROADMAP — Iroko SaaS Boilerplate · Fases de Cierre

> Documento maestro. Define **qué construimos, con qué reglas, y en qué orden**.
> Cada fase trae un **prompt listo para Claude Code**. Trabajamos fase por fase,
> cerrando puntos, sin abrir scope nuevo fuera de lo escrito acá.

---

## 0. La Constitución (reglas que gobiernan TODO)

### Identidad del producto

> **El boilerplate SaaS que exprime Supabase al máximo y corre en free tier.**
> Base profesional, vertical-agnostic, para lanzar cualquier SaaS (un robot, un CRM,
> una app de IA) en días — o se vende como starter kit, o es tu base perpetua para partir.

**Cuña diferencial:** LatAm-first (MercadoPago + español-first) + profundidad de
seguridad/multi-tenancy que los boilerplates genéricos no tienen. Globalmente vendible
gracias a Stripe + inglés; único gracias a MercadoPago + RLS de verdad.

### La Regla de Oro (el recortador de scope)

> **Si se puede hacer nativo en Supabase y entra en free tier → está en el v1.**
> **Si necesita infra externa o plan pago → es add-on Pro/Enterprise, o no va.**

Esta regla es la autoridad final. Ante cualquier duda de "¿meto esto?", se mide contra
la regla. Si no entra, no entra.

### Qué está DENTRO y qué está FUERA

| ✅ DENTRO (Supabase-native + free)                | ❌ FUERA del repo (error de categoría)                                     |
| ------------------------------------------------- | -------------------------------------------------------------------------- |
| Postgres + RLS, Auth, Storage, Realtime           | SOC2 / ISO / HIPAA / PCI (son certificaciones de empresa, no código)       |
| Edge Functions, pg_cron, **pgmq** (colas), pg_net | Temporal / BullMQ / DLQ / Disaster Recovery (lo opera el comprador)        |
| pgvector (vertical IA), Vault (secrets)           | Distributed tracing pesado (Datadog/OTel full)                             |
| Stripe + MercadoPago (externo inevitable, free)   | SAML / SCIM a mano → **"WorkOS-ready"**, no construido (add-on Enterprise) |
| Resend email (externo inevitable, free)           | Multi-moneda / POs / contratos anuales (Pro tier)                          |

### Matriz de Tiers (estrategia de producto y pricing)

- **Core (v1 — Fases 1–4):** lo que vende el boilerplate. Todo Supabase-native + free.
- **Pro (post-v1):** API keys avanzadas, ABAC/permisos granulares, usage-based billing,
  nested orgs/departments.
- **Enterprise (cuando haya compradores):** SAML/SCIM vía WorkOS, multi-moneda, contratos.

### Mapa "necesidad → Supabase-native, free tier"

Catálogo de módulos. La columna **Superficie** indica qué UI lleva cada uno — **no todos necesitan página**.

| Necesidad                     | Implementación nativa                                           | Superficie / UI                                                   | Estado     |
| ----------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------- | ---------- |
| Auth (email/oauth/magic/MFA)  | Supabase Auth                                                   | 🟡 Flujos login/signup + settings MFA                             | ✅ existe  |
| Multi-tenant + RBAC           | Postgres + RLS + custom access token hook (JWT claims)          | 🟢 Members + account switcher (RLS = enforcement, sin vista)      | ✅ core    |
| Audit logs                    | triggers Postgres (schema `audit`) + `v_recent_activity`        | 🟢 Visor por cuenta en `dashboard/activity`, filtros + paginación | ✅ F2 (2G) |
| Notificaciones in-app         | tabla + **Realtime** (live, sin polling)                        | 🟡 Campanita + lista (leer/descartar) — no se "crean"             | F2         |
| Email transaccional           | Resend (free 3k/mes)                                            | ⚪ Servicio `sendEmail()` disparado por eventos                   | F2         |
| Webhooks salientes            | **Database Webhooks / pg_net**                                  | 🟢 CRUD de endpoints + log de entregas read-only                  | F2         |
| API keys                      | tabla hasheada + RPC `verify_api_key` (route Next)              | 🟢 Crear / listar / revocar (sin editar)                          | F2         |
| Feature flags                 | tabla Postgres + RLS                                            | 🟢 Página admin (toggles + asignación)                            | F2         |
| Jobs / colas                  | **pg_cron + pgmq + Edge Functions**                             | ⚪ Backend puro (panel de estado opcional)                        | F2         |
| Storage de archivos           | Supabase Storage + RLS                                          | 🟡 Widgets embebidos (avatar, subir archivos)                     | ✅ existe  |
| Admin panel + impersonation   | RLS `platform_admin` + service role                             | 🟡 Páginas read + acciones (admin)                                | F3         |
| GDPR export / right-to-delete | funciones Postgres (RPC)                                        | 🟡 2 botones en settings + confirmación                           | F3         |
| Billing (suscripciones)       | Stripe + MercadoPago, estado en Postgres, webhook en route Next | 🟡 Plan / facturas + suscribir / cancelar                         | F2         |
| Vertical IA ("IA tuneada")    | **pgvector**                                                    | 🟢 Según el vertical                                              | base lista |

**Superficie:** 🟢 página + CRUD visual · 🟡 UI sin CRUD (widget / lista / acciones) · ⚪ sin vista (backend / servicio).

### Free tier — la verdad (para no mentirle al comprador)

- **Supabase free:** 500MB DB · 1GB storage · 50k MAU · 500k Edge invocations/mes.
  Se **pausa a los 7 días de inactividad** (importa para demos, no para SaaS con usuarios).
- **Vercel Hobby:** gratis pero **no-comercial**. Al monetizar → Vercel Pro (~USD 20/mes).
- **Resend:** 3.000 mails/mes free. **Stripe/MercadoPago:** sin fee mensual (comisión por venta).
- **Auth Pro-gated:** session timebox / inactivity timeout (`0s` en Free, se activan en `config.toml`
  tras upgrade) y **leaked password protection** (HaveIBeenPwned, toggle en Dashboard → Authentication
  → Sign In / Providers, sin equivalente declarable en `config.toml`) requieren plan Pro.

El pitch es honesto: **"gratis para partir; escalás a pago cuando crecés"**.

---

## 1. Estándares de Ingeniería (Definition of Done compartida)

**Todas las fases cumplen esto. Los prompts lo referencian; no es negociable.**

### Stack y convenciones del repo (resumen accionable)

- **Next.js 16 App Router + React 19 + TS strict.** React Compiler activo →
  **NO usar `useMemo`/`useCallback` manuales.**
- **Sin `middleware.ts`** (rompe Turbopack). Toda lógica edge va en **`src/proxy.ts`**.
- **Env vars** se declaran y validan en **`src/env.ts`** (`@t3-oss/env-nextjs`) antes de usar `process.env`.
- **i18n:** `next-intl`, navegación tipada desde `@/i18n/routing` (`Link`, `useRouter`, `redirect`, `usePathname`).
  Params son `Promise`. **Toda string nueva va en `messages/en.json` Y `messages/es.json`.**
- **Logging:** `import { logger } from '@/lib/logger'` (Pino). Campos tipados: `userId`, `tenantId`,
  `requestId`, `action`, `component`. Auto-redacta secrets.
- **Supabase:** `.schema('name')` para schemas no-public. RLS con funciones `private.*`
  `SECURITY DEFINER` + `SET search_path = ''`. Tras tocar el schema: **`pnpm supa:gen:types`**.
- **Estilos:** Tailwind 4 + tokens MD3. Merge de clases con `cn()` de `@/lib/utils`.
  Iconos Material Symbols (font) o `lucide-react`.

### Calidad de código — SOLID / DRY / KISS

- **S**ingle Responsibility: cada función/módulo hace UNA cosa. Server actions finas;
  lógica en `src/lib/*` testeable.
- **O/L/I/D:** dependé de abstracciones (ej. `PaymentProvider` interface, no Stripe directo en la UI).
- **DRY:** cero duplicación. Helpers compartidos. Si copiás dos veces, extraé.
- **KISS:** la solución más simple que funcione. Nada de abstracción especulativa.
- **No `any`** (error de ESLint). **`import type`** para tipos. **Sin secrets hardcodeados**
  (`eslint-plugin-no-secrets`, tolerancia 5.7).

### Tests (obligatorio por feature)

- **Vitest** (unit, jsdom) para toda lógica en `src/lib/*`, parsers, mappers, RPCs wrappers,
  reducers. Mock de Supabase donde aplique.
- **Playwright** (e2e) para flujos críticos de usuario (signup, invite, checkout, etc.).
- Seguir **`TESTING-PLAN.md`** (prioridades P0–P2, patrones de mock, convenciones de assertion).
- Tests para schema/RLS en `supabase/tests/` cuando se agregan políticas.

### Documentación — JSDoc

- **JSDoc en TODO export** (funciones, tipos, componentes públicos, RPC wrappers, server actions):
  propósito, `@param`, `@returns`, `@throws`, y un `@example` si no es trivial.
- Comentarios de **por qué**, no de **qué**. El "qué" lo dice el código.
- Cada migración nueva: header con propósito + comentarios `COMMENT ON TABLE/COLUMN`.

### Commits y entrega

- **Conventional commits** (commitlint): `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`.
  Un commit por cambio lógico, no un mega-commit.
- **Definition of Done de cada tarea:**
  ```
  pnpm typecheck && pnpm lint && pnpm format:check && pnpm test   # === pnpm validate ===
  ```
  debe estar **en verde** antes de dar algo por terminado. Para cambios de schema, además
  `pnpm supa:gen:types` y commitear `src/types/database.ts`.
- `pnpm knip` sin nuevos unused exports/files.

---

## 2. Las Fases

Orden no arbitrario: **cada fase habilita la siguiente.** F1 deja la base limpia y
re-skineable; F2 mete los módulos Supabase-native; F3 la capa admin/compliance; F4 lo
vuelve vendible.

---

### F1 — Fundación limpia + DX

**Objetivo:** que la app deje de ser un boilerplate de e-commerce disfrazado y pase a ser
una **base profesional, genérica y re-skineable en un solo lugar.**

**Done when:**

- No queda ni una pantalla/string de e-commerce (ventas, inventario de almacén, reportes demo).
- Existe `src/config/` central: cambiar nombre, marca, colores, URLs y feature toggles
  en UN lugar re-skinea toda la app.
- El robot vive como **vertical de ejemplo** desacoplado, no incrustado en "operations".
- `pnpm validate` en verde; `.env.example` y `src/env.ts` documentados y alineados.

**Tareas detalladas:**

1. **Purga de demo e-commerce.** Eliminar rutas y componentes huérfanos:
   `dashboard/inventory`, `dashboard/reports`, y el dashboard de ventas de
   `dashboard/operations` (incluido `components/dashboard/operations/operations-dashboard.tsx`
   con KPIs `Total Sales / Orders / Conversion`). Limpiar claves i18n asociadas
   (`Dashboard.kpis.*`, etc.) en `en.json` y `es.json`, y tests que las referencien.
2. **Config central.** Crear `src/config/app.config.ts` (o `src/config/index.ts`) tipado:
   `name`, `brand`, `description`, `urls` (site, support, docs, social), `supportEmail`,
   `defaultLocale`, `locales`, `features` (toggles de módulos/verticales), `theme` (refs a tokens).
   Reemplazar todo `"Iroko"`/`"saasboilerplate"` hardcodeado (sidebar, layout, metadata,
   `package.json` name, sitemap) por lecturas del config.
3. **Desacoplar el vertical robot.** Mover `dashboard/operations/robot` → `dashboard/robot`.
   Actualizar nav (`app-sidebar-client.tsx`) y links. Marcarlo como ejemplo detrás de un
   toggle `features.verticals.robot` del config. Arreglar el título "Iroko Administration"
   para que use el brand del config.
4. **Home real.** Reemplazar los KPIs de ventas falsos de `dashboard/page.tsx` por un
   resumen real de la cuenta/membership (o un placeholder limpio impulsado por config).
5. **DX base.** Revisar `.env.example` (todas las vars documentadas con comentario) y que
   `src/env.ts` valide cada una. README mínimo de "clone → configure → run".

**Archivos clave:** `src/app/[locale]/dashboard/*`, `src/components/dashboard/operations/*`,
`src/components/layout/app-sidebar-client.tsx`, `src/config/*` (nuevo), `messages/*.json`,
`src/env.ts`, `.env.example`, `package.json`.

**🤖 Prompt para Claude Code — F1:**

```
Trabajás sobre el repo iroko (Next.js 16 + Supabase, ver CLAUDE.md y la sección
"Estándares de Ingeniería" de ROADMAP.md — cumplilos todos).

Implementá la FASE 1: Fundación limpia + DX.

1. Purgá todo el demo de e-commerce: eliminá las rutas dashboard/inventory,
   dashboard/reports y el dashboard de ventas de dashboard/operations (incluido el
   componente operations-dashboard.tsx con KPIs de ventas). Limpiá las claves i18n
   asociadas en messages/en.json y messages/es.json y cualquier test que las use.
2. Creá un config central tipado en src/config/app.config.ts: name, brand, description,
   urls, supportEmail, defaultLocale, locales, features (toggles), theme. Reemplazá TODO
   "Iroko"/"saasboilerplate" hardcodeado (sidebar, layout, metadata, package.json name,
   sitemap) por lecturas de ese config. Documentá cada campo con JSDoc.
3. Mové el vertical robot de dashboard/operations/robot a dashboard/robot, actualizá nav y
   links, y poné el item detrás de un toggle features.verticals.robot del config.
4. Reemplazá los KPIs falsos de dashboard/page.tsx por un resumen real de la cuenta o un
   placeholder limpio impulsado por config.
5. Alineá .env.example con src/env.ts (toda var documentada y validada).

Reglas: SOLID/DRY/KISS, sin `any`, import type, sin middleware.ts. JSDoc en todo export.
Actualizá/eliminá tests rotos y agregá tests Vitest para el config loader.
Terminá con `pnpm validate` en verde y `pnpm knip` sin nuevos unused. Commits convencionales
y atómicos (feat:/refactor:/chore:/test:). No abras scope fuera de esta fase.
```

---

### F2 — Módulos Supabase-native (Core)

**Objetivo:** **reventar Supabase.** Meter los módulos que todo dev espera funcionando
out-of-the-box, cada uno como showcase de una capacidad nativa, todo en free tier.

**Done when:** billing real (Stripe + MercadoPago) con webhooks actualizando estado;
email transaccional; notificaciones in-app live por Realtime; webhooks salientes + API keys;
feature flags; y un patrón de jobs/colas con pg_cron + pgmq + Edge Function. Todo con
migraciones, tipos regenerados, tests y JSDoc.

**Tareas detalladas (sub-módulos):**

- **2A · Billing.** Partido en dos entregas:
  - **2A-core (✅ hecho):** interfaz `PaymentProvider` + factory `registry.ts` (`src/lib/billing/`,
    "si la pasarela existe en env, se agrega") con `MockProvider` (checkout simulado vía hosted-page
    firmada HMAC, sin credenciales). Webhook handler genérico en
    `/api/webhooks/[provider]` → RPC `apply_subscription_event` (idempotente por
    `external_event_id`, emite `subscription.*` a los webhooks salientes de 2D). Máquina de
    estados pura (`subscription-state.ts`). Plan-gating (`entitlements.ts`:
    `hasFeature`/`getLimit`/`withinLimit`) leyendo `billing.plans.features/limits` vía RPC.
    Seed Free/Pro/Scale (mensual+anual). UI real de planes + estado + historial de facturas.
  - **2A-providers (⏳ próximo):** agregar el primer proveedor real (Stripe / MercadoPago /
    Lemon Squeezy) implementando `PaymentProvider` — sin tocar la UI, el webhook handler ni el
    registry (solo `providers/<nombre>.ts` + env vars + un `if` en `registry.ts`). Lemon Squeezy
    es Merchant of Record (maneja impuestos globales, modelo distinto a Stripe/MP que son
    processors directos) — la interfaz ya definida debe cubrir ambos modelos sin cambios.
- **2B · Email.** Integrar **Resend** + plantillas (React Email o templates simples) para
  invite, reset, welcome, receipt. Abstracción `sendEmail()` en `src/lib/email/`. Conectar
  el envío real del email de invitación de `members`.
- **2C · Notificaciones in-app (Realtime).** Tabla `public.notifications` (+ RLS), helper
  server `notify(userId, payload)`, hook cliente suscrito a **Supabase Realtime**, y UI
  (campana + dropdown). Cero polling.
- **2D · Webhooks salientes + API keys.** Tablas `webhook_endpoints`, `webhook_deliveries`,
  `api_keys` (clave **hasheada**, nunca en claro) con RLS. Entrega vía **Database Webhooks /
  pg_net**. Un route handler de ejemplo autenticado por API key. UI para administrar
  endpoints y keys.
- **2E · Feature flags.** Tablas `feature_flags` + `feature_flag_assignments` (+ RLS).
  Helper `isEnabled(flag, ctx)`. (UI admin llega en F3.)
- **2F · Jobs / colas.** Patrón de referencia: cola con **pgmq**, scheduler con **pg_cron**,
  y un worker **Edge Function** (ej. procesar cola de emails o limpieza). Documentar el patrón
  como "así se hacen jobs sin infra externa".
- **2G · Audit Log Viewer.** La DB ya existe (`audit.logs`, `audit.v_recent_activity`, 6 triggers
  activos, inmutabilidad garantizada). Lo que falta: RPC `get_account_audit_logs(account_id, limit,
cursor)` `SECURITY DEFINER` que valida que el caller es `owner` o `admin` de esa cuenta (vía
  `private.user_is_member`). UI en `dashboard/settings/activity`: tabla paginada con filtros por
  `action` y `resource_type`, columnas actor + acción + recurso + fecha. Accesible solo para roles
  `owner`/`admin`; la vista cross-account (plataforma) queda para F3.

**Orden ejecutado (histórico, actualizado 2026-07-09):**

| #   | Módulo                   | Estado                | Por qué en ese orden                                                                                                                                                                                                                                                                       |
| --- | ------------------------ | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | 2E · Feature Flags       | ✅ hecho              | El más simple (solo tablas + helper). 2A necesita `hasFeature()`/entitlements para el plan-gating.                                                                                                                                                                                         |
| 2   | 2B · Email               | ✅ hecho              | Se conecta a 2A (receipts, welcome) y se usa en 2C (notificaciones por mail).                                                                                                                                                                                                              |
| 3   | 2C · Notificaciones      | ✅ hecho              | Realtime in-app. Reutiliza 2B para emails; se dispara con eventos de 2A/2D.                                                                                                                                                                                                                |
| 4   | 2G · Audit Log Viewer    | ✅ hecho              | Se coló entre medio (RPC + UI ya listos); no dependía de nada del resto.                                                                                                                                                                                                                   |
| 5   | 2D · Webhooks + API keys | ✅ hecho              | Deja el punto de enchufe (`private.emit_webhook_event`) para que 2A emita `subscription.*`.                                                                                                                                                                                                |
| 6   | 2A · Billing — **core**  | ✅ hecho (2026-07-09) | `PaymentProvider` + factory registry + `MockProvider` + entitlements + UI real + e2e. Sin proveedor real todavía.                                                                                                                                                                          |
| 7   | 2A · Billing — providers | ✅ hecho (2026-07-10) | Adapters reales Stripe + MercadoPago sobre la interfaz `PaymentProvider` ya construida. Lemon Squeezy descartado.                                                                                                                                                                          |
| 8   | 2F · Jobs / colas        | ✅ hecho (2026-07-13) | Patrón pgmq + pg_cron + Edge Function: cola `email_queue`, RPC `broadcast_alert_email` (un mensaje por owner de cuenta), worker `process-email-queue` (fetch directo a Resend, sin SDK), cron cada minuto vía pg_net. Sin gate de admin (llega en F3); sin UI (backend puro, per ROADMAP). |

**🤖 Prompt para Claude Code — F2 (ejecutar sub-módulo por sub-módulo, no todo junto):**

```
Trabajás sobre iroko. Cumplí la sección "Estándares de Ingeniería" de ROADMAP.md.

Implementá la FASE 2, sub-módulo {2A|2B|2C|2D|2E|2F} (uno por corrida).

Reglas de arquitectura:
- TODO nativo Supabase + free tier (Postgres/RLS/Realtime/Edge Functions/pg_cron/pgmq/pg_net).
  Los únicos externos permitidos: Stripe, MercadoPago, Resend.
- Billing detrás de una interfaz PaymentProvider (no acoplar Stripe/MP a la UI).
- Migraciones siguiendo el patrón existente (numeradas, RLS con private.* SECURITY DEFINER,
  COMMENT ON TABLE/COLUMN). Tras la migración: `pnpm supa:gen:types` y commitear database.ts.
- Secrets/credenciales declarados y validados en src/env.ts. Nunca en claro; API keys hasheadas.

Entregables del sub-módulo:
- Migración(es) + tipos regenerados.
- Lógica en src/lib/<modulo>/ con JSDoc en todo export.
- UI mínima funcional (si aplica), i18n en en.json y es.json, accesible y responsive.
- Tests Vitest de la lógica (mock Supabase) y, para flujos críticos (checkout, invite),
  un test Playwright.
- `pnpm validate` en verde + `pnpm knip` limpio. Commits convencionales atómicos.

No avances al siguiente sub-módulo hasta cerrar el actual en verde.
```

---

### F3 — Plataforma admin + Compliance + Onboarding

**Objetivo:** la capa "clase MakerKit": back-office de soporte, cumplimiento legal y la
primera experiencia del usuario.

**Done when:** existe `/dashboard/admin` (solo `platform_admin`, MFA) con lista de cuentas +
estado de pago + visor de audit logs; impersonation auditada; export/borrado GDPR;
onboarding post-signup; páginas legales + cookie consent; y anuncios broadcast.

**Tareas detalladas:**

1. **Super-admin / back-office.** Tabla `platform_admins` + `private.is_platform_admin()`.
   Extender RLS de las tablas necesarias con `OR private.is_platform_admin()`. Ruta
   `/dashboard/admin` protegida (requiere MFA). Vistas: cuentas, estado de suscripción/pago
   (resuelve el caso call-center), visor **cross-account** de `audit.logs` (distinto del visor
   por cuenta de 2G, que es solo para el admin de esa cuenta).
2. **Impersonation ("ver como").** Flujo seguro con **banner permanente**, salida clara, y
   **registro en audit logs** de cada acción mientras se impersona.
3. **GDPR.** RPCs `export_my_data()` (devuelve JSON completo del usuario/tenant) y
   `delete_my_account()` (borrado en cascada, respetando FKs). UI en `account` settings.
4. **Onboarding.** Wizard post-signup: confirmar/crear org → invitar equipo → elegir plan →
   branding. Impulsado por config (skippable según `features`).
5. **Legal + cookies.** Páginas Términos y Privacidad (en `(public)`), banner de cookie
   consent config-driven.
6. **Anuncios (broadcast).** Tabla `announcements` + UI admin para publicar avisos in-app a
   todas las cuentas (reusa el canal de notificaciones de 2C). Web push queda FUERA.
7. **Gate de admin para `broadcast_alert_email` (deuda 2F).** Restringir el RPC a
   `platform_admin` (hoy cualquier usuario autenticado puede invocarlo — limitación
   documentada de 2F). Opcional: botón de disparo en `/dashboard/admin`.
8. **Logo de organización (deuda Storage).** El bucket `org-assets` existe en `config.toml`
   pero no tiene políticas RLS ni UI. Agregar upload de logo en `org/settings` (patrón de
   avatar de perfil: path en DB + `storageUrl()`), políticas RLS del bucket, y mostrar el
   logo en el account switcher (`accounts.logo_url` ya existe en el schema).
9. **Vault para secrets de webhooks (deuda 2D).** `webhook_endpoints.secret` se guarda en
   texto plano (protegido por RLS/RPCs pero sin cifrado at-rest). Migrar a Supabase Vault
   (`vault.create_secret` / `vault.decrypted_secrets`) y ajustar `process-webhook-deliveries`
   para leer el secret desde Vault al firmar. Cumple la promesa "Vault (secrets)" del mapa.
10. **Advisors en CI (deuda DX).** Los scripts `supa:advisors` y `supa:lint` existen pero
    ningún workflow los corre. Agregar un job al nightly que los ejecute contra el stack
    local y falle en findings de seguridad (RLS sin índice, SECURITY DEFINER sin
    search_path, etc.).
11. **Presence "miembros online" (opcional, demo-value).** Badge de presencia en la lista
    de members reusando Realtime (canal `account:{id}:presence`, uso puntual per regla de
    realtime). Única primitiva de Realtime aún sin demostrar en el boilerplate.
12. **Cablear entitlements a la UI (deuda 2A — el ejemplo "free ve esto / pago ve esto").**
    La infraestructura completa existe (`billing.plans.features/limits`, RPC
    `get_account_entitlements`, helpers `hasFeature/getLimit/withinLimit` testeados) pero
    **ningún componente ni server action la consume** — la única UI consciente del plan es
    la página de billing. Demostrar el patrón end-to-end en las 3 superficies existentes:
    - **Webhooks** (feature booleana): si `hasFeature('webhooks_enabled')` es false, la tab
      muestra empty state con CTA "Disponible en Pro" en vez del CRUD.
    - **API keys** (límite numérico): botón "Crear" deshabilitado con contador
      `X/api_keys_max` cuando `withinLimit()` da false.
    - **Members** (seats): chequear `seats_max` al invitar.
      Incluye **fix de bug de consistencia**: `create_webhook_endpoint` tiene el límite
      hardcodeado en 10 (el valor de Pro) en vez de leer `webhook_endpoints_max` del plan —
      hoy una cuenta free (webhooks_enabled=false, max=0) puede crear hasta 10 webhooks.
      El RPC debe leer el límite desde `get_account_entitlements`. Aplicar el mismo criterio
      en el RPC de creación de API keys (límite del plan, no fijo).

**Nota (decisión 2026-07-13):** las extensiones habilitadas sin uso (`postgis`, `pg_trgm`,
`unaccent`, `pg_partman`) se quedan como están por ahora — son "activables" para verticales;
`pgvector` sigue reservada para el vertical IA. Revisar en F4 si conviene quitarlas del v1.

**🤖 Prompt para Claude Code — F3:**

```
Trabajás sobre iroko. Cumplí los "Estándares de Ingeniería" de ROADMAP.md.

Implementá la FASE 3: Plataforma admin + Compliance + Onboarding.

1. platform_admins + private.is_platform_admin(); extendé RLS con OR is_platform_admin()
   donde el back-office lo necesite. Ruta /dashboard/admin protegida con MFA obligatorio:
   lista de cuentas, estado de pago/suscripción, y visor de audit.logs.
2. Impersonation con banner permanente, salida segura y auditoría de toda acción.
3. RPCs export_my_data() y delete_my_account() (cascada respetando FKs) + UI en account settings.
4. Onboarding wizard post-signup (org → invitar → plan → branding), skippable por config.
5. Páginas legales (Términos, Privacidad) en (public) + cookie consent banner config-driven.
6. Tabla announcements + UI admin de broadcast in-app reusando el canal de notificaciones.
7. Gate platform_admin para broadcast_alert_email (deuda 2F).
8. Upload de logo de org al bucket org-assets (RLS + UI en org/settings + account switcher).
9. Migrar webhook_endpoints.secret a Supabase Vault y ajustar el worker de deliveries.
10. Job nightly que corra supa:advisors + supa:lint y falle en findings de seguridad.
11. (Opcional) Presence de members online vía canal account:{id}:presence.
12. Cablear entitlements a la UI: gate de webhooks por hasFeature('webhooks_enabled'),
    límite de API keys por withinLimit('api_keys_max'), seats_max al invitar members.
    Fix: create_webhook_endpoint y el RPC de API keys deben leer el límite del plan
    (get_account_entitlements), no valores hardcodeados.

Reglas: migraciones con patrón private.* + COMMENT, `pnpm supa:gen:types` tras el schema.
Seguridad primero (RLS, MFA en admin, auditoría de impersonation). JSDoc en todo export.
i18n en/es. Tests: Vitest para RPCs (export/delete), Playwright para onboarding e impersonation.
`pnpm validate` en verde + `pnpm knip` limpio. Commits convencionales atómicos.
```

---

### F4 — Producto vendible (Docs · Landing · Distribución)

**Objetivo:** convertir la base en algo que un developer **compra y usa**. Acá el cliente
es un dev; el producto es la **experiencia** (docs, DX, demos) y la **maquinaria de venta**.

**Done when:** sitio de docs navegable; landing con secciones de conversión + SEO/OG/JSON-LD;
blog MDX; modelo de licencia + distribución; y verticales de ejemplo documentados
("cómo agregar un vertical").

**Tareas detalladas:**

1. **Docs site.** MDX (Fumadocs/Nextra o ruta `/docs` con MDX): quickstart (clone→run<15min),
   arquitectura, variables de entorno, deploy (Vercel + Supabase free), y una guía por módulo
   (billing, notifs, webhooks, jobs, admin). **Las docs SON el producto.**
2. **Landing + SEO.** Secciones de conversión (hero, features, pricing leído de `billing.plans`,
   FAQ, testimonios, CTA). OG images, JSON-LD/structured data, metadata completa, sitemap
   (ya hay `next-sitemap`).
3. **Blog (MDX).** Motor de contenido para adquisición/SEO.
4. **Licencia + distribución.** Modelo de license key + estrategia de repo privado +
   flujo de compra del propio boilerplate (reusa el módulo billing de F2 — meta) +
   changelog/versionado de releases.
5. **Verticales de ejemplo.** Mantener el **robot** como demo #1 + agregar un starter de
   **IA (pgvector)** para la persona "IA tuneada". Documentar el patrón "cómo agregar un vertical".
6. **Pasada final.** Accesibilidad (a11y), performance, i18n 100% completo, pulido visual.
7. **Checklist de emails en producción (auditoría 2026-07-13).** Los dos rieles de email
   quedaron listos en local pero con pendientes de deploy:
   - **Auth (Supabase/GoTrue):** el bloque `[auth.email.smtp]` con Resend está comentado en
     `config.toml` a propósito — sin él, Supabase Cloud manda los emails de auth desde su
     SMTP built-in (`noreply@mail.app.supabase.io`, ~2-4 emails/hora, inusable en prod).
     Al desplegar: descomentar el bloque (host `smtp.resend.com`, pass `env(RESEND_API_KEY)`)
     y subir los templates custom de `supabase/templates/*.html` con
     `pnpm supa:cloud:config:push` (o Dashboard → Auth → Email Templates).
   - **Transaccionales (Resend directo):** `FROM_EMAIL=onboarding@resend.dev` es el sender
     compartido de prueba de Resend — para prod hay que **verificar un dominio propio** en
     Resend y actualizar `FROM_EMAIL` (y el `admin_email` del bloque SMTP; `iroko.vercel.app`
     no sirve, no es verificable como dominio de envío).
   - Documentar ambos pasos en la guía de deploy del docs site (tarea 1).

**🤖 Prompt para Claude Code — F4:**

```
Trabajás sobre iroko. Cumplí los "Estándares de Ingeniería" de ROADMAP.md.

Implementá la FASE 4: Producto vendible, en este orden.

1. Sitio de docs (MDX): quickstart, arquitectura, env vars, deploy en free tier, y guía por
   módulo (billing/notifs/webhooks/jobs/admin). Que un dev clone y corra en <15 min siguiéndolas.
2. Landing de conversión (hero, features, pricing desde billing.plans, FAQ, testimonios, CTA)
   + SEO completo: OG images, JSON-LD, metadata, sitemap.
3. Blog MDX para contenido/SEO.
4. Modelo de licencia + distribución (license key, estrategia de repo privado, flujo de compra
   reusando el módulo billing, changelog/versionado).
5. Verticales de ejemplo: mantené el robot (toggle de config) y agregá un starter de IA con
   pgvector. Documentá "cómo agregar un vertical".
6. Pasada final de a11y, performance e i18n 100%.
7. Checklist de emails en prod: descomentar [auth.email.smtp] (Resend) + config push de
   templates de auth al proyecto cloud; verificar dominio propio en Resend y actualizar
   FROM_EMAIL (hoy usa onboarding@resend.dev, sender de prueba). Documentarlo en la guía
   de deploy.

Reglas: contenido bilingüe en/es donde aplique. JSDoc en todo export. SEO medible (metadata,
sitemap, structured data). Tests Playwright de las páginas públicas clave. `pnpm validate` en
verde + `pnpm knip` limpio. Commits convencionales atómicos.
```

---

## 3. Cómo trabajamos las fases (flujo operativo)

1. **Rama:** todo el trabajo de cierre vive en `fasesdecierre` (o sub-ramas `fase-1`, `fase-2-2a`…
   que mergean a `fasesdecierre`). PRs en **draft** hasta cerrar la fase.
2. **Una fase / sub-módulo por vez.** No se abre el siguiente hasta que el actual esté en verde.
3. **Definition of Done por tarea:** `pnpm validate` verde + `pnpm knip` limpio +
   (si tocó schema) `pnpm supa:gen:types` commiteado.
4. **Commits** convencionales y atómicos. **JSDoc** y **tests** entran en el mismo commit que el código.
5. **Cada fase actualiza este ROADMAP** marcando lo hecho, para que el estado viva en el repo
   y no en la cabeza.

### Checklist de progreso

- [x] **F1** — Fundación limpia + DX
- [x] **F2** — Módulos Supabase-native
  - [x] 2B · Email (Resend + React Email + 3 templates + wiring auth/invitations)
  - [x] 2C · Notificaciones in-app (Realtime broadcast + `notify()` + `NotificationBell`)
  - [x] 2E · Feature flags (tablas + RPC 3-niveles + `isEnabled()` + 5 tests)
  - [x] 2A · Billing (schema DB ✅ — core ✅ + **providers ✅ (2026-07-10)**: adapters reales Stripe + MercadoPago sobre la interfaz `PaymentProvider`, sin cambios en UI/registry-shape. Lemon Squeezy descartado (riesgo de sunset post-adquisición por Stripe, ver spec). Fuera de scope: selector de proveedor en checkout — un solo `BILLING_DEFAULT_PROVIDER` global; 2F completo — solo se tomó prestado un `pg_cron` job acotado para la cancelación diferida de MercadoPago.)
  - [x] 2D · Webhooks salientes + API keys (endpoints + deliveries vía pg_net/HMAC/pg_cron, `api_keys` hasheadas, `GET /api/v1/account`, tabs en `org/settings`)
  - [x] 2F · Jobs / colas (pgmq `email_queue` + RPC `broadcast_alert_email` + Edge Function `process-email-queue` + cron cada minuto vía pg_net — patrón de referencia, sin UI ni gate de admin todavía)
  - [x] 2G · Audit Log Viewer (RPC `get_account_audit_logs` + UI paginada en `dashboard/activity`, owner/admin only)
- [ ] **F3** — Admin + Compliance + Onboarding
- [ ] **F4** — Producto vendible (docs · landing · distribución)
