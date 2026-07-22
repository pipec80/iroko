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

1. **[x] Super-admin / back-office. ✅ Hecho (2026-07-21, F3-C1).** Tabla `platform_admins`
   (RLS deny-all, se puebla a mano) + `private.is_platform_admin()`/`assert_platform_admin()`
   (whitelist + aal2 real, no solo el claim). Claim `is_platform_admin` en
   `custom_access_token_hook`. Ruta `/dashboard/admin` protegida en el edge (404 sin revelar
   la ruta si no es admin; redirect a inscribir MFA si es admin sin factor). Vistas:
   `admin/accounts` (RPC `admin_list_accounts`, resuelve el caso call-center con
   plan/estado de suscripción), `admin/audit` (RPC `get_platform_audit_logs`, visor
   **cross-account** de `audit.logs`, distinto del visor por cuenta de 2G). Columna
   `audit.logs.impersonator_id` agregada (sin poblar) para que C2 no tenga que volver a
   tocar el RPC. **No** se extendió ninguna RLS existente con `OR is_platform_admin()`
   todavía — queda preparado para C2/C3. Impersonation (tarea 2), GDPR (tarea 3) y el gate
   de `broadcast_alert_email` (tarea 7) siguen pendientes, cada una su propia tarea/PR.
2. **[x] Impersonation ("ver como"). ✅ Hecho (2026-07-22, F3-C2).** Sesión real del target
   (no JWT spoofing) via `auth.admin.generateLink` + `verifyOtp`, cap duro de 30 min
   (`impersonation_sessions.expires_at`), banner permanente con salida clara
   (`endImpersonation` restaura al admin ANTES de cerrar la sesión en DB), y cada acción del
   admin mientras impersona queda auditada con `audit.logs.impersonator_id` poblado (actor_id
   sigue siendo el target). Cookie de retorno del admin firmada con HMAC-SHA256 nativo (sin
   dependencia nueva). Tabla `impersonation_sessions` RLS deny-all + índice único "una sesión
   activa por admin". `owner_id` agregado a `admin_list_accounts` (gap encontrado en C1).
   E2E queda en `test.skip` (falta fixture de `platform_admin` con MFA/aal2 en CI) — cubierto
   por QA manual.
3. **GDPR.** RPCs `export_my_data()` (devuelve JSON completo del usuario/tenant) y
   `delete_my_account()` (borrado en cascada, respetando FKs). UI en `account` settings.
4. **Onboarding.** Wizard post-signup: confirmar/crear org → invitar equipo → elegir plan →
   branding. Impulsado por config (skippable según `features`).
5. **Legal + cookies.** Páginas Términos y Privacidad (en `(public)`), banner de cookie
   consent config-driven.
6. **Anuncios (broadcast).** Tabla `announcements` + UI admin para publicar avisos in-app a
   todas las cuentas (reusa el canal de notificaciones de 2C). Web push queda FUERA.
7. **[x] Gate de admin para `broadcast_alert_email` (deuda 2F). ✅ Hecho (2026-07-21, F3-C6).**
   `public.broadcast_alert_email` gateado con `PERFORM private.assert_platform_admin();`
   (whitelist + aal2 real, mismo guard que `admin_list_accounts`/`get_platform_audit_logs`
   de C1) — antes cualquier usuario autenticado podía invocarlo. `GRANT`/`REVOKE` sin cambios
   (gate interno al body). Botón de disparo implementado en `/dashboard/admin/alerts`
   (formulario subject+body → `sendPlatformAlert()`), no quedó opcional/pendiente.
8. **[x] Logo de organización (deuda Storage). ✅ Hecho (2026-07-18, PR #54 + hotfix PR #57, 3H-2).**
   El bucket `org-assets` existe en `config.toml` pero no tenía políticas RLS ni UI.
   Agregado: upload de logo en `org/settings` (`general-tab.tsx`, patrón de avatar de
   perfil: path en DB + `storageUrl()`), RPC `set_account_logo`, políticas RLS
   insert/update/delete admin-only + **fix post-QA:** política SELECT para members (sin
   ella, el `INSERT ... RETURNING *` real de la Storage API fallaba con "row-level
   security policy" — bug detectado en QA manual y cerrado en PR #57), logo visible en el
   account switcher (`accounts.logo_url`).
9. **[x] Vault para secrets de webhooks (deuda 2D). ✅ Hecho (2026-07-21, PR #56, 3H-3).**
   `webhook_endpoints.secret` se guardaba en texto plano (protegido por RLS/RPCs pero sin
   cifrado at-rest). Migrado a Supabase Vault (`vault.create_secret` / `secret_id uuid` +
   `vault.decrypted_secrets`); `create_webhook_endpoint`/`send_webhook_delivery`/
   `delete_webhook_endpoint` ajustados para leer/borrar el secret vía Vault. Cumple la
   promesa "Vault (secrets)" del mapa.
10. **[x] Advisors en CI (deuda DX). ✅ Hecho (2026-07-21, PR #56, 3H-3).** Nuevo job
    `db-advisors` en `nightly.yml`: `supabase db lint --fail-on warning` (schema-scoped a
    public/private/billing/audit) + `supabase db advisors --type security --fail-on warn`
    (performance queda report-only). Incluye migración de limpieza de 10 funciones
    `STABLE→VOLATILE` para pasar el lint desde el día 1.
11. **[x] Presence "miembros online". ✅ Hecho (2026-07-18, PR #54, 3H-2).** Badge de
    presencia en la lista de members vía Realtime (canal `account:{id}:presence`, hook
    `usePresence()`), reusando `private.user_is_member` existente — no hizo falta un
    helper nuevo. Cierra la última primitiva de Realtime sin demostrar en el boilerplate.
12. **[x] Cablear entitlements a la UI (deuda 2A — el ejemplo "free ve esto / pago ve esto").
    ✅ Hecho (2026-07-15, PR #49, 3H-1).**
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
    - **Implementado vía:** helpers `private.get_account_limit`/`private.account_has_feature`
      (nuevos, resuelven plan efectivo sin exponer membership); gate de creación **y entrega**
      en webhooks (`feature_not_in_plan`/`endpoint_limit_reached`); `key_limit_reached` en
      `create_api_key`; `seat_limit_reached` en `invite_members`; server action
      `getOrgEntitlements()`; UI gateada en los 3 tabs de `org/settings` + invite dialog.
      Bonus: se detectó y arregló un incidente de infra CI no relacionado (retiro de endpoint
      legacy de npm audit → migración a pnpm 11) y una falta de traducciones fr/pt (+ test de
      paridad i18n nuevo, `src/test/i18n-parity.test.ts`).

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
blog MDX; modelo de licencia + distribución.

> **Nota (decisión 2026-07-17):** la tarea de verticales de ejemplo (robot + starter IA/pgvector
>
> - guía "cómo agregar un vertical") se **saca de F4** y se difiere completa a **F5** — F3+F4
>   se enfocan puramente en cerrar el MVP vendible del boilerplate en sí, sin ningún trabajo de
>   vertical de por medio. Ver la idea de F5 más abajo.

**Tareas detalladas:**

0. **Elegir motor MDX.** Decisión (2026-07-17): **Fumadocs** — App-Router-native, sin wrapper
   de config propio (mejor sobre Turbopack que Nextra), search local (Orama) sin infra externa.
   Un solo motor para docs (tarea 1) y blog (tarea 3), dos colecciones de contenido separadas.
1. **Docs site.** MDX (Fumadocs, ver tarea 0): quickstart (clone→run<15min) **verificable con
   un smoke test en `nightly.yml`** (no solo prosa), arquitectura, variables de entorno,
   deploy (Vercel + Supabase free), y una guía por módulo (billing, notifs, webhooks, jobs,
   admin). **Las docs SON el producto.**
2. **Landing + SEO.** Fix urgente: la home y `/pricing` hoy tienen el pricing **hardcodeado en
   TS**, no leen `billing.plans` en vivo (la RPC `get_active_plans` ya existe y se usa en
   `dashboard/billing` — falta conectarla acá). Secciones de conversión (hero, features,
   pricing real, FAQ nueva, testimonios nuevos, CTA). OG images generadas con `next/og`,
   JSON-LD (`SoftwareApplication`/`FAQPage`/`BlogPosting`), metadata completa, sitemap
   (ya hay `next-sitemap`, usar `generateStaticParams` en docs/blog para que las detecte).
3. **Blog (MDX).** Mismo motor de la tarea 0. RSS opcional sin dependencia nueva.
4. **Licencia + distribución.** `release-please` ya resuelve el changelog/versionado al 100%
   (solo documentarlo). Falta el modelo de license key: schema nuevo `licensing.license_keys`
   (NO reusa `api_keys` — son conceptualmente distintos), RPC `verify_license_key`/
   `create_license_key` disparada por el webhook de Stripe/MP existente (reusa
   `PaymentProvider` — meta, Iroko vendiéndose a sí mismo), repo privado con invitación
   individual vía API de GitHub (revocable).
5. **Pasada final.** Accesibilidad (`@axe-core/playwright` + activar `eslint-plugin-jsx-a11y`
   si no está activo), performance (Lighthouse CI en `nightly.yml`), i18n 100% completo
   (4 locales), pulido visual.
6. **Checklist de emails en producción (auditoría 2026-07-13).** Los dos rieles de email
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

Implementá la FASE 4: Producto vendible, en este orden. Verticales de ejemplo (robot/IA/
pgvector/guía de verticales) NO son parte de F4 — se difieren completas a F5, no las toques.

0. Elegí e instalá el motor MDX (Fumadocs) — lo consumen las tareas 1 y 3.
1. Sitio de docs (MDX): quickstart, arquitectura, env vars, deploy en free tier, y guía por
   módulo (billing/notifs/webhooks/jobs/admin). Que un dev clone y corra en <15 min siguiéndolas,
   verificado con un smoke test en nightly.yml (no solo prosa).
2. Landing de conversión: primero conectar el pricing real (`get_active_plans`) en vez del
   hardcodeado actual; hero, features, FAQ, testimonios, CTA + SEO completo: OG images
   (next/og), JSON-LD, metadata, sitemap.
3. Blog MDX para contenido/SEO (mismo motor de la tarea 0).
4. Modelo de licencia + distribución (schema `licensing.license_keys` separado de `api_keys`,
   estrategia de repo privado vía invitación GitHub, flujo de compra reusando el módulo
   billing — release-please ya cubre el changelog/versionado, no rediseñarlo).
5. Pasada final de a11y (axe-core + jsx-a11y), performance (Lighthouse CI) e i18n 100%.
6. Checklist de emails en prod: descomentar [auth.email.smtp] (Resend) + config push de
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
- [ ] **F5 (idea, sin comprometer — 2026-07-15)** — Vertical "Operación remota": PWA + chat + videollamada

---

## Idea futura: vertical "Operación remota" (F5, sin fecha)

Capturada el 2026-07-15, no diseñada aún. Pensada como **tercer vertical de ejemplo**
(junto a robot y un futuro vertical IA/pgvector), no como módulo core — sigue el
mismo patrón de desacople por feature toggle que ya usa el robot.

> **Actualización 2026-07-17:** la tarea "Verticales de ejemplo" que antes vivía en F4
> (mantener robot + starter IA/pgvector + guía "cómo agregar un vertical") se movió acá
> completa — F3 y F4 quedan enfocadas 100% en cerrar el MVP vendible del boilerplate,
> sin ningún trabajo de vertical de por medio. F5 diseña junto: robot expandido, starter
> IA/pgvector, la guía de verticales, y esta idea de "Operación remota" — todo sin fecha,
> pendiente de un brainstorm dedicado cuando se priorice frente a cerrar F3+F4.

**Caso de uso:** operador de un dispositivo/vertical físico (ej. robot) a distancia,
necesita: (a) ver/escuchar el feed en vivo del dispositivo, y (b) coordinarse por
chat/videollamada con otras personas (supervisor, soporte) mientras opera.

**Motivación PWA:** instalable en móvil/tablet para uso en campo + push notifications
(hoy 2C solo notifica con la pestaña abierta) + mejor UX de permisos de cámara/micro.

**Chequeo contra la Regla de Oro (nativo Supabase + free tier):**

| Pieza                                      | Encaja en v1 (nativo/free)                                      |
| ------------------------------------------ | --------------------------------------------------------------- |
| PWA instalable (manifest + service worker) | ✅ sí — nativo del navegador, sin infra                         |
| Push notifications (Web Push + VAPID)      | ✅ sí — extiende 2C, no lo duplica                              |
| Acceso a cámara/micro                      | ✅ sí — API nativa del navegador                                |
| Chat de equipo (coordinación)              | ✅ sí — mismo patrón de 2C: Realtime `broadcast` + tabla        |
| Videollamada persona↔persona               | ⚠️ señalización sí (Realtime), pero TURN confiable no es free   |
| Feed video dispositivo↔persona             | ⚠️ mismo problema de TURN + el dispositivo debe ser peer WebRTC |

**Decisión tentativa:** igual criterio que SAML/Temporal — lo que necesita TURN/infra
paga en escala se documenta como _demo best-effort con STUN público_, dejando explícito
que un TURN confiable en producción es costo/responsabilidad del comprador (Twilio,
Cloudflare Calls, Metered, etc.), nunca parte prometida del free tier del v1.

Falta: diseño completo (arquitectura WebRTC, esquema de señalización sobre Realtime,
alcance exacto del vertical demo) — pendiente de un brainstorm dedicado cuando se
priorice frente a F3/F4.
