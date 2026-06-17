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

| Necesidad                     | Implementación nativa                                     | Estado     |
| ----------------------------- | --------------------------------------------------------- | ---------- |
| Auth (email/oauth/magic/MFA)  | Supabase Auth                                             | ✅ existe  |
| Multi-tenant + RBAC           | Postgres + RLS + custom access token hook (JWT claims)    | ✅ core    |
| Audit logs                    | triggers Postgres (schema `audit`)                        | ✅ existe  |
| Notificaciones in-app         | tabla + **Realtime** (live, sin polling)                  | F2         |
| Email transaccional           | Resend (free 3k/mes)                                      | F2         |
| Webhooks salientes            | **Database Webhooks / pg_net**                            | F2         |
| API keys                      | tabla hasheada + Edge Function de validación              | F2         |
| Feature flags                 | tabla Postgres + RLS                                      | F2         |
| Jobs / colas                  | **pg_cron + pgmq + Edge Functions**                       | F2         |
| Storage de archivos           | Supabase Storage + RLS                                    | ✅ existe  |
| Admin panel + impersonation   | RLS `platform_admin` + service role                       | F3         |
| GDPR export / right-to-delete | funciones Postgres (RPC)                                  | F3         |
| Billing (suscripciones)       | Stripe + MercadoPago, estado en Postgres, webhook en Edge | F2         |
| Vertical IA ("IA tuneada")    | **pgvector**                                              | base lista |

### Free tier — la verdad (para no mentirle al comprador)

- **Supabase free:** 500MB DB · 1GB storage · 50k MAU · 500k Edge invocations/mes.
  Se **pausa a los 7 días de inactividad** (importa para demos, no para SaaS con usuarios).
- **Vercel Hobby:** gratis pero **no-comercial**. Al monetizar → Vercel Pro (~USD 20/mes).
- **Resend:** 3.000 mails/mes free. **Stripe/MercadoPago:** sin fee mensual (comisión por venta).

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

- **2A · Billing.** Interface `PaymentProvider` (en `src/lib/billing/`) con dos
  implementaciones: **Stripe** (default global) y **MercadoPago** (cuña LatAm, vía
  `preapproval`). Checkout → **webhook handler** (route handler `/api/webhooks/[provider]`
  o Edge Function) que valida firma y actualiza `billing.subscriptions`. Helper de
  **plan-gating** (`hasFeature(account, key)`) leyendo `billing.plans.features`.
  Env de credenciales en `src/env.ts`. Tests: validación de firma + transiciones de estado (mock).
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
   (resuelve el caso call-center), visor de `audit.logs`.
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

- [ ] **F1** — Fundación limpia + DX
- [ ] **F2** — Módulos Supabase-native (2A billing · 2B email · 2C notifs · 2D webhooks/API keys · 2E flags · 2F jobs)
- [ ] **F3** — Admin + Compliance + Onboarding
- [ ] **F4** — Producto vendible (docs · landing · distribución)
