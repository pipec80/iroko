# Plan 012 — Hardening de seguridad + fuente de verdad única para pricing

- Priority: P1
- Status: Pendiente — hardening y pricing; actualización documental 2026-09-11.
- Baseline: `main` @ `d9e2648`
- Orden v1: después de resolver y aceptar el tramo Mercado Pago de Fases 2/6
  y antes de declarar v1 lista para usuarios reales. No espera a los cuatro
  proveedores ni a la distribución comercial de Plan 013.
  `requireAccountRole` de Plan 010 ya existe en `main` para cualquier ítem
  que necesite autorización viva.
- Scope: reducir privilegios/superficie sin cambiar arquitectura (P1-1), y
  hacer que landing + pricing + checkout + entitlements hablen del mismo
  catálogo (P1-2). No corrige comportamiento roto (eso es P0) ni aumenta
  vendibilidad directamente (eso es Fase D).

## Boundary with Mercado Pago reliability

The Mercado Pago reliability work does **not** implement this plan's pricing
rename or source-of-truth migration. It preserves the current Free/Plus/Pro
labels, CLP amounts, and durable `free` / `pro` / `scale` slugs; its only
catalogue presentation change is returning `trialDays: 0` for Mercado Pago.
Hardening and pricing source-of-truth remain v1 gates. The historical
`scale → teams` rename is a separate catalogue migration, not a prerequisite
for Mercado Pago acceptance or for removing duplicated public pricing.
Prices/slugs remain unchanged during the MP closeout. See the
[v1 Chile matrix and order](011-mercadopago-v1-chile-acceptance.md).

## Objective

Cerrar deuda de seguridad de bajo riesgo/alto ruido (grants sobrantes, SSRF,
rate limiting, CSP, secretos compartidos) y eliminar la triplicidad de
fuentes de pricing que hoy hace que landing, `/pricing` y `billing.plans`
puedan divergir silenciosamente.

## Contexto — hallazgos históricos a revalidar antes de cada PR

Las referencias de la auditoría 2026-08-19 conservan su valor diagnóstico,
pero no son un inventario actual de líneas, nombres ni datos Cloud. El circuito
sandbox 2026-09-10 creó suscripción, factura y eventos; queda retirada la
premisa de una base sin suscripciones. Conteos y dependencias actuales deben
inspeccionarse antes de migrar; Cloud actual **[NO VERIFICADO]**.

- **Grants SQL sobrantes (parcial, no exhaustivo).** Conteo por archivo en
  `supabase/schemas/`: `private.sql` define funciones `private.*` sin un
  `REVOKE EXECUTE ... FROM PUBLIC` explícito acompañante en el mismo archivo;
  `audit.sql` igual (2 `CREATE FUNCTION private.*`, 0 `REVOKE`). Confirmado
  como patrón real, no verificado función por función — el PR 1 de este plan
  debe hacer el barrido completo.
- **`public.invitations` tiene grants de tabla de más:**
  `GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."invitations" TO "authenticated"`
  (`supabase/schemas/public.sql:2117`) — no habilita bypass de RLS
  directamente (esos privilegios no tocan SELECT/INSERT/UPDATE/DELETE), pero
  es superficie sobrante que contradice el principio de mínimo privilegio del
  contrato compartido en `AGENTS.md`.
- **SSRF saliente parcialmente mitigado, no demostrado explotable.**
  `private.assert_safe_webhook_url()` (`supabase/schemas/webhooks.sql:46-90`)
  valida HTTPS obligatorio, rechaza userinfo (`@`) y patrones sospechosos de
  IPv6 literal — no se verificó si además resuelve DNS y valida el rango de
  IP resultante (protección real contra DNS rebinding). Clasificación
  correcta heredada de la auditoría original: **P1 de riesgo, no P0
  demostrado** — no se intentó explotar.
- **Pricing en 3 fuentes desconectadas — confirmado.**
  `src/app/[locale]/(public)/pricing/page.tsx:14-64` define tiers
  hardcodeados vía `t('tier_personal_price')`/`tier_studio_price`/
  `tier_custom_price` (nombres "Personal/Studio/Custom", strings de i18n, sin
  llamar a `get_active_plans()`). Mientras tanto
  `checkoutSchema` en `billing/actions.ts:66` usa
  `z.enum(['pro', 'scale'])` — los slugs reales de `billing.plans`
  ("Free/Pro/Scale"). La página del dashboard (`getBillingData()`,
  `actions.ts:208-217`) sí llama `get_active_plans()` correctamente — el gap
  es específicamente marketing público, no todo el producto.

## Design decisions

### 1. P1-1 no toca RLS ni arquitectura — solo reduce grants y cierra gaps puntuales

A diferencia de Plan 010, ningún ítem de P1-1 cambia cómo se autoriza algo;
solo reduce quién puede ejecutar/acceder a algo que ya estaba correctamente
denegado por RLS. Esto significa: bajo riesgo de romper funcionalidad, alto
valor para pasar advisors de Supabase limpio antes de D-3 (licenciamiento).

### 2. `billing.plans` es la fuente de verdad de pricing; UI pública deja de tener arrays propios

Se separa explícitamente "plan técnico" (slug `free`/`pro`/`scale`, lo que
vive en DB y determina entitlements) de "producto comercial" (el nombre que
ve el usuario en la landing, ej. "Personal"/"Studio"). La UI pública consume
`get_active_plans()` (ya existe, público vía `anon`) y mapea
`slug → nombre comercial` con un diccionario chico y explícito en código —
nunca con un segundo array de precios independiente.

## Tabla priorizada

| #   | PR                                    | Prioridad | Depende de | Esfuerzo | Por qué ahí                                                                                               |
| --- | ------------------------------------- | :-------: | :--------: | :------: | --------------------------------------------------------------------------------------------------------- |
| 1   | `chore/revoke-excess-grants`          |  **P1**   |     —      |    M     | Barrido mecánico, sin riesgo funcional, alto valor para advisors                                          |
| 2   | `fix/webhook-ssrf-dns-rebinding`      |  **P1**   |     —      |    M     | Requiere decidir estrategia (allowlist vs revalidación post-DNS) antes de codear                          |
| 3   | `feat/rate-limit-public-api`          |  **P1**   |     —      |    S     | Confirmar primero si `check_request()` ya cubre `/api/v1/*` — puede no requerir trabajo nuevo             |
| 4   | `chore/csp-and-secrets-hardening`     |  **P1**   |     —      |    S     | CSP + secretos dedicados (impersonation HMAC, mock billing) — verificar Sentry/PostHog antes de tocar CSP |
| 5   | `feat/pricing-single-source-of-truth` |  **P1**   |     —      |    M     | Independiente de 1-4, se puede hacer en paralelo                                                          |

---

## PR 1 — `chore/revoke-excess-grants`

**Ejecución.**

1. Query de auditoría contra `information_schema.routine_privileges` +
   `information_schema.role_routine_grants` filtrando `routine_schema =
'private'` y `grantee NOT IN ('postgres')` — listar toda función `private.*`
   con `EXECUTE` heredado por `PUBLIC` sin `REVOKE` explícito en
   `supabase/schemas/private.sql`/`audit.sql`.
2. Migración que agrega los `REVOKE EXECUTE ... FROM PUBLIC` faltantes +
   `GRANT EXECUTE` solo a los roles (`authenticated`/`service_role`) que
   realmente invocan cada función (verificar call sites antes de otorgar).
3. Mismo barrido para `GRANT ... ON TABLE` con `TRUNCATE`/`TRIGGER`/
   `REFERENCES` sobrantes — empezar por `public.invitations` (ya confirmado),
   extender al resto de tablas `public.*`/`billing.*`.
4. Confirmar `USAGE ON SCHEMA private` solo donde lo requieren los helpers
   expuestos (`get_my_account_role` de Plan 010, `get_billing_overview`,
   etc.) — documentar cada excepción con comentario SQL, no dejarla implícita.

**Acceptance criteria.**

- `supabase db advisors` (o `pnpm supa:cloud:advisors` contra Cloud) sin
  hallazgos nuevos de "function/table grants too permissive" para lo tocado
  en este PR.
- Cero regresión: `pnpm supa:test` completo en verde (una función a la que
  se le revocó PUBLIC de más rompería su call site real, no solo el linter).

---

## PR 2 — `fix/webhook-ssrf-dns-rebinding`

**Ejecución.** Decidir entre (a) resolver el hostname en el momento de
`assert_safe_webhook_url` y validar el rango de IP resultante contra
RFC1918/loopback/link-local antes de aceptar la URL, revalidando de nuevo
justo antes de que `pg_net` dispare el request (mitiga rebinding entre
validación y uso), o (b) egress vía proxy controlado si la infraestructura de
Supabase hosted lo permite. Elegir (a) si no hay egress proxy disponible —
es lo ejecutable sin infraestructura nueva.

**Acceptance criteria.** Un webhook endpoint que resuelve a `127.0.0.1`,
`169.254.169.254` (metadata cloud) o rangos privados es rechazado tanto al
crear el endpoint como en cada intento de entrega, no solo al crear.

---

## PR 3 — `feat/rate-limit-public-api`

**Ejecución.** Primer paso: confirmar si `check_request()`
(`supabase/schemas/public.sql`, hook `db_pre_request`) ya cubre las rutas
`/api/v1/*` o si es genérico a todas las mutaciones vía PostgREST/RPC. Si ya
cubre: cerrar este ítem como "ya resuelto, sin trabajo nuevo" y documentarlo.
Si no cubre `/api/v1/*` específicamente (esas rutas podrían no pasar por el
hook si son Route Handlers de Next.js, no PostgREST): agregar rate limit a
nivel de Route Handler, mismo criterio de IP que `check_request` (
`cf-connecting-ip` con fallback a XFF), respuesta 429 coherente con el resto
del API.

**Acceptance criteria.** Documentado con evidencia (no solo afirmado) si
`/api/v1/*` estaba cubierto o no, y si no lo estaba, un test que dispare

> N requests y reciba 429.

---

## PR 4 — `chore/csp-and-secrets-hardening`

**Ejecución.**

1. Secretos dedicados: HMAC de impersonation con su propio secret (hoy a
   verificar si reusa `SUPABASE_SECRET_KEY`), `MOCK_BILLING_SECRET` ya es
   dedicado (confirmar que no se reusa en otro lado).
2. CSP: reducir/eliminar `'unsafe-inline'` donde Next.js lo permita sin
   romper Sentry/PostHog — probar en preview de Vercel antes de main, un CSP
   demasiado estricto rompe estas dos integraciones en silencio.
3. Revisar exposición de links ingresados por usuarios/admin en
   notifications/announcements/webhooks — validar que no se acepten
   `javascript:`/protocolos inesperados donde el link se renderiza clickeable.

**Acceptance criteria.** Sentry y PostHog siguen reportando en un preview
deploy con el CSP nuevo antes de mergear a `main`.

---

## PR 5 — `feat/pricing-single-source-of-truth`

**Pendiente para v1:** conectar landing, `/pricing`, checkout y entitlements
al catálogo vigente, sin modificar precios ni slugs durante el cierre MP.
El catálogo chileno mantiene etiquetas Free / Plus / Pro y slugs
`free` / `pro` / `scale`; no deducir el nombre comercial capitalizando el slug.

**Ejecución.**

1. Releer `catalog.ts`, las RPCs de catálogo, las Server Actions y ambas
   superficies públicas. Determinar una lectura común que respete proveedor,
   moneda, intervalo y plan activo, sin filtrar datos privados.
2. Reemplazar las fuentes hardcodeadas de la landing y `/pricing` por esa
   fuente común, con i18n coherente. No ofrecer anual MP ni trial; no presentar
   un tier self-serve con precio fijo como un plan de contactar ventas.
3. Después de leer `TESTING-PLAN.md`, añadir pruebas de divergencia entre
   catálogo mostrado y checkout, incluyendo CLP y catálogo no disponible.
4. Revalidar permisos y completar los checks proporcionales antes de cierre.

**Acceptance criteria.** Un cambio autorizado en el catálogo se refleja en
landing, `/pricing` y checkout sin editar precios de UI; moneda, intervalo,
slugs y etiquetas coinciden con la oferta vigente. La fuente única no requiere
renombrar `scale` ni alterar contratos de suscripciones existentes.

### Migración de nomenclatura separada — `scale → teams`

La decisión histórica del 2026-08-19 proponía Free / Pro / Teams y un rename
técnico. Se conserva como antecedente de trabajo comercial/de catálogo, pero
no es la nomenclatura vigente del cierre MP y no se ejecuta dentro de él.
Revisar alcance y compatibilidad con el catálogo CLP antes de retomarla.

El antiguo argumento «sin riesgo porque subscriptions tiene 0 filas» está
retirado. El circuito del 2026-09-10 prueba que esa base vacía no puede
presuponerse. Antes de una migración separada: inventariar referencias,
provider prices, suscripciones, URLs, eventos y consumidores; definir
compatibilidad/backfill y reversibilidad; conservar plan IDs y datos; cambiar
migración/espejo/tipos cuando corresponda y validar en base local desechable
con datos existentes. Toda escritura linked/Cloud requiere autorización.

Criterio de esa migración futura: ningún consumidor queda con un slug inválido
y las suscripciones existentes conservan precio, identidad y entitlements.
No convertir el borrado indiscriminado de strings `scale` en criterio de v1.
