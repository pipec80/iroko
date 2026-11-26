# Mercado Pago v1 Chile internal acceptance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:executing-plans` to execute this acceptance plan sequentially.
> Steps use checkbox (`- [ ]`) syntax for tracking. Provider and Cloud mutations
> require the explicit authorization gates below.

**Goal:** Decide MP-01–MP-15 individually from sanitized provider, Cloud,
database and UI evidence for Iroko's own Chilean v1.

**Architecture:** Treat each scenario as an independent evidence chain joined
by opaque aliases: provider application/seller, preapproval, authorized
payment, payment, local account/subscription/invoice/attempt/event and visible
UI. Passing one scenario never substitutes for another.

**Tech Stack:** Mercado Pago test/sandbox tools and API, deployed Next.js app,
Supabase SQL, Vercel/Supabase diagnostics, Markdown evidence.

**Spec:**
[`docs/architecture/mercadopago-reliability-design.md`](../../../architecture/mercadopago-reliability-design.md#delivery-i--rollout-and-internal-acceptance)

**Status note — 2026-09-23:** the authoritative state of each scenario is the
[v1 Chile matrix](011-mercadopago-v1-chile-acceptance.md), not the checkboxes
below, which were not maintained as steps ran. Where evidence stands: Steps for
MP-01, 02, 05, 06 (rejection and alert), 07, 11, 13 and 15 have real correlated
evidence; MP-04 is partial (resume observed; provider behaviors measured;
simultaneous requests pending); MP-14 is partial (Cloud lease drill and a real
failing scan); MP-03 waits for the real charge due 2026-10-22; MP-12's scan
completes since two defects found on first contact were fixed (#205, #208; seen
on 2026-09-24) but no genuinely omitted invoice has occurred yet;
MP-09/10 cannot be exercised with test accounts (the API refuses refunds for
their credentials) and stay pending for a productive account. Do not check a
box from this note.

## Guion de QA humano en Windows — 2026-11-20

**Estado de partida.** El 16 de noviembre, MP-01 abrió el checkout en el
despliegue `118fedf` y dejó un intent pendiente. El cobro, la autorización y el
ingreso firmado del candidato siguen **[NO VERIFICADO]**. Reutilizar la evidencia
de septiembre únicamente para su escenario y contrato. La matriz sigue siendo
la fuente de veredictos MP-01–15. Este guion ordena la ejecución de las tareas
de abajo dentro de 011f y recoge el aviso del recorrido de escritorio.
[Matriz vigente](011-mercadopago-v1-chile-acceptance.md) ·
[QA manual](../../../quality/manual-qa-register.md) ·
[Enmienda ADR 0005](../../../adr/0005-replicable-saas-mvp-and-bounded-acceptance.md)

### Primera compra y alcance de la prueba en casa

La primera sesión de pago se concentra en una compra inicial aprobada, con
evidencia del comprador, del vendedor y de Iroko para la misma operación.
La renovación queda para una segunda etapa. La compra y su validación se
pueden hacer desde el navegador de casa. El recorrido visual previo usa el
build local y la prueba integrada usa el destino público canónico.

| Qué observar | Herramienta y alcance |
| ------------ | --------------------- |
| Completar el checkout como comprador | La guía chilena de **Suscripciones** documenta completar el checkout con el usuario de prueba y una tarjeta nacional de prueba. La tabla para ese producto documenta `APRO` para aprobación y ofrece otros resultados simulados. Reusar la aplicación y las cuentas existentes. [Compra de prueba](https://www.mercadopago.cl/developers/es/docs/subscriptions/integration-test/payment-approval) · [Tarjetas de prueba](https://www.mercadopago.cl/developers/es/docs/subscriptions/additional-content/your-integrations/test/cards) |
| Ver que el vendedor recibió el pago de prueba | En **Tus integraciones → aplicación → Prueba**, identificar el pago aprobado en **Pagos de prueba** si la sección está disponible. Corroborar por lectura del recurso del proveedor si el panel no expone el detalle. Registrar importe, moneda, estado y alias de la operación. [Detalles de la aplicación](https://www.mercadopago.cl/developers/es/docs/subscriptions/additional-content/your-integrations/application-details) |
| Confirmar el aviso a Iroko | La guía de **Suscripciones** indica configurar la notificación al crear el recurso. Iroko ya envía `notification_url` en el preapproval. Observar la entrega que nace de la compra como prueba principal. La disponibilidad del simulador para esa aplicación y tópico se comprueba en el panel. [Webhooks de Suscripciones](https://www.mercadopago.cl/developers/es/docs/subscriptions/additional-content/your-integrations/notifications/webhooks) |
| Ver dinero real acreditado y disponible | Requiere una operación productiva autorizada. Con el mismo identificador, verificar el movimiento del vendedor, el importe bruto y neto y si queda por liquidar o ya está disponible. Mercado Pago indica que su reporte de transacciones se genera sin datos para cuentas de prueba. La aprobación de sandbox cubre el circuito funcional. [Reporte de Todas las transacciones](https://www.mercadopago.cl/developers/es/docs/reports/account-money/introduction?scope=prod) |
| Ver la siguiente cuota mensual | No se encontró en la guía oficial consultada una herramienta documentada para simular el paso del tiempo y producir una nueva cuota en este flujo. Retomar luego con la suscripción histórica y buscar su factura y pago posteriores por lectura. [Gestión de suscripciones](https://www.mercadopago.cl/developers/es/docs/subscriptions/subscription-management) |

### Turno 1 — build local, pantalla y diagnóstico

- [ ] Con el build ya levantado por el propietario, abrir en el navegador lateral
  de Codex el origen que sirva `next start` y entrar en **Facturación**
  (`/es/dashboard/billing`). Registrar SHA base, cambios locales incluidos si se
  conocen, origen y destino Supabase. Si hace falta reconstruir el build local
  de referencia, seguir `pnpm build:qa` y `pnpm start --hostname 127.0.0.1` con el
  stack local `saas-boilerplate`. Mantener un mismo host para la sesión de Iroko.
- [ ] Con owner de una cuenta de prueba, revisar **Plan y facturación**, plan
  vigente, moneda, periodicidad y disponibilidad de **Suscribirme**. Para
  Mercado Pago se esperan Free, Plus y Pro mensuales en CLP, con 0, 19.990 y
  102.990 respectivamente. Usar Plus (`pro`) para el circuito de pago. Repetir
  con un miembro común para confirmar ausencia de operaciones de gestión y de
  datos privados de facturación. Registrar el resultado tras recargar.
- [ ] Si aparece «El checkout no está disponible temporalmente», comprobar de
  forma saneada el proveedor seleccionado, disponibilidad del registro y lectura
  del catálogo CLP mensual. Las señales `billing.catalog.provider_unavailable`,
  `billing.catalog.incomplete` y `billing.catalog.read_failed` ayudan a ubicar
  la causa. Registrar presencia y coincidencias de configuración sin volcar
  valores. La pantalla puede estar habilitada y la compra quedar bloqueada en
  el mismo build. Terminar este turno antes de pulsar **Suscribirme**.
  [Catálogo efectivo](../../../../src/lib/billing/public-catalog.ts)

### Turno 2 — aplicación, vendedor y comprador de prueba

- [ ] Abrir **Tus integraciones** en el navegador con la sesión del propietario
  de Mercado Pago. Identificar la aplicación de Iroko, el producto
  **Suscripciones**, el entorno que el panel muestra y el vendedor que posee los
  recursos. Verificar el país Chile, la disponibilidad de cuentas y medios de
  prueba y sus límites efectivos. Preferir cuentas ya existentes. El dueño de
  la aplicación administra la integración, el vendedor es el `collector_id`
  que cobra y el comprador es el pagador. La pertenencia del token se comprueba
  con un preapproval propio mediante `application_id` y `collector_id`, más
  la configuración visible del panel. El prefijo del token por sí solo es
  insuficiente para identificar el entorno.
- [ ] Usar un contexto de navegador separado para el comprador de prueba. El
  propietario introduce login, verificación y medio de prueba en el sitio del
  proveedor. Iroko toma `payer_email` del correo autenticado en Supabase, así
  que preparar una cuenta Iroko de prueba compatible con el pagador asignado y
  registrar la coincidencia sin guardar los correos. Verificar en el panel que
  el medio de prueba está admitido por este checkout de **Suscripciones**.
  El código hace `POST /preapproval` con `pending`, sin plan remoto asociado, y
  abre el `init_point` devuelto. Las instrucciones de Checkout Pro y Orders
  corresponden a productos distintos.
- [ ] Verificar de solo lectura SHA desplegado, origen público, proyecto
  Supabase asociado y configuración visible de Webhooks. Confirmar el HTTPS
  canónico `https://project-a89lv.vercel.app/api/webhooks/mercadopago` y los
  tópicos que usa este circuito (`subscription_preapproval`,
  `subscription_authorized_payment` y, cuando corresponda, `payment`). El
  retorno de la UI se construye con `SITE_URL`; la entrega del proveedor usa
  `MERCADOPAGO_WEBHOOK_URL`. Un checkout creado en loopback con la base local y
  un webhook enviado a Cloud repartiría la correlación entre dos bases. Para
  aceptar el circuito completo usar la aplicación canónica y su misma base de
  punta a punta. El MCP y el CLI quedan como apoyos de lectura cuando sean
  utilizables. Si una sesión o un medio de prueba falla, registrar el punto
  exacto y continuar las comprobaciones de sólo lectura independientes.
  [Suscripciones](https://www.mercadopago.cl/developers/es/docs/subscriptions/overview) ·
  [Pago pendiente](https://www.mercadopago.cl/developers/es/docs/subscriptions/integration-configuration/subscription-no-associated-plan/pending-payments) ·
  [Referencia de preapproval](https://www.mercadopago.cl/developers/es/reference/online-payments/subscriptions/create-preapproval/post)

### Turno 3 — una suscripción completa y evidencia

- [ ] Acordar el candidato, la cuenta propia, una suscripción Plus mensual de
  prueba por CLP 19.990, el medio de prueba, el máximo de operaciones y la
  cancelación o conservación aprobada del fixture. El ejercicio anterior de un
  solo reenvío oficial ya autorizado cubre ingreso sin pago, si sigue siendo
  viable sobre el recurso autorizado. Un envío firmado desde el panel puede
  comprobar transporte y validación para ese recurso. La compra de prueba es
  el paso que permite observar su callback natural y el primer cobro.
- [ ] Con owner en el dominio canónico, pulsar **Suscribirme** una vez. Verificar
  un intent y un preapproval `pending`, Plus y CLP 19.990 mensuales, sin trial y
  sin acceso pagado mientras siga incompleto. Completar el checkout alojado en
  el contexto de comprador habilitado. Mantener una sesión Iroko para la misma
  cuenta en el contexto que reciba el retorno. Verificar la vuelta a
  **Plan y facturación**, el estado «Estamos confirmando tu suscripción con Mercado Pago…»
  si hay demora y **Volver a comprobar** si se agota la espera. Usar ese botón
  para consultar el estado sin crear otra suscripción.
- [ ] Correlacionar por lectura la entrega oficial y el resultado de validación,
  `billing.checkout_intents`, `billing.subscriptions`, `billing.events`,
  `billing.invoices` y `billing.payment_attempts` de la cuenta de prueba. La
  autorización del preapproval puede activar la suscripción antes de ver la
  primera factura. Registrar ambas pruebas de forma independiente. Exigir para
  MP-02 una factura pagada y un intento correlacionado con importe y moneda
  correctos. Después de recargar, comprobar plan efectivo, factura visible y
  aislamiento de la otra cuenta. Atribuir cada transición a webhook o worker
  según su origen observado. Cuando corresponda, verificar que una entrega
  repetida conserva un solo efecto de negocio.
- [ ] Comprobar que se entregó el valor del plan. Usar una cuenta de equipo de
  prueba en Free cuyo dueño compre Plus. En la misma cuenta, comparar antes y
  después de la compra las cuotas efectivas que indique el catálogo. La
  referencia observada es 2 → 10 miembros, 2 → 20 claves API y 0 → 10 endpoints
  de webhook. Los límites de equipos corresponden a la cuenta personal y se
  comprueban en ese contexto. Observar el estado de **Ajustes → Webhooks** y
  hacer valer una capacidad en servidor. Si el equipo ya tiene dos claves API
  de prueba, verificar que una tercera queda habilitada al activar Plus y
  revocar la clave nueva según la disposición acordada. Registrar lo que
  persiste tras recargar. Confirmar que la cuenta de control conserva Free.
  [Cuotas observadas en Cloud](../../../quality/manual-qa-register.md#precios-y-cuotas-visibles-en-cloud)
- [ ] Como dueño del SaaS, encontrar el pago aprobado de prueba en Mercado Pago
  y cotejarlo con la factura pagada de Iroko para la misma cuenta e importe.
  Registrar por separado la autorización de la suscripción, la aprobación del
  cobro y la acreditación de fondos. Si solo se ejecuta sandbox, la acreditación
  real queda **[NO VERIFICADO]**. La factura de este guion es el registro de
  facturación de Iroko.
- [ ] Registrar `MP-ID · UTC · SHA/origen/BD · alias de cuenta/preapproval/factura/pago ·
  pantalla y estado · origen y resultado técnico · disposición del fixture · veredicto`.
  Conservar sólo datos saneados. Si se autoriza cancelar, comprobar el estado
  remoto/local, vigencia hasta el período pagado y ausencia de renovación
  posterior cuando corresponda. Si se conserva para MP-03, dejar dueño, próxima
  fecha de revisión y decisión explícita sobre la renovación.
  [Simulador oficial de Webhooks](https://www.mercadopago.cl/developers/es/news/2024/01/11/Webhooks-Notifications-Simulator-and-Secret-Signature)

### Mini auditoría sin navegador — 2026-11-20

Base local `66bc3f7` con el árbol de trabajo actual. La selección focalizada
de Vitest para proveedor, webhook, reducer, acciones y componentes de billing
pasó con 419 pruebas y 1 omitida por el fixture opcional de discovery. La
consulta de retorno se probó con DOM simulado: `pending` conserva el indicador
de confirmación y `active` detiene el sondeo, pide volver a leer facturación
y facturas, y limpia `preapproval_id`. La URL de retorno que se entrega al
proveedor se arma sin el query previo para que pueda agregar el ID.

```powershell
pnpm test --maxWorkers=1 src/lib/billing 'dashboard/billing/__tests__' 'dashboard/org/__tests__/billing' 'api/webhooks' 'api/internal/billing/worker/__tests__/route'
```

En el Supabase local `saas-boilerplate`, una transacción pgTAP sobre los RPC
reales pasó 19/19 y se revirtió con cero filas residuales del fixture. El
checkout pendiente mantenía el equipo en Free y `create_api_key` rechazó la
tercera clave. El evento de autorización dejó Plus efectivo en ese equipo,
con 20 claves API, 10 miembros y 10 endpoints con Webhooks habilitado, y el
mismo RPC aceptó la tercera clave. La cuenta personal de control siguió en
Free. El evento de cobro registró una factura y un intento pagados por CLP
19.990. Repetirlo devolvió `duplicate`.

Dos observaciones para el recorrido visual:

- Se comprobó que `paused` devuelve `confirmed` en la consulta de retorno,
  aunque sus derechos efectivos caen a Free. Distinguir que se reconoció la
  suscripción, que el plan quedó activo y que la factura está pagada.
- Si la primera consulta de confirmación falla por un error transitorio, el
  componente no presenta el botón de reintento que sí muestra al agotar el
  sondeo en `pending`. Si la factura llega después de confirmar la
  suscripción, el historial requiere una lectura posterior para reflejarla.
  Estas dos ramas se identificaron por inspección del componente.

La prueba local trabajó con eventos simulados y dejó pendiente comprobar el
retorno exacto del proveedor, la entrega natural del webhook y el pago de la
primera compra en el candidato desplegado.

### Alta, cuenta activa y alcance del plan — 2026-11-20

El alta crea un usuario de Auth, su perfil y una cuenta Personal con
membresía `owner` para ese usuario. El enlace de confirmación pasa por
`/auth/click` y `/auth/confirm`, que valida el token y establece la sesión.
Con el asistente habilitado, el primer acceso lleva al onboarding. Omitir
antes de confirmar la organización deja solo Personal. Confirmar el nombre
crea un equipo, deja al usuario como `owner` y lo selecciona. Omitir después
conserva el equipo. Los proyectos documentales se crean aparte bajo la
cuenta activa. [Registro de QA y criterio QA-OBS-05](../../../quality/manual-qa-register.md#diagramas-del-registro-y-la-invitación)

El checkout usa el ID de la cuenta activa de la sesión y verifica el rol
`owner` o `admin` en el servidor. El correo de quien compra va al
proveedor como pagador. La suscripción y las facturas se guardan para la
cuenta elegida, y los derechos de uso siguen el plan y la membresía de esa
cuenta. El límite `teams_max` se consulta en Personal al crear equipos.
En una prueba local transaccional, 14/14 aserciones confirmaron las dos
ramas, la selección del equipo, cero proyectos documentales creados por el
asistente y Plus aplicado al equipo. Personal siguió en Free y bloqueó un
segundo equipo propio. El fixture se revirtió con cero filas residuales.

Para la primera compra de QA, terminar el onboarding y comprobar el nombre
de la cuenta seleccionada antes de abrir Facturación. Queda un caso separado
para comprar dentro del asistente. El retorno a `/dashboard/billing` con
onboarding pendiente se redirige al asistente conservando `preapproval_id`.
El asistente reentra en Invitaciones si el equipo está activo. El componente
que lee ese ID está en Elegir plan. Esta secuencia se identificó en código y
queda por observar en navegador. El criterio vigente de QA-OBS-05 pide que
el asistente configure el espacio inicial y que crear otro sea explícito.

### Pendientes después del circuito principal

| Casos | Evidencia pendiente y retorno |
| ----- | ---------------------------- |
| MP-01/02/05/15 | Dueños billing y propietario. Completar autorización, primer cobro, entrega oficial y coherencia de entorno contra el candidato. Para MP-05, sumar deduplicación, orden y correlación según la matriz y registrar qué contratos históricos se reutilizan. |
| MP-03 | Billing. Buscar primero por lectura el resultado de la cuota prevista para el 22 de octubre en la suscripción histórica. La fecha ya pasó y no se localizó un resultado documentado. Para aprobar, observar segunda factura y pago distintos en el mismo preapproval y avance del período pagado una vez. |
| MP-04/08 | Billing. Reusar evidencia de reanudación. Acotar concurrencia, resultado remoto desconocido y abandono con `needs_review`. Consultar el estado remoto antes de resolver y conservar el rastro del intent. |
| MP-06/07 | Billing y propietario. Septiembre acredita rechazo y alerta y cancelaciones correlacionadas. Queda acreditar recuperación posterior al rechazo y renovar en el candidato la evidencia de cancelación y acceso durante el período pagado según el escenario acordado. |
| MP-11/12/13/14 | Operación billing. Verificar ambos modos de `/api/internal/billing/worker`, efectos durables y recuperación del candidato con fencing. MP-12 exige una factura omitida por Webhooks y encontrada por discovery. MP-14 exige avance, aislamiento, backoff y replay sobre casos acotados. HTTP 200 del cron sólo acredita invocación. |
| MP-09/10 | Billing. Refund total/parcial, contracargo y mediación conservan cobertura local histórica y aceptación de proveedor pendiente. El rechazo histórico del sandbox limita el ensayo. Registrar el bloqueo y el escenario de retorno, y conservar los requisitos antes de operar con dinero real. |

El recorrido visual queda acreditado con MP-01/02/05/15 y la comprobación de
permisos, persistencia y disposición del fixture, dentro de las afirmaciones
efectivamente observadas. El veredicto operativo de 011 conserva MP-03–14 según
la matriz y las tareas siguientes, incluidos `015-OPERATIONS`, `RL-F05` y su
alias DB-19. Revisar antes de decidir el cierre si queda alguna brecha de
integridad o seguridad que bloquee la oferta. Un bloqueo del proveedor se
documenta con su alcance y condición de retorno.

### Contrato reutilizable y reglas del repositorio

El guion reutilizable es **plan y permisos → checkout → retorno y confirmación
→ webhook verificado → factura y acceso → cancelación y recuperación**. El
catálogo, la coordinación, el reducer y los permisos son comunes. Cada
adaptador aporta autenticación, catálogo del proveedor, creación, firma,
traducción de eventos y capacidades. Cualquier pasarela futura debe confirmar
sus capacidades de recurrencia, cancelación y reconciliación antes de aplicar
los mismos casos. [Billing Platform v2](../../../architecture/billing-platform-v2-design.md)

Se revisaron las ocho reglas de `.codex/rules`. Para TypeScript, JavaScript y
React/Next se conservan la frontera servidor/cliente y `src/proxy.ts`. La
referencia a `src/env.js` en `typescript-nextjs.md` se resuelve con el archivo
vigente `src/env.ts` que establece `AGENTS.md`. Para SQL se usan lecturas
acotadas por cuenta y entorno. Si se aprueba en otro cambio una corrección de
esquema, aplica la excepción Windows de migración manual más espejo en
`supabase/schemas/`. Facturación permite comprobar la confirmación con el
polling existente de TanStack Query. Las reglas de Supabase Realtime quedan
fuera de este recorrido. Las reglas de calidad y simplicidad se aplican al
reusar el plan, los guards y las pruebas existentes. JSDoc y el flujo de
commits aplican a cualquier implementación o entrega posterior que los requiera.
Antes de modificar pruebas, consultar `TESTING-PLAN.md` y `testing-standards.md`.

## Global Constraints

- Scope is own-use Chile, monthly CLP, hosted checkout and pending preapproval
  without an associated plan.
- Keep Free / Plus / Pro, CLP 0 / 19.990 / 102.990 and slugs
  `free` / `pro` / `scale`.
- No trial, upgrade/downgrade, Iroko-initiated pause, in-app card management or
  annual checkout is accepted or tested as v1 functionality.
- This is Iroko internal acceptance, not an official Mercado Pago
  certification.
- Every Mercado Pago or Cloudflare scenario uses the fixed official origin
  `https://project-a89lv.vercel.app`. A temporary Vercel deployment URL is not
  eligible because webhooks are configured for the stable origin.
- Record deployment revision, UTC timestamps and sanitized aliases. Never
  record credentials, payer email, card data, signatures or raw payloads.
- Every provider charge, refund, cancellation, test-user creation or Cloud
  mutation requires explicit authorization for the named environment and
  scenario.
- A scenario is `verified`, `failed` or `[NO VERIFICADO]`; partial evidence does
  not become a pass.

---

### Task 1: Freeze the acceptance candidate and evidence template

**Files:**

- Create: `docs/quality/mercadopago-v1-chile-acceptance-evidence.md`
- Modify: `docs/quality/operational-evidence.md`

**Interfaces:**

- Consumes: completed local gates 011a–011d and successful rollout 011e.
- Produces: immutable acceptance header and one evidence row per MP ID.

- [ ] **Step 1: Capture revision and runtime identity read-only**

Record Git SHA, deployment ID/stable URL, local/linked migration versions,
worker health for both modes, Mercado Pago credential environment type and
application/seller identifiers. Hash external identifiers with a documented
one-way local scheme and keep only 10-character aliases.

- [ ] **Step 2: Prove credential/application/seller coherence (MP-15)**

With the configured access token, read one known preapproval created by the
target deployment and verify its `application_id`/`collector_id` against the
approved environment inventory. Deliver one signed test notification to the
configured webhook and verify it resolves to the same deployment/account.
Record only boolean comparisons and aliases.

- [ ] **Step 3: Create the fixed evidence schema**

Use this table for every scenario:

```markdown
| Field                                      | Evidence                   |
| ------------------------------------------ | -------------------------- |
| MP requirement                             | MP-01                      |
| Result                                     | [NO VERIFICADO]            |
| Git SHA / deployment                       | recorded aliases           |
| UTC start / end                            | ISO-8601                   |
| Provider environment / app / seller        | sanitized aliases          |
| Account / subscription / invoice / payment | sanitized aliases          |
| Provider observation                       | bounded normalized fields  |
| Local DB observation                       | table/status/count summary |
| UI observation                             | exact visible state/copy   |
| Replay/recovery observation                | count and final state      |
| Reviewer                                   | repository identity        |
| Remaining gap                              | exact unmet assertion      |
```

Replace the example MP ID for each real row; do not leave example content in
the final evidence file.

- [ ] **Step 4: Request scenario authorization**

Present the exact environments, maximum number/value of test charges,
cancellations/refunds and test data to be created. Continue only after explicit
authorization; the worker rollout approval does not authorize financial
scenarios automatically.

- [ ] **Step 5: Commit the candidate and evidence template**

```bash
git add docs/quality/mercadopago-v1-chile-acceptance-evidence.md docs/quality/operational-evidence.md
git commit -m "docs: freeze Mercado Pago acceptance candidate"
```

### Task 2: Accept checkout, first charge, renewal and event ordering

**Files:**

- Modify: `docs/quality/mercadopago-v1-chile-acceptance-evidence.md`

**Interfaces:**

- Produces: independent MP-01–MP-05 decisions.

- [ ] **Step 1: Execute enrollment and authorization (MP-01)**

From an owner/admin account, choose Plus monthly. Verify one local reserved
intent precedes the provider POST, the hosted URL belongs to Mercado Pago, the
preapproval has no associated plan ID, currency is CLP, amount is 19.990 and
status begins pending. Complete authorization and verify the same local account
and selected `pro` plan become correlated; a member/non-admin attempt remains
rejected.

- [ ] **Step 2: Verify the first charge (MP-02)**

Correlate one authorized-payment invoice and nested payment. Verify distinct
external invoice/payment IDs, exact amount/currency, actual approval/debit time,
one local invoice, one payment attempt and one normalized event. Confirm the UI
shows the plan/invoice and no trial.

- [ ] **Step 3: Verify a later renewal (MP-03)**

Observe a later recurring authorized payment for the same preapproval. It must
have new invoice/payment aliases and extend the paid-through period once. A new
preapproval or manual replay of the first invoice is not renewal evidence. If
the provider test environment cannot accelerate renewal, keep MP-03
`[NO VERIFICADO]` until a real later quota occurs.

- [ ] **Step 4: Verify concurrency, resume and unknown outcome (MP-04)**

Issue two simultaneous checkout requests for one fresh account/plan and prove
only one remote preapproval exists. Revisit the flow and prove the known URL is
resumed without another POST. In the approved sandbox, interrupt the response
after remote creation and verify the intent becomes/resolves from
`needs_review` through provider lookup, never blind recreation.

- [ ] **Step 5: Verify signatures, replay, ordering and correlation (MP-05)**

Run each case separately:

1. invalid signature returns rejection and creates no event/job;
2. exact valid notification replay creates no second ledger effect;
3. payment notification before local correlation queues recovery and later
   converges to the correct account;
4. old failed delivery after a newer approved payment does not regress health,
   subscription or period;
5. webhook and snapshot race yields CAS stale/no duplicate effect;
6. a foreign account cannot claim the subscription/invoice/payment.

Record provider delivery ID aliases, HTTP statuses and before/after row counts.

- [ ] **Step 6: Commit MP-01–MP-05 evidence**

```bash
git add docs/quality/mercadopago-v1-chile-acceptance-evidence.md
git commit -m "docs: record Mercado Pago checkout evidence"
```

### Task 3: Accept rejection/recovery, cancellation and abandoned checkout

**Files:**

- Modify: `docs/quality/mercadopago-v1-chile-acceptance-evidence.md`

**Interfaces:**

- Produces: independent MP-06–MP-08 decisions.

- [ ] **Step 1: Verify rejected payment and recovery (MP-06)**

Cause a provider-supported test rejection, then inspect one failed local attempt
and `attention_required` UI while subscription status/access remain unchanged.
Allow the provider retry or approved recovery path and verify an equal-or-newer
paid/recovered attempt changes health to `healthy` without fabricating
`past_due`, a retry date or an access cutoff.

- [ ] **Step 2: Verify provider-confirmed cancellation and paid-through access (MP-07)**

Cancel from Iroko and require the Mercado Pago response to confirm terminal
status before local change. Verify future billing stops. Confirm access remains
through the invoice-backed `current_period_end` and falls to Free after that
boundary. Exercise a late cancellation webhook and snapshot replay; neither may
shorten the verified paid period or recreate access after expiry.

- [ ] **Step 3: Verify abandoned/ambiguous checkout procedure (MP-08)**

Abandon one known-URL checkout and prove it remains resumable. For a separate
unknown outcome, execute the runbook's read-only provider investigation. If no
remote resource exists, use the separately authorized private resolver and
verify its immutable audit fields; if one exists, attach/reduce it. Prove a
lease timeout alone never creates a new preapproval.

- [ ] **Step 4: Commit MP-06–MP-08 evidence**

```bash
git add docs/quality/mercadopago-v1-chile-acceptance-evidence.md
git commit -m "docs: record Mercado Pago lifecycle evidence"
```

### Task 4: Accept financial anomalies and recovery/discovery workers

**Files:**

- Modify: `docs/quality/mercadopago-v1-chile-acceptance-evidence.md`

**Interfaces:**

- Produces: independent MP-09–MP-14 decisions.

- [ ] **Step 1: Verify full refund, chargeback and mediation (MP-09)**

Exercise each provider-supported test state separately. Verify one deduplicated
open anomaly with correct type/resource alias and repeated observation count.
Confirm no subscription/access mutation. Execute manual resolution only after
provider review and record resolver/time/code. If the test environment cannot
produce chargeback or mediation, leave that sub-scenario `[NO VERIFICADO]` and
MP-09 open.

- [ ] **Step 2: Verify partial refund (MP-10)**

Refund an authorized subset of one payment. Verify original and affected CLP
amounts, type `partial_refund`, one deduplicated anomaly and unchanged access.
Confirm it is not recorded as a full refund. Do not treat a mocked local row as
provider acceptance.

- [ ] **Step 3: Verify known-payment recovery (MP-11)**

Create or retain a provider payment whose notification produces a durable known
payment job. Run recovery through the scheduled path, verify backoff/lease and
event correlation, then rerun to prove one ledger effect. Inspect the provider
resource before classifying any pending job as unrelated.

- [ ] **Step 4: Verify wholly omitted invoice discovery (MP-12)**

Suppress only Iroko's receipt of one authorized-payment webhook while allowing
the real provider invoice/payment to exist. Run reconciliation and verify
paginated discovery creates the missing normalized invoice/payment/event once.
Replay and confirm counts remain stable.

- [ ] **Step 5: Verify real worker execution (MP-13)**

Reference plan 011e evidence showing matching secret/URL/application inventory,
two manual and two scheduled invocations for each mode, HTTP 200 and correlated
health plus durable effects. Recheck current health because evidence expires
after 48 hours or any configuration change.

- [ ] **Step 6: Verify failure, progress and interruption recovery (MP-14)**

In the approved sandbox, process more than 20 due candidates with one provider
failure and one interrupted lease. Verify later candidates progress, the lease
is reclaimed, an intermediate invoice cursor resumes, watermark advances only
after completion and replay creates no duplicate ledger effects.

- [ ] **Step 7: Commit MP-09–MP-14 evidence**

```bash
git add docs/quality/mercadopago-v1-chile-acceptance-evidence.md
git commit -m "docs: record Mercado Pago recovery evidence"
```

### Task 5: Review and decide internal acceptance

**Files:**

- Modify: `docs/quality/mercadopago-v1-chile-acceptance-evidence.md`
- Modify: `docs/exec-plans/deferred/011-billing/011-mercadopago-v1-chile-acceptance.md`
- Modify: `docs/exec-plans/deferred/011-billing/011-phase2-mercadopago-tasks.md`
- Modify: `docs/exec-plans/deferred/011-billing/011-phase6-reconciliation-tasks.md`
- Modify: `docs/exec-plans/deferred/011-billing/011-billing-correctness.md`
- Modify: `docs/current-state.md`
- Modify: `docs/index.md`
- Modify: `docs/quality/operational-evidence.md`

**Interfaces:**

- Consumes: all evidence from Tasks 1–4.
- Produces: reviewed acceptance decision for the Mercado Pago v1 Chile slice.

- [ ] **Step 1: Perform a row-by-row evidence review**

For MP-01 through MP-15, require official reference, deployed code revision,
local test evidence, provider/runtime evidence, sanitized correlation and a
named reviewer. Mark a row verified only if its exact pending statement has
been satisfied. Renewal, failure/recovery, cancellation boundary, partial
refund and omitted invoice each require their own evidence.

- [ ] **Step 2: Separate code, operation and acceptance status**

Update each document using only `implementado`, `probado localmente`,
`verificado en proveedor`, `pendiente operacional` and `fuera de v1`. Keep
Plan 011 active for Stripe/Paddle/Lemon Squeezy even if the Mercado Pago slice
passes. Do not call the result an official provider certification or general
production readiness.

- [ ] **Step 3: Run fresh repository gates**

Run:

```bash
pnpm test src/lib/billing
pnpm test "dashboard/billing/__tests__/actions"
pnpm test src/app/api/internal/billing/worker/__tests__/route.test.ts
pnpm supa:test
pnpm typecheck
pnpm lint
pnpm docs:check
pnpm test:docs-check
git diff --check
```

Expected: every command exits 0. A green repository gate supports the code
revision but cannot replace provider evidence.

- [ ] **Step 4: Obtain independent internal review**

Have a reviewer compare every evidence row against the matrix and deployed
revision. Record `accepted`, `rejected` or `[NO VERIFICADO]` per row plus review
UTC timestamp. Any open required row keeps Mercado Pago acceptance pending.

- [ ] **Step 5: Commit the acceptance record**

```bash
git add docs/quality/mercadopago-v1-chile-acceptance-evidence.md docs/exec-plans/deferred/011-billing/011-mercadopago-v1-chile-acceptance.md docs/exec-plans/deferred/011-billing/011-phase2-mercadopago-tasks.md docs/exec-plans/deferred/011-billing/011-phase6-reconciliation-tasks.md docs/exec-plans/deferred/011-billing/011-billing-correctness.md docs/current-state.md docs/index.md docs/quality/operational-evidence.md
git commit -m "docs: record Mercado Pago v1 Chile acceptance"
```
