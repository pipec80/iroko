# 017.3 — Billing integrity implementation plan

**Alcance vigente 2026-10-28:** [ADR0005](../../adr/0005-replicable-saas-mvp-and-bounded-acceptance.md).
Un proveedor y los escenarios ofrecidos, sin otra plataforma de cobros. D01/D11
se aceptan por contrato real; reutilizar T11 que lo cubra, no repetir ni reescribir
billing por un estado documental antiguo. Distinguir fixtures/proveedor simulado
de recibo Cloud. Una instalación sin nuevas compras conserva suscripciones/jobs
existentes. No añadir proveedor ni activar escenarios diferidos de011.

> **Ejecución:** aplicar el [contrato común de 017](017-freeze-remediation.md#contrato-de-ejecución-independiente-del-modelo--2026-10-27). No requiere plugins específicos.

**Goal:** Impedir efectos de recovery con lease obsoleto y evitar contabilizar una invoice cuyo estado contradice el payment fresco.

**Architecture:** Un resultado de recovery se aplica y completa dentro de una única transacción SQL que posee el lease vigente. Discovery conserva la precedencia de anomalías y rechaza páginas con divergencias ordinarias antes de publicar eventos o progreso.

**Tech Stack:** PostgreSQL/Supabase, Node.js, TypeScript strict, Vitest, pgTAP.

**Spec:** [017 — Freeze remediation](017-freeze-remediation.md).

**Status:** T1–T2 tienen implementación y [aceptación local histórica del 22/10](../../audits/2026-10-20-017-3-p1-execution.md). El 27/10 se reabrió la disposición D-01/D-11 por aislamiento de pruebas R04/R05, sin atribuir un defecto nuevo al fencing/adapter. T3 conserva decisión pendiente en el CSV. Base `main` / `a2feb3d`, sin commit; proveedor y Cloud **[NO VERIFICADO]**. No cierra 017 ni 016.

## Cómo retomar este hijo

Leer las filas de su tarea en el [registro único](freeze-remediation-register.csv).
**Files/Interfaces** delimitan el cambio; **Resultado y límite** y los escenarios
fijan la aceptación. Los pasos RED/crear/implementar solo aplican a lo ausente o
regresado: primero inspeccionar lo ya existente. Dependencias, bloqueo, destinos,
gates compartidos y revisión por lote se rigen por el padre. Evidencia pendiente
no implica falta de código. No ejecutar otro plan al cerrar este hijo.

## Global constraints

- Reutilizar local oficial `saas-boilerplate` de `supabase/config.toml`. Preservar fuentes pendientes, secretos y otros proyectos; reset únicamente de entorno/fixtures previamente autorizados e identificados. No crear stack paralelo.
- No instalar herramientas/dependencias ni modificar Cloud/proveedores; no push, merge o deploy. Las verificaciones siguientes son futuras, no realizadas por escribir este plan.
- Conservar Free/Plus/Pro, slugs `free/pro/scale`, CLP y restricciones actuales de MP (mensual, sin trial). No nuevos proveedores ni cambio de oferta.
- Mantener distinción estado de suscripción, salud de pago y acceso paid-through. Refund/chargeback/mediation generan anomalía sin revocación automática ni `past_due` inventado.
- D-02 Stripe permanece diferido en familia 011: no implementar coordinación Stripe aquí. Reabrir antes de ofrecer ese proveedor, con su aceptación propia.
- T1/T2 son P1 y preceden 012.5/014. T3 es disposición de follow-up; no extiende implementación silenciosamente. T2/T3 de 016 mantienen su gate integrado y consolidación.
- Migración manual más espejo SQL, tipos regenerados cuando cambia firma expuesta. No `supabase db diff` en Windows. Nueva migración propuesta se vuelve a comprobar libre al ejecutar.

## Rules applied and exceptions

Leídas las ocho reglas `.codex/rules/{code-quality,git-workflow,jsdoc-documentation,software-principles,supabase-realtime,supabase-setup,testing-standards,typescript-nextjs}.md`, `TESTING-PLAN.md` y contratos vigentes de recovery/reducer/MP. Aplicar TS strict, imports `type`, Zod en frontera, logs sin payload/tokens, funciones SQL con esquema explícito y `search_path=''`, grants mínimos comprobados. JSDoc explica fencing y comportamiento ante rollback.
Excepciones por autoridad AGENTS: `src/env.ts` sustituye referencia antigua `env.js`; migraciones manuales sustituyen receta db-diff; Poppy/Cobalt sustituye Material; ningún workflow Git autoriza remoto. React/Next/Realtime no cambian: no caché de decisión financiera, no nuevo middleware ni canal. Tests usan estado financiero persistido, no mocks como prueba de SQL. No bajar thresholds.

## Review focus

1. Worker A vencido termina después de claim B: cero efecto financiero/anomalía/completion de A (T1).
2. Fallo después de aplicar evento pero antes de completar: rollback total y retry idempotente (T1).
3. Invoice approved con payment rejected/pending y caso inverso: no avance de paid-through ni cursor (T2).
4. Página con primer evento válido y divergencia posterior: no publicación parcial (T2).
5. Token mock firmado reutilizado y token antiguo: evidencia explícita determina disposición, sin asumir TTL o uso único existentes (T3).

### 017.3-T1 — Recovery con fencing hasta persistencia (D-01)

**Resultado y límite:** Resultado con lease vencido/ajeno produce cero efecto; efecto y completion son atómicos. T11 implementa aislamiento del test R04; T1 verifica aceptación financiera sin separar la transacción de producto.

**Files:** modificar `src/lib/billing/recovery.ts`, `src/lib/billing/__tests__/recovery.test.ts`, `supabase/schemas/billing.sql`, `supabase/schemas/public.sql`, `src/types/database.ts`; crear `supabase/migrations/20261020110000_billing_recovery_fencing.sql`, `supabase/tests/database/54_billing_recovery_fencing.test.sql`. Extender `supabase/tests/database/37_billing_recovery.test.sql` a la nueva firma. Crear `src/lib/billing/recovery-result.ts` y `src/lib/billing/__tests__/recovery-result.test.ts` para serialización validada de resultados.

**Interfaces previstas:**

- `billing.recovery_jobs` añade `lease_token uuid` y `lease_expires_at timestamptz`; cada claim crea token aleatorio nuevo. No usar attempt_count saturado en 5 como generación.
- `public.claim_billing_recovery_jobs(p_batch_size integer,p_visibility_seconds integer)` retorna las columnas actuales más `lease_token uuid,lease_expires_at timestamptz`; mantiene batch 1..20 y visibilidad 30..3600. Recrear función por cambio de retorno y restituir ACL solo service_role.
- `public.apply_billing_recovery_result(p_job_id uuid,p_lease_token uuid,p_result jsonb) RETURNS TABLE(status text,anomaly_created boolean)` es la única entrada del worker para efectos y completion. `status` conserva `pending/resolved/exhausted`; error de lease `billing_recovery_lease_not_owned` y error de payload `billing_recovery_result_invalid`.
- Tipo TS `RecoveryResultInput = ProviderRecoveryResult | {kind:'error';errorCode:string}` usa `ProviderRecoveryResult` de `src/lib/billing/types.ts`; `serializeRecoveryResult(result: RecoveryResultInput): Json` valida union/UUIDs/fechas/importes y no acepta un nombre RPC arbitrario. `event` usa exactamente la unión `NormalizedBillingEvent` de `events.ts`; `anomaly` usa `FinancialAnomalyObservation` de `types.ts`.
- La RPC adquiere `recovery_jobs FOR UPDATE`, exige processing/token igual/expiración posterior a `clock_timestamp()` antes de cualquier escritura. En esa misma transacción, aplica evento o anomalía y completa/reprograma. Usa ramas SQL explícitas para los seis discriminantes del reducer (`subscription_created`, `subscription_updated`, `subscription_canceled`, `invoice_paid`, `invoice_payment_failed`, `payment_recovered`); llama las `public.apply_*` existentes con el mismo mapeo de campos de `src/lib/billing/reducer.ts`, sin SQL dinámico ni duplicar lógica financiera. Para eventos que requieren plan, resolver mediante contrato SQL existente `resolve_billing_plan_by_external_price`; falta de resolución aborta todo, nunca plan inventado.
- Correlación de cuenta MP (`resolve_billing_checkout_reference`) ocurre antes del envío, y RPC comprueba provider y payment/resource del resultado contra el job antes de aplicar. El fallo de correlación se traduce a resultado error con el mismo token. Anomalía llama `upsert_billing_financial_anomaly` dentro del lock; pending/error conserva backoff y exhaustion actual.
- Retirar acceso service_role a `complete_billing_recovery_job(uuid,text,text)` y eliminar su uso en worker: un completion legacy sin token no puede seguir mutando jobs. No modificar las firmas de reducers normales de webhook/reconciliación ni introducir un precheck HTTP separado del efecto.

- [ ] Escribir pgTAP `expired_a_reclaimed_b_rejects_all_a_results`: A claim, expiración controlada local, B claim, A intenta event/anomaly/pending/error; todas fallan, sin invoice, paid-through, anomalía ni cambios al job de B. B aplica una vez; repetir resultado no duplica. Añadir token incorrecto, null, lease vencido sin reclaim y recurso de otro job.
- [ ] Escribir `apply_and_complete_rollback_together`: provocar error SQL controlado en fixture después del efecto y antes de completion; verificar rollback de evento/invoice/job y retry exitoso. `claim_during_apply_waits_or_skips` usa dos conexiones reales y barrera explícita; la transacción en curso no se recupera mientras mantiene row lock. No usar sleeps como demostración de contención.
- [ ] R04: en test54, `WHERE id=fixture` después de `claim_billing_recovery_jobs(20,900)` no limita sus efectos. Antes de cualquier claim remoto exigir que no haya otros jobs elegibles en el stack identificado y abortar antes de mutar si los hay; ejecución exclusiva sin workers concurrentes. Conservar concurrencia entre conexiones propias, comprobar cero cambios ajenos y cleanup de commits dblink. No añadir parámetros de testing a la RPC de producto ni borrar/suspender jobs ajenos.
- [ ] Escribir Vitest de worker: resultado válido usa RPC atómica, ningún `reduceBillingEvent`/upsert directo; lease perdido se cuenta como skipped y no se intenta reprogramar con otro token. Error proveedor mientras lease vigente conserva retry; summary no afirma resolved si SQL rechaza. Tests serializer rechazan discriminante/UUID/importes inválidos y preservan payload normalizado.
- [ ] Ejecutar RED focalizado y registrar fallo del contrato baseline. Antes de DB confirmar instancia oficial y fixtures propias; corregir precondición de harness de 017.5-T11 si hace falta. Conexiones de concurrencia derivan del destino local confirmado, no host/puerto hardcoded; cleanup tras éxito y excepción, sin imprimir secretos.
- [ ] Implementar migración/espejos/serializer/worker. Reemplazar processing heredado sin lease mediante transición acotada a pending en la migración, conservando attempt_count y motivo; registrar número de filas. Hacerlo solo en destino autorizado; en este alcance la aplicación es local. No tolerar worker antiguo mediante fallback inseguro.
- [ ] Aplicar local con `pnpm supa:migration:up`; ejecutar `pnpm supa:test supabase/tests/database/54_billing_recovery_fencing.test.sql`, `pnpm supa:test supabase/tests/database/37_billing_recovery.test.sql`, `pnpm test src/lib/billing/__tests__/recovery.test.ts`, `pnpm test src/lib/billing/__tests__/recovery-result.test.ts`, `pnpm test src/lib/billing/__tests__/reducer.test.ts`, `pnpm supa:gen:types`, `pnpm supa:lint`, `pnpm typecheck`, `pnpm lint`, `git diff --check`. Exigir exit 0/TAP sin fallos, fixtures eliminadas y ACL anon/authenticated negativas, service_role positiva.
- [ ] Revisor del lote comprueba fencing dentro de transacción, nunca check-then-write entre HTTP; idempotencia, rollback, identidad recurso/job y todas las ramas de resultado. Registrar SHA/evidencia. Un cambio de firma requiere futuro rollout coordinado worker/SQL con autorización aparte; no declarar Cloud compatible antes de esa aceptación.

### 017.3-T2 — Discovery rechaza divergencia fresca (D-11)

**Resultado y límite:** Divergencia fresca rechaza página completa sin avance financiero/cursor; control concordante funciona. T11 implementa aislamiento del test R05; T2 verifica persistencia sin certificar MP real.

**Files:** `src/lib/billing/providers/mercadopago.ts`, `src/lib/billing/providers/__tests__/mercadopago.test.ts`, `src/lib/billing/reconciliation.ts`, `src/lib/billing/__tests__/reconciliation.test.ts`; nuevo `supabase/tests/database/55_discovery_paid_through_guard.test.sql` y `src/lib/billing/__tests__/discovery-persistence.test.ts` para el contraste local opt-in. No migración: cambia la admisión de evidencia, no el modelo financiero.

**Interfaces:** mantener `discoverSubscriptionInvoices(input: InvoiceDiscoveryInput): Promise<InvoiceDiscoveryPage>`; divergencia no financiera ordinaria lanza `mercadopago_discovery_payment_status_divergence`, que `providerErrorCode(error: unknown): SafeErrorCode` debe conservar como `provider_discovery_payment_status_divergence` usando el clasificador real existente. La página entera se rechaza sin eventos/anomalías/cursor/watermark parcial. Refund/chargeback/mediation conserva precedencia de `financialAnomalyObservationForPayment` y el comportamiento de anomalía existente.

- [ ] Añadir tests tabla `invoice_payment_disagreement_rejects_page` para approved/rejected, approved/pending, rejected/approved y pending/approved. Esperar error exacto y ninguna página devuelta. Control approved/approved produce un invoice_paid; rejected/rejected produce fallo. Añadir refund/chargeback/mediation y campos inválidos, fetch fallido, identificador distinto, página de dos invoices con divergencia en la última.
- [ ] Actualizar test histórico que normalizaba invoice rejected con payment approved: ya debe rechazar; no conservar expectativa errónea por compatibilidad. Ejecutar `pnpm test src/lib/billing/providers/__tests__/mercadopago.test.ts` y registrar RED.
- [ ] Comparar `invoice.payment.status` con `payment.status` fresco después de clasificar anomalías financieras y antes de normalizar cualquier evento. Mantener staging de toda página y rechazo total; no corregir importes/estado usando un objeto de proveedor incompleto ni convertir divergencia en paid.
- [ ] Añadir test reconciliation que simula solo HTTP del proveedor, conserva adapter real y observa cero llamadas reductoras/cursor sin avance al rechazar página. Persistencia local: fixture con invoice pendiente y paid-through conocido; ejecutar adapter/reconciliation real con SDK DB local y fetch provider simulado; comprobar desde SQL eventos/invoice/periodo invariantes, failure_count/error_code registrados y cursor intacto. Un control concordante avanza según regla actual y replay no duplica. El test opt-in `discovery-persistence.test.ts` requiere `IROKO_LOCAL_DB_TESTS=1`, rechaza destino no local/no oficial antes de escribir y limpia fixtures en finally; añadir esa variable solo al harness, no al runtime de producto.
- [ ] R05: antes de iniciar worker con proveedor simulado en `discovery-persistence.test.ts`, exigir que no haya suscripciones candidatas ajenas a la fixture y ejecución exclusiva sin workers concurrentes. Si existen, abortar antes de escribir; no limpiarlas ni modificar su backoff. Verificar que solo IDs propios fueron procesados y que el error de preflight no deja residuos. No introducir otra DB ni una abstracción de producto para esta prueba.
- [ ] Ejecutar `pnpm test src/lib/billing/providers/__tests__/mercadopago.test.ts`, `pnpm test src/lib/billing/__tests__/reconciliation.test.ts`, y en PowerShell `$env:IROKO_LOCAL_DB_TESTS='1'` seguido de `pnpm test src/lib/billing/__tests__/discovery-persistence.test.ts`, restaurando valor previo después. Ejecutar `pnpm supa:test supabase/tests/database/55_discovery_paid_through_guard.test.sql` para invariantes SQL y `pnpm typecheck`, `pnpm lint`, `git diff --check`. pgTAP no simula ser prueba de HTTP; el test integrado aporta esa unión. Salidas cero, ninguna alteración financiera en divergencia y cero residuos.
- [ ] Revisor del lote comprueba ambas direcciones, precedencia de anomalía, página completa y no avance de progreso/paid-through. Registrar ejecución local como evidencia simulada de proveedor; incidencia y reparación real MP siguen **[NO VERIFICADO]**. No reactivar certificaciones diferidas de 011.

### 017.3-T3 — Disposición explícita del token bearer mock

**Resultado y límite:** Dejar disposición de replay mock con alcance, responsable y condición de retorno. Mantener decision-pending donde falte decisión; no implementar TTL/jti arbitrarios.

**Files de lectura:** `src/lib/billing/signing.ts`, `mock-policy.ts`, `mock-schemas.ts`, `providers/mock.ts`, sus tests, rutas `src/app/[locale]/billing/mock-checkout/` y `src/app/api/webhooks/[provider]/route.ts` (provider `mock`), y cierre 012.4. **Salida documental:** sección de disposición en este plan y fila correspondiente de [freeze-remediation-register.csv](freeze-remediation-register.csv). No cambio de código ni migración en esta tarea.

**Contrato existente a contrastar:** `signMockPayload(payload: object): Promise<string>` / `verifyMockPayload(token: string): Promise<unknown|null>`. Firma válida no acredita expiración, binding de sesión ni uso único. El flag mock y secreto dedicado de 012.4 son controles distintos.

- [ ] Inventariar emisor, portador, consumidor y efecto de replay por tipo de token (checkout/evento), diferenciando event-id idempotente de nuevo efecto. Registrar TTL/jti ausentes y qué cuenta/actor valida realmente cada consumidor. No publicar tokens.
- [ ] Ejecutar solo pruebas locales existentes `pnpm test src/lib/billing/__tests__/signing.test.ts`, `pnpm test src/lib/billing/__tests__/mock-policy.test.ts`, `pnpm test src/lib/billing/providers/__tests__/mock.test.ts`; registrar alcance y carencias. Esto no verifica una configuración Cloud actual.
- [ ] Resolver disposición con criterio obligatorio: si mock continúa habilitado en un entorno accesible fuera de fixtures controladas o si replay cruza actor/cuenta o crea nuevo efecto, exigir una tarea de hardening aprobada antes de aceptar ese uso. Esa tarea futura debe decidir caducidad, audiencia/actor, identificador y consumo atómico con pruebas de replay; no elegir aquí un TTL arbitrario ni activar billing comercial. Si el uso queda limitado a fixtures controladas y mock deshabilitado fuera de ellas, registrar aceptación acotada por owner con destino, condición y fecha de revalidación; no denominarlo corregido.
- [ ] Mientras falte decisión/evidencia de destino, estado `decision-pending`, responsable billing/security, bloqueo de aceptación del uso mock afectado. Mantenerlo visible al cierre 016-T3. Revisor del lote verifica que la disposición tiene evidencia y condición de reapertura, no un checkbox de implementación ficticio.

#### Disposición ejecutada localmente, 2026-10-23

**Decisión:** `FOLLOW-MOCK` permanece `decision-pending`; no se acepta el
checkout mock como uso general, aunque la firma HMAC valide. Responsable:
billing/security. Antes de habilitarlo fuera de fixtures controladas, abrir y
aprobar una tarea de hardening específica para caducidad, audiencia y actor,
identificador de token y consumo atómico con tests de replay. Revalidar al
definir el destino de MVP y en 016-T3. No se elige un TTL arbitrario aquí.

Inventario estático del código actual:

| Tipo | Emisor y portador | Consumidor y efecto | Replay/actor |
| --- | --- | --- | --- |
| Checkout | `mockProvider.createCheckout` firma `accountId`, plan, intervalo y URLs; token bearer viaja en query `data` y formulario hosted | Página valida HMAC/esquema; `confirmMockCheckout` genera `subscription_created` y lo entrega a `handleProviderWebhook` | No hay `exp`, `jti`, binding de sesión ni comprobación de actor/membresía en la confirmación. El evento recibe ID basado en hora, de modo que repetir el token puede producir ID nuevo y otro intento de efecto; la idempotencia por `externalEventId` no cubre ese caso. Cruce de actor/cuenta es posible para quien posee el token. |
| Evento | `confirmMockCheckout` y cancelación mock firman evento normalizado; webhook recibe body firmado | `mockProvider.verifyWebhook` valida HMAC y `mockEventSchema`; reducer deduplica por ID externo | El mismo evento con el mismo ID se trata como duplicado en el reducer; la firma por sí sola no garantiza TTL, origen ni uso único. |

`isMockBillingAllowed` permite mock por defecto cuando `NODE_ENV` no es
`production`; en `production` exige `ALLOW_MOCK_BILLING=true`. El valor
efectivo de Cloud y su accesibilidad son **[NO VERIFICADO]**. Los tests locales
existentes `pnpm test src/lib/billing/__tests__/signing.test.ts
src/lib/billing/__tests__/mock-policy.test.ts
src/lib/billing/providers/__tests__/mock.test.ts` pasaron exit 0, **17/17**
fuera del sandbox (Vitest EPERM al crear caché dentro). Prueban firma, esquema
y flag en dobles; no prueban consumo atómico, cruce de actor ni replay en DB.
No se modificó código de billing ni proveedor. Revisión fresca de esta
disposición: **[NO VERIFICADO]**.

## Completion record

Actualización2026-10-29: D-01/D-11 renuevan su disposición local usando T11
del27/10 y hashes sin cambios, con revisión independiente dirigida. No se
reimplementa billing ni se repite SQL; la aceptación de aislamiento que el
párrafo siguiente mantenía pendiente ya tiene esa evidencia posterior.
FOLLOW-MOCK sigue decision-pending; uso general bloqueado. Ver
[disposición vigente](../../audits/2026-10-20-017-p1-execution.md).

Actualizar CSV con contenido probado, comando, resultado y gate del lote.
D-01 conserva sus resultados históricos, pero su aceptación pendiente de R04
necesita aislamiento de fixtures; D-11 necesita R05 antes de renovar persistencia.
No reimplementar fencing ni el adapter por esos defectos de prueba. T3 registra
disposición, no TTL/jti implementado. Cloud y proveedor real: **[NO VERIFICADO]**.
