# Plan 012 — Hardening de seguridad + fuente de verdad única para pricing

- Priority: P1
- Status: Activo — 012.1 grants y alcances operativos 012.2/012.3 cerrados. 012.3 aplicado y desplegado con aceptación HTTPS pública del dominio estable (2026-10-14). Push/merge, 012.4 y pricing pendientes; los límites y seguimientos heredados conservan su estado explícito.
- Baseline: `main` @ `d9e2648`
- Orden v1: sus cambios independientes pueden avanzar sin esperar renovación
  o aceptación final de Mercado Pago. Coordinar superficies compartidas con
  Plan 011; ambos cierres son necesarios antes de declarar v1 lista para
  usuarios reales. No espera a los cuatro proveedores ni a la distribución
  comercial de Plan 013.
  `requireAccountRole` de Plan 010 ya existe en `main` para cualquier ítem
  que necesite autorización viva.
- Scope: reducir privilegios/superficie sin cambiar arquitectura (P1-1), y
  hacer que landing + pricing + checkout + entitlements hablen del mismo
  catálogo (P1-2). No corrige comportamiento roto (eso es P0) ni aumenta
  vendibilidad directamente (eso es Fase D).

## Boundary with Mercado Pago reliability

### Coordination update — 2026-09-24

The [reuse investigation](../../audits/2026-09-24-reusable-saas-readiness.md)
confirms public pricing drift (RS-04) and the unconditional readiness claim in
`src/config/app.config.ts` (RS-10). PR 5 owns catalogue-aligned public copy and
metadata, without promising capabilities that have not passed acceptance.
The target promise and allowed evidence stages are in
[product strategy](../../architecture/product-strategy.md).

Proposed [Plan 014](014-reference-surface-correctness.md) owns robot
route/action/SQL correctness, image-origin validation and platform audit
interaction. They do not expand this plan's historical «no RLS changes» scope.
Proposed [Plan 015](015-reusable-foundation-acceptance.md) owns configuration
without new subscription sales and independent reuse. Coordinate its public
billing visibility with PR 5; do not create a second catalogue. Plan 012 still
owns the security sweep and does not certify infrastructure merely from code.

### Existing Mercado Pago boundary

The Mercado Pago reliability work does **not** implement this plan's pricing
rename or source-of-truth migration. It preserves the current Free/Plus/Pro
labels, CLP amounts, and durable `free` / `pro` / `scale` slugs; its only
catalogue presentation change is returning `trialDays: 0` for Mercado Pago.
Hardening and pricing source-of-truth remain v1 gates. The historical
`scale → teams` rename is a separate catalogue migration, not a prerequisite
for Mercado Pago acceptance or for removing duplicated public pricing.
Prices/slugs remain unchanged during the MP closeout. See the
[v1 Chile matrix and order](../deferred/011-billing/011-mercadopago-v1-chile-acceptance.md).

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

P1-1 conserva RLS y arquitectura, pero modifica la autorización por ACL.
Revocar EXECUTE o privilegios de tabla puede romper consumidores directos e
indirectos; requiere inventario efectivo, excepciones explícitas y regresiones
positivas/negativas. Advisors es una señal complementaria, no una prueba de
mínimos privilegios ni de ausencia de regresiones.

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
| 1   | `chore/revoke-excess-grants`          |  **P1**   |     —      |    M     | Reducción de ACL con consumidores y regresiones verificadas                                               |
| 2   | `fix/webhook-ssrf-dns-rebinding`      |  **P1**   |     —      |    M     | Requiere decidir estrategia (allowlist vs revalidación post-DNS) antes de codear                          |
| 3   | `feat/rate-limit-public-api`          |  **P1**   |     —      |    S     | Confirmar primero si `check_request()` ya cubre `/api/v1/*` — puede no requerir trabajo nuevo             |
| 4   | `chore/csp-and-secrets-hardening`     |  **P1**   |     —      |    S     | CSP + secretos dedicados (impersonation HMAC, mock billing) — verificar Sentry/PostHog antes de tocar CSP |
| 5   | `feat/pricing-single-source-of-truth` |  **P1**   |     —      |    M     | Independiente de 1-4, se puede hacer en paralelo                                                          |

---

## PR 1 — `chore/revoke-excess-grants`

**Alcance aprobado — 2026-10-08.**

- Diez firmas privadas pierden EXECUTE heredado de PUBLIC; get_user_role y
  user_is_member conservan EXECUTE authenticated y USAGE private por RLS/Realtime.
  get_user_role conserva además EXECUTE anon por una policy Storage existente;
  anon sigue sin USAGE private. La suite completa detectó esta dependencia.
- Cuatro privilegios administrativos (TRUNCATE, REFERENCES, TRIGGER, MAINTAIN)
  se revocan de anon/authenticated en 34 tablas propias public/billing.
- Defaults limitados a FOR ROLE postgres en public/billing, para esos cuatro
  privilegios y dos roles. CRUD, RLS, service_role, supabase_admin y secuencias
  permanecen fuera de la modificación. UPDATE de secuencias queda como seguimiento.
- Migración manual nueva y espejos simultáneos según la excepción Windows.
  El trabajo pendiente de 014 se preserva; firmas y tipos expuestos no cambian.

**Acceptance criteria.**

- Inventario pg_catalog/has_*_privilege con PUBLIC, herencia, propietarios y
  defaults; matriz objeto/firma → consumidor → rol → decisión revisada.
- RED/GREEN de ACL en proyecto local desechable exacto, controles positivos,
  comparación de ACL antes/después y pgTAP completo con conteo TAP real.
- Checks unitarios, typecheck, lint, formato focalizado, documentación y diff.
- Advisors comparados contra baseline: cero regresiones atribuibles; conservar
  y explicar avisos intencionales. No exigir cero avisos globales.
- Aceptación local y aplicación Cloud se registran por separado; las escrituras
  Cloud requieren autorización explícita. El inventario read-only no prueba aceptación funcional.

**Estado — 2026-10-09:** implementado y aceptado en SQL local: 44 archivos /
884 aserciones TAP, sin fallos. Ensayo nuevo: 161 migraciones desde cero;
rollback real de 014/012 comprobado y advisors antes/después idénticos (66).
Revisión de integración SQL aprobada; aceptación pgTAP consolidada del nuevo
destino: 44 archivos / 884 aserciones, incluida la repetición aislada de 42. Se
registra en el [ensayo del historial](../../audits/2026-10-09-plan-012-1-history-rehearsal.md).
Cloud 014 → 012 aplicado con autorización explícita: 161 migraciones alineadas, gate intermedio y revisión independiente aprobados; 105 permisos retirados y diez revocaciones PUBLIC verificadas. Advisors idénticos: 57 WARN / 3 INFO. Aceptación funcional Cloud **[NO VERIFICADO]**, sin deploy de aplicación. Véase [ejecución Cloud](../../audits/2026-10-09-plan-012-1-cloud-application.md). Plan 012 continúa activo.

Estado y resultados actuales en el
[registro de ejecución012.1](../../audits/2026-10-08-plan-012-1-grants-execution.md).
La [revisión de cierre del 2026-10-11](../../audits/2026-10-11-plan-012-closure-review.md)
renovó el catálogo Cloud y confirmó el cierre del alcance grants, sin nueva
corrección necesaria. Aceptación funcional Cloud e integración Git permanecen
separadas; no declarar «nada pendiente» para esos circuitos.

**Actualización — 2026-10-13:** el alcance de grants de 012.1 sigue cerrado.
La reconstrucción del stack oficial `saas-boilerplate` y la aceptación Cloud de
Auth/Storage/Realtime añaden evidencia funcional acotada; no certifican todos
los flujos de Billing ni las integraciones pendientes. La suite consolidada de
012.2 pasa 46 archivos / 950 aserciones SQL. Véase el
[cierre Cloud](../../audits/2026-10-13-plan-012-2-cloud-acceptance.md).

---

## PR 2 — `fix/webhook-ssrf-dns-rebinding`

**Actualización — 2026-10-09.** Inventario iniciado por instrucción del usuario;
[desglose 012.2](012-2-webhook-ssrf.md) con evidencia, ownership y gates. Cloud
consultado solo en lectura: pg_net 0.20.3, sin controles SQL de fijación de IP.
Resolver DNS antes de encolar no elimina rebinding porque el envío ocurre
después del commit. Queda retirada la recomendación de doble DNS como cierre
suficiente. Evaluar sender Node en infraestructura existente o relay controlado;
la decisión de transporte y el contrato de validación directa por RPC preceden
a la implementación. El ensayo T2 aprobó 28 controles HTTPS y 6 DNS por separado;
[diseño y gate](../../audits/2026-10-09-plan-012-2-transport-design.md) aprobados
explícitamente para implementación local. Sender Node, tickets obligatorios y
leases están implementados; aceptación local verificada en el
[registro de ejecución](../../audits/2026-10-09-plan-012-2-local-execution.md).
Ese estado de aplicación local corresponde al 2026-10-09 y quedó superado por
la ejecución autorizada del 2026-10-13 descrita a continuación.

**Actualización — 2026-10-13:** migración 012.2 y seguimiento de tres grants de
contexto aplicados; Cloud tiene 163 migraciones, última `20261013143645`.
Candidato selectivo C81 desplegado READY en Vercel con Node 24, worker 60 s y
dominio `project-a89lv.vercel.app` reasignado mediante autorización explícita.
Entrega HTTPS controlada con HTTP 200 y HMAC verificado independientemente;
wake `pg_net` → worker HTTP 200 tras excepción WAF restringida. Data API `net`
rechazado con HTTP 406 / `PGRST106`. Cron reactivado y observado: run `312227`
`succeeded`, wake `118454` HTTP 200 con `claimed: 0`; fixtures y receptor temporal
retirados, cola/leases vacíos. El alcance operativo de 012.2 queda cerrado;
integración Git pendiente, sin commit, push ni merge. La prueba usó un emisor privado; no acredita todos los triggers
de negocio ni pago Mercado Pago. Registro y límites en la
[aceptación Cloud](../../audits/2026-10-13-plan-012-2-cloud-acceptance.md).
Siguiente paso recomendado: preparar revisión de integración del diff selectivo
e inventariar la cobertura real de 012.3; Plan 012 completo permanece activo.

**Acceptance criteria.** Un endpoint que resuelve a loopback, metadata Cloud o
rangos privados es rechazado al crear/editar y en cada intento de entrega.
El transporte conecta solo a IP validada manteniendo TLS; no sigue redirects
hacia destinos no validados. Demostrar cero conexiones prohibidas en ensayo
controlado de rebinding y conservar HMAC, entregas legítimas y retries.

---

## PR 3 — `feat/rate-limit-public-api`

**Implementación local — 2026-10-13:** el [plan012.3](012-3-rate-limiting.md)
registra el contrato aprobado y la [ejecución local](../../audits/2026-10-13-plan-012-3-local-execution.md)
su evidencia. Hook corregido con RED/GREEN HTTP y concurrencia real; API cuenta
con admisión durable de 100/cuenta y 300/IP en ventanas móviles de 300 segundos.
Suite SQL 49 archivos/999 pruebas y unitarios 112 archivos/1281 pruebas aprobados;
typecheck, lint, build webpack, HTTP Next real y Chromium Robot aprobados.
La lectura real detectó un grant faltante; una tercera migración local concede
solo cuatro columnas de resumen a service_role, sin wildcard ni mutaciones.
La aplicación Cloud y la
aceptación de identidad del hosting no están realizadas por este cierre local.

**Aplicación y aceptación Cloud — 2026-10-14:** las tres migraciones están
aplicadas, ledger 166. Candidato selectivo READY
`dpl_4AK3JX5bMMkgtavTnteEnr77Fcoe`, promovido a `project-a89lv.vercel.app` con
autorización explícita. RPC Cloud: siete comprobaciones PASS. Candidato y dominio
estable: cinco comprobaciones HTTPS públicas PASS cada uno, sin bypass,
incluyendo identidad IP resistente a headers falsificados, aislamiento y una
admisión/siete rechazos 429 concurrentes con Retry-After. WAF versión 6 conserva
tres reglas; dos ramas GET/ruta/host exactos se añadieron a la última regla,
preservando el worker y las protecciones previas. Alcance operativo cerrado;
confianza CF/XFF del hook heredado, provocación Cloud de 500/503 y reducción de
ACL históricas de service_role conservan sus límites/seguimientos separados.
Evidencia y recuperación: [ejecución Cloud](../../audits/2026-10-14-plan-012-3-cloud-execution.md).
Pendientes explícitos, condiciones para retomarlos y criterios de cierre en el
[registro de seguimientos](../../audits/2026-10-14-plan-012-3-follow-ups.md).
Siguiente paso recomendado: concretar y ejecutar 012.4 desde su inventario actual.

**Snapshot previo a la implementación local — 2026-10-13 (Cloud 163):** la API cuenta no tiene cuota
propia y el hook Cloud conserva un contrato de headers 429 incompatible con
PostgREST. La cobertura por cliente/IP y la concurrencia requieren pruebas
locales; no se modificó producto ni Cloud en este bloque. Véase el
[inventario y siguiente ejecución](../../audits/2026-10-13-plan-012-3-rate-limit-inventory.md).
No asumir que CF/XFF son confiables sin evidencia de la entrada efectiva.

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

### Gate local de validación — ejecución autorizada 2026-10-08

Implementado como precondición de aceptación014-T1, sin completar este PR4.
Modo explícito de validación local: Next deriva la bandera pública y rechaza
hosting/destinos Cloud; no aplica wrapper Sentry ni inicializa SDK local.
Comportamiento normal conservado. Inventario de variables: `src/env.ts`.

Las ocho reglas locales se revisaron por archivo/consumidor; aplicar prácticas
TypeScript/JavaScript, SQL, React/Next, pruebas y Realtime, registrando aplicación,
excepciones y contradicciones. En este gate aplican validación pura, fallos
explícitos, pruebas de init/uploads y configuración Next; no cambia SQL ni
Realtime. Prevalecen env.ts, AGENTS y contratos ejecutables sobre recetas locales.

Suite final: 104 archivos/1092 unitarios aprobados; revisión estática independiente
sin hallazgos bloqueantes. Build webpack y E2E aislados aprobados. CSP, Vault,
impersonación y verificación de observabilidad Cloud siguen pendientes dePR4;
no inferir cierre de012.4 a partir de este gate. Evidencia en el
[registro014](../../audits/2026-10-08-plan-014-t1-execution.md).

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
