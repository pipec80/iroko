# Mercado Pago — matriz de certificación interna para v1 Chile

Actualización documental inicial: **2026-09-11**, inspección estática de `main`
en `66bc9b2`. Evidencia local de Plan 011a / Task 4 actualizada el
**2026-09-14** en `feat/mercadopago-v1-implementation`. Pertenece a
[Plan 011](011-billing-correctness.md),
[Fase 2](011-phase2-mercadopago-tasks.md) y el tramo Mercado Pago de
[Fase 6](011-phase6-reconciliation-tasks.md). No crea otro programa.

## Decisión y significado del cierre

V1 para uso propio en Chile: CLP mensual, checkout alojado, preapproval creado
`pending` sin plan asociado. Se mantienen Free / Plus / Pro, precios CLP 0 /
19.990 / 102.990 y slugs `free` / `pro` / `scale` durante el cierre. Sin trial,
upgrade/downgrade, pausa iniciada desde Iroko ni gestión de tarjetas dentro de
Iroko; anual y otros países quedan fuera de v1. La recepción de estados del
proveedor sigue siendo necesaria aunque Iroko no ofrezca la operación saliente.

La **certificación interna** es la aceptación de estos requisitos por Iroko;
no se dispone de evidencia de una certificación oficial de Mercado Pago.
Cerrar este tramo no cierra Stripe, Paddle, Lemon Squeezy ni el programa de
cuatro proveedores. Tampoco declara la v1 lista para usuarios reales sin
hardening, pricing y los checks operacionales descritos abajo.

**Origen operativo fijo:** toda aceptación, webhook y verificación de Mercado
Pago/Cloudflare usa `https://project-a89lv.vercel.app`. Las URLs temporales de
un deployment de Vercel no son un origen válido: pueden variar su configuración
y no reciben los webhooks configurados. No se sustituyen por conveniencia ni
para una ejecución de preview.

## Cómo leer el estado

- **Implementado:** código y migraciones presentes, con el límite indicado.
- **Probado localmente:** exige comando, resultado y revisión identificada.
  La existencia de un test no significa que se haya ejecutado en esta revisión.
- **Verificado en proveedor:** requiere escenario, entorno y evidencia fechada;
  el circuito sandbox del 2026-09-10 es evidencia histórica informal y parcial.
- **Pendiente operacional:** falta ejecutar o registrar una operación autorizada.
- **Fuera de v1:** exclusión de producto explícita, no un defecto pendiente.

La revisión local de Task 4 ejecutó `pnpm supa:test` (422/422),
`pnpm test src/lib/billing` (182/182),
`pnpm test "dashboard/billing/__tests__/actions"` (37/37), `pnpm typecheck`,
`pnpm test src/components/dashboard/org/__tests__/billing-payment-health-notice.test.tsx src/components/dashboard/org/__tests__/billing-tab.test.tsx`
(24/24), `pnpm lint`, `pnpm docs:check` y `git diff --check`; todos finalizaron
correctamente. Esta evidencia
se identifica como **Probado localmente — Plan 011a / Task 4, 2026-09-14**.
El seguimiento SQL posterior a ese gate registró test 39 en 51/51 y los tests
11 + 39 en 88/88 sobre los commits `572db30` y `67cc6ce`; esos resultados
amplían la evidencia focalizada sin reemplazar los conteos del gate completo.
La revisión local de Plan 011b / Task 3 ejecutó `pnpm supa:test` (40 archivos,
488 pruebas), `pnpm test src/lib/billing/__tests__/service.test.ts` (22/22),
`pnpm typecheck`, `pnpm lint`, `pnpm docs:check` (88 archivos Markdown) y
`git diff --check`; todos finalizaron correctamente. Esta evidencia prueba el
gate local de código y documentación de MP-08, no una inspección del proveedor
ni una aceptación interna.
La revisión local de Plan 011c / Task 3 ejecutó `pnpm supa:test` (41 archivos,
509 pruebas), `pnpm test src/lib/billing` (17 archivos, 194 pruebas),
`pnpm typecheck`, `pnpm lint`, `pnpm docs:check` (88 archivos Markdown) y
`git diff --check`; todos finalizaron correctamente. Esta evidencia prueba la
clasificación y persistencia local de MP-09/10 y la documentación del
procedimiento. No prueba observaciones reales del proveedor, manejo operacional
de alertas ni una ejecución manual del resolver.
La revisión local de Plan 011d / Task 4 reinició Supabase local y ejecutó
`pnpm supa:test` (42 archivos, 559 pruebas), `pnpm test src/lib/billing`
(17 archivos, 216 pruebas), la ruta del worker (7/7) y `pnpm typecheck`, todos
correctos el **2026-09-16**. `pnpm supa:gen:types` no produjo diff. El intento
de `pnpm lint` abortó inicialmente con `Atomics.wait() failed: timed-out`
dentro de `better-tailwindcss/enforce-canonical-classes` al analizar
`src/app/global-error.tsx`; el reintento fuera del sandbox pasó. El harness
combinado versionado de 25 aliases pasó 1/1: una falla aislada, cursor
intermedio, reclaim de lease expirado, avance de las 25 filas y comparación sin
duplicados de IDs invoice/event/payment. Es un seam determinista del servicio,
no un proveedor ni una base Cloud. Esta evidencia prueba código y pruebas
locales de MP-12/14, no proveedor, Cloud, interrupción de proceso ni aceptación
interna.
La revisión local de Plan 011g / Task 4 reinició Supabase local, regeneró tipos
sin diff y ejecutó pgTAP 36 38/38, 37 20/20 y 41 21/21; provider 96/96, webhook
25/25, recovery 11/11, reconciliation 17/17 y billing 245/245 Vitest; además
de typecheck, lint y Supabase lint, todos con salida 0 el **2026-09-16**. El
linter de Supabase emitió únicamente hallazgos heredados de extensiones ajenas
al cambio. Esta evidencia prueba el ingreso local de anomalías de MP-09/10 por
webhook y discovery, no observaciones del proveedor, alertas operacionales,
resolver manual, workers desplegados, configuración del proveedor ni Cloud.
Todo resultado Cloud/proveedor actual sigue **[NO VERIFICADO]**.
El [registro operacional](../../quality/operational-evidence.md) conserva la
procedencia y caducidad del circuito histórico. Ninguna fila se cierra solo
con alta/cancelación o con tests verdes.

## Matriz de aceptación

Las referencias de código y pruebas se resuelven en el inventario inferior.
Cada pendiente incluye su fase responsable; salvo las filas que identifican un
gate fechado, las pruebas citadas son existentes y no nuevos resultados de
ejecución.

**Corrección operacional 2026-09-22 para MP-11/13/14:** el rollout 011e ya
verificó la invocación básica Cloud. Recovery y reconciliation tienen health
correlacionado con `pg_net` HTTP 200, sin timeout/error; reconciliation job 15
completó cuatro ejecuciones horarias consecutivas (12:00–15:00 UTC). Esta
corrección sustituye las referencias históricas de la tabla a worker apagado o
no reinspeccionado. No identifica un pago conocido reparado (MP-11), una factura
realmente omitida (MP-12) ni prueba múltiples lotes, fallo, interrupción, lease
reclaim o replay (MP-14): esos escenarios siguen **[NO VERIFICADO]**.

| ID / requisito                                                                   | Referencia oficial                                                                                                           | Implementación inspeccionada                                                                                                                                                                                                                                                                                                                                                                                                                                                | Pruebas existentes y límite                                                                                                                                                                                                                                                                                                                                              | Evidencia operacional                                                                                            | Pendiente concreto de cierre                                                                                                                                                                                                                                  |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MP-01 Alta y autorización                                                        | [Checkout pendiente][mp-pending], [prueba de compra][mp-test]                                                                | Implementado: `createCheckout`, reserva/attach en `service.ts`, correlación en webhook y confirmación por cuenta.                                                                                                                                                                                                                                                                                                                                                           | Provider, service, webhook; SQL 35/36. Cubren CLP, reserva, identidad y confirmación.                                                                                                                                                                                                                                                                                    | Circuito sandbox 2026-09-10: intent `confirmed`, suscripción `active`; informal. Actual **[NO VERIFICADO]**.     | Fase 2: repetir con entorno coherente y registrar preapproval, cuenta, plan y autorización; confirmar UI de la misma cuenta.                                                                                                                                  |
| MP-02 Primer cobro                                                               | [API de suscripciones][mp-api], [prueba de compra][mp-test]                                                                  | Implementado: authorized-payment se normaliza a invoice y payment independientes.                                                                                                                                                                                                                                                                                                                                                                                           | Provider/reducer; SQL 11. No demuestran un cobro real actual.                                                                                                                                                                                                                                                                                                            | Invoice `paid` e `invoice_paid` registrados informalmente el 2026-09-10.                                         | Fase 2: evidencia sanitizada del importe CLP, fecha aprobada e identidades factura/pago; distinguir autorización de cobro.                                                                                                                                    |
| MP-03 Renovación posterior                                                       | [API de suscripciones][mp-api], [reintentos de cuotas][mp-retries]                                                           | Implementado el procesamiento de invoices; eventos de pago no cambian plan/estado de suscripción. Snapshot usa `next_payment_date`, que no demuestra por sí sola período pagado.                                                                                                                                                                                                                                                                                            | Provider/reducer y SQL 11 comprueban separación de mutaciones. No hay aceptación de segunda cuota.                                                                                                                                                                                                                                                                       | **[NO VERIFICADO]**.                                                                                             | Fases 2/6: observar una cuota posterior de la misma suscripción, nueva invoice/payment y entitlements correctos; no sustituirla por otra alta. Validar origen del período pagado.                                                                             |
| MP-04 Checkout concurrente, reanudación y respuesta desconocida                  | [Checkout pendiente][mp-pending]; reserva local definida en [ADR 0003](../../adr/0003-mercadopago-reliability-boundaries.md) | Implementado: `reserve_billing_checkout` antes del POST, resume de URL conocida y `needs_review` ante resultado ambiguo.                                                                                                                                                                                                                                                                                                                                                    | Service: ganador único, resume sin POST, fallo de attach; SQL 36: lease/aislamiento.                                                                                                                                                                                                                                                                                     | **[NO VERIFICADO]** en circuito concurrente del proveedor.                                                       | Fase 2: demostrar un único preapproval con dos solicitudes y recuperación tras respuesta perdida; documentar resolución del operador sin recreación ciega.                                                                                                    |
| MP-05 Firmas, duplicados, desorden y correlación cuenta/suscripción/factura/pago | [Webhooks][mp-webhooks], [API de suscripciones][mp-api]                                                                      | Implementado: firma/manifiesto, fetch remoto, resolución de referencia, IDs deterministas y reducer/RPC; CAS para snapshots.                                                                                                                                                                                                                                                                                                                                                | Provider/contract, webhook/reducer, SQL 11/36/37/38. Hay replay/idempotencia y CAS; no equivalen a toda permutación de eventos tardíos.                                                                                                                                                                                                                                  | El circuito histórico contiene eventos; no hay replay/desorden formal capturado.                                 | Fases 2/6: firmas inválidas rechazadas; replay sin efecto extra; pago antes de correlación; rechazo antiguo después de pago aprobado y webhook concurrente con snapshot sin regresión ni cruce de cuenta.                                                     |
| MP-06 Rechazo, reintento y recuperación visibles                                 | [Reintentos de cuotas][mp-retries]                                                                                           | Implementado: `invoice_payment_failed`, intentos y recovery; el reducer conserva estado de suscripción. `get_billing_payment_health` separa salud de lifecycle y el dashboard muestra una alerta visible solo para `attention_required`.                                                                                                                                                                                                                                    | **Probado localmente — Plan 011a / Task 4, 2026-09-14:** pgTAP 422/422, billing 182/182, actions 37/37 y notice/billing tab 24/24; incluye fallo → recuperación sin RPC de suscripción y alerta visible. No demuestra el ciclo real del proveedor.                                                                                                                       | **[NO VERIFICADO]** rechazo, reintento y recuperación en proveedor.                                              | Fases 2/6: ejercer rechazo, reintento y recuperación en proveedor, observar aparición y limpieza de la alerta y probar convergencia del ledger. No inventar `past_due`, cortes de acceso, portal de tarjetas ni motor de cobros.                              |
| MP-07 Cancelación confirmada y acceso hasta período pagado                       | [Gestión de suscripción][mp-management]; acceso definido por Iroko                                                           | Implementado: PUT y validación de `cancelled`/`canceled`; evento de cancelación por webhook. `apply_invoice_paid` persiste intervalos válidos de invoices aprobadas y solo adelanta el período verificado. Los reducers de lifecycle y cancelación aplican sus campos sin borrar evidencia de período más fuerte. Los RPC de lectura y el plan efectivo aceptan `active`/`trialing`, o `canceled` solo con `current_period_end IS NOT NULL AND current_period_end > now()`. | **Probado localmente — Plan 011a / Task 4, 2026-09-14:** el gate conserva pgTAP 422/422 y billing 182/182. El seguimiento de test 39 pasó 51/51 y tests 11 + 39 pasaron 88/88 con RPC reales: future/past/null, intervalos inválidos o parciales, replay y eventos fuera de orden. El test TypeScript solo mapea salidas Pro/Free autoritativas; no prueba el reloj SQL. | Cancelación sandbox observada el 2026-09-10 (fix #179); acceso antes/después del fin pagado **[NO VERIFICADO]**. | Fases 2/6: confirmar cese de cobros en proveedor, fecha pagada sustentada y acceso real antes/después del límite, incluidos webhook tardío y snapshot. No confundir cancelación inmediata remota con corte inmediato local.                                   |
| MP-08 Checkout abandonado                                                        | [Checkout pendiente][mp-pending], [consulta/gestión][mp-api]                                                                 | Implementado: migración `20260911110000_billing_checkout_operator_resolution.sql` y resolver privado inmutable. Solo permite `needs_review` o `pending` vencido sin ID remoto → `canceled`/`failed`, conserva auditoría y no tiene grants de aplicación; el runbook exige inspección y convergencia remota antes de resolver localmente.                                                                                                                                    | **Probado localmente — Plan 011b / Task 3, 2026-09-14:** SQL 40 fue aprobado 28/28 en el GREEN de la tarea de migración; el gate completo posterior pasó pgTAP 488/488 y service 22/22. El resolver bloquea resultado desconocido, ID remoto, estados no elegibles y cambios directos de la evidencia; ninguna prueba autoriza un segundo POST.                          | Procedimiento versionado para revisión del proveedor y resolución; proveedor/Cloud actuales **[NO VERIFICADO]**. | Fases 2/6: con autorización separada, inspeccionar el recurso remoto, adjuntarlo y convergerlo o ejecutar la resolución auditada según el runbook; conservar evidencia sanitizada. Edad/lease vencido no autorizan nuevo POST ni cancelación local inventada. |
| MP-09 Refund total, contracargo y mediación                                      | [Reembolso de pago][mp-refund], [Webhooks][mp-webhooks]                                                                      | Implementado: recovery, webhook `payment` vinculado y discovery obtienen evidencia fresca, validan el ID retornado y clasifican refund total o los estados `refunded`, `charged_back` e `in_mediation`. El RPC idempotente persiste evidencia acotada antes del reducer; la rama de anomalía no llama al reducer y la resolución sigue siendo privada y manual.                                                                                                             | **Probado localmente — Plan 011g / Task 4, 2026-09-16:** pgTAP 37 20/20 y 41 21/21, provider 96/96, webhook 25/25, recovery 11/11, reconciliation 17/17 y billing 245/245 verifican identidad fresca, deduplicación, estados adversos y cero llamadas al reducer en rutas anómalas. No observa el proveedor ni ejecuta el resolver.                                      | Refund/contracargo/mediación reales, manejo de alerta y resolución manual **[NO VERIFICADO]**.                   | 011e/011f: ejercer cada estado en proveedor, correlacionar la fila, comparar evidencia sanitizada según el runbook, observar una alerta accionable y ejecutar bajo autorización la resolución manual; confirmar que el acceso no cambia automáticamente.      |
| MP-10 Reembolso parcial                                                          | [Reembolso parcial/total][mp-refund], [consulta de reembolso][mp-get-refund]                                                 | Implementado: recovery, un webhook `payment` vinculado y reconciliation discovery buscan el pago fresco. Con `0 < transaction_amount_refunded < transaction_amount`, importes enteros válidos y moneda mayúscula de tres letras, persisten `partial_refund` deduplicado antes del reducer. Full refund, importes inválidos, cero y sobre-reembolso siguen la clasificación acotada; discovery falla la página completa sin avanzar estado ante fetch/ID/cuerpo inválido.    | **Probado localmente — Plan 011g / Task 4, 2026-09-16:** provider 96/96, webhook 25/25, recovery 11/11, reconciliation 17/17, billing 245/245 y SQL 41 21/21 cubren parcial/full/cero/CLP inválido, identidad, replay, persistencia y exclusión del reducer. La evidencia cubre código local, no un reembolso proveedor real.                                            | Reembolso parcial real, manejo de alerta y ejecución del resolver manual **[NO VERIFICADO]**.                    | 011e/011f: observar un parcial real, comparar evidencia sanitizada, manejar la alerta y ejecutar la resolución manual autorizada. Verificar proveedor, Cloud, workers desplegados y alerta real; no automatizar reembolsos desde Iroko.                       |
| MP-11 Recovery de pago conocido                                                  | [Consulta de pago/factura][mp-api]                                                                                           | Implementado: job durable con payment ID; fetch del pago y búsqueda de authorized-payment por `payment_id`; backoff, lease, agotamiento y reducer compartido.                                                                                                                                                                                                                                                                                                               | Recovery/provider y SQL 37: correlación tardía, pending, error, lease, agotamiento y deduplicación.                                                                                                                                                                                                                                                                      | Worker apagado según registro 2026-09-10; estado actual **[NO VERIFICADO]**.                                     | Fase 6: ejecutar job conocido hasta resolución o escalamiento; repetir y probar concurrencia, sin doble aplicación. No cerrar como cosmético sin inspeccionar el recurso.                                                                                     |
| MP-12 Factura omitida totalmente por webhooks                                    | [Búsqueda paginada de facturas por preapproval][mp-api]                                                                      | Implementado: discovery paginada y acotada por suscripción, cursor y watermark durables en `billing.reconciliation_state`, normalización de invoices y aplicación por el reducer compartido.                                                                                                                                                                                                                                                                                | **Probado localmente — Plan 011d / Task 4, 2026-09-16:** pgTAP 559/559 y billing 216/216 cubren el estado durable, cursor/replay y el ingreso de eventos descubiertos sin depender de webhook/job conocido. El harness versionado 1/1 usa 25 aliases y compara IDs de invoice/event/payment antes/después de replay. Typecheck y lint también pasaron.                   | Omisión real de webhook/factura y convergencia contra Mercado Pago **[NO VERIFICADO]**.                          | 011e/011f: observar una invoice del proveedor completamente omitida, correlacionar aliases sanitizados y validar una sola aplicación y replay sin duplicados. El harness no sustituye esa evidencia operacional.                                              |
| MP-13 Worker: configuración y ejecución real                                     | [Consultas remotas][mp-api]; contrato local en [runbook](../../runbooks/billing-reconciliation.md)                           | Implementado: ruta Node, secreto, Vault/pg_net, health y modos recovery/reconciliation; configuración versionada no activa cron.                                                                                                                                                                                                                                                                                                                                            | Route y SQL 38: autenticación, resumen y registro de errores.                                                                                                                                                                                                                                                                                                            | Registro 2026-09-10: sin secret/Vault/firewall/cron, health vacío. No reinspeccionado.                           | Fase 6: rollout autorizado, verificar ambos modos manualmente y agendados; health unido a respuesta HTTP y resultado en ledger/jobs, no solo éxito de cron.                                                                                                   |
| MP-14 Worker: fallos, avance e idempotencia                                      | [Consultas paginadas][mp-api]; límites locales del [diseño](../../architecture/mercadopago-reliability-design.md)            | Implementado: claims por `next_scan_at,subscription_id`, lotes ≤20, grupos de 5, presupuesto 45 s, cursor/watermark, backoff y aislamiento por candidato. El estado terminal se programa como skipped y el lease vencido se puede reclamar.                                                                                                                                                                                                                                 | **Probado localmente — Plan 011d / Task 4, 2026-09-16:** pgTAP 559/559 cubre 25 filas, cursor, reclaimer y una segunda sesión `SKIP LOCKED`; billing 216/216 cubre fallo aislado, deadline y replay; la ruta 7/7 y el harness 25-alias 1/1 cubren avance, cursor y reclaim deterministas. Typecheck y lint también pasaron.                                              | Invocaciones múltiples Cloud, interrupción de proceso y replay operacional **[NO VERIFICADO]**.                  | 011e/011f: ejecutar workers manuales y agendados y registrar más de un lote y una interrupción/reinicio reales. El harness no sustituye esos escenarios.                                                                                                      |
| MP-15 Aplicación, vendedor y credenciales por entorno                            | [Credenciales][mp-credentials], [prueba de compra][mp-test]                                                                  | `src/env.ts` valida configuración; no prueba pertenencia de token/secreto/webhook al mismo vendedor/aplicación.                                                                                                                                                                                                                                                                                                                                                             | Validación estática no acredita configuración remota.                                                                                                                                                                                                                                                                                                                    | Intento fallido 2026-09-01 y dos aplicaciones reportadas 2026-09-10. Coherencia actual **[NO VERIFICADO]**.      | Fase 2: mapa sanitizado entorno → aplicación/vendedor/tipo de prueba → deployment/webhook, lectura del mismo recurso con el token configurado y firma válida. Resolver mezcla de aplicaciones bajo autorización y adjuntar evidencia formal.                  |

## Inventario de evidencia ejecutable

- Adaptador: [mercadopago.ts](../../../src/lib/billing/providers/mercadopago.ts),
  [pruebas provider](../../../src/lib/billing/providers/__tests__/mercadopago.test.ts)
  y [contrato de firma](../../../src/lib/billing/providers/__tests__/mercadopago.contract.test.ts).
- Orquestación: [service](../../../src/lib/billing/service.ts),
  [pruebas service](../../../src/lib/billing/__tests__/service.test.ts),
  [webhook](../../../src/lib/billing/webhook-handler.ts),
  [pruebas webhook](../../../src/lib/billing/__tests__/webhook-handler.test.ts),
  [reducer](../../../src/lib/billing/reducer.ts),
  [pruebas reducer](../../../src/lib/billing/__tests__/reducer.test.ts) y
  [estado de suscripción](../../../src/lib/billing/subscription-state.ts).
- Acceso: [entitlements](../../../src/lib/billing/entitlements.ts),
  [pruebas de consumo de entitlements](../../../src/lib/billing/__tests__/entitlements.test.ts)
  y el predicado temporal ejercido por SQL 39.
- Operación: [recovery](../../../src/lib/billing/recovery.ts),
  [pruebas recovery](../../../src/lib/billing/__tests__/recovery.test.ts),
  [reconciliation](../../../src/lib/billing/reconciliation.ts),
  [pruebas reconciliation](../../../src/lib/billing/__tests__/reconciliation.test.ts),
  [route](../../../src/app/api/internal/billing/worker/route.ts) y
  [pruebas route](../../../src/app/api/internal/billing/worker/__tests__/route.test.ts).
- UI: [billing-tab](../../../src/components/dashboard/org/billing-tab.tsx),
  [notice de salud](../../../src/components/dashboard/org/billing-payment-health-notice.tsx),
  [pruebas del tab](../../../src/components/dashboard/org/__tests__/billing-tab.test.tsx)
  y [pruebas del notice](../../../src/components/dashboard/org/__tests__/billing-payment-health-notice.test.tsx).
- SQL: [11 billing](../../../supabase/tests/database/11_billing.test.sql),
  [35 confirmación](../../../supabase/tests/database/35_billing_checkout_confirmation.test.sql),
  [36 intents](../../../supabase/tests/database/36_billing_checkout_intents.test.sql),
  [37 recovery](../../../supabase/tests/database/37_billing_recovery.test.sql),
  [38 worker](../../../supabase/tests/database/38_billing_reconciliation_worker.test.sql),
  [39 salud/período pagado](../../../supabase/tests/database/39_billing_payment_health_paid_through.test.sql)
  y [41 detalle de anomalía financiera](../../../supabase/tests/database/41_billing_financial_anomaly_detail.test.sql).
  Migraciones que reemplazan planificación anterior:
  [intents](../../../supabase/migrations/20260909160000_billing_checkout_intents.sql),
  [recovery/anomalías](../../../supabase/migrations/20260909180000_billing_recovery_and_anomalies.sql)
  y [worker](../../../supabase/migrations/20260909190000_billing_reconciliation_worker.sql),
  con sus espejos en `supabase/schemas/`.

## Secuencia y evidencia exigida

1. Ejecutar [`011a`](011a-mercadopago-payment-health-paid-through.md),
   [`011b`](011b-mercadopago-checkout-resolution.md),
   [`011c`](011c-mercadopago-financial-anomalies.md) y
   [`011d`](011d-mercadopago-invoice-discovery-reconciliation.md) para resolver
   los gaps de código dentro de Fases 2/6 con TDD y gates locales.
2. Activar y verificar workers mediante el rollout explícitamente autorizado
   [`011e`](011e-mercadopago-worker-rollout.md); cubrir ambos modos, errores,
   avance y replay.
3. Ejecutar la aceptación interna
   [`011f`](011f-mercadopago-internal-acceptance.md) con evidencia sanitizada por fila: revisión,
   fecha UTC, entorno de aplicación y proveedor, escenario/resultado esperado,
   resultado observado, IDs correlacionables mediante alias, estado remoto y
   local, comprobación UI/acceso, comando/run y revisión del responsable.
   Sin tokens, secretos, datos personales ni payloads crudos. Un escenario
   imposible de reproducir sigue abierto, con limitación y siguiente acción.
4. Resolver hardening y fuente única de pricing del [Plan 012](012-security-hardening-and-pricing-truth.md),
   conservando el rename `scale → teams` como decisión separada. Antes de
   usuarios reales: smoke de producción, auth/aislamiento, seguridad, entrega
   de email, observabilidad/alertas accionables, paridad de migraciones y
   recuperación operacional verificadas. Aplican los gates del
   [registro](../../quality/operational-evidence.md) y la
   [Definition of Done](../../quality/definition-of-done.md).
5. Stripe, Paddle y Lemon Squeezy: certificación interna independiente para
   adaptador, catálogo, eventos, capacidades, reconciliación y pruebas de cada
   uno. No bloquean la v1 propia limitada a Mercado Pago; sí el programa completo.
6. [Plan 013](013-launch-readiness-roadmap.md): distribución comercial posterior
   cuando se decida vender. Smoke, observabilidad y seguridad para operar no
   se posponen hasta esa decisión.

## Referencias oficiales y límite de consulta

Referencias consultadas el 2026-09-11 mediante resultados indexados del dominio
oficial chileno. La apertura directa de checkout pendiente, gestión y Webhooks
devolvió HTTP 403; no se afirma lectura integral actual de esas páginas.
Reabrir y contrastar contratos exactos antes del trabajo con el proveedor.
Las guías de otros productos (Orders o cargos automáticos) no sustituyen el
contrato de Suscripciones. Reintentos de Mercado Pago no son jobs de recovery
de Iroko; los últimos consultan/convergen estado, no vuelven a cobrar.

[mp-pending]: https://www.mercadopago.cl/developers/en/docs/subscriptions/integration-configuration/subscription-no-associated-plan/pending-payments
[mp-api]: https://www.mercadopago.cl/developers/en/reference/online-payments/subscriptions/overview
[mp-management]: https://www.mercadopago.cl/developers/en/docs/subscriptions/subscription-management
[mp-webhooks]: https://www.mercadopago.cl/developers/en/docs/subscriptions/additional-content/your-integrations/notifications/webhooks
[mp-retries]: https://www.mercadopago.cl/developers/es/docs/subscriptions/integration-configuration/subscription-no-associated-plan/authorized-payments
[mp-refund]: https://www.mercadopago.cl/developers/es/reference/online-payments/checkout-api-payments/create-refund/post
[mp-get-refund]: https://www.mercadopago.cl/developers/en/reference/online-payments/checkout-api-payments/get-refund/get
[mp-credentials]: https://www.mercadopago.cl/developers/en/docs/your-integrations/credentials
[mp-test]: https://www.mercadopago.cl/developers/en/docs/subscriptions/integration-test/payment-approval
