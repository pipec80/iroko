# Plan 011 — Billing Platform v2: Core → Mercado Pago → Stripe → Paddle → Lemon Squeezy → Reconciliation

- Priority: P0
- Status: Active — Fase 1 cerrada por PR #152 el 2026-08-27. Mercado Pago es
  la Fase 2 y referencia de la v1 propia Chile, CLP mensual. Coordinación
  durable, recovery y anomalías implementados; el rollout básico de workers
  está verificado en Cloud. Permanecen aceptación interna y drills
  proveedor/fallo/múltiples lotes. El registro histórico documenta aplicación
  de migraciones el 2026-09-10; paridad actual `[NO VERIFICADO]`.
- Baseline de Core v2: `main` @ `4a0a3d4`; revisión documental MP: `66bc9b2`
  (2026-09-11).
- Depends on: Plan 010 cerró el 2026-08-26; reutilizar
  `requireAccountRole` como la autorización viva ya integrada. No mezclar
  cambios de esta orquestación con esa remediación ya cerrada.
- Spec: [`docs/architecture/billing-platform-v2-design.md`](../../architecture/billing-platform-v2-design.md)
  — arquitectura aprobada, tipos, modelo de datos, comportamiento por
  provider, política de acceso, observabilidad, reconciliación. Este
  documento argumenta desde ese spec; léanse juntos.
- Detalle task-by-task por fase, todos al mismo nivel de rigor (código,
  Files/Interfaces/Steps, TDD), listos para ejecutar:
  - Fase 1 (Core v2): [`011-phase1-core-v2-tasks.md`](011-phase1-core-v2-tasks.md)
  - Fase 2 (Mercado Pago, referencia LATAM): [`011-phase2-mercadopago-tasks.md`](011-phase2-mercadopago-tasks.md)
  - Fase 3 (Stripe): [`011-phase3-stripe-certification-tasks.md`](011-phase3-stripe-certification-tasks.md)
  - Fase 4 (Paddle): [`011-phase4-paddle-tasks.md`](011-phase4-paddle-tasks.md)
  - Fase 5 (Lemon Squeezy): [`011-phase5-lemon-squeezy-tasks.md`](011-phase5-lemon-squeezy-tasks.md)
  - Fase 6 (Reconciliation): [`011-phase6-reconciliation-tasks.md`](011-phase6-reconciliation-tasks.md)

## Cierre de ejecución — Fase 1 Core v2 (2026-08-27)

- Implementado: identidad provider-scoped, catálogo `provider_prices` con
  RPCs de lectura acotadas, eventos discriminados, reducer con RPCs de
  mutación acotada, `BillingService`, UI por capabilities, guard de
  producción para Mock y retiro del RPC amplio `apply_subscription_event`.
- Migraciones versionadas: `20260826123000` a `20260826220000`; cada cambio de
  esquema tiene espejo en `supabase/schemas/` y tipos regenerados.
- Entrega: [PR #152](https://github.com/pipec80/iroko/pull/152), validado en
  la cabeza `b396aa4` por el
  [run 33037169891](https://github.com/pipec80/iroko/actions/runs/33037169891)
  (Quality, CodeQL, Documentation, Security, Gitleaks, Unit, Database
  Types/Tests, Edge Function, Chromium/WebKit E2E, Build y Vercel Preview en
  verde) y squash-merged como `4a0a3d4`.
- Este cierre no certifica proveedores, sandbox de Mercado Pago, paridad de
  migraciones Local↔Cloud, ni una ejecución CI posterior al squash en `main`:
  todos siguen `[NO VERIFICADO]` hasta evidencia específica.

## Cierre v1 Chile y orden vigente (2026-09-11)

La [matriz de certificación interna Mercado Pago](011-mercadopago-v1-chile-acceptance.md)
es el checklist verificable del cierre de Fases 2/6 para uso propio: checkout
alojado sin plan asociado, CLP mensual y precios/slugs actuales. Sin trial,
upgrade/downgrade, pausa iniciada desde Iroko ni gestión de tarjetas interna.
No se atribuye certificación oficial del proveedor.

Orden: resolver gaps de Fases 2/6 → completar los drills restantes del rollout
011e → aceptación interna MP → hardening/pricing de Plan 012 y checks
operacionales de v1 → certificaciones independientes Stripe, Paddle y Lemon
Squeezy → preparación comercial de Plan 013 cuando se decida vender.
`scale → teams` queda separado del cierre MP. El programa completo permanece
abierto aunque se acepte esta v1 limitada a Mercado Pago.

### Handoffs ejecutables del cierre Mercado Pago

El diseño aprobado se implementa y acepta en este orden:

1. [`011a` — salud de pago y acceso pagado](011a-mercadopago-payment-health-paid-through.md);
2. [`011b` — resolución de checkout abandonado/ambiguo](011b-mercadopago-checkout-resolution.md);
3. [`011c` — detalle de anomalías financieras](011c-mercadopago-financial-anomalies.md);
4. [`011d` — descubrimiento de facturas y reconciliación durable](011d-mercadopago-invoice-discovery-reconciliation.md);
5. [`011e` — rollout autorizado de workers](011e-mercadopago-worker-rollout.md);
6. [`011f` — aceptación interna v1 Chile](011f-mercadopago-internal-acceptance.md).

Los planes `011a`–`011d` son entregas de código local con TDD. `011e` y `011f`
son handoffs operacionales: sus mutaciones Cloud/proveedor requieren una
autorización explícita nueva sobre el entorno y las acciones concretas.

## Objective

Que los providers de billing (Stripe, Paddle, Lemon Squeezy, MercadoPago,
mock) sean intercambiables sin perder información de negocio, que ningún
webhook pueda convertir accidentalmente una suscripción paga en
`free`/`month`, y que cancelar en Iroko siempre corte el cobro futuro en el
proveedor real — no solo en la DB local.

## Contexto — hallazgos verificados (tres pasadas de auditoría, 2026-08-18/19)

**Evidencia histórica, no inventario actual.** Core v2 y las entregas de
Fases 2/6 reemplazaron varios mecanismos descritos abajo. No usar esta
auditoría como checklist de implementación pendiente ni como permiso para
migrar una base supuestamente vacía.

Todo lo siguiente se verificó leyendo el código fuente exacto y consultando
Supabase Cloud en vivo — no se acepta ningún hallazgo solo porque "suena
razonable". El spec y el roadmap (documentos formales, ver arriba)
coinciden con estos hallazgos en los casos verificados; las
únicas correcciones respecto al material fuente están marcadas
explícitamente abajo.

**Estado real de la DB desplegada (verificado en vivo, 2026-08-19).**
`billing.plans.provider_ids = {}` en los 5 planes (`free/month`,
`pro/month`, `pro/year`, `scale/month`, `scale/year`); `customers`,
`subscriptions`, `invoices`, `events`, `invoice_line_items`,
`payment_methods`, `subscription_items`: **0 filas en las siete en aquella consulta**. Esa premisa quedó obsoleta
tras el circuito sandbox del 2026-09-10, que sí registró suscripción, factura
y eventos. Cualquier migración futura necesita inspección y preservación de
datos actuales; el conteo vigente en Cloud es `[NO VERIFICADO]`.

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
  falla 400 en el 100% de los casos reales. Se corrige en la Fase 3
  (certificación interna Stripe), no en Core v2 — coherente con el spec.
- **Constraints de unicidad, verificados contra `supabase/schemas/billing.sql`:**
  `customers_account_id_key UNIQUE(account_id)` (global, línea 269),
  `events_external_event_id_key UNIQUE(external_event_id)` (sin
  `provider`, línea 284), `billing.subscriptions.external_subscription_id`
  sin ningún constraint de unicidad. Los tres se cierran en Fase 1.
- **`billing.invoices` no recibe identidad externa.** El `INSERT` dentro de
  `apply_subscription_event` (líneas 689-699) puebla 9 columnas, ninguna es
  `external_invoice_id`/`hosted_url`/`pdf_url`. Se cierra en Fase 1 (schema)
  - Fase 3 (Stripe puebla los campos reales).
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

| Fase | Nombre                                 | Prioridad | Depende de | Outcome                                                                                                                                                                                                                     |
| ---- | -------------------------------------- | :-------: | :--------: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0    | Congelar contrato y tests de regresión |    P0     |     —      | Los 9 defectos conocidos (B0.1-B0.9) quedan codificados como tests que fallan sobre `main`, antes de tocar nada — bullets en el roadmap formal, sin companion file propio (son parte de las Tasks 1 de cada fase siguiente) |
| 1    | Billing Core v2                        |    P0     |   Fase 0   | Cerrada por #152: modelo de dominio provider-neutral — [`011-phase1-core-v2-tasks.md`](011-phase1-core-v2-tasks.md)                                                                                                         |
| 2    | Mercado Pago (referencia LATAM)        |    P0     |   Fase 1   | Reemplaza `preapproval_plan_id`, confirma cancelación real y certifica sandbox — [`011-phase2-mercadopago-tasks.md`](011-phase2-mercadopago-tasks.md)                                                                       |
| 3    | Certificación Stripe                   |    P1     |   Fase 1   | Segundo provider, cuando existan credenciales de test — [`011-phase3-stripe-certification-tasks.md`](011-phase3-stripe-certification-tasks.md)                                                                              |
| 4    | Paddle                                 |    P1     |   Fase 2   | Mismo contrato, sin cambios al core — [`011-phase4-paddle-tasks.md`](011-phase4-paddle-tasks.md)                                                                                                                            |
| 5    | Lemon Squeezy                          |    P1     |   Fase 2   | Preserva semántica `cancelled` vs `expired` propia — [`011-phase5-lemon-squeezy-tasks.md`](011-phase5-lemon-squeezy-tasks.md)                                                                                               |
| 6    | Reconciliation + hardening             |    P1     | Fases 1+2  | Red de seguridad PSP↔DB, inicia con Mercado Pago — [`011-phase6-reconciliation-tasks.md`](011-phase6-reconciliation-tasks.md)                                                                                               |

**Secuencia histórica de PRs (reemplazada para v1 por el orden anterior):** PR-1/2/3 se consolidaron como [PR #152](https://github.com/pipec80/iroko/pull/152)
(Fase 1) → PR-4 (Mercado Pago) → PR-5 (Stripe, con credenciales de test) →
PR-6 (Paddle) → PR-7 (Lemon Squeezy) → PR-8 (reconciliation). Los providers
P1 pueden planificarse después de que la referencia Mercado Pago demuestre el
contrato, pero no se implementan en paralelo con la certificación P0.

Stripe, Paddle y Lemon Squeezy siguen en el programa, fuera del gate de la
v1 propia Chile. Cada uno debe demostrar adaptador, catálogo, eventos,
capacidades y reconciliación antes de ofrecerse como proveedor.

**Decisión declarada sobre Fase 0 (2026-08-19):** el roadmap formal
describe los 9 tests de regresión (B0.1-B0.9) como un paquete único, todo
antes de tocar Fase 1. Al escribir los companion files los repartí: 7 de
los 9 quedaron en Fase 1 (Task 1 y Task 7, que son provider-neutral, igual
que Fase 1 misma) — pero **B0.8** (portal de Stripe usa `cus_*`) va a
Fase 3 Task 1, y **B0.9** (MercadoPago no marca cancelado sin confirmar en
el proveedor) está en Fase 2 Task 1. Motivo: son regresiones específicas de
un provider concreto, y Fase 1 es deliberadamente provider-neutral —
meter fixtures de Stripe/MercadoPago ahí violaría la misma separación de
responsabilidades que todo este rediseño persigue. Es una desviación
consciente del roadmap literal, no un olvido; si se prefiere fidelidad
estricta al roadmap (los 9 en un solo archivo antes de Fase 1), es
reversible — avisar y se reagrupan.

## Decisión — `provider_prices.amount` vs `plans.price` (resuelto 2026-08-19)

`billing.provider_prices.amount` (spec, sección 6.1) duplicaba
`billing.plans.price` sin que estuviera decidido si podían divergir. Con
solo 3 niveles (la nomenclatura Free/Pro/Teams era la propuesta histórica
de Plan 012; el catálogo MP vigente conserva Free/Plus/Pro y `free/pro/scale`) y sin ningún requisito de negocio de precios distintos por proveedor
(no hay impuestos/redondeo declarados como necesidad hoy), no hay YAGNI
que justifique permitir la divergencia: **`provider_prices.amount` debe
coincidir con `plans.price` en la moneda base, validado, no solo
documentado.** Fase 1, Task 3 agrega un `CHECK`/trigger de coherencia (ver
[`011-phase1-core-v2-tasks.md`](011-phase1-core-v2-tasks.md)) en vez de
dejarlo como campo libre. Si en el futuro un proveedor específico necesita
un precio distinto (ej. redondeo de MercadoPago en CLP), se relaja ahí
puntualmente — no se empieza permitiendo divergencia sin necesidad
demostrada.

## Antes de ejecutar Fase 2 (Mercado Pago) y Fase 3 (Stripe)

Ambas fases tienen como gate de cierre un E2E real contra sandbox/test-mode
— no es opcional, es la condición de "listo". El dueño declaró disponibles
las credenciales de Mercado Pago para Fase 2. El circuito sandbox básico
fue observado informalmente el 2026-09-10; la matriz completa y su evidencia
formal siguen pendientes, con runtime actual `[NO VERIFICADO]`. Stripe no bloquea el lanzamiento LATAM y
permanece pendiente de sus propias credenciales y certificación.

## Definition of Done (Fase 1 — cerrado)

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

## Definition of Done (programa completo; separado de v1 Chile)

Comprar Pro mensual/anual en cualquiera de los 4 providers produce
exactamente el mismo estado interno y los mismos entitlements; cancelar
converge correctamente en todos — verificado contra sandbox real, no solo
fixtures (los fixtures por sí solos no habrían detectado BILL-001 ni
BILL-002 originalmente). Reconciliation puede detectar y reparar/alertar un
webhook perdido sin doble cobro ni inventar estado.
