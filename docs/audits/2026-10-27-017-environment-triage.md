# 017 — Destinos de prueba y diagnóstico de bloqueos (2026-10-27)

Inspección local de configuración, consumidores y evidencia anterior; sin
escritura a Vercel, Supabase Cloud, Cloudflare ni GitHub. Esta nota distingue
el candidato sin commit de la revisión actualmente desplegada.

| Control                                | Destino válido ahora                                                                | Límite                                                                                                                                                                                                                                          |
| -------------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SQL, RLS, GoTrue, Storage y CAS de 017 | Supabase local oficial `saas-boilerplate`, identificado antes de mutar              | No demuestra paridad Cloud.                                                                                                                                                                                                                     |
| E2E del código sin commit              | Next local + Supabase local con `scripts/run-plan-017-local.mjs`                    | Usa site key de prueba y script Turnstile sintético; no certifica el desafío real.                                                                                                                                                              |
| CI GitHub                              | Futuro checkout integrado, Supabase efímero local, `SITE_URL=http://localhost:3000` | El job E2E omite `NEXT_PUBLIC_TURNSTILE_SITE_KEY`; checks de este árbol sin commit: **[NO VERIFICADO]**.                                                                                                                                        |
| Turnstile real y flujos Cloud          | `https://project-a89lv.vercel.app/` tras desplegar la revisión exacta               | Hostnames reportados: `project-a89lv.vercel.app`, `localhost` y `iroko-git-chore-mp-sandbox-cert-pipec80-labs.vercel.app` (3/10). Allowlist no prueba desafío superado ni evita Vercel Security Checkpoint. Estado actual: **[NO VERIFICADO]**. |

`src/env.ts` controla si el cliente muestra CAPTCHA. `CaptchaField` lo monta
sólo con `NEXT_PUBLIC_TURNSTILE_SITE_KEY`; las acciones Auth pasan el token a
GoTrue cuando existe. `supabase/config.toml` tiene `[auth.captcha] enabled =
false` en local. `playwright.config.ts` elimina la site key para la suite común;
el runner confinado de 017 pone una test key e intercepta el script Cloudflare.
Los fallos de editor, tabla Admin, cuenta activa e impersonación no se pueden
atribuir a Turnstile sin traza de rechazo CAPTCHA: ocurrieron en navegación,
render o selectores locales. Diagnosticar el primer fallo de cada caso aislado
antes de repetir la suite conjunta.

El contrato de 017 conserva pruebas locales positivas/negativas y revisión por
tarea. Cloud sólo puede aceptar el mismo código después del flujo de integración
autorizado; la revisión Cloud registrada en `current-state.md` es anterior a
este árbol. Los tres hostnames no sustituyen pruebas locales.

Tras revisión independiente de carreras de selección/carga del logo, se
bloqueó quitarlo durante el submit, se asoció el éxito a la revisión confirmada
y se ignoró el fetch inicial tardío tras una mutación confirmada. La prueba
consulta el botón actual después de cada cambio. `general-tab.test.tsx` pasó
8/8, `pnpm typecheck` pasó y el revisor `browser_diagnosis` no encontró
bloqueantes en la corrección final. Señaló como menor que una selección inválida
posterior al éxito puede mostrar simultáneamente el éxito histórico y el error
local, sin alterar el estado guardado. Un lint completo después de esa revisión
detectó dos errores de React en la implementación de la confirmación. Se movió
la confirmación al resultado async de la acción y se acotó la excepción de
inmutabilidad en la eliminación confirmada. Después de ese ajuste,
`general-tab.test.tsx` pasó 8/8, `pnpm typecheck` pasó y el ESLint focal de
`general-tab.tsx` terminó exit 0. `browser_diagnosis` revisó el cambio
estructural sin hallar nuevas carreras ni bloqueantes. La repetición del lint
completo está **[NO VERIFICADO]**.
Esto no es aceptación HTTP multipart/avatar ni Cloud.

## Revisión estática y simplificación de ejecución — 2026-10-27

Tres revisiones independientes del candidato sin commit distinguieron contratos
necesarios de repetición del proceso. Se mantienen locks/RLS, fencing atómico,
CAS, aislamiento de identidad y controles positivos de privacidad. El padre 017
y sus cinco hijos ahora fijan resultados, alcance y validación por tarea, con
gates/revisión compartidos por lote y cierre local separado del integrado.
No se añadió arquitectura de producto ni se ejecutaron reparaciones en esta entrega.

| ID del CSV | Hallazgo estático                                                                                                                            | Reparación acotada y aceptación pendiente                                                                                                                        |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 017-R01    | CI `db-tests` llama directamente `supabase test db`, pero test42 exige atestación creada por el runner.                                      | 017.5-T11: Node/pnpm/dependencias existentes y runner en CI; control estructural más ejecución SQL local. GitHub real permanece no verificado hasta correr allí. |
| 017-R02    | El registro de borradores guarda contenido/pending sin revisión; restaurar adopta `initialRevision` fresco y puede sobrescribir otra sesión. | 017.4-T1/T2: conservar baseRevision y probar restauración tras avance servidor, sin sobrescritura silenciosa.                                                    |
| 017-R03    | Error de enroll cierra diálogo sin retirar `currentAttempt`; el siguiente clic retorna antes de reintentar.                                  | 017.1-T7: liberar intento terminal, probar reintento en el mismo montaje y compensación segura.                                                                  |
| 017-R04    | Test54 reclama hasta 20 jobs por dblink en autocommit; `WHERE id=fixture` filtra después de mutar.                                           | 017.5-T11 con contrato de 017.3-T1: preflight de candidatos propios y ejecución exclusiva, sin cambios ajenos ni residuos.                                       |
| 017-R05    | Discovery opt-in ejecuta worker real por lote con proveedor simulado para una fixture, pudiendo procesar suscripciones ajenas.               | 017.5-T11 con contrato de 017.3-T2: rechazar candidatos ajenos antes de escribir y comprobar alcance/cleanup.                                                    |

Fuentes inspeccionadas: `.github/workflows/ci.yml`, test42/test54,
`markdown-editor.tsx`, `document-draft-provider.tsx`, `mfa-setup.tsx` y
`discovery-persistence.test.ts`, con sus consumidores y pruebas. Certeza estática
alta sobre los caminos señalados; ninguna fila declara reproducción runtime nueva.
Los controles Node de `check-e2e-status`, `run-reconciliation-db-test` y
`run-plan-017-local` se iniciaron durante la revisión previa: hubo controles
aprobados impresos, pero ejecución conjunta interrumpida sin resumen final.
No cuentan como suite aprobada ni prueban la causa de la interrupción.

El CSV conserva las aceptaciones anteriores con su fecha y reabre únicamente
la disposición afectada. No se borra evidencia histórica ni se presenta una
modificación documental como arreglo. Cloud, build y suites SQL/browser no
ejecutadas en esta revisión: **[NO VERIFICADO]**.

### Validación de la entrega documental

- `node scripts/check-docs.mjs`: PASS, 182 Markdown; `git diff --check`: exit 0.
- Comprobación puntual de CSV/planes: 101 IDs únicos (96 conservados + 5 nuevos),
  29 tareas con resultado/límite, owners resolubles incluidas filas agregadas,
  cinco hallazgos nuevos sin implementación/cierre y cinco disposiciones reabiertas
  conservando sus resultados históricos: PASS. El primer comprobador puntual no
  contemplaba la fila agregada D-03 (`T1/T2`); se corrigió el comprobador, sin
  modificar esa fila para satisfacerlo.
- Prettier procesó ROADMAP sin cambios; `docs/` está excluido por `.prettierignore`.
  No se presenta ese comando como verificación de formato de todos los documentos.
- Revisión independiente `review_017_docs`: detectó falta de billing pendiente en
  la cola P1 y alcance incompleto de T11. Tras ajustes, revisión dirigida aprobada
  sin bloqueantes; R02 explica su dependencia del gate P1 aunque su severidad sea P2.
- Solo se modificó documentación y CSV. No se ejecutaron reparaciones, tests de
  producto, SQL, build, browser, instalación ni operaciones Cloud en esta entrega.

## T11 — reparación local acotada R01/R04/R05

Lote único de esta sesión: 017.5-T11, únicamente R01/R04/R05 y trazabilidad D-09.
Base `main` @ `a2feb3de9ca95bef5b18c7f6d2b4a4e88f6f899f`, árbol extensamente
modificado previamente y preservado; sin commits. No se reimplementó billing,
el runner, atestación ni Storage. Los resultados anteriores conservan su fecha.

- R01: `db-tests` prepara pnpm/Node y las dependencias ya declaradas con
  `pnpm install --frozen-lockfile` en el futuro job; ejecuta `pnpm supa:test`.
  Regresión estructural RED por setup ausente, luego GREEN. No se instaló nada localmente.
- R04: test54 rechaza todo job pending/processing (también backoff futuro) y
  colisiones de recursos antes de su primera escritura remota. Conserva las dos
  conexiones, barrera y fencing. Compara snapshot de jobs ajenos. Registra su
  recurso UUID por autocommit antes de enqueue; el runner limpia únicamente
  recursos registrados y verifica ausencia, incluso tras cancelación del test.
- R05: discovery rechaza suscripciones ajenas no terminales con ID externo
  antes de crear fixtures y antes de cada worker. El doble HTTP sólo responde
  para recursos propios; cada ejecución exige scanned=1. Compara suscripciones
  y estado ajenos y verifica residuos propios después del finally.

**Exclusividad:** sigue siendo precondición operativa, sin workers contra el
stack. Los preflights no son un mutex frente a procesos externos. Al reanudar,
identificar stack vivo y demostrar exclusividad antes de pruebas mutantes.
No borrar ni suspender candidatos ajenos para conseguir cola vacía.

### Comandos y resultados de esta sesión

| Comando                                                                                                                                                                           | Resultado                                                                                                                                                                                                   |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `git status --short`; `git branch --show-current`; `git rev-parse HEAD`                                                                                                           | Árbol pendiente inventariado; main y base indicada.                                                                                                                                                         |
| `Get-Command docker,supabase,pnpm,node -All`; `where.exe docker`; `where.exe supabase`                                                                                            | Herramientas encontradas; where no encontró shim Supabase, Get-Command sí.                                                                                                                                  |
| `docker --version`; `node --version`; `pnpm --version`                                                                                                                            | 29.9.2; v24.18.0; 11.22.0.                                                                                                                                                                                  |
| `docker context show`; `docker ps --format '{{.Names}}'`; `supabase --version` (fuera del sandbox)                                                                                | desktop-linux; pipe dockerDesktopLinuxEngine inexistente; Supabase 2.110.0. No hay stack vivo identificado.                                                                                                 |
| `node --test scripts/__tests__/run-reconciliation-db-test.test.mjs`                                                                                                               | Final 8/8 PASS, exit 0; fake executor valida cleanup tras fallo, no prueba SQL real. Intentos iniciales confinados imprimieron parciales y quedaron pendientes en el test de proceso; no cuentan como pase. |
| `pnpm test src/test/local-e2e-target.test.ts src/lib/billing/__tests__/discovery-persistence.test.ts --pool=threads --maxWorkers=1`                                               | Final 15 PASS, 1 opt-in omitido, exit 0. Primera corrida antes de los dos nuevos unitarios: 13 PASS, 1 omitido.                                                                                             |
| `pnpm exec prettier --write scripts/__tests__/run-reconciliation-db-test.test.mjs scripts/run-reconciliation-db-test.mjs src/lib/billing/__tests__/discovery-persistence.test.ts` | PASS con dependencias instaladas y acceso fuera del sandbox; primer acceso directo confinado rechazado EPERM.                                                                                               |
| `pnpm typecheck`                                                                                                                                                                  | Final exit 0 tras los cambios de código.                                                                                                                                                                    |
| `git diff --check`                                                                                                                                                                | exit 0; repetir tras documentación.                                                                                                                                                                         |

El primer sondeo confinado de Docker/Supabase encontró permisos denegados para
config/context/telemetría. La comprobación específica fuera del sandbox distinguió
esa restricción de la falta real del daemon. No se cambió configuración del sandbox,
no se arrancó/creó entorno y no se ejecutó SQL, SDK opt-in ni browser. Cleanup real:
no hubo fixtures creadas en esta sesión; ausencia actual de residuos históricos
**[NO VERIFICADO]**. No se repitió una prueba mutante ni se alteraron candidatos ajenos.

### Revisión independiente y disposición

Agente `review_t11`, distinto del autor, revisó el diff acotado. Detectó un falso
positivo estructural (install ausente daba indexOf=-1) y posible residuo remoto
tras query_canceled; ambas correcciones recibieron revisión dirigida final.
Veredicto final: sin bloqueantes estáticos bajo ejecución exclusiva sin workers,
certeza alta estática. No realizó aceptación runtime.

**Entrega: pendiente de validación local, bloqueada en SQL/SDK por daemon ausente.**
R01/R04/R05 permanecen evidence-pending; D-09 conserva su evidencia histórica.
Faltan negativos con job/suscripción ajenos intactos, positivo SQL54/SDK, cancelación
tras commit remoto y cero residuos, suite SQL por runner y gates restantes.
GitHub/Cloud **[NO VERIFICADO]**; sin proveedores, pagos, push, merge ni deploy.
Siguiente en cola: 017.4-T1/T2 (R02), condicionado a satisfacer la precondición T11;
no se inicia en esta sesión. Primero reanudar la validación pendiente de T11.

### Manifiesto SHA256 del contenido revisado/probado

- `.github/workflows/ci.yml`: `ab9e0adc22131c907a153073ec72711c95c89a0f665959227cfe8c28a2640b84`
- `scripts/run-reconciliation-db-test.mjs`: `0eaed571856537d07eca560360a611b16439a1d7b4984654d34815b5c15b8068`
- `scripts/__tests__/run-reconciliation-db-test.test.mjs`: `c2024d04c0b63d54f6e35477276902fb8c032247022b91a5d3e8204f45e5b036`
- `supabase/tests/database/54_billing_recovery_fencing.test.sql`: `c3ba149916f4f0d79e9419c1e0d410dbb5665ac24add9d53c2f63357cbf4d012`
- `src/lib/billing/__tests__/discovery-persistence.test.ts`: `a59385b349677b4b33f9745eb78ebb2c1c1218359420371569a70a1f6c4f60aa`

### Gates compartidos finales y cleanup de procesos

- `pnpm typecheck`: exit 0 sobre contenido final.
- `pnpm lint`: exit 0, 0 errores / 34 warnings del árbol compartido; ninguno
  en los archivos de T11. No se repararon otras tareas.
- `node scripts/check-docs.mjs`: PASS, 182 Markdown; `git diff --check`: exit 0.
- Los tres intentos confinados iniciales del runner dejaron hijos sintéticos
  `setInterval` porque el timeout no pudo cerrar su árbol bajo esa restricción.
  No fueron aceptación. Se identificaron por CommandLine y ParentProcessId;
  `Stop-Process` falló; `taskkill /PID 24460 /T /F`,
  `taskkill /PID 23096 /T /F`, `taskkill /PID 24016 /T /F` terminaron únicamente
  esos árboles. Inventario posterior: cero procesos runner/sintéticos.
  La ejecución fuera del sandbox pasó 8/8 y su timeout terminó correctamente.
  No se modificó el sandbox para conseguirlo.

Los gates estáticos y la revisión están completos; sigue pendiente exclusivamente
la aceptación runtime SQL/SDK requerida de este lote. No ejecutar R02 todavía.

## T11 — continuación con Docker disponible (2026-10-27)

El usuario inició Docker y autorizó levantarlo si está apagado cuando haga falta.
En esta continuación ya estaba activo; no fue necesario iniciarlo. Se conserva
el alcance T11 y la prohibición de modificar candidatos ajenos para pasar pruebas.
No hubo cambios de código, instalaciones, resets ni otros entornos. Los cinco
SHA256 del manifiesto anterior siguen idénticos. Los gates estáticos anteriores
siguen vinculados a ese contenido; no se presentan como nuevas ejecuciones.

### Identidad y exclusividad

- `docker context show`: `desktop-linux`; `docker ps --format '{{.Names}}|{{.Status}}'`:
  únicamente los diez servicios del stack `saas-boilerplate`; DB healthy.
- `docker inspect supabase_db_saas-boilerplate --format '{{.State.Running}}|{{index .Config.Labels "com.supabase.cli.project"}}'`:
  `true|saas-boilerplate`.
- Consultas por `docker exec -i supabase_db_saas-boilerplate psql -X -U supabase_admin -d postgres -At -v ON_ERROR_STOP=1`:
  database `postgres`, system_identifier `7697300702868647975`; sin otra sesión
  cliente activa ni cron billing. Los procesos Node examinados corresponden a
  next-devtools MCP, sin servidor Next/worker/Vitest concurrente. Pruebas en serie.
- Discovery: cero suscripciones candidatas. Recovery: un job preexistente
  `319aa8ae-023f-4e39-ad4a-d50ceaf68ea0`, recurso
  `recovery54-8cec8fd2-6116-4221-9b45-fb94fc9d151e`, processing/attempt_count=2,
  next_attempt_at `2026-10-20 20:26:08.586151+00`, lease_expires_at
  `2026-10-21 14:16:12.588859+00`. Es residuo de una ejecución histórica,
  no propiedad de esta continuación; se preservó íntegro.

### Ejecuciones nuevas

| Comando / control                                                                                                                                                 | Resultado observado y límite                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm supa:test supabase/tests/database/54_billing_recovery_fencing.test.sql`                                                                                     | Exit 1 esperado para el negativo natural: `test54_foreign_jobs_or_fixture_collision: no jobs changed`, antes del primer dblink/claim; 0 assertions de las 27 previstas. Esto valida rechazo, NO es SQL54 verde.                                                                                                                                                                                                                                                                                                                                      |
| Preservar/restaurar `IROKO_LOCAL_DB_TESTS`; establecerlo a `1`; `pnpm test src/lib/billing/__tests__/discovery-persistence.test.ts --pool=threads --maxWorkers=1` | 3/3 PASS, exit 0. Persistencia local real + proveedor simulado; desacuerdo/concordancia/replay, scanned=1, snapshot ajeno y cleanup del finally comprobados.                                                                                                                                                                                                                                                                                                                                                                                         |
| Negativo R05 con centinela propia, ejecutado una vez mediante Node stdin                                                                                          | Creación transaccional de auth.user, cuenta, customer y subscription active MP con UUIDs nuevos y external ID propio. `node node_modules/vitest/vitest.mjs run src/lib/billing/__tests__/discovery-persistence.test.ts --pool=threads --maxWorkers=1`, env opt-in=1: exit 1 y `discovery_foreign_candidates` requeridos. JSON completo de subscription/reconciliation_state centinela idéntico antes/después; fixture55 no creada. Finally elimina exclusivamente UUIDs generados y verifica suma de residuos=0; snapshot de recovery_jobs idéntico. |
| `pnpm supa:test supabase/tests/database/42_billing_reconciliation_state.test.sql`                                                                                 | PASS, 1 archivo / 49 assertions, exit 0. Recorrido positivo real del runner y concurrencia dblink preservada; no acredita ejecución GitHub.                                                                                                                                                                                                                                                                                                                                                                                                          |
| Fallo inyectado SQLSTATE57014 tras enqueue propio comprometido, mediante API existente `runReconciliationDbTest`                                                  | Se delegó cada llamada a `execute` real salvo la invocación de suite, sustituida por psql local: INSERT del UUID recurso en recovery_resources; enqueue del mismo recurso; RAISE EXCEPTION ERRCODE=57014 MESSAGE=t11_injected_query_canceled_after_commit. Error propagado; finally real del runner retiró exactamente ese job y schema; snapshot de todos los jobs ajenos idéntico. No se llamó claim RPC. Valida cleanup del runner, NO reemplaza el positivo/concurrencia SQL54 ni prueba su handler de cancelación completo.                     |

Postflight del mismo contenedor: harness ausente, cero usuarios/cuentas/subscriptions
fijos propios de test42/discovery, cero recursos `t11-cancel-*`; comprobaciones
adicionales en cada finally dieron cero filas propias de centinela/discovery.
El job histórico sigue processing, attempt_count=2 y mismos timestamps/lease.
No se limpió, suspendió ni cambió su backoff. No se dejó ninguna fixture nueva.

### Bloqueo restante y siguiente paso

Clasificación: **estado del entorno de pruebas**, residuo histórico ajeno; no es
un defecto nuevo del producto y el rechazo es el comportamiento reparado esperado.
No se repitió SQL54 con la misma firma ni se lanzó suite completa que necesariamente
volvería a fallar ahí. No se omitió test54 para declarar el gate completo verde.
Antes de cualquier positivo SQL54/suite completa se necesita una disposición
explícita del propietario sobre ese residuo; no se presume autorización para
borrarlo por necesitar cola vacía. No se ejecuta R02 ni se amplía el alcance.
GitHub/Cloud/proveedores/pagos/push/merge/deploy: **[NO VERIFICADO]**, no ejecutados.

### Revisión independiente de esta continuación

`review_t11` verificó de nuevo los cinco hashes y su igualdad con el manifiesto;
revisó los resultados reportados y sus límites sin repetir pruebas mutantes.
Disposición aprobada: R05 corrected-local; R01/R04/D-09 evidence-pending;
T11 sin aceptación global. Certeza alta sobre contenido/disposición, runtime
corresponde a los comandos ejecutados por el autor de esta continuación.

## T11 — validación final tras cleanup autorizado (2026-10-27)

El propietario autorizó expresamente eliminar únicamente el residuo histórico
`319aa8ae-023f-4e39-ad4a-d50ceaf68ea0` y completar la validación. Esta autorización
resuelve el bloqueo anterior; no borra ni convierte sus resultados en pases.

Se renovó identidad: Docker `desktop-linux`, contenedor
`supabase_db_saas-boilerplate`, running/label `true|saas-boilerplate`, database
`postgres`, system_identifier `7697300702868647975`. Cleanup exacto mediante
`docker exec -i supabase_db_saas-boilerplate psql -X -U supabase_admin -d postgres -At -v ON_ERROR_STOP=1`:

```sql
BEGIN;
DO $guard$ BEGIN
 IF current_database()<>'postgres' OR (SELECT system_identifier::text FROM pg_control_system())<>'7697300702868647975' THEN RAISE EXCEPTION 'wrong_local_target'; END IF;
 IF (SELECT count(*) FROM billing.recovery_jobs WHERE id='319aa8ae-023f-4e39-ad4a-d50ceaf68ea0' AND resource_id='recovery54-8cec8fd2-6116-4221-9b45-fb94fc9d151e' AND status='processing' AND attempt_count=2 AND lease_expires_at='2026-10-21 14:16:12.588859+00'::timestamptz)<>1 THEN RAISE EXCEPTION 'authorized_fixture_changed'; END IF;
END $guard$;
DELETE FROM billing.recovery_jobs WHERE id='319aa8ae-023f-4e39-ad4a-d50ceaf68ea0' AND resource_id='recovery54-8cec8fd2-6116-4221-9b45-fb94fc9d151e' RETURNING id;
COMMIT;
```

Resultado: id autorizado retornado, `DELETE 1`, COMMIT; cero jobs y candidatos
Discovery. Sin cron billing activo ni otra sesión cliente activa. Pruebas en serie:

| Comando                                                                       | Resultado nuevo                                                                                                 |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `pnpm supa:test supabase/tests/database/54_billing_recovery_fencing.test.sql` | PASS, 1 archivo / 27 assertions, exit 0. Intercalación dblink, fencing y snapshot de jobs ajenos preservados.   |
| `pnpm supa:test`                                                              | PASS, 57 archivos / 1180 assertions, exit 0; suite completa incluyendo test42/test54, sin filtros ni omisiones. |

Postflight por el mismo psql: `to_regnamespace('iroko_test_guard') IS NULL`=true;
counts de recovery_jobs, reconciliation_state, subscriptions y customers=0;
usuarios/cuentas propios fijos y usuarios centinela=0; invoices invoice54/invoice55=0;
sin otro backend activo. Ninguna fixture/lease propia nueva ni harness persistente.
Se preservaron los demás recursos y todos los cambios fuente pendientes.

Los cinco hashes de código se volvieron a comprobar: idénticos al manifiesto
previo. No hubo nuevas reparaciones ni cambios que invaliden TypeScript/lint,
regresiones Node/Vitest y revisión estática anteriores. Se reutilizan esos gates
por contenido; no se afirma haberlos repetido en esta continuación.

Disposición: R01/R04/R05 y D-09 `corrected-local`; **alcance autorizado T11
R01/R04/R05 aceptado localmente**, sin cierre global de Plan017 ni de billing.
Positivo/negativo R05 y cleanup tras cancelación del runner son los ejecutados
anteriormente en esta misma evidencia; SQL54 no recibió una cancelación específica
para probar su handler `query_canceled`, y no se afirma esa rama ejecutada.
GitHub CI real, Cloud, proveedores y browser adicional **[NO VERIFICADO]**.
Sin commits, push, merge, deploy, instalaciones, resets ni otras tareas.
Siguiente tarea habilitada: **017.4-T1/T2 — R02**; no iniciada.

Revisión independiente final `review_t11`: disposición aprobada para el alcance
autorizado R01/R04/R05, sin bloqueantes estáticos. Evaluó código, hashes y evidencia
reportada; no repitió SQL. Confirmó separación entre cleanup histórico autorizado
y cleanup de fixtures nuevas; no extiende aceptación a Storage ni Plan017 completo.

Validación documental final: `node scripts/check-docs.mjs` PASS, 182 Markdown.
El primer `git diff --check` detectó CRLF introducido al actualizar current-state;
se restauraron sus finales LF sin cambiar contenido previo y se repitió el control.
