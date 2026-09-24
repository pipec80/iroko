# Mercado Pago — matriz de certificación interna para v1 Chile

Actualización documental inicial: **2026-09-11**, inspección estática de `main`
en `66bc9b2`. Evidencia local de Plan 011a / Task 4 actualizada el
**2026-09-14** en `feat/mercadopago-v1-implementation`. Pertenece a
[Plan 011](011-billing-correctness.md),
[Fase 2](011-phase2-mercadopago-tasks.md) y el tramo Mercado Pago de
[Fase 6](011-phase6-reconciliation-tasks.md). No crea otro programa.

**Estado al 2026-09-24** (`main` en `220caa7`, con #205 y #208 mergeadas y desplegadas; el escaneo de discovery completa en Cloud): cerradas con
evidencia real MP-01, 02, 05, 07, 11, 13 y 15; MP-06 cerrada para rechazo y
alerta; MP-08 parcial; MP-04 y MP-14 parciales. Siguen **[NO VERIFICADO]**: MP-03
(renovación real el 2026-10-22), MP-09/10 (bloqueo del proveedor con cuentas de
prueba; requiere una cuenta productiva), MP-12 (el escaneo de discovery ya
completa y su replay no duplica; falta observar una factura realmente omitida)
y los escenarios de volumen de MP-14. La
[séptima corrección](#matriz-de-aceptación) explica los defectos hallados al
ejecutar el discovery real.

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
verificó la invocación sostenida en Cloud sin supervisión. `cron.job_run_details`
muestra el job de recovery (14, cada 5 min) en 1493/1493 `succeeded` entre el
2026-09-17 14:35 UTC y el 2026-09-22 18:55 UTC, y el job de reconciliation (15,
cada hora) en 22/22 `succeeded` entre el 2026-09-21 21:00 UTC y el 2026-09-22
18:00 UTC, sin filas no exitosas en esa ventana. `private.billing_worker_health`
correlaciona ambos modos con `last_status_code=200` en el mismo instante que la
última corrida de cron. La paridad de migraciones Cloud también se confirmó
(159/159 versiones idénticas a `main`). Esta corrección sustituye las
referencias históricas de la tabla a worker apagado o no reinspeccionado. No
identifica un pago conocido reparado (MP-11) ni una factura realmente omitida
(MP-12): en toda la ventana observada, `last_summary` reporta `claimed=0` y
`scanned=0`, es decir que no hubo ningún caso real que ambos workers debieran
resolver. Tampoco prueba múltiples lotes, fallo inyectado, interrupción, lease
reclaim o replay (MP-14): esos escenarios siguen **[NO VERIFICADO]**.

**Corrección operacional 2026-09-22 (segunda) para MP-01/02/05/07/15:**
inspección directa de `billing.subscriptions`/`invoices`/`payment_attempts`/`events`
(solo lectura) para el ciclo real cerrado el 2026-09-10, con alias
suscripción=SUB-1, invoice/pago=INV-1. Checkout con alta CLP 19.990 (plan
Plus): `invoice_paid` procesado a los 5 s del pago y `subscription_updated` a
los 7 s. Cancelación real vía Mercado Pago 17 minutos después
(`subscription_canceled`); `current_period_end` se conservó en la fecha del
período pagado en vez de cortarse en la cancelación. El 2026-09-17, recovery
re-confirmó el mismo INV-1 sin crear una fila duplicada en `invoices` ni en
`payment_attempts` — mismo ID de invoice y de pago en ambos pases. Los 4
eventos, la suscripción, la factura y el intento de pago comparten la misma
identidad sin cruce de cuenta. Sin filas en `financial_anomalies` para SUB-1.
Sobre MP-15: la confusión de "dos aplicaciones" se descartó — era una cuenta
de Mercado Pago ajena, conectada por error a la sesión MCP de esta máquina, sin
relación con Iroko. La única aplicación real (la que aparece en el usuario
vendedor de prueba) es la misma que ya está configurada en Vercel producción y
en su webhook.

**Corrección operacional 2026-09-22 (tercera) para MP-11:** reparación real
observada sin inducirla deliberadamente. Un checkout nuevo (alias SUB-2/INV-2,
cuenta distinta a SUB-1) generó `subscription_updated` a los 4 s del pago, pero
el pago llegó a `billing.recovery_jobs` como `unlinked_payment` en vez de crear
el invoice de inmediato — sin fila en `invoices` ni en `payment_attempts` por
~4 minutos. El job agendado (14, cada 5 min) recogió y resolvió ese job,
creando invoice y payment_attempt con el monto CLP 19.990 y el `paid_at` real
correctos. A diferencia de la re-confirmación idempotente de SUB-1 (segunda
corrección arriba), este caso sí carecía de invoice antes de la intervención de
recovery. Pendiente: entender por qué la correlación directa del webhook falló
esta vez y no en el ciclo de SUB-1 — posible carrera entre los tópicos
`payment` y `subscription_authorized_payment` de Mercado Pago.

Dos observaciones en curso, no cerradas todavía: (1) un intento de reembolso
parcial sobre INV-1 desde el panel del vendedor de prueba no mostró la
transacción ni en su vista de "Suscripciones" ni, hasta el momento, en
"Actividad" — posible limitación del entorno de prueba, sin diagnóstico
concluyente; MP-09/10 siguen **[NO VERIFICADO]**. (2) SUB-2 se deja activa
deliberadamente para observar su renovación real el 2026-10-22 (MP-03), en vez
de cancelarla ahora.

**Corrección operacional 2026-09-22 (cuarta) para MP-06/07:** ciclo de rechazo
real ejercido con tarjeta de prueba (titular `FUND`). El evento
`invoice_payment_failed` llegó a Iroko con `failure_code=cc_rejected_max_attempts`
y `get_billing_payment_health` mapea ese resultado a `attention_required`,
confirmando la alerta documentada. Se observó además que Mercado Pago entregó
la misma notificación de rechazo 3 veces; Iroko la aplicó una vez, detectó un
duplicado y rechazó una tercera entrega con 400 — evidencia adicional real para
MP-05. El reintento del comprador vía el enlace de recuperación de Mercado Pago
falló dos veces sin generar ningún webhook (confirmado en los logs de Vercel:
cero actividad en `/api/webhooks/mercadopago` en esa ventana), indicando que el
fallo ocurrió enteramente del lado del proveedor. Al reintentar desde Iroko, el
sistema reanudó automáticamente el mismo checkout `pending` (protección
anti-duplicados por diseño) hacia un preapproval que Mercado Pago ya había
invalidado ("no disponible"). Se siguió trabajando usando una cuenta distinta
en vez de esperar a que ese checkout convergiera — ver la corrección siguiente
sobre lo que realmente le pasó. Cierra MP-07 en su segunda dirección
(Iroko→proveedor, alias SUB-3): el botón "Cancelar ahora" hizo el PUT real,
Mercado Pago lo confirmó y `current_period_end` se conservó igual que en la
dirección proveedor→Iroko. Hallazgo de UX corregido en el mismo PR: ese botón
usaba `window.confirm()` nativo del navegador; se reemplazó por un diálogo del
design system con estado de carga visible durante la mutación.

**Corrección operacional 2026-09-22 (quinta) para MP-08:** el checkout de la
corrección anterior (alias SUB-4) no quedó atascado indefinidamente. Una
revisión posterior mostró que `reconciliation_state.last_completed_at` pasó de
`null` a un valor real por primera vez a las 23:00 UTC, con `failure_count=0`;
la suscripción y el checkout local convergieron solos a `canceled`, sin
intervención de operador. Inspección del código confirma por qué el resolver
manual (`private.resolve_billing_checkout_intent`) no era la vía correcta aquí:
rechaza explícitamente cualquier fila con `external_subscription_id` no nulo
(`RAISE EXCEPTION 'billing_checkout_remote_requires_convergence'`), exactamente
el caso de SUB-4. El principio documentado del runbook ("converger con el
estado remoto antes de resolver localmente") se cumplió, pero vía reconciliation
automática en vez del procedimiento manual del runbook. El escenario estricto
de MP-08 (checkout sin ID remoto, `needs_review`, resolución manual ejecutada
de verdad) sigue sin ejercitar.

**Corrección operacional 2026-09-23 (sexta) para MP-09/10:** diagnóstico del
intento de reembolso sobre la operación 178343879608 (pago aprobado de CLP
19.990, `account_money`, cuenta de prueba `3976…`). Con `mpcli` y el token del
vendedor de prueba se pudo **leer** el pago (`approved`/`accredited`,
`refunds` vacío), pero `refunds create --amount 5000` fue rechazado por la API
con `ERROR_UNAUTHORIZED: Unauthorized use of live credentials`; no se movió
dinero. El panel de developers del vendedor de prueba responde "No puedes usar
credenciales de prueba en un ambiente de prueba", por lo que no existe un token
alternativo, y el panel de Mercado Pago del mismo vendedor no muestra la
operación ni ofrece "Devolver dinero". La documentación oficial consultada
(reembolsos y cancelaciones) no describe esta restricción ni otra vía. Conclusión:
los reembolsos reales no son ejercitables con usuarios de prueba; MP-09/10
siguen **[NO VERIFICADO]** por limitación del proveedor, no por un defecto
conocido de Iroko. La evidencia real requiere una cuenta productiva y un cobro
pequeño, y se deja como última prueba antes de cerrar el plan.

**Corrección operacional 2026-09-23 (séptima) para MP-04/12/14:** ejecutar por
primera vez el discovery de facturas sobre una suscripción real mostró que el
camino nunca había funcionado en Cloud, en dos etapas. (1) Mercado Pago rechaza
`limit` mayor a 15 en `/authorized_payments/search` (`400 Invalid value for
limit`); reconciliation pedía 20, así que cada escaneo terminaba en
`provider_fetch_failed` (corregido en #205; medido en vivo: 1–15 aceptado, 16+
rechazado; la documentación no lo indica). (2) Con ese arreglo, el escaneo de las
22:00 UTC llegó al reducer y falló como `reducer_failed`: el evento de factura
descubierta trae como `accountId` el `external_reference` del preapproval, que
desde el checkout durable es el id del checkout y no el de la cuenta, y
`apply_invoice_paid` lo rechaza; el webhook y recovery ya resolvían la
referencia, reconciliation no (corregido en #208, que además registra la causa
del reducer en el log). Las pruebas con mocks no podían detectarlo porque sus
datos usaban el id de cuenta como referencia. Resultado tras desplegar #208
(2026-09-24): el escaneo completa (`last_completed_at` 13:00 UTC, `failure_count`
0, sin error) y los reescaneos horarios no duplican efectos. MP-12 sigue
**[NO VERIFICADO]** solo para su escenario central, una factura realmente
omitida por los webhooks.

Sobre MP-14, el 2026-09-23 se ejecutó con autorización un drill de lease sobre el
candidato real de Cloud: un worker reclamó con lease de 30 s y no completó; otro
lo reclamó tras el vencimiento; quien intentó completar con su propio lease
vencido recibió `billing_reconciliation_lease_not_owned`; y dentro de una misma
transacción un segundo claim recibió 0 filas mientras el lease estaba vigente.
Se cerró con `deferred` conservando `failure_count` y `last_error_code`. Prueba la
semántica del lease en la base real, no un proceso de Node terminado a la fuerza.

Comportamientos medidos del proveedor (también en el
[diseño](../../architecture/mercadopago-reliability-design.md#verified-provider-behaviors-2026-09-23)):
`POST /preapproval` ignora `X-Idempotency-Key`, exige `payer_email` (`400` si
falta) y `/preapproval/search` no filtra por `external_reference`. Con usuarios
de prueba se usan las credenciales de **producción** del vendedor de prueba: la
documentación oficial indica que las credenciales de prueba existen solo para
Checkout API y Bricks, y el panel del usuario de prueba lo confirma. Esa misma
credencial no puede crear reembolsos por API (sexta corrección).

| ID / requisito                                                                   | Referencia oficial                                                                                                           | Implementación inspeccionada                                                                                                                                                                                                                                                                                                                                                                                                                                                | Pruebas existentes y límite                                                                                                                                                                                                                                                                                                                                              | Evidencia operacional                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Pendiente concreto de cierre                                                                                                                                                                                                                                                                                                                                                                                                                              |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MP-01 Alta y autorización                                                        | [Checkout pendiente][mp-pending], [prueba de compra][mp-test]                                                                | Implementado: `createCheckout`, reserva/attach en `service.ts`, correlación en webhook y confirmación por cuenta.                                                                                                                                                                                                                                                                                                                                                           | Provider, service, webhook; SQL 35/36. Cubren CLP, reserva, identidad y confirmación.                                                                                                                                                                                                                                                                                    | Ciclo real 2026-09-10 (alias SUB-1): checkout creado, `subscription_updated` procesado a los 7 s del pago, cuenta y plan Plus correlacionados sin ambigüedad en `billing.subscriptions`/`events`. Ya no es informal.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Cerrado para alta simple y coherente. Checkout concurrente/reanudación sigue en MP-04, sin cubrir aquí.                                                                                                                                                                                                                                                                                                                                                   |
| MP-02 Primer cobro                                                               | [API de suscripciones][mp-api], [prueba de compra][mp-test]                                                                  | Implementado: authorized-payment se normaliza a invoice y payment independientes.                                                                                                                                                                                                                                                                                                                                                                                           | Provider/reducer; SQL 11. No demuestran un cobro real actual.                                                                                                                                                                                                                                                                                                            | Ciclo real 2026-09-10 (alias INV-1): `invoice_paid` a los 5 s del pago, CLP 19.990, plan Plus; `paid_at`/`amount_paid` exactos en `billing.invoices` y `billing.payment_attempts`, sin discrepancia de monto.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Cerrado. El reducer separó correctamente `subscription_updated` (autorización) de `invoice_paid` (cobro) en dos eventos distintos.                                                                                                                                                                                                                                                                                                                        |
| MP-03 Renovación posterior                                                       | [API de suscripciones][mp-api], [reintentos de cuotas][mp-retries]                                                           | Implementado el procesamiento de invoices; eventos de pago no cambian plan/estado de suscripción. Snapshot usa `next_payment_date`, que no demuestra por sí sola período pagado.                                                                                                                                                                                                                                                                                            | Provider/reducer y SQL 11 comprueban separación de mutaciones. No hay aceptación de segunda cuota.                                                                                                                                                                                                                                                                       | **[NO VERIFICADO]**.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Fases 2/6: observar una cuota posterior de la misma suscripción, nueva invoice/payment y entitlements correctos; no sustituirla por otra alta. Validar origen del período pagado.                                                                                                                                                                                                                                                                         |
| MP-04 Checkout concurrente, reanudación y respuesta desconocida                  | [Checkout pendiente][mp-pending]; reserva local definida en [ADR 0003](../../adr/0003-mercadopago-reliability-boundaries.md) | Implementado: `reserve_billing_checkout` antes del POST, resume de URL conocida y `needs_review` ante resultado ambiguo.                                                                                                                                                                                                                                                                                                                                                    | Service: ganador único, resume sin POST, fallo de attach; SQL 36: lease/aislamiento.                                                                                                                                                                                                                                                                                     | Parcial (2026-09-23). Reanudación observada en vivo el 2026-09-22: se reutilizó la URL conocida sin un segundo POST (ver cuarta corrección). Comportamiento del proveedor medido: `POST /preapproval` no deduplica con `X-Idempotency-Key` (dos POST idénticos con la misma clave crearon dos preapprovals) y `/preapproval/search?external_reference=` no filtra (devolvió los 13 preapprovals del vendedor; solo uno coincidía) y respondió 429 en un segundo llamado inmediato. Solicitudes simultáneas reales y respuesta perdida **[NO VERIFICADO]**.                                                                                                                                                                                                                                                                                                                                                                       | Fase 2: dos pestañas simultáneas con un usuario de prueba sin suscripción, comprobando un único preapproval remoto (sandbox, sin cobro). La respuesta perdida exige inyección de fallo y no es reproducible en producción sin cambiar código: queda con los tests de servicio. El operador busca en el proveedor filtrando del lado cliente por `external_reference` (ver el [runbook](../../runbooks/billing-reconciliation.md)); nunca recrea a ciegas. |
| MP-05 Firmas, duplicados, desorden y correlación cuenta/suscripción/factura/pago | [Webhooks][mp-webhooks], [API de suscripciones][mp-api]                                                                      | Implementado: firma/manifiesto, fetch remoto, resolución de referencia, IDs deterministas y reducer/RPC; CAS para snapshots.                                                                                                                                                                                                                                                                                                                                                | Provider/contract, webhook/reducer, SQL 11/36/37/38. Hay replay/idempotencia y CAS; no equivalen a toda permutación de eventos tardíos.                                                                                                                                                                                                                                  | Ciclo real 2026-09-10–17 (alias SUB-1/INV-1): 4 eventos correlacionan a la misma identidad sin fila duplicada. Además, el 2026-09-22 Mercado Pago entregó una notificación de rechazo 3 veces para el mismo pago: Iroko aplicó una, deduplicó la segunda y rechazó la tercera con 400 — entrega repetida real del proveedor manejada correctamente, no solo un test de idempotencia local.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Cerrado para el caso feliz y para reintentos de entrega reales. Firmas inválidas, replay adversarial y webhook concurrente con regresión de snapshot siguen sin ejercitar: **[NO VERIFICADO]**.                                                                                                                                                                                                                                                           |
| MP-06 Rechazo, reintento y recuperación visibles                                 | [Reintentos de cuotas][mp-retries]                                                                                           | Implementado: `invoice_payment_failed`, intentos y recovery; el reducer conserva estado de suscripción. `get_billing_payment_health` separa salud de lifecycle y el dashboard muestra una alerta visible solo para `attention_required`.                                                                                                                                                                                                                                    | **Probado localmente — Plan 011a / Task 4, 2026-09-14:** pgTAP 422/422, billing 182/182, actions 37/37 y notice/billing tab 24/24; incluye fallo → recuperación sin RPC de suscripción y alerta visible. No demuestra el ciclo real del proveedor.                                                                                                                       | Rechazo real ejercido 2026-09-22 (tarjeta de prueba, titular `FUND`): `invoice_payment_failed` con `failure_code=cc_rejected_max_attempts` correlacionado a la operación exacta de Mercado Pago; `get_billing_payment_health` calcula `attention_required` para ese resultado, confirmando la alerta. Mercado Pago reintentó la entrega del mismo rechazo 3 veces; Iroko aplicó una, deduplicó otra y rechazó una tercera con 400 (ver corrección arriba).                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Rechazo y alerta cerrados con evidencia real. Reintento y recuperación real del mismo preapproval sigue **[NO VERIFICADO]**: el enlace de recuperación de Mercado Pago falló dos veces sin generar webhook (falla del proveedor, no de Iroko); no se llegó a observar una recuperación exitosa sobre el mismo pago. No inventar `past_due`, cortes de acceso, portal de tarjetas ni motor de cobros.                                                      |
| MP-07 Cancelación confirmada y acceso hasta período pagado                       | [Gestión de suscripción][mp-management]; acceso definido por Iroko                                                           | Implementado: PUT y validación de `cancelled`/`canceled`; evento de cancelación por webhook. `apply_invoice_paid` persiste intervalos válidos de invoices aprobadas y solo adelanta el período verificado. Los reducers de lifecycle y cancelación aplican sus campos sin borrar evidencia de período más fuerte. Los RPC de lectura y el plan efectivo aceptan `active`/`trialing`, o `canceled` solo con `current_period_end IS NOT NULL AND current_period_end > now()`. | **Probado localmente — Plan 011a / Task 4, 2026-09-14:** el gate conserva pgTAP 422/422 y billing 182/182. El seguimiento de test 39 pasó 51/51 y tests 11 + 39 pasaron 88/88 con RPC reales: future/past/null, intervalos inválidos o parciales, replay y eventos fuera de orden. El test TypeScript solo mapea salidas Pro/Free autoritativas; no prueba el reloj SQL. | Ambas direcciones probadas con datos reales. Proveedor→Iroko (alias SUB-1, 2026-09-10): cancelación real vía Mercado Pago 17 minutos después de la alta (`subscription_canceled`). Iroko→proveedor (alias SUB-3, 2026-09-22): clic real en el botón "Cancelar ahora" → PUT a Mercado Pago → `subscription_canceled` aplicado desde la respuesta síncrona del PUT (no un webhook async). En ambos casos `current_period_end` se conservó en la fecha del período pagado en vez de cortarse; por la regla vigente (`canceled` + `current_period_end > ahora`), el acceso Plus debería mantenerse hasta esa fecha.                                                                                                                                                                                                                                                                                                                  | Cerrado para cese de cobros, fecha pagada sustentada y ambas direcciones de cancelación. El panel de un plan cancelado con acceso restante ya se revisó en producción tras #198–#202 (fecha de acceso hasta, sin botón de cancelar, insignia distinta de "plan actual"). Confirmar en UI, en la fecha del límite, que el acceso cae a Free — verificación puntual pendiente, no bloqueante.                                                               |
| MP-08 Checkout abandonado                                                        | [Checkout pendiente][mp-pending], [consulta/gestión][mp-api]                                                                 | Implementado: migración `20260911110000_billing_checkout_operator_resolution.sql` y resolver privado inmutable. Solo permite `needs_review` o `pending` vencido sin ID remoto → `canceled`/`failed`, conserva auditoría y no tiene grants de aplicación; el runbook exige inspección y convergencia remota antes de resolver localmente.                                                                                                                                    | **Probado localmente — Plan 011b / Task 3, 2026-09-14:** SQL 40 fue aprobado 28/28 en el GREEN de la tarea de migración; el gate completo posterior pasó pgTAP 488/488 y service 22/22. El resolver bloquea resultado desconocido, ID remoto, estados no elegibles y cambios directos de la evidencia; ninguna prueba autoriza un segundo POST.                          | Caso real 2026-09-22 (alias SUB-4): un checkout con ID remoto adjunto cuyo preapproval se volvió inutilizable en el proveedor (confirmado en la UI de Mercado Pago: "no disponible"). El guard de código (`private.resolve_billing_checkout_intent`, `IF external_subscription_id IS NOT NULL THEN RAISE EXCEPTION 'billing_checkout_remote_requires_convergence'`) confirma que el resolver rechaza justo este caso — no es aplicable, por diseño. En vez de resolución manual, **reconciliation lo convergió solo**: `reconciliation_state.last_completed_at` pasó de `null` a un valor real por primera vez, `failure_count=0`, y la suscripción y el checkout local pasaron a `canceled` sin intervención de operador.                                                                                                                                                                                                       | El escenario estricto de MP-08 (checkout sin ID remoto, `needs_review`, resolución manual vía el runbook ejecutada de verdad) sigue **[NO VERIFICADO]** — lo de arriba prueba el guard y la auto-convergencia de reconciliation, pero es un caso distinto y mejor resuelto que el que el runbook manual cubre.                                                                                                                                            |
| MP-09 Refund total, contracargo y mediación                                      | [Reembolso de pago][mp-refund], [Webhooks][mp-webhooks]                                                                      | Implementado: recovery, webhook `payment` vinculado y discovery obtienen evidencia fresca, validan el ID retornado y clasifican refund total o los estados `refunded`, `charged_back` e `in_mediation`. El RPC idempotente persiste evidencia acotada antes del reducer; la rama de anomalía no llama al reducer y la resolución sigue siendo privada y manual.                                                                                                             | **Probado localmente — Plan 011g / Task 4, 2026-09-16:** pgTAP 37 20/20 y 41 21/21, provider 96/96, webhook 25/25, recovery 11/11, reconciliation 17/17 y billing 245/245 verifican identidad fresca, deduplicación, estados adversos y cero llamadas al reducer en rutas anómalas. No observa el proveedor ni ejecuta el resolver.                                      | Refund/contracargo/mediación reales, manejo de alerta y resolución manual **[NO VERIFICADO]**. Intento 2026-09-23 bloqueado por el proveedor con cuentas de prueba (ver sexta corrección).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | 011e/011f: ejercer cada estado en proveedor, correlacionar la fila, comparar evidencia sanitizada según el runbook, observar una alerta accionable y ejecutar bajo autorización la resolución manual; confirmar que el acceso no cambia automáticamente.                                                                                                                                                                                                  |
| MP-10 Reembolso parcial                                                          | [Reembolso parcial/total][mp-refund], [consulta de reembolso][mp-get-refund]                                                 | Implementado: recovery, un webhook `payment` vinculado y reconciliation discovery buscan el pago fresco. Con `0 < transaction_amount_refunded < transaction_amount`, importes enteros válidos y moneda mayúscula de tres letras, persisten `partial_refund` deduplicado antes del reducer. Full refund, importes inválidos, cero y sobre-reembolso siguen la clasificación acotada; discovery falla la página completa sin avanzar estado ante fetch/ID/cuerpo inválido.    | **Probado localmente — Plan 011g / Task 4, 2026-09-16:** provider 96/96, webhook 25/25, recovery 11/11, reconciliation 17/17, billing 245/245 y SQL 41 21/21 cubren parcial/full/cero/CLP inválido, identidad, replay, persistencia y exclusión del reducer. La evidencia cubre código local, no un reembolso proveedor real.                                            | Reembolso parcial real, manejo de alerta y ejecución del resolver manual **[NO VERIFICADO]**. Intento 2026-09-23 bloqueado por el proveedor con cuentas de prueba (ver sexta corrección).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | 011e/011f: observar un parcial real, comparar evidencia sanitizada, manejar la alerta y ejecutar la resolución manual autorizada. Verificar proveedor, Cloud, workers desplegados y alerta real; no automatizar reembolsos desde Iroko.                                                                                                                                                                                                                   |
| MP-11 Recovery de pago conocido                                                  | [Consulta de pago/factura][mp-api]                                                                                           | Implementado: job durable con payment ID; fetch del pago y búsqueda de authorized-payment por `payment_id`; backoff, lease, agotamiento y reducer compartido.                                                                                                                                                                                                                                                                                                               | Recovery/provider y SQL 37: correlación tardía, pending, error, lease, agotamiento y deduplicación.                                                                                                                                                                                                                                                                      | **Reparación real observada en vivo el 2026-09-22** (alias SUB-2/INV-2): un checkout nuevo generó `subscription_updated` a los 4 s del pago, pero el pago mismo llegó como `unlinked_payment` (`billing.recovery_jobs`, motivo `unlinked_payment`) — sin invoice ni payment_attempt creados de inmediato. El job agendado (14, cada 5 min) lo recogió y resolvió ~4 minutos después, creando invoice y payment_attempt con el monto e identidad correctos. Antes de este caso, 1493/1493 corridas `succeeded` entre 2026-09-17 y 2026-09-22 tenían `claimed=0` (ningún caso real).                                                                                                                                                                                                                                                                                                                                               | Fase 6: cerrado — se observó una reparación real, no solo idempotencia. Pendiente investigar por qué el webhook inicial no correlacionó directo (posible carrera entre los tópicos `payment` y `subscription_authorized_payment`); repetir bajo concurrencia sigue abierto.                                                                                                                                                                               |
| MP-12 Factura omitida totalmente por webhooks                                    | [Búsqueda paginada de facturas por preapproval][mp-api]                                                                      | Implementado: discovery paginada y acotada por suscripción, cursor y watermark durables en `billing.reconciliation_state`, normalización de invoices y aplicación por el reducer compartido.                                                                                                                                                                                                                                                                                | **Probado localmente — Plan 011d / Task 4, 2026-09-16:** pgTAP 559/559 y billing 216/216 cubren el estado durable, cursor/replay y el ingreso de eventos descubiertos sin depender de webhook/job conocido. El harness versionado 1/1 usa 25 aliases y compara IDs de invoice/event/payment antes/después de replay. Typecheck y lint también pasaron.                   | Omisión real de webhook/factura y convergencia contra Mercado Pago **[NO VERIFICADO]**. El primer escaneo de discovery sobre una suscripción real (2026-09-22/23) reveló dos defectos que los tests con mocks no podían ver: `limit=20` rechazado por Mercado Pago con `400` (corregido en #205) y facturas descubiertas reducidas con el id del checkout como cuenta, que terminaba en `reducer_failed` (corregido en #208). Con #205 el escaneo de las 22:00 UTC llegó hasta el reducer. Tras desplegar #208 el escaneo **completa**: el 2026-09-24 14:09 UTC la fila muestra `last_completed_at` = 13:00 UTC, `failure_count` 0, sin error y `invoice_watermark` avanzado; entre las 00:51 y las 14:09 UTC, con reescaneos horarios de por medio, los conteos siguen iguales (12 eventos de Mercado Pago, 3 invoices, 0 anomalías, 0 jobs abiertos), es decir que el replay sobre una factura ya aplicada no duplica efectos. | 011e/011f: el escaneo completo y el replay estable ya están observados (ver evidencia). Falta el escenario propiamente dicho: una invoice del proveedor completamente omitida por los webhooks (por ejemplo el cobro del 2026-10-22 si su notificación no llega), correlacionar aliases sanitizados y validar una sola aplicación. El harness no sustituye esa evidencia operacional.                                                                     |
| MP-13 Worker: configuración y ejecución real                                     | [Consultas remotas][mp-api]; contrato local en [runbook](../../runbooks/billing-reconciliation.md)                           | Implementado: ruta Node, secreto, Vault/pg_net, health y modos recovery/reconciliation; configuración versionada no activa cron.                                                                                                                                                                                                                                                                                                                                            | Route y SQL 38: autenticación, resumen y registro de errores.                                                                                                                                                                                                                                                                                                            | Rollout 011e verificado 2026-09-22: cron activo para ambos modos, `private.billing_worker_health` con `last_status_code=200` correlacionado a la última corrida de cada job (ver corrección arriba).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Fase 6: cerrado para configuración/ejecución básica. La reparación real de MP-11/MP-12 y los drills de MP-14 siguen abiertos.                                                                                                                                                                                                                                                                                                                             |
| MP-14 Worker: fallos, avance e idempotencia                                      | [Consultas paginadas][mp-api]; límites locales del [diseño](../../architecture/mercadopago-reliability-design.md)            | Implementado: claims por `next_scan_at,subscription_id`, lotes ≤20, grupos de 5, presupuesto 45 s, cursor/watermark, backoff y aislamiento por candidato. El estado terminal se programa como skipped y el lease vencido se puede reclamar.                                                                                                                                                                                                                                 | **Probado localmente — Plan 011d / Task 4, 2026-09-16:** pgTAP 559/559 cubre 25 filas, cursor, reclaimer y una segunda sesión `SKIP LOCKED`; billing 216/216 cubre fallo aislado, deadline y replay; la ruta 7/7 y el harness 25-alias 1/1 cubren avance, cursor y reclaim deterministas. Typecheck y lint también pasaron.                                              | Invocación repetida sin fallos confirmada (1493 corridas de recovery, 22 de reconciliation, cero no exitosas); avance con más de un lote, fallo inyectado, interrupción de proceso y replay operacional siguen **[NO VERIFICADO]**. Evidencia real parcial del 2026-09-23 sobre el candidato real: (1) fallo sostenido del proveedor con backoff (10 escaneos con `400`, luego `reducer_failed`) sin afectar a otros candidatos; (2) drill de lease en Cloud: un lease vencido se reclama, quien completa con un lease vencido recibe `billing_reconciliation_lease_not_owned` y, dentro de una misma transacción, un segundo claim recibe 0 filas mientras el lease está vigente.                                                                                                                                                                                                                                               | Más de 20 candidatos, un cursor intermedio de facturas (más de 15 en un preapproval) y un proceso terminado a la fuerza no se pueden generar en sandbox: quedan con el harness determinista de 25 aliases y pendientes para producción con volumen real. El harness no sustituye esos escenarios.                                                                                                                                                         |
| MP-15 Aplicación, vendedor y credenciales por entorno                            | [Credenciales][mp-credentials], [prueba de compra][mp-test]                                                                  | `src/env.ts` valida configuración; no prueba pertenencia de token/secreto/webhook al mismo vendedor/aplicación.                                                                                                                                                                                                                                                                                                                                                             | Validación estática no acredita configuración remota.                                                                                                                                                                                                                                                                                                                    | Resuelto 2026-09-22: el usuario vendedor de prueba está emparejado con la misma aplicación que ya está configurada en Vercel producción y en su webhook (`https://project-a89lv.vercel.app/api/webhooks/mercadopago`). La confusión de "dos aplicaciones" era una cuenta de Mercado Pago ajena conectada por error a la sesión MCP de esta máquina, sin relación con Iroko.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Cerrado: aplicación/vendedor/entorno coherentes confirmados. La lectura del mismo recurso con firma válida queda demostrada por el ciclo real de MP-01/02/05/07.                                                                                                                                                                                                                                                                                          |

## Auditoría con prompts de Mercado Pago (2026-09-23)

Se ejecutaron cinco prompts genéricos de Mercado Pago (auditoría de calidad,
webhooks, guía de pruebas de integración, reportes e historial de
notificaciones) contra el
código y los datos reales. La medición de calidad oficial **no aplica a
Suscripciones** (`quality_checklist` responde `Product not homologable`), así
que no existe un puntaje oficial; lo siguiente es criterio propio. Disposición
de los hallazgos:

| #   | Hallazgo                                                                                      | Estado                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Reconciliation pedía `limit=20` a `/authorized_payments/search`; Mercado Pago rechaza > 15.   | Corregido: tope 15 (PR #205). Medido en vivo: 1–15 aceptado, 16+ responde `400 Invalid value for limit`; la documentación no lo indica. La suscripción activa acumulaba `failure_count=10` y `last_completed_at=null` desde su alta. Tras #205 el escaneo de las 22:00 UTC ya no falló por `limit` sino por un segundo defecto (`reducer_failed`, ver séptima corrección), corregido en #208, tras lo cual el escaneo completa en Cloud (observado el 2026-09-24).                                                                                                                                                                                                                                                    |
| 2   | Todo `null` del verificador respondía `400 invalid_signature`, aun con firma válida.          | Corregido: un recurso firmado pero malformado responde `400 invalid_resource`; un recurso que Iroko no creó (sin `external_reference`) se reconoce con 200. Solo lo anterior a la firma sigue siendo `invalid_signature`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 3   | El error de reconciliation quedaba como `provider_fetch_failed` sin causa.                    | Corregido: se guarda `provider_fetch_failed:<HTTP>` o `provider_discovery_<motivo>`, sin cuerpos del proveedor.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 4   | La URL de retorno tenía `/es/` fijo.                                                          | Corregido: usa el locale de la sesión.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 5   | Latencia del webhook frente al plazo de 22 s de Mercado Pago.                                 | Revisado: el tópico `payment` consulta en paralelo y los demás hacen una sola consulta (timeout 10 s), así que el peor caso es ~10 s más base de datos. Se agregó `durationMs` a un log por entrega, con aviso desde 15 s. Falta observarlo en producción.                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 6   | `X-Idempotency-Key` en `POST /preapproval` y `payer_email` con cuentas reales.                | Probado el 2026-09-23 con el vendedor de prueba (3 preapprovals `pending`, cancelados al terminar; Iroko no recibió eventos). **Idempotencia:** dos POST idénticos con la misma `X-Idempotency-Key` devolvieron dos `id` distintos (201 y 201), igual que uno sin clave: `/preapproval` **no deduplica** con ese header, así que no se agrega y la reserva local (`reserve_billing_checkout` + `needs_review`) es la única protección. **`payer_email`:** omitirlo responde `400 payer_email is required`, por lo que es obligatorio. Sigue **[NO VERIFICADO]** qué pasa cuando el pagador real usa una cuenta de Mercado Pago con otro correo (con usuarios de prueba el pago se rechaza); requiere una cuenta real. |
| 7   | Deuda menor: SDK oficial, coherencia de credenciales, `data.id` sin firmar si falta en query. | Aceptado y documentado. Se mantiene `fetch` directo (timeouts explícitos, sin reintento en POST/PUT para no duplicar). Coherencia: el token `APP_USR-<app>-…-<vendedor>` debe coincidir con `GET /users/me` de la cuenta esperada; el secreto del webhook solo se comprueba con entregas firmadas reales (MP-05). Omitir un `data.id` ausente del manifiesto es lo que indica la documentación.                                                                                                                                                                                                                                                                                                                       |
| 8   | El build de CI falla de forma transitoria al descargar Google Fonts.                          | Corregido en #207: Geist y Geist Mono se sirven desde `src/app/fonts` (mismas familias y pesos), sin descargar de Google Fonts en el build. El chequeo de paridad del sistema de diseño acepta ahora ambas formas de carga.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

**Corrección a la evidencia de MP-13/14:** que el cron figure `succeeded` con
`last_status_code=200` prueba que el worker se invoca, no que sus candidatos se
procesen. Hasta la PR #205 el discovery de cualquier suscripción no cancelada
terminaba en `failed` dentro de un resumen con HTTP 200. MP-12 y MP-14 siguen
**[NO VERIFICADO]**.

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
