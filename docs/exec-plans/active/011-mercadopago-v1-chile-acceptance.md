# Mercado Pago — matriz de certificación interna para v1 Chile

Actualización documental: **2026-09-11**, inspección estática de `main` en
`66bc9b2`. Pertenece a [Plan 011](011-billing-correctness.md),
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

## Cómo leer el estado

- **Implementado:** código y migraciones presentes, con el límite indicado.
- **Probado localmente:** exige comando, resultado y revisión identificada.
  La existencia de un test no significa que se haya ejecutado en esta revisión.
- **Verificado en proveedor:** requiere escenario, entorno y evidencia fechada;
  el circuito sandbox del 2026-09-10 es evidencia histórica informal y parcial.
- **Pendiente operacional:** falta ejecutar o registrar una operación autorizada.
- **Fuera de v1:** exclusión de producto explícita, no un defecto pendiente.

Esta pasada inspecciona código y pruebas, pero solo ejecuta validaciones
documentales. Todo resultado Cloud/proveedor actual sigue **[NO VERIFICADO]**.
El [registro operacional](../../quality/operational-evidence.md) conserva la
procedencia y caducidad del circuito histórico. Ninguna fila se cierra solo
con alta/cancelación o con tests verdes.

## Matriz de aceptación

Las referencias de código y pruebas se resuelven en el inventario inferior.
Cada pendiente incluye su fase responsable; las pruebas citadas son existentes,
no nuevos resultados de ejecución.

| ID / requisito                                                                   | Referencia oficial                                                                                                           | Implementación inspeccionada                                                                                                                                                                | Pruebas existentes y límite                                                                                                                  | Evidencia operacional                                                                                            | Pendiente concreto de cierre                                                                                                                                                                                                                 |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MP-01 Alta y autorización                                                        | [Checkout pendiente][mp-pending], [prueba de compra][mp-test]                                                                | Implementado: `createCheckout`, reserva/attach en `service.ts`, correlación en webhook y confirmación por cuenta.                                                                           | Provider, service, webhook; SQL 35/36. Cubren CLP, reserva, identidad y confirmación.                                                        | Circuito sandbox 2026-09-10: intent `confirmed`, suscripción `active`; informal. Actual **[NO VERIFICADO]**.     | Fase 2: repetir con entorno coherente y registrar preapproval, cuenta, plan y autorización; confirmar UI de la misma cuenta.                                                                                                                 |
| MP-02 Primer cobro                                                               | [API de suscripciones][mp-api], [prueba de compra][mp-test]                                                                  | Implementado: authorized-payment se normaliza a invoice y payment independientes.                                                                                                           | Provider/reducer; SQL 11. No demuestran un cobro real actual.                                                                                | Invoice `paid` e `invoice_paid` registrados informalmente el 2026-09-10.                                         | Fase 2: evidencia sanitizada del importe CLP, fecha aprobada e identidades factura/pago; distinguir autorización de cobro.                                                                                                                   |
| MP-03 Renovación posterior                                                       | [API de suscripciones][mp-api], [reintentos de cuotas][mp-retries]                                                           | Implementado el procesamiento de invoices; eventos de pago no cambian plan/estado de suscripción. Snapshot usa `next_payment_date`, que no demuestra por sí sola período pagado.            | Provider/reducer y SQL 11 comprueban separación de mutaciones. No hay aceptación de segunda cuota.                                           | **[NO VERIFICADO]**.                                                                                             | Fases 2/6: observar una cuota posterior de la misma suscripción, nueva invoice/payment y entitlements correctos; no sustituirla por otra alta. Validar origen del período pagado.                                                            |
| MP-04 Checkout concurrente, reanudación y respuesta desconocida                  | [Checkout pendiente][mp-pending]; reserva local definida en [ADR 0003](../../adr/0003-mercadopago-reliability-boundaries.md) | Implementado: `reserve_billing_checkout` antes del POST, resume de URL conocida y `needs_review` ante resultado ambiguo.                                                                    | Service: ganador único, resume sin POST, fallo de attach; SQL 36: lease/aislamiento.                                                         | **[NO VERIFICADO]** en circuito concurrente del proveedor.                                                       | Fase 2: demostrar un único preapproval con dos solicitudes y recuperación tras respuesta perdida; documentar resolución del operador sin recreación ciega.                                                                                   |
| MP-05 Firmas, duplicados, desorden y correlación cuenta/suscripción/factura/pago | [Webhooks][mp-webhooks], [API de suscripciones][mp-api]                                                                      | Implementado: firma/manifiesto, fetch remoto, resolución de referencia, IDs deterministas y reducer/RPC; CAS para snapshots.                                                                | Provider/contract, webhook/reducer, SQL 11/36/37/38. Hay replay/idempotencia y CAS; no equivalen a toda permutación de eventos tardíos.      | El circuito histórico contiene eventos; no hay replay/desorden formal capturado.                                 | Fases 2/6: firmas inválidas rechazadas; replay sin efecto extra; pago antes de correlación; rechazo antiguo después de pago aprobado y webhook concurrente con snapshot sin regresión ni cruce de cuenta.                                    |
| MP-06 Rechazo, reintento y recuperación visibles                                 | [Reintentos de cuotas][mp-retries]                                                                                           | Implementado: `invoice_payment_failed`, intentos y recovery; `applyEvent` conserva estado de suscripción. Dashboard muestra facturas, sin señal específica de salud del pago.               | Provider: rechazo → aprobación con IDs distintos; recovery/reducer; SQL 11/37. Falta aceptación de aviso al usuario.                         | **[NO VERIFICADO]** rechazo, reintento y recuperación en proveedor.                                              | Fase 2: señal visible de problema/recuperación y siguiente acción viable con checkout alojado. No inventar `past_due`, cortes de acceso, portal de tarjetas ni motor de cobros. Fase 6: probar convergencia del ledger.                      |
| MP-07 Cancelación confirmada y acceso hasta período pagado                       | [Gestión de suscripción][mp-management]; acceso definido por Iroko                                                           | Implementado: PUT y validación de `cancelled`/`canceled`; evento de cancelación por webhook. El guard del proveedor no certifica el cálculo de acceso.                                      | Provider/service rechazan cancelación no confirmada; reducer y SQL 11 separan cancelación.                                                   | Cancelación sandbox observada el 2026-09-10 (fix #179); acceso antes/después del fin pagado **[NO VERIFICADO]**. | Fases 2/6: confirmar cese de cobros en proveedor, fecha pagada sustentada y acceso antes/después del límite, incluidos webhook tardío y snapshot. No confundir cancelación inmediata remota con corte inmediato local.                       |
| MP-08 Checkout abandonado                                                        | [Checkout pendiente][mp-pending], [consulta/gestión][mp-api]                                                                 | Implementado: `incomplete`, intent pendiente reutilizable y bloqueo de incertidumbre. No hay política operativa completa de abandono/expiración.                                            | Service/SQL 36 cubren resume y resultado desconocido, no el ciclo operativo de abandono.                                                     | **[NO VERIFICADO]**.                                                                                             | Fases 2/6: procedimiento verificable para pendientes antiguos y ambiguos; consultar estado remoto, reanudar o escalar y registrar resolución. Edad/lease vencido no autorizan nuevo POST ni cancelación local inventada.                     |
| MP-09 Refund total, contracargo y mediación                                      | [Reembolso de pago][mp-refund], [Webhooks][mp-webhooks]                                                                      | Implementado: `recoverResource` clasifica `refunded`, `charged_back`, `in_mediation`; anomalía persistente y resolución SQL manual.                                                         | Provider prueba refund; recovery y SQL 37 cubren persistencia/deduplicación. Cobertura específica de cada estado y alertas a verificar.      | **[NO VERIFICADO]** evidencia proveedor y resolución operacional.                                                | Fases 2/6: ejercer cada estado, alerta accionable, correlación y resolución manual auditada; demostrar que no se altera acceso automáticamente.                                                                                              |
| MP-10 Reembolso parcial                                                          | [Reembolso parcial/total][mp-refund], [consulta de reembolso][mp-get-refund]                                                 | Brecha: la clasificación inspeccionada depende de `payment.status`; no consulta importes/reembolsos para detectar un parcial con otro estado.                                               | No se encontró prueba específica de refund parcial en las suites inspeccionadas.                                                             | **[NO VERIFICADO]**.                                                                                             | Fases 2/6: confirmar payload/estado real del parcial, definir detección persistente y prueba de importes sin duplicar ni marcar devolución total; resolución manual, sin automatizar devolución desde Iroko.                                 |
| MP-11 Recovery de pago conocido                                                  | [Consulta de pago/factura][mp-api]                                                                                           | Implementado: job durable con payment ID; fetch del pago y búsqueda de authorized-payment por `payment_id`; backoff, lease, agotamiento y reducer compartido.                               | Recovery/provider y SQL 37: correlación tardía, pending, error, lease, agotamiento y deduplicación.                                          | Worker apagado según registro 2026-09-10; estado actual **[NO VERIFICADO]**.                                     | Fase 6: ejecutar job conocido hasta resolución o escalamiento; repetir y probar concurrencia, sin doble aplicación. No cerrar como cosmético sin inspeccionar el recurso.                                                                    |
| MP-12 Factura omitida totalmente por webhooks                                    | [Búsqueda paginada de facturas por preapproval][mp-api]                                                                      | Brecha: recovery parte de IDs conocidos; snapshot consulta preapproval, no enumera invoices de la suscripción.                                                                              | No hay test de descubrimiento de invoice sin evento/job local en las suites inspeccionadas.                                                  | **[NO VERIFICADO]**.                                                                                             | Fase 6: búsqueda paginada/acotada por suscripción, cursor/ventana y correlación; demostrar ingreso por normalizador/reducer de factura desconocida y replay idempotente. Resolver antes del cierre.                                          |
| MP-13 Worker: configuración y ejecución real                                     | [Consultas remotas][mp-api]; contrato local en [runbook](../../runbooks/billing-reconciliation.md)                           | Implementado: ruta Node, secreto, Vault/pg_net, health y modos recovery/reconciliation; configuración versionada no activa cron.                                                            | Route y SQL 38: autenticación, resumen y registro de errores.                                                                                | Registro 2026-09-10: sin secret/Vault/firewall/cron, health vacío. No reinspeccionado.                           | Fase 6: rollout autorizado, verificar ambos modos manualmente y agendados; health unido a respuesta HTTP y resultado en ledger/jobs, no solo éxito de cron.                                                                                  |
| MP-14 Worker: fallos, avance e idempotencia                                      | [Consultas paginadas][mp-api]; límites locales del [diseño](../../architecture/mercadopago-reliability-design.md)            | Implementado: lotes ≤20, grupos de 5 y presupuesto 45 s; CAS. Brechas: selección por `updated_at,id` sin cursor de barrido y `Promise.all` sin aislamiento por candidato en reconciliación. | Reconciliation/SQL 38 prueban CAS; recovery/route prueban errores. No hay aceptación de avance con más de 20 candidatos estables o fallidos. | **[NO VERIFICADO]**.                                                                                             | Fase 6: demostrar y corregir posible estancamiento por duplicados/skips/errores, aislamiento de fallo, lease tras interrupción y recuperación idempotente. Registrar más de un lote y un reinicio real.                                      |
| MP-15 Aplicación, vendedor y credenciales por entorno                            | [Credenciales][mp-credentials], [prueba de compra][mp-test]                                                                  | `src/env.ts` valida configuración; no prueba pertenencia de token/secreto/webhook al mismo vendedor/aplicación.                                                                             | Validación estática no acredita configuración remota.                                                                                        | Intento fallido 2026-09-01 y dos aplicaciones reportadas 2026-09-10. Coherencia actual **[NO VERIFICADO]**.      | Fase 2: mapa sanitizado entorno → aplicación/vendedor/tipo de prueba → deployment/webhook, lectura del mismo recurso con el token configurado y firma válida. Resolver mezcla de aplicaciones bajo autorización y adjuntar evidencia formal. |

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
- Operación: [recovery](../../../src/lib/billing/recovery.ts),
  [pruebas recovery](../../../src/lib/billing/__tests__/recovery.test.ts),
  [reconciliation](../../../src/lib/billing/reconciliation.ts),
  [pruebas reconciliation](../../../src/lib/billing/__tests__/reconciliation.test.ts),
  [route](../../../src/app/api/internal/billing/worker/route.ts) y
  [pruebas route](../../../src/app/api/internal/billing/worker/__tests__/route.test.ts).
- UI: [billing-tab](../../../src/components/dashboard/org/billing-tab.tsx).
- SQL: [11 billing](../../../supabase/tests/database/11_billing.test.sql),
  [35 confirmación](../../../supabase/tests/database/35_billing_checkout_confirmation.test.sql),
  [36 intents](../../../supabase/tests/database/36_billing_checkout_intents.test.sql),
  [37 recovery](../../../supabase/tests/database/37_billing_recovery.test.sql),
  [38 worker](../../../supabase/tests/database/38_billing_reconciliation_worker.test.sql).
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
