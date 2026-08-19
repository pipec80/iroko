# Plan 011 — Billing Platform v2: Core → Stripe → Paddle → Lemon Squeezy → MercadoPago → Reconciliation

- Priority: P0
- Status: Active (roadmap finalized 2026-08-19, after three rounds of
  audit + a formal design spec/roadmap/implementation plan, all verified
  against the live codebase and Supabase Cloud)
- Baseline: `main` @ `d9e2648`
- Depends on: nada bloqueante de Plan 010, pero no mezclar PRs en el mismo
  branch. **Coordinar orden de merge con Plan 010** — ambos tocan
  `src/app/[locale]/dashboard/billing/actions.ts` (Plan 010 agrega
  `requireAccountRole`; este plan mueve la orquestación a `BillingService`)
  — mergear uno completo antes de ramificar el otro para evitar un merge
  conflictivo.
- Spec: [`docs/architecture/billing-platform-v2-design.md`](../../architecture/billing-platform-v2-design.md)
  — arquitectura aprobada, tipos, modelo de datos, comportamiento por
  provider, política de acceso, observabilidad, reconciliación. Este
  documento argumenta desde ese spec; léanse juntos.
- Detalle task-by-task por fase, todos al mismo nivel de rigor (código,
  Files/Interfaces/Steps, TDD), listos para ejecutar:
  - Fase 1 (Core v2): [`011-phase1-core-v2-tasks.md`](011-phase1-core-v2-tasks.md)
  - Fase 2 (Stripe, referencia): [`011-phase2-stripe-certification-tasks.md`](011-phase2-stripe-certification-tasks.md)
  - Fase 3 (Paddle): [`011-phase3-paddle-tasks.md`](011-phase3-paddle-tasks.md)
  - Fase 4 (Lemon Squeezy): [`011-phase4-lemon-squeezy-tasks.md`](011-phase4-lemon-squeezy-tasks.md)
  - Fase 5 (MercadoPago, P0 antes de producción): [`011-phase5-mercadopago-redesign-tasks.md`](011-phase5-mercadopago-redesign-tasks.md)
  - Fase 6 (Reconciliation): [`011-phase6-reconciliation-tasks.md`](011-phase6-reconciliation-tasks.md)

## Objective

Que los providers de billing (Stripe, Paddle, Lemon Squeezy, MercadoPago,
mock) sean intercambiables sin perder información de negocio, que ningún
webhook pueda convertir accidentalmente una suscripción paga en
`free`/`month`, y que cancelar en Iroko siempre corte el cobro futuro en el
proveedor real — no solo en la DB local.

## Contexto — hallazgos verificados (tres pasadas de auditoría, 2026-08-18/19)

Todo lo siguiente se verificó leyendo el código fuente exacto y consultando
Supabase Cloud en vivo — no se acepta ningún hallazgo solo porque "suena
razonable". El spec y el roadmap (documentos formales, ver arriba)
coinciden con estos hallazgos en el 100% de los casos verificados; las
únicas correcciones respecto al material fuente están marcadas
explícitamente abajo.

**Estado real de la DB desplegada (verificado en vivo, 2026-08-19).**
`billing.plans.provider_ids = {}` en los 5 planes (`free/month`,
`pro/month`, `pro/year`, `scale/month`, `scale/year`); `customers`,
`subscriptions`, `invoices`, `events`, `invoice_line_items`,
`payment_methods`, `subscription_items`: **0 filas en las siete**. Ningún
checkout real puede completarse hoy. Es la mejor noticia posible para este
plan — cualquier cambio de schema/constraint se hace sin datos reales que
migrar (aunque el plan de todos modos incluye SQL de backfill válido para
DBs no vacías — ver Fase 1, Task 3).

- **BILL-001 — determinístico, no probabilístico.** Ningún adapter
  (`stripe.ts:31-52`, `mercadopago.ts:187-218`) setea `planSlug` en el
  evento normalizado que retorna. `webhook-handler.ts:48-49` hace
  `event.planSlug ?? 'free'` / `interval ?? 'month'` — el único camino que
  se ejecuta para cualquier webhook real de ambos proveedores.
- **Hallazgo propio, no estaba en los documentos formales al momento en
  que se escribieron — `invoice.paid` corrompe la suscripción en cada
  renovación, no solo en la compra inicial.** `apply_subscription_event`
  (`supabase/schemas/public.sql:636-715`) hace el mismo `UPDATE
billing.subscriptions SET plan_id, status, ...` para cualquier
  `p_event_type`, sin condicional — cada `invoice.paid` real (cada
  renovación mensual) vuelve a pisar `plan_id` a Free. **El spec y el
  roadmap ya lo cierran de raíz** (Fase 0, test B0.2; discriminated union
  donde `InvoicePaidEvent` no tiene `planSlug` por diseño de tipo — el
  compilador impide el bug, no un `if` que alguien puede olvidar).
- **BILL-002 — MercadoPago, tres mecanismos posibles, dos confirmados, uno
  descartado.**
  - **Confirmado — shape mismatch, no falla de HMAC.**
    `mercadopago.ts:159-172` pasa un `NormalizedEvent` serializado donde
    `verifyWebhook` espera `WebhookBody { type, data: { id } }` —
    `body.data?.id` es `undefined`, retorna `null` antes de
    `verifyManifest()`. `cancelSubscription()` no revisa el `.status` de
    la respuesta.
  - **Confirmado — el cron nunca llama a la API de MercadoPago.**
    `private.cancel_overdue_mercadopago_subscriptions()`
    (`supabase/schemas/private.sql:494-506`) solo hace `UPDATE
billing.subscriptions SET status='canceled'`. Su propio comentario SQL
    lo admite: _"No llama a la API de MercadoPago."_
  - **Descartado — "admin client sin sesión" no coincide con el código.**
    `findAccountIdBySubscription` (`mercadopago.ts:123-124`) usa
    `createClient()` (sesión real de la request), no un admin client. No
    incluir este mecanismo en el fix salvo evidencia concreta.
- **BILL-003 — sin atenuantes, y confirmado que ningún documento formal lo
  cierra.** `src/env.ts:28`: `BILLING_DEFAULT_PROVIDER:
z.string().default('mock')`, sin `.refine()` ni chequeo de `NODE_ENV`.
  El spec/roadmap/implementation plan limpian `.env.example` pero no
  agregan el guard de producción — **se agregó explícitamente en
  [`011-phase1-core-v2-tasks.md`](011-phase1-core-v2-tasks.md), Task 9,
  marcado como extensión sobre el material fuente.**
- **`createPortalSession()` — bug confirmado.** `stripe.ts:103-108` pasa
  `customer: params.accountId` (UUID interno) en vez de `cus_...` real —
  falla 400 en el 100% de los casos reales. Se corrige en la Fase 2
  (certificación Stripe), no en Core v2 — coherente con el spec.
- **Constraints de unicidad, verificados contra `supabase/schemas/billing.sql`:**
  `customers_account_id_key UNIQUE(account_id)` (global, línea 269),
  `events_external_event_id_key UNIQUE(external_event_id)` (sin
  `provider`, línea 284), `billing.subscriptions.external_subscription_id`
  sin ningún constraint de unicidad. Los tres se cierran en Fase 1.
- **`billing.invoices` no recibe identidad externa.** El `INSERT` dentro de
  `apply_subscription_event` (líneas 689-699) puebla 9 columnas, ninguna es
  `external_invoice_id`/`hosted_url`/`pdf_url`. Se cierra en Fase 1 (schema)
  - Fase 2 (Stripe puebla los campos reales).
- **Riesgo de doble suscripción.** `startCheckout()`
  (`billing/actions.ts:79-114`) no verifica suscripción paga existente
  antes de iniciar un checkout nuevo. Se cierra en Fase 1, Task 7
  (`BillingService`, guard `active_paid_subscription_exists`).
- **Sentry: el path de error del webhook no capturaba excepción.**
  `webhook-handler.ts:62-68` solo hacía `logger.error`. Se cierra en Fase
  1, Task 6 (`captureBillingException` explícito).

## El programa completo (Fases 0-6)

Documentado en detalle en el roadmap formal — resumen aquí, no
duplicado palabra por palabra:

| Fase | Nombre                                 |       Prioridad        | Depende de | Outcome                                                                                                                                                                                                                     |
| ---- | -------------------------------------- | :--------------------: | :--------: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0    | Congelar contrato y tests de regresión |           P0           |     —      | Los 9 defectos conocidos (B0.1-B0.9) quedan codificados como tests que fallan sobre `main`, antes de tocar nada — bullets en el roadmap formal, sin companion file propio (son parte de las Tasks 1 de cada fase siguiente) |
| 1    | Billing Core v2                        |           P0           |   Fase 0   | Modelo de dominio provider-neutral — [`011-phase1-core-v2-tasks.md`](011-phase1-core-v2-tasks.md)                                                                                                                           |
| 2    | Certificación Stripe (referencia)      |           P0           |   Fase 1   | Stripe como implementación de referencia — [`011-phase2-stripe-certification-tasks.md`](011-phase2-stripe-certification-tasks.md)                                                                                           |
| 3    | Paddle                                 |           P1           |   Fase 2   | Mismo contrato, sin cambios al core — [`011-phase3-paddle-tasks.md`](011-phase3-paddle-tasks.md)                                                                                                                            |
| 4    | Lemon Squeezy                          |           P1           |   Fase 2   | Preserva semántica `cancelled` vs `expired` propia — [`011-phase4-lemon-squeezy-tasks.md`](011-phase4-lemon-squeezy-tasks.md)                                                                                               |
| 5    | Rediseño MercadoPago                   | P0 antes de producción |   Fase 1   | Reemplaza `preapproval_plan_id` + cancelación insegura — [`011-phase5-mercadopago-redesign-tasks.md`](011-phase5-mercadopago-redesign-tasks.md)                                                                             |
| 6    | Reconciliation + hardening             |           P1           | Fases 1+2  | Red de seguridad PSP↔DB — [`011-phase6-reconciliation-tasks.md`](011-phase6-reconciliation-tasks.md)                                                                                                                        |

**PR slicing recomendado** (del roadmap formal): PR-1 (schema+tests) → PR-2
(eventos tipados+reducer+webhook) → PR-3 (`BillingService`+capabilities+UI)
→ PR-4 (Stripe) → {PR-5 (MercadoPago), PR-6 (Paddle tras PR-4), PR-7 (Lemon
Squeezy tras PR-4)} en paralelo → PR-8 (reconciliation). PR-1/2/3 = Fase 1,
desglosadas como Task 1-10 en el archivo companion.

**Paddle y Lemon Squeezy no están pausados** — corrección a mi propio
borrador anterior de este plan, que los trataba como "fuera de scope".
Van secuenciados dentro del mismo programa, después de certificar Stripe
(Fase 2), tal como lo especifica la sección 15 del design spec.

**Decisión declarada sobre Fase 0 (2026-08-19):** el roadmap formal
describe los 9 tests de regresión (B0.1-B0.9) como un paquete único, todo
antes de tocar Fase 1. Al escribir los companion files los repartí: 7 de
los 9 quedaron en Fase 1 (Task 1 y Task 7, que son provider-neutral, igual
que Fase 1 misma) — pero **B0.8** (portal de Stripe usa `cus_*`) fue a
Fase 2 Task 1, y **B0.9** (MercadoPago no marca cancelado sin confirmar en
el proveedor) fue a Fase 5 Task 1. Motivo: son regresiones específicas de
un provider concreto, y Fase 1 es deliberadamente provider-neutral —
meter fixtures de Stripe/MercadoPago ahí violaría la misma separación de
responsabilidades que todo este rediseño persigue. Es una desviación
consciente del roadmap literal, no un olvido; si se prefiere fidelidad
estricta al roadmap (los 9 en un solo archivo antes de Fase 1), es
reversible — avisar y se reagrupan.

## Decisión — `provider_prices.amount` vs `plans.price` (resuelto 2026-08-19)

`billing.provider_prices.amount` (spec, sección 6.1) duplicaba
`billing.plans.price` sin que estuviera decidido si podían divergir. Con
solo 3 planes (Free/Pro/Teams, ver decisión de nomenclatura en Plan 012 PR 5) y sin ningún requisito de negocio de precios distintos por proveedor
(no hay impuestos/redondeo declarados como necesidad hoy), no hay YAGNI
que justifique permitir la divergencia: **`provider_prices.amount` debe
coincidir con `plans.price` en la moneda base, validado, no solo
documentado.** Fase 1, Task 3 agrega un `CHECK`/trigger de coherencia (ver
[`011-phase1-core-v2-tasks.md`](011-phase1-core-v2-tasks.md)) en vez de
dejarlo como campo libre. Si en el futuro un proveedor específico necesita
un precio distinto (ej. redondeo de MercadoPago en CLP), se relaja ahí
puntualmente — no se empieza permitiendo divergencia sin necesidad
demostrada.

## Antes de ejecutar Fase 2 (Stripe) y Fase 5 (MercadoPago)

Ambas fases tienen como gate de cierre un E2E real contra test-mode/sandbox
— no es opcional, es la condición de "listo". **Confirmar si ya existen
credenciales de test de Stripe y sandbox de MercadoPago** antes de empezar
esas fases — condiciona si se pueden cerrar en la misma iteración o quedan
con el gate abierto como seguimiento inmediato.

## Definition of Done (Fase 1 — el hito inmediato)

Ver Completion criteria completo en
[`011-phase1-core-v2-tasks.md`](011-phase1-core-v2-tasks.md). Resumen: sin
webhook que invente `free`; eventos de invoice no pueden mutar plan/período
por diseño de tipo; idempotencia `(provider, external_event_id)`;
identidad de suscripción única `(provider, external_subscription_id)`; una
cuenta puede tener identidad en múltiples providers; segundo checkout pago
bloqueado; UI deriva de capabilities; Sentry captura excepciones no
esperadas del webhook; `NODE_ENV=production` + `mock` rechaza arrancar sin
opt-in explícito; gates existentes (`typecheck`, `lint`, Vitest, pgTAP, DB
lint) en verde.

## Definition of Done (programa completo)

Comprar Pro mensual/anual en cualquiera de los 4 providers produce
exactamente el mismo estado interno y los mismos entitlements; cancelar
converge correctamente en todos — verificado contra sandbox real, no solo
fixtures (los fixtures por sí solos no habrían detectado BILL-001 ni
BILL-002 originalmente). Reconciliation puede detectar y reparar/alertar un
webhook perdido sin doble cobro ni inventar estado.
