# Current State

## Consolidación GitHub y dependencias — 2026-10-30

El mantenedor autorizó publicar e integrar el trabajo local, resolver Dependabot
y retirar las ramas integradas para continuar desde `main`. El
[PR #232](https://github.com/pipec80/iroko/pull/232) concentra ese alcance; su
estado de merge y checks se consulta en GitHub. La
[auditoría de consolidación](audits/2026-10-30-github-consolidation.md) registra
baseline, actualizaciones, validaciones y pendientes upstream de desarrollo.
Las menciones fechadas de «sin push/PR» inferiores describen su ejecución
histórica. Esta integración no cierra 017/015/016 ni aplica migraciones Cloud.
La próxima implementación de producto continúa siendo 012.5.

## Punto de salida de sesión — 2026-10-30

Próxima implementación: **012.5, pricing y promesas**, ya habilitada, todavía no
ejecutada. El [plan existente](exec-plans/active/012-5-pricing-truth.md#reentrada-en-una-sesion-nueva--2026-10-30)
contiene la entrada acotada para una sesión nueva; no requiere recuperar este
chat. Código consolidado `634ad491`; exclusión aceptada registrada en `6e5e778`.
El siguiente commit documental no será el cierre del freeze ni aceptación Cloud.

Robot fue una vertical de prueba para importar Excel con formato específico,
no un módulo obligatorio del template ni un importador empresarial genérico.
La [aclaración de alcance](architecture/iot-vertical-pilot.md) conserva ese
origen sin incorporar mensajería, chatbot o más formatos al producto.
Capas gratuitas y sin nuevas prestaciones pagadas son el límite del trabajo
declarado por el mantenedor, no una auditoría actual de planes/cuentas proveedor.

Cola restante única:012.5 →014-T2/T3 →disposiciones017 restantes →015
reutilización/configuración →016 revisión final. El CSV conserva además los
seguimientos heredados RL-F01–F06, FOLLOW-MOCK, FOLLOW-TTL y FREEZE-VALIDATION;
no desaparecen por cerrar P1 ni se convierten todos en nuevas implementaciones.
Documentación reproducible de instalación/configuración/extensión/actualización
se verifica en015; comentarios de contratos no obvios siguen AGENTS/JSDoc.
La revisión final del código/documentación y del candidato corresponde a016,
sin una reauditoría general paralela ahora. Venta/licencia/empaquetado013 sigue
diferido respecto de demostrar la base adaptable para productos/clientes.

## Exclusión RS-05 aceptada localmente — 2026-10-29

Projects/editor y Robot tienen aceptación local acotada de exclusión: navegador
2/2 sin skips/reintentos/flaky, guards unitarios y revisión independiente.
Candidato `558ad5c`, código `634ad491`; sin cambios de producto nuevos.
Fixtures retiradas, scratch/procesos propios ausentes y puerto3000 disponible.
[Resultado, comandos y límites](audits/2026-10-20-017-p1-execution.md).

RS-05 global sigue `evidence-pending` por composición/billing de015: sólo se
acepta su prerrequisito adelantado. El evento sanitizado server-error queda
registrado sin causa; no se afirma salud general ni capacidad sostenida.
No quedan filasP1 pendientes del núcleo017 en CSV; se habilita012.5 según roadmap.
017 P2, resto015 y016 siguen abiertos. Editor N04/N05/R02 continúa diferido.
Buildproduction/GitHub/Cloud **[NO VERIFICADO]**. Los bloqueos browser descritos
abajo conservan su fecha histórica y quedan superados sólo para esta exclusión.

## Consolidación local de017 — 2026-10-29

Código consolidado en `634ad4918809141b0d63c3f00bf368cc8b829b02`:
166 archivos de implementación, configuración, pruebas y migraciones existentes.
El commit conserva las reparaciones del editor diferido sin aceptarlo. Sin push,
PR, merge, deploy ni mutaciones Cloud/proveedores.

S-05/S-06 pasan a `corrected-local` por su contrato017.5-T10: checker4/4,
runners34/34 y27/27, TypeScript y lint completo476 archivos/0 errores/34 warnings,
con revisión independiente de código/YAML/selección. CI general excluye los
escenarios que requieren el contexto confinado017; CI invoca los runners
existentes para password/analítica sintética. Selección0124:21/22 casos según
Projects;017 conserva analítica7/8 y password1. No se ejecutó la modificación de
política Auth del job aquí. Actions real, protección de rama y capacidad CI
siguen **[NO VERIFICADO]** para016.

Junto con N-18/017-R03/S-12, son cinco cierres locales de tareas; no cierre de017
ni del freeze. RS-05 sigue pendiente de aceptación en navegador. El CSV conserva
los resultados anteriores y referencia el commit de implementación; los relatos
fechados anteriores no describen necesariamente el estado actual.

## Plan017 — continuación y cierre local de tareas,2026-10-29

N-18,017-R03 y S-12 están `corrected-local`: MFA12/12 y privacidad/logs62/62,
revisión independiente, TypeScript y lint compartido con exit0. La estrategia
serial calentó una caché nueva por contenido/configuración; el comando final
conservó la selección completa `eslint .`:476 archivos,0 errores,34 warnings.
Dos errores de accesibilidad en dobles Link nuevos se corrigieron sin supresiones
y su selección focal12/12 pasó. Reportes, hashes y límites en
[evidencia017](audits/2026-10-20-017-p1-execution.md).

Cobertura/SQL/build/E2E integrados siguen en016; no condicionan estos cierres
locales. RS-05 conserva su aceptación runtime pendiente. La revisión previa a
consolidar detectó dos escenarios que necesitan el contexto confinado017 en CI;
su selección quedó corregida localmente según la consolidación anterior, sin
omitir assertions ni ejecutar Cloud.
Esto no cierra017 ni el freeze. Los estados anteriores siguientes conservan
su fecha/alcance; el CSV es la disposición vigente.

## Plan 017 — disposición local del alcance, 2026-10-29

`projects=false` y Robot=false en la configuración ofrecida. Guards de páginas,
metadata y acciones, inicio sin consultas Projects y navegación/atajos tienen
regresiones unitarias. La selección de CI/runners conserva negativos de exclusión
y core, y separa positivos diferidos antes de ejecutar. La aceptación browser de
exclusión todavía **[NO VERIFICADO]**: no se confunde con la implementación.

S09/N29 y D01/D11 se concilian desde evidencia local histórica pertinente y
revisión independiente; D03 conserva disposición mixta de sus subfilas. No se
reimplementó billing ni T11. MFA recibe corrección de reintento y revisión.
La [disposición y límites por ID](audits/2026-10-20-017-p1-execution.md)
conserva resultados originales y verificaciones bloqueadas. El presupuesto
observado del host (1391MB libres/16123MB) impide renovar build/browser sin
repetir el bloqueo conocido. No se acepta el hito local completo de017 ni el MVP.

Gates acotados del29/10: TypeScript PASS; runners34/34 y27/27; privacidad/logs62/62;
MFA12/12 con revisión independiente. Lint focal: cero errores/una advertencia
preexistente. Lint completo se interrumpió al observar313MB libres. Cobertura
generó artefactos sobre umbrales, pero no se recuperó el exit code tras retomar:
no es gate global aprobado. Docker dejó de estar disponible al postflight;
no se renovó estado BD/cleanup ni se ejecutó SQL/E2E mutante.

Aclaración de alcance29/10: la cobertura y suite integrada completa pertenecen
a016 final, no son condiciones nuevas de cada cierre local017. MFA/logs
conservan como pendiente el lint compartido del lote y los escenarios explícitos
de su contrato; no repetir login/S-02 ya aceptado ni el editor diferido.

Siguiente trabajo: completar los gates/recorridos ofrecidos bloqueados con
recursos suficientes. Después siguen012.5/014 y015 según roadmap; no ejecutados
automáticamente. Editor N04/N05/R02 sigue diferido, no aceptado. Réplica/actualización,
GitHub y Cloud **[NO VERIFICADO]**; sin commit/push/PR/merge/deploy.

## Dirección vigente del MVP — 2026-10-28

Decisión del mantenedor: [ADR0005](adr/0005-replicable-saas-mvp-and-bounded-acceptance.md).
Primero base SaaS replicable/adaptable; después vertical cliente/Robot. No se
busca paridad comercial ni usar toda la plataforma Supabase. Editor N04/N05/R02
diferido, sin aceptación browser; su runner sale del camino crítico y no se vuelve
a optimizar/ejecutar como condición del MVP. Se conservan sus reparaciones/evidencia.

**Cola registrada el28/10 (actualización del29/10 arriba):** 015-T1/RS-05, definir y demostrar la configuración ofrecida
y exclusión efectiva de Projects/editor y Robot en rutas/acciones/UI, sin borrar
datos ni relajar RLS. En esa inspección projects=true: exclusión todavía pendiente.
En paralelo lógico, disponer/cerrar P1 del núcleo de017: S09, D01/D11 y agregado
D03 con sus subfilas, reutilizando evidencia válida, sin pruebas mutantes en paralelo.
Luego012.5/014 ofrecidos, réplica/extensión/actualización015 y reauditoría final016.

Aquella entrega del28/10 cambió dirección/planes/registro, no runtime: no se desactivó ningún
módulo ni se probó réplica, CI o Cloud. Los relatos siguientes conservan sus fechas;
no constituyen la cola vigente. No hay autorización nueva de push/merge/deploy.

## Plan 017 T11 — aceptación local acotada, 2026-10-27

R01/R04/R05 y D-09 tienen aceptación local tras corregir el wiring CI y el
aislamiento de fixtures: test54 27/27, suite SQL por runner atestado 57 archivos /
1180 assertions, discovery opt-in 3/3, negativos y cleanup verificados. Se retiró
únicamente el residuo histórico expresamente autorizado. Revisión y gates por
contenido en la [evidencia T11](audits/2026-10-27-017-environment-triage.md).
GitHub/Cloud **[NO VERIFICADO]**; no cierra 017 ni renueva aceptación de otros
subsistemas. R02 (017.4-T1/T2) está implementado y en validación local: el
borrador conserva su revisión de origen; unitarios focalizados 47/47 y SQL
16/16 pasan. La aceptación browser está bloqueada: las corridas parciales no
cierran el lote. Evidencia y límites en el [registro de ejecución del editor](audits/2026-10-20-017-p1-execution.md).
No se ha creado PR, hecho commit, push, merge ni deploy.

Continuación 2026-10-28: se corrigió la falta de progreso visible del runner017
(etapas, tiempo, RSS del padre y RAM libre) y se añadió cancelación del padre
antes de browser. Durante browser se difiere para dejar terminar fixtures.
Las pruebas simulan señales al padre; Ctrl+C real y cleanup de BD ante
interrupciones externas permanecen [NO VERIFICADO]. El consumo agregado y arranque
de Next siguen sin resolución demostrada; no repetir el E2E completo todavía.
Detalle en el mismo registro de ejecución del editor. No cambia la aceptación
local histórica de T11 ni acepta R02.

Diagnóstico real posterior del28: el arranque aislado (sin browser) alcanzó
compilación del login y se detuvo a63s por RAM libre<1GB; servidor/scratch propios
retirados y cero usuariosE2E. No demuestra fuga ni cierre de R02. Siguiente control
requiere liberar memoria del host; se pidió guardar/cerrar Code/Claude al usuario,
sin cerrar procesos ajenos automáticamente. Evidencia detallada en el registro.

Reintento con RAM liberada del28: arranque aislado PASS (loginHTTP200,109546ms).
Suite editor posterior inició con3825MB libres, pero descendió a570MB al añadir
browser/rutas. Se detuvo exclusivamente su Next; suite0/4, invalidada como
aceptación por interrupción de recursos. Cleanup final cero usuariosE2E/proyectos
propios, sin Next/runner activo ni scratch de esa corrida. R02 sigue bloqueado;
no repetir igual ni atribuir los errores de conexión posteriores al producto.

Experimento posterior de heap1536MB: arranque aislado PASS, suite1/4 con reinicio
de Next por memoria y fallos de login previos al editor. Se rechazó y retiró el
límite; sólo queda detección sanitizada de memory-restart con regresión. Cleanup
verificado; no existe aún optimización aceptada del consumo ni aceptación R02.

## Plan 017 execution contract update — 2026-10-27

Documentation-only simplification: [017](exec-plans/active/017-freeze-remediation.md)
now defines model-independent task outcomes, one shared review/quality gate per
bounded batch, explicit stop conditions and separate local/integrated milestones.
The five children retain their security/integrity acceptance scenarios. The
[register](exec-plans/active/freeze-remediation-register.csv) adds five static
review findings, 017-R01–R05: CI runner wiring, restored draft revision, MFA retry
and two billing-fixture isolation defects. These are pending corrections, not
fresh runtime failures or new passing acceptance. Original dated results remain
historical; affected dispositions are explicitly reopened without erasing them.
Next: 017.5-T11 prerequisite repairs; no product, SQL, provider or Cloud change
was executed by this documentation update. Integrated acceptance remains
**[NO VERIFICADO]**. The roadmap still owns execution order.

Planning consolidation **2026-10-20**: the owner accepted the revalidated
[audit](audits/2026-10-19-freeze-code-and-documentation-revalidation.md) as the
basis for [017 remediation](exec-plans/active/017-freeze-remediation.md), the
[central register](exec-plans/active/freeze-remediation-register.csv), a detailed
[012.5 plan](exec-plans/active/012-5-pricing-truth.md) and the
[final validation protocol](runbooks/freeze-candidate-validation.md).
The audit freshly ran TypeScript, lint (0 errors/16 warnings), 122 unit files /
1452 tests with threads, documentary checks and two pure synthetic probes.
It is a directed revalidation of historical findings, not a renewed exhaustive
T1 review, SQL/E2E/build run or Cloud/provider acceptance.
Implementation of **017 P1** started locally on 2026-10-20 and continues on
2026-10-22 in the uncommitted `a2feb3de` worktree. The
[execution record](audits/2026-10-20-017-p1-execution.md) and central register
separate task results from remaining gates. Data/membership and billing tasks
have local SQL/SDK/review acceptance. Fresh shared checks on 2026-10-22 passed:
TypeScript, lint (0 errors/23 warnings) and 1518 unit tests (one opt-in test
skipped, separately executed locally in billing evidence). Auth/editor browser
acceptance remains pending; production build and Cloud are **[NO VERIFICADO]**.
This does not close 017 or final 016 acceptance. The subsequent order remains
012.5, 014 T2/T3, remaining 017 work, 015 and final 016 T2/T3.

Latest exhaustive static review: **2026-10-08**, Plan016 T1, candidate
`03ef8730560c638328c7bad12e58d50376493080`; coverage and exceptions in
[closure record](audits/2026-10-08-plan-016-t1-closure.md). This does not renew
the runtime, Cloud or test results recorded below. T1 static review closed; documentary checks passed.

Previous recorded static verification: **2026-09-24** (selective reusable-foundation
investigation, full Vitest 99 files/1032 tests and TypeScript passed; see the
[audit](audits/2026-09-24-reusable-saas-readiness.md). This is not an exhaustive
security audit or fresh Cloud/provider verification.)
Latest bounded runtime observation: **2026-10-19**, Plan 012.4 acceptance on
`project-a89lv.vercel.app`, Git source `1a8474968e6c861c985f45b48d552a44adbfd98d`,
READY deployment `dpl_3ySKYADzZGhWWvcJABoTjiEYcytb`. Provider-correlated Sentry
and consented PostHog receipts, owner-performed Firefox MFA/impersonation,
authorized recovery retries and exact-fixture cleanup are recorded in the
[closure audit](audits/2026-10-19-plan-012-4-cloud-closure.md). Explicit limits
include the blocked nonfatal Zod probe and Cloud TTL not waited out.

Previous bounded runtime observation: **2026-10-14**, Plan 012.3 Cloud migrations,
RPC acceptance and candidate endpoint through the official Vercel CLI; see
[dated record](audits/2026-10-14-plan-012-3-cloud-execution.md). Public HTTPS
candidate acceptance, stable-domain promotion and public stable-domain
acceptance passed. Prior Plan 012.2
[acceptance](audits/2026-10-13-plan-012-2-cloud-acceptance.md) retains its own
scope. Neither observation renews unrelated providers or the whole platform.
Previous recorded runtime observation: **2026-09-24** (reconciliation discovery
against the live subscription and a Cloud lease drill, see
[Runtime update](#runtime-update--2026-09-23); recovery and reconciliation
workers in Supabase Cloud, see
[Worker rollout update](#worker-rollout-update--2026-09-22); real Mercado Pago
checkout/cancellation circuit, see MP-01/02/05/07 in the
[v1 Chile matrix](exec-plans/deferred/011-billing/011-mercadopago-v1-chile-acceptance.md))
Repository baseline inspected for this static investigation:
`f82d2fbe381014c80a090ba3c36c99e4778111c3` (main). Runtime entries below retain
their own revision/date; they were not re-inspected in this investigation.

This is the operational entry point for humans and coding agents. It answers
what Iroko is today, which work is active, and which claims have actually been
verified. It does not replace execution plans, architecture documents, or
their evidence.

## Rate limiting Cloud update — 2026-10-14

The three Plan 012.3 migrations were applied to `rgrxlygtmvavqzkjyywg` using
`supabase db push --linked --yes`, exit 0; Cloud ledger 166. Postflight confirms
source parity for the hook, admission RPC and cleanup; backend-only admission,
private event tables with RLS and no direct API-role grants, valid indexes and
preserved cron identity/schedule/previous tasks. The broader pre-existing
service_role accounts grants in Cloud were preserved: local column-scoped ACL
acceptance does not establish least-privilege parity for this table.

Cloud RPC acceptance passed seven checks with fixture cleanup. Candidate
`dpl_4AK3JX5bMMkgtavTnteEnr77Fcoe` is READY; Turbopack build, TypeScript and
sitemap passed. Five endpoint checks through the official Vercel CLI observed
account-scoped 200, invalid/missing 401, canonical IP resisting spoofed headers,
one 200/seven 429 concurrent last-slot requests with Retry-After, and independent
account access. Real shared IP events remain for 300-second TTL; fixture
accounts/keys/account events were removed. Security advisors have no added WARN;
two INFO reflect deliberately inaccessible RLS tables without policies.

The earlier public HTTPS attempt without CLI bypass returned a Vercel Security Checkpoint
HTML 429. This is not an application limiter response. A narrow GET/exact-path,
two-host WAF exception has been prepared, reviewed and explicitly authorized,
along with promoting `project-a89lv.vercel.app`. Its first publication attempt
failed; readback retained version 5, no draft and three existing rules, with no
verified change. A public preflight reached application 401, but the full public
run failed on a non-JSON identity probe before completing any check; its two
fixture accounts were removed. A premature acceptance flag in the harness was
corrected; this failed run is not public acceptance.

The CLI diagnosed a three-rule provider limit (HTTP 400), so no fourth rule is
created. The approved GET/exact-path/two-host policy is being represented by
two appended OR groups in the existing third worker rule, preserving its
original worker condition, secret, name and action and both other rules.
The policy was subsequently published successfully: version 6, no draft and
three rules, with complete comparison preserving the original worker branch,
its metadata/action, both other rules and remaining protections. Its two added
branches match the authorized fingerprint. Public candidate testing is
complete: five checks passed through raw HTTPS without bypass and fixtures were
removed. The stable alias was subsequently promoted with the authorized CLI
command and MCP confirmed `dpl_4AK3JX5bMMkgtavTnteEnr77Fcoe` as its target.
The same public five-check suite on the stable domain passed, exit 0, without
bypass. Final MCP checks confirmed ACTIVE_HEALTHY, ledger 166, zero fixture
accounts/keys, zero orphan account events and zero webhook deliveries. Cron 7
cleanup last ran successfully at 15:20 UTC. Shared real IP events retain their TTL.
MCP runtime logs returned no error/fatal groups for the new deployment in the
last 30 minutes. The initial one-hour query exceeded Hobby retention (HTTP 400);
the valid 30-minute retry passed. This is a bounded observation, not global
monitoring acceptance.
Canonical IP evidence correlates observed DB buckets against controlled spoof
requests; no independent external IP source was checked. Legacy CF/XFF trust
for the SQL hook remains **[NO VERIFICADO]** in Cloud. The CLI also reported its
default candidate alias despite `--skip-domain`; do not claim no alias effects.
The bounded 012.3 Cloud/API acceptance is complete; Cloud 503/500 fault injection,
legacy hook header trust, independent external-IP verification and unrelated
provider/callback acceptance remain **[NO VERIFICADO]**. Pre-existing broad
service_role/accounts grants remain follow-up work. Closure documentation and
the Cloud harness were integrated through PR [#221](https://github.com/pipec80/iroko/pull/221),
squash commit `3bac4f9b`, on 2026-10-15. Local `main` was synchronized to the
same `origin/main` SHA and verified clean. This closes only Git integration;
it does not close the remaining 012.3 follow-ups or certify all providers.
The [follow-up register](audits/2026-10-14-plan-012-3-follow-ups.md) records each
unexecuted check, inherited difference and condition for resuming it. The then-next
[Plan 012.4](exec-plans/completed/012-4-csp-and-secrets.md) subsequently closed
on 2026-10-19; the owner-approved sequence on 2026-10-20 now starts with 017 P1 before 012.5.
See the [execution record](audits/2026-10-14-plan-012-3-cloud-execution.md).

## Product position

### Plan 012.4 closure - 2026-10-19

Implementation merged through [PR #229](https://github.com/pipec80/iroko/pull/229),
with PR CI and post-merge CI green, exact-source Git deployment READY and the
fixed domain automatically assigned. The [completed execution record](exec-plans/completed/012-4-csp-and-secrets.md)
and [Cloud closure](audits/2026-10-19-plan-012-4-cloud-closure.md) retain the actual
counts and scope. Browser baseline passed 39 controls; actual provider receipts
and manual Firefox Turnstile/login/MFA were confirmed. Two impersonation rows
closed with two start/two end audits. Owner-authenticated RPC retries returned
204 without duplicating the audit. Final cleanup returned zero fixture users,
accounts, temporary admin grants, Auth sessions, MFA factors and open
impersonations. Shared preview/production signing-secret records and uploads
false were verified through metadata, without reading secret contents.

The caught Zod eval-capability probe remains a nonfatal CSP console exception;
no unsafe-eval allowance was added. Cloud elapsed TTL was not exercised, and
an already-closed row limits attribution of the console recovery's first close.
Pricing, the service map and other parent-plan work are not closed here.

### Dated Plan 012.4 local/preview execution history — updated 2026-10-19

The snapshots below preserve their original pending/failed/ready states. Present-tense statements inside the 15/16 October history are not the current closeout verdict; the 19 October closure above supersedes them for its bounded scope.

Owner decision, 2026-10-19: Iroko is still under construction; preview and
production are treated as one MVP/test environment. All Cloud acceptance uses
**https://project-a89lv.vercel.app/**. The owner confirms equal values across
both scopes; secret equality has not been independently compared. Do not require
an isolated preview or changing candidate hostnames. The
[MVP acceptance runbook](runbooks/mvp-cloud-acceptance.md) supersedes the earlier
preview-only destination requirement for approved work. Renew the deployed
revision/configuration on the fixed domain before crediting it with 012.4;
that pre-closure boundary is superseded by the dated acceptance above.

Local implementation advanced on 2026-10-15 on `chore/012-4-csp-and-secrets`:
dedicated impersonation cookies/recovery, mock gates and strict schemas, navigation
validation/backfill tooling and nonce CSP are present. The final isolated production
build passed with 43 dynamic routes, 3,780,660 static asset bytes, zero forbidden
Node attempts, zero public maps and zero synthetic build-sink requests. Cleanup
passed after one EPERM retry. Final serial unit coverage passed
122 files / 1452 tests at the original thresholds, including the logout-CSRF
regressions (57 focused impersonation tests also passed). Final serial lint passed
with zero errors / 16 warnings; TypeScript, focused formatting and Knip passed
(six existing Knip configuration hints). Runner/backfill regressions passed 35 tests.
The confined production Chromium run passed all 22 tests with zero skips or
flaky tests, runner exit 0 and zero guard events through server teardown.
Scratch external rewrites now target the local synthetic sink, preserving the
product configuration and guard. Post-run inspection found zero E2E users but
50 accumulated ownerless MFA fixture accounts; transactional teardown now removes
accounts before Auth users. The final repeat after a clean reset passed all 22
tests with runner exit 0, zero skips/flaky cases, zero forbidden Node egress/child
attempts through teardown and zero scratch build directories. Verified post-run
counts were zero E2E users, accounts, ownerless accounts and impersonation
sessions. Local Auth origin attestation now
keeps the email confirmation, browser and application on the same host; no Cloud
or private environment configuration was changed.

The official local reset failed before seed completion at ledger 167 / Vault 0.
Two prior Vault values held only in RAM were not preserved after a missing-row
UPDATE no-op and process exit. Pending sources and `.env` credentials remain
intact. Local values were reconstructed from seed and existing Edge configuration;
their equality with the original lost values remains **[NO VERIFICADO]**. The
reset replay defect was corrected by making the navigation migration's lock,
preflight and constraints atomic. The latest clean reset passed at ledger 169,
preserving reconstructed credentials by RAM comparison at 16:18:38 UTC.
Fresh post-reset pgTAP passed 52 files / 1067 assertions; the verified official
local baseline has zero E2E users, accounts, ownerless accounts and impersonation
sessions. No Cloud write, deployment, push or merge is established. See the
[current local hardening ledger](audits/2026-10-15-plan-012-4-local-hardening.md)
and [earlier task 1 attempts](audits/2026-10-15-plan-012-4-task-1-local.md).

Read-only Cloud preparation on 2026-10-16 confirmed the expected healthy Free
Supabase project, ledger 166 with exactly three reviewed migrations pending,
zero navigation rows/open impersonations and preserved Vault consumer ACL.
Linked dry-run selected only those three migrations. Vercel metadata identifies
the stable deployment as main `58a00b7`; the dedicated cookie secret is absent.
Candidate `800e439` was sealed locally, all 1080 Git blobs verified and the
installed CLI selected 1078 upload files without network/upload/deploy. Sentry
and PostHog read queries work with existing access; no events were generated.
That preflight snapshot was followed by explicit authorization and bounded
execution on 2026-10-16 (Chile). Exactly three migrations were applied; Cloud
ledger 169, four function definitions/ACL/comments and two validated CHECKs
match the accepted local state. Vault ACL was preserved and navigation/open
impersonation counts remain 0/0/0. Advisor aggregate counts are unchanged;
identical pre/post finding fingerprints were not established. See the
[DB execution record](audits/2026-10-16-plan-012-4-cloud-db-execution.md).

Vercel preview now has the dedicated impersonation key and source-map uploads
explicitly false. The sealed candidate `800e439` created preview deployment
`dpl_28u87ioWbhRRUdPgqxhXS69Bn5qk`, but its build failed with `invalid_env_var`
for `MOCK_BILLING_SECRET`, which must satisfy the 64-hex contract. The stable
alias still targets `dpl_5uU8Fr1qKw4d2nRyKgyk32vpgCUN`; no promotion occurred.
The [candidate execution record](audits/2026-10-16-plan-012-4-candidate-execution.md)
and [preview-only recovery proposal](audits/2026-10-16-plan-012-4-preview-mock-key-recovery.md)
record the initial blocker. The owner subsequently authorized the correction:
the original production record was retained and a new sensitive preview key
created. Recorded redeploy `dpl_7jRQgrvKsBrraSEA94BdcAWfuyfp` reached READY,
CLI exit 0, but the browser received Vercel Security Checkpoint 429 before Iroko.
These are 2026-10-16 observations, not fresh Cloud verification today.
Real browser/CAPTCHA/MFA and provider
receipts remain **[NO VERIFICADO]**. No acceptance fixtures or synthetic receipt
events were created. Remaining free-quota balances are not exposed by available
access; this does not authorize paid resources or changing billing.

The [static readiness inventory](audits/2026-10-14-plan-012-4-readiness.md)
and [approved execution plan](exec-plans/completed/012-4-csp-and-secrets.md) contrast
PR4 with the planning snapshot. That snapshot found: impersonation HMAC reused the
Supabase server key; the expiry route and SQL authorization differed; mock and
navigation lacked some explicit boundaries; production CSP permitted inline
scripts; the local Sentry gate was not a general upload authorization gate.
These are static findings, not newly reproduced runtime failures or exploits.
No product code, secrets, providers or dependencies were changed by planning.
Local browser and fixture cleanup acceptance passed; final delta checks,
documentation checks and local Git closure remain pending. No pre-change HTTP
RED trace was recorded. Cloud acceptance was not established by that local/planning snapshot; see the closure above.
The implementation keeps
styles inline as an explicit exception and mock replay as separate follow-up;
all services are user-declared Free, with no paid upgrade authorized.

Owner clarification, 2026-10-13: all current Iroko environments and external
integrations are MVP/test environments, including hosting environments labelled
`production` by their providers. There is no customer production data requiring
preservation. The freeze is for correcting and polishing existing capabilities.
Approved local/test rebuilds may reset project data; pending source work,
credentials and unrelated projects remain outside that deletion scope.
The official local Supabase stack is `saas-boilerplate`, defined by
`supabase/config.toml`. Inventory the existing services and consumers before
creating another environment or changing an integration.

Iroko is currently an **internal-first, reusable SaaS foundation**. It is being
built to a quality level that may later support a commercial boilerplate or
market kit, but it is not yet an installable, supported, customer-ready
product. Commercialization remains an option, not a present-tense claim.

The agreed target promise is: **«Tengo una base que ya resuelve acceso,
cuentas, permisos y servicios comunes. Podemos dedicar el desarrollo a tu
operación y adaptar la experiencia a lo que necesitas.»** The
[product strategy](architecture/product-strategy.md) defines when that claim
is justified, configuration versus domain extensions, and minimal complete
Supabase integrations. Independent reuse is valuable before selling the kit.
The [capability inventory](capabilities.md) is the canonical map of what the
foundation already implements, how each capability is demonstrated, its known
boundary and the acceptance gates for the current MVP feature freeze. During
that freeze, new providers, verticals and commercial modules are deferred;
work is limited to repairing, proving, configuring or documenting capabilities
already in the inventory.
The [competitive landscape review](audits/2026-10-05-saas-template-competitive-landscape.md)
places Iroko close to MakerKit in the Supabase/B2B technical core, but still one
productization stage behind the mature kits in independent setup, configuration,
updates, billing breadth and customer-facing documentation. It adds no new MVP
scope; it reinforces Plans 012, 014, 015 and 016 as the path through the freeze.
The owner has now supplied the IoT/robot conversation: the
[proposed IoT pilot](architecture/iot-vertical-pilot.md) interprets it as a
derived telemetry product with the robot as its first real consumer. The
robot server and selected HTTP client code were subsequently inspected
read-only at `993ff4b5903a852231067858ee3ce9096431a651`. Availability/latency
signals exist in code; current runtime, physical telemetry and Cloud
integration remain **[NO VERIFICADO]**. Plan 015 T0 now proposes shared
navigation/home composition; no implementation or robot changes were made.

### Reuse investigation — 2026-09-24

Static inspection found the robot flag hides navigation but does not guard its
route/actions or tighten its membership-based SQL writes; the image helper
accepts external lookalike origins (reproduced in isolation); platform audit
filters/pagination switch to the account query. These are proposed Plan 014
corrections, not fixed code. Plan 015 proposes coherent minimal configuration,
recipes and an independent install/extension/update drill. At that investigation date neither plan had
started implementation; see the current update below. The [audit](audits/2026-09-24-reusable-saas-readiness.md)
records exact evidence and limitations. Passing unit tests do not close these
defects or prove SQL/runtime acceptance.

### Robot reference implementation — 2026-10-08

Plan014 T1 now has local route/action guards, live-role checks and a new SQL
migration with its schema mirror. Isolated SQL acceptance passed 240 assertions
(after 56 expected failures before Plan014). An isolated webpack production build
and authenticated direct URL/reload Chromium E2E passed. Final cleanup verified
zero users, profiles, accounts and memberships; the temporary app server stopped.

The local Sentry validation gate and exact-project test harness have independent
static approval. Final checks passed after fixture cleanup changes: 104 unit files/1092 tests,
typecheck and lint (zero errors, four existing warnings outside the change). Canonical Turbopack build remains **[NO VERIFICADO]** because
its scratch dependency junction was rejected. Cloud/provider/merge/deploy were
not performed; local acceptance does not renew historical Cloud evidence.
Details and next recommendation 012.1 are in the
[execution record](audits/2026-10-08-plan-014-t1-execution.md).

### Grants hardening — 2026-10-09

Plan 012.1 is implemented and accepted in the disposable local SQL project:
44 pgTAP files / 884 assertions passed, including Robot 240/240. Ten private
functions lose PUBLIC EXECUTE and 105 effective administrative table privileges
are removed. CRUD, RLS, owners and operational defaults are preserved. Existing
Storage policies require explicit anon EXECUTE on get_user_role; anon still has
no private schema USAGE.

Before Cloud application, a new disposable DB reproduced all 161 migrations from
zero with official platform prerequisites. Consolidated SQL acceptance passed
44 files / 884 assertions, with fixture42 redirected to the exact disposable DB
for its focused replay; original sources and temporary connection configuration
were preserved/restored. Before/after local advisor arrays
are identical (66 findings); the three service_role SELECT grants missing in the
earlier manual bootstrap are present and preserved. This does not establish
Cloud parity or external operational acceptance. Evidence and next steps
are in the [history rehearsal](audits/2026-10-09-plan-012-1-history-rehearsal.md).
Cloud application was explicitly authorized and completed in order 014 → 012 on
2026-10-09: 161 migrations aligned, 105 administrative privileges removed and ten
PUBLIC EXECUTE revocations verified. The intermediate gate and independent final
review passed; Security Advisors remained identical (57 WARN / 3 INFO). Functional
Cloud acceptance was **[NO VERIFICADO]** at that date; no application deployment occurred.
See the [Cloud execution record](audits/2026-10-09-plan-012-1-cloud-application.md).
The [2026-10-11 closure review](audits/2026-10-11-plan-012-closure-review.md)
renewed the Cloud grant checks: ten PUBLIC revocations and zero administrative
privileges remaining in scope. The grants change is closed; functional Cloud
acceptance and Git integration retained their separate pending status at that date.
The bounded October 13 Auth/Storage/Realtime smoke below supersedes that runtime
gap for its exercised cases; Billing/provider certification remains separate.

### Webhook SSRF local implementation — 2026-10-09

Plan 012.2 T2 verified a local Node transport mechanism: 28 HTTPS checks and6
separate UDP DNS checks passed and were rerun by the coordinator. The vulnerable
double-resolution comparator reached the forbidden test receiver; the pinned
candidate made zero forbidden connections. These are scratch experiments with
fixture IP policy and loopback mapping, not a product fix or Cloud acceptance.
The user subsequently approved the [transport/RPC design](audits/2026-10-09-plan-012-2-transport-design.md)
for local implementation. Product code now requires a one-use DNS validation
ticket for create/update and sends through a Node worker with pinned IP and TLS.
At the October 9 observation, the isolated database had migration 20261009180000
(162 migrations); Cloud remained
at the previously verified 161, without this change. Local acceptance passed:
45 SQL files / 932 TAP assertions, 111 unit files / 1249 tests, 130 focused
transport checks and concurrent lease/fencing verification. See the
[execution record](audits/2026-10-09-plan-012-2-local-execution.md).
Worker configuration and functional hosting/Cloud delivery were [NO VERIFICADO]
at that observation. The October 13 update below supersedes those pending states.
The [Cloud transition package](audits/2026-10-09-plan-012-2-cloud-preparation.md)
is prepared with read-only preflight/postflight SQL and an operational runbook.
A transition regression corrected historical failed deliveries retaining their
legacy request ID; attempts and backoff are preserved. October 9 Cloud reads confirmed
161 migrations, zero webhook endpoints/deliveries and the legacy cron active.
Application, secrets and deploy for 012.2 were then pending authorization.
The [selective source candidate](audits/2026-10-09-plan-012-2-release-candidate.md)
preserves unrelated changes and passed 1190 tests, typecheck and lint. Its build
was stopped under verified memory pressure and remains [NO VERIFICADO]; source
packaging does not establish deployment readiness. The observed HTTP429 is a
Vercel challenge for the inspected client; Supabase-to-worker access is pending.
The October 11 continuation renewed local emulation (8 files / 167 tests passed)
and independently verified all 972 sealed source entries. A bounded Turbopack
attempt reached fifteen minutes without completing compile; both temporary
configs were restored. Build remains unaccepted. The user deferred the external
receiver until the final Cloud acceptance; emulation does not remove that gate.

### Webhook Cloud acceptance — 2026-10-13

The user authorized the MVP Cloud transition, deployment and explicit alias
reassignment. Supabase `rgrxlygtmvavqzkjyywg` has 163 migrations, latest
`20261013143645`: the original safe-delivery migration plus a separate minimal
`service_role SELECT (id, account_id, version)` grant needed by the validation
context lookup. This grants no URL, Vault secret or mutation access.
Vercel deployment `dpl_4SXbR25CKn6VpdTzxm95LvvaGKQt` is READY and serves
`https://project-a89lv.vercel.app`; the worker uses Node 24 with a 60-second limit.
The sealed source candidate retains SHA256
`c81ef6c05504513e5fcb89054a4f9390d9c9ad271dc2b4fc13236e7bbefad1d7`.

Recorded acceptance passed 46 SQL files / 950 assertions, 111 unit files / 1250
tests run serially, typecheck and lint (zero errors, four prior warnings).
The Windows canonical build attempts remain unaccepted; the READY hosted build
is separate provider evidence. Cloud functional smoke passed 14 checks covering
Auth, its hook/triggers, Storage and private Realtime notification delivery.
The outgoing smoke passed 14 checks and nine cleanup checks: a controlled
240-byte HTTPS delivery completed HTTP 200 on attempt one, with HMAC verified
independently in receiver logs. It used the private SQL emitter, not a business
mutation or Mercado Pago callback; those paths are not certified by this test.

The Supabase-to-worker wake returned HTTP 200 after a Vercel WAF exception
restricted to the exact worker path, POST and the dedicated Bearer authorization.
Other rule structure and managed rules were preserved. The fresh Data API `net`
exposure check returned HTTP 406 / `PGRST106`. Cleanup verified zero temporary
receiver functions/secrets, fixture tickets/accounts/customers, endpoints and
deliveries. Cron job 9 was reactivated at 19:19:45 UTC (16:19 Chile), retaining
its existing once-per-minute schedule. Its first scheduled run, 312227 at
19:20 UTC, succeeded; correlated webhook wake response 118454 returned HTTP 200
without timeout/transport error and reported zero claimed deliveries. This proves
the scheduled wake with an empty queue; delivery/HMAC evidence comes from the
separate controlled smoke. See the
[acceptance record](audits/2026-10-13-plan-012-2-cloud-acceptance.md).
This update closes only the recorded 012.2 surface; Git integration and the
remaining Plan 012 product/security gates have their own status.

## Current technical baseline

### Rate limiting local acceptance — 2026-10-13

Plan 012.3 is accepted locally. Three new migrations bring the official local
ledger to 166, including the subsequent four-column backend summary grant;
the previously observed Cloud ledger remained 163 and was not
modified in this execution. The hook's HTTP 500/PGRST121 and cross-minute race
were reproduced before correction. Local GREEN verifies HTTP 429, rollback,
serialization and independent-IP progress.

The account API now uses backend-only durable admission: strict rolling
300-second windows, 300 IP admissions before credential checks and 100 account
admissions shared across keys. Responses distinguish 401, 429 with Retry-After,
503 and later lookup 500. RPC HTTP tests cover concurrent final slots, expiry
and reservations surviving a separate failed database read. Hosted canonical
IP identity was unverified at this local stage. The Cloud update dated
2026-10-14 above supersedes that rollout status and retains its own limits.

Recorded local checks pass: 49 SQL files/999 tests, 112 unit files/1281 tests,
TypeScript strict, lint with four existing Mercado Pago warnings, and an
isolated webpack build with the local Sentry gate. Actual Next HTTP verifies
scoped 200, missing/invalid 401 and account-quota 429 with Retry-After; Chromium
Robot acceptance passed. Fixture reservations/accounts/users were removed and
the owned application server stopped. See the
[execution record](audits/2026-10-13-plan-012-3-local-execution.md) for current
E2E and Git integration status. Nine code commits now preserve the corrections
on the local branch; their linked evidence is included in the documentary
closure commit. In that local stage there was no push, merge or change to the
deployed application; the later authorized Cloud rollout is recorded above.

- Next.js 16 App Router, React 19, strict TypeScript and React Compiler.
- Locale-prefixed routes for `es`, `en`, `pt`, and `fr`; `es` is the default.
- Supabase provides authentication, PostgreSQL, RLS, migrations, and Edge
  Functions.
- Vitest covers unit/component tests and Playwright covers end-to-end flows.
- Sentry, Pino, and PostHog provide the current observability foundations.
- Plan 010 tenant-isolation remediation is completed with regression evidence.
  Billing Core v2 closed through PR #152. Mercado Pago checkout coordination,
  known-payment recovery, persistent anomalies and Node worker are implemented.
  The basic Cloud rollout is now observed for both worker modes; historical
  local test results and HTTP 200 alone do not certify the full lifecycle.
  The 2026-09-10 **sandbox circuit against the production deployment** (checkout,
  first charge, provider cancellation with paid-through access preserved) is
  now confirmed with correlated database evidence, closing MP-01/02/05/07/15;
  it is not real-money production acceptance. Rejection and its dashboard alert
  (MP-06), both cancellation directions (MP-07) and a genuine recovery repair
  (MP-11) were later closed with real correlated evidence. Local code covers
  refund ingress and missed-invoice discovery, including local migration
  `20260911140000_billing_financial_anomaly_ingress`. Still open in the
  [v1 Chile matrix](exec-plans/deferred/011-billing/011-mercadopago-v1-chile-acceptance.md):
  renewal (a real charge due 2026-10-22), provider refunds (blocked for test
  accounts), recovery of an actually omitted provider invoice, concurrent
  checkout and the volume scenarios of the worker drills.

## V1 product decision — 2026-09-11

Own use in Chile, monthly CLP, hosted checkout with pending preapproval and no
associated plan. Keep prices CLP 0 / 19.990 / 102.990, Free / Plus / Pro labels
and durable `free` / `pro` / `scale` slugs during MP closeout. Trial,
upgrade/downgrade, Iroko-initiated pause and in-app card management are outside
v1, as are annual MP checkout and additional countries. `scale → teams` stays
separate from this closeout.

Internal Mercado Pago acceptance is independent of the full four-provider
program and future commercial distribution. No official provider certification
is claimed. Security, smoke, observability and operational recovery remain
required before real users; they are not deferred to selling the boilerplate.

## Freeze work status

Updated **2026-10-20** after the audit and planning disposition. The
[root roadmap](../ROADMAP.md) owns the single execution sequence. This table
summarizes recorded evidence, not a new runtime audit or a second task checklist.
A closed bounded scope does not close inherited follow-ups or certify the whole
platform. The current implementation entry is **015-T1/RS-05 scope exclusion and
configuration**, with offered-core P1 disposition in017. Editor and Robot are
not prerequisites of the replicable base under ADR0005. Plans/rows are not runtime evidence.

| Work item                                                                                     | Recorded status                                                                                | Remaining work / evidence boundary                                                                                                                                                                                                                                  |
| --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [011 — Billing](exec-plans/deferred/011-billing/README.md)                                    | Freeze scope satisfied; remainder deferred                                                     | Preserve dated Mercado Pago/core/worker evidence. Renewal, refunds, omitted-invoice recovery and other provider certifications are not completed.                                                                                                                   |
| [016 T0/T1 — Review](audits/2026-10-08-plan-016-t1-closure.md)                                | Static review closed, 2026-10-08                                                               | 947 paths: 874 complete readings and 73 alternative methods; zero pending inventory rows. Findings and later revisions still require validation/consolidation in T2/T3.                                                                                             |
| [014 T1 — Robot permissions](exec-plans/active/014-reference-surface-correctness.md)          | Accepted locally; SQL applied to Cloud                                                         | Local route/action/RLS evidence exists. Robot-specific Cloud functional acceptance remains **[NO VERIFICADO]**; the October 13 selective-deployment limitation below is historical. Later overall builds do not independently prove Robot roles in Cloud.           |
| [012.1 — Grants](exec-plans/active/012-security-hardening-and-pricing-truth.md)               | Bounded grants scope closed                                                                    | Local SQL and Cloud grant changes recorded; October 13 adds bounded Auth/Storage/Realtime acceptance. This does not certify all billing/provider paths or eliminate later inherited ACL follow-ups.                                                                 |
| [012.3 — Rate limiting](audits/2026-10-14-plan-012-3-follow-ups.md)                           | Bounded local/Cloud/API acceptance closed                                                      | Concurrency, isolation and public stable-domain checks passed. Legacy hook header trust, Cloud 500/503 injection, independent external-IP confirmation and inherited service-role ACL differences remain explicit follow-ups.                                       |
| [012.2 — SSRF / outbound HTTP](audits/2026-10-13-plan-012-2-cloud-acceptance.md)              | Bounded operational scope closed                                                               | Validated Node sender, controlled HTTPS/HMAC delivery and worker wake observed; implementation consolidated through PR #221. This is not acceptance of every business trigger or Mercado Pago callback.                                                             |
| [012.4 — CSP / secrets](audits/2026-10-19-plan-012-4-cloud-closure.md)                        | Closed, 2026-10-19; PRs #229 / #230 merged                                                     | Browser baseline, provider receipts, owner MFA/impersonation/recovery retries and fixture cleanup recorded. Nonfatal blocked Zod probe and unexecuted Cloud elapsed TTL remain explicit limitations.                                                                |
| [017 — Remediation](exec-plans/active/017-freeze-remediation.md)                              | Local disposition recorded29/10; milestone blocked                                             | Exclusion/MFA implemented and scoped checks reviewed; shared lint/coverage confirmation and offered browser acceptance remain blocked. CSV distinguishes reused local evidence, deferred editor and outstanding gates. Integrated016 follows015; no MVP acceptance. |
| [012.5 — Pricing truth](exec-plans/active/012-5-pricing-truth.md)                             | Planned; after 017 P1                                                                          | Align landing, pricing, checkout and entitlements with the current catalog; correct unsupported claims. Keep its own scope and current CLP labels/slugs/provider constraints; coordinate availability with 015.                                                     |
| [014 T2 — Trusted image origins](exec-plans/active/014-reference-surface-correctness.md)      | Pending                                                                                        | Replace prefix trust with exact origin validation and regressions for similar hosts, userinfo and unauthorized ports.                                                                                                                                               |
| [014 T3 — Platform audit interaction](exec-plans/active/014-reference-surface-correctness.md) | Pending                                                                                        | Keep platform-wide scope when filtering/paginating; preserve valid rows on errors and correct displayed fields/states.                                                                                                                                              |
| [016 T2 — Candidate validation](exec-plans/active/016-nextjs-supabase-code-review.md)         | Pending as an integrated review deliverable                                                    | Reuse applicable commit-bound evidence and run remaining checks against the corrected candidate, including Edge Functions/SQL/E2E as required. Individual 012.4 CI passes do not complete T2.                                                                       |
| [016 T3 — Consolidation](exec-plans/active/016-nextjs-supabase-code-review.md)                | Pending                                                                                        | Deduplicate, reproduce/revalidate and assign remaining findings, including account cache, password, leases, editor, concurrent limits and document invariants. A historical finding is not proof that it remains unfixed today.                                     |
| [015 — Reusable foundation](exec-plans/active/015-reusable-foundation-acceptance.md)          | Exclusion prerequisite implemented locally; browser blocked; remaining work/drills not started | Prove configurable composition, operation with/without billing, extension and independent installation/update preserving customization and data.                                                                                                                    |
| [Solid MVP candidate](../ROADMAP.md)                                                          | Not yet accepted                                                                               | Evaluate all freeze exit gates together after the remaining work. No overall percentage is inferred from heterogeneous tasks.                                                                                                                                       |

The parent Plans **012, 014, 015, 016 and 017 remain active**. Plan
[013 — commercial preparation](exec-plans/deferred/013-launch-readiness-roadmap.md),
new providers and verticals remain outside this freeze. The
[external-services map](exec-plans/deferred/external-services-map.md) is a
separate deferred follow-up, not unfinished 012.4 work.

The owner's older progress table is superseded by this section: its percentages,
012 security at zero, pending 016 T1 inventory and unactivated billing worker
are not current summaries. Earlier worker rollout and monitoring observations
retain their own dates; this documentation update does not renew email health,
nightly monitoring, provider certification or every integration. Dependabot
configuration/consolidation already has [recorded evidence](audits/2026-10-14-git-consolidation-and-dependabot.md);
do not recreate that item as entirely absent without checking the maintained
workflows. Other historical miscellaneous items require item-specific triage.

Maintain this table in the same change that alters a plan's status, linking to
its acceptance record. Keep historical dated observations instead of rewriting
them as fresh validation. The historical Plan 016 T1 task map remains in the
[security, integrity and critical-flow breakdown](exec-plans/active/016-t1-security-integrity-critical-flows.md);
the October 8 closure supersedes its initial coverage checkpoint.

### Integration traceability — 2026-10-13

Before the local 012.3 implementation, read-only verification matched all 163 migration version identifiers
between the repository and Cloud; this is ledger parity, not an exhaustive
schema comparison. As of this 2026-10-13 snapshot, Vercel's stable alias targeted
the accepted 012.2 deployment. That sealed candidate included the webhook implementation and SQL
migrations 014/012.1, but retains HEAD for the Robot application and local
Sentry validation configuration. Those pending application changes were not
deployed. Robot SQL application and Robot hosting acceptance therefore have
separate states. The [integration inventory and source contrast](audits/2026-10-13-git-cloud-traceability.md)
records the selective commit proposal and its remaining checks. The subsequent
2026-10-14 Cloud update above records the 012.3 rollout and alias promotion;
do not treat this dated integration snapshot as the current deployment target.

Plan 010 closed on 2026-08-26 through PRs #139, #140, #147, #149 and #150
(the last being the independent toolchain repair). Plans 001–010 remain under
`exec-plans/completed/` as evidence records. Their historical status was not
re-certified against a live runtime or Cloud environment during this
documentation pass.

## Verification boundary

### Runtime update — 2026-09-23

First real run of the missed-invoice discovery, plus sandbox drills, against the
linked Supabase project and the test seller. No real-money operation and no
migration change (the latest migration is still
`20260911140000_billing_financial_anomaly_ingress`; Cloud parity was last
inspected on 2026-09-22).

- **Reconciliation discovery had never worked in Cloud.** The only live
  subscription failed every hourly scan while the worker kept answering HTTP 200.
  Two defects were found in sequence: Mercado Pago rejects `limit` above 15 on
  `/authorized_payments/search` (fixed in #205, deployed), and discovered
  invoices carried the checkout id as account, which the reducer rejects
  (`reducer_failed` at the 22:00 UTC scan; fixed in #208). **Observed on
  2026-09-24 after #208 deployed:** the scan completes (`last_completed_at`
  13:00 UTC, `failure_count=0`, no error code) and the hourly rescans add nothing
  (12 Mercado Pago events, 3 invoices, 0 anomalies and 0 open jobs, unchanged from
  00:51 to 14:09 UTC). Whether discovery repairs a genuinely omitted invoice
  stays **[NO VERIFICADO]**. Unit tests with mocked providers could not see
  either defect;
  see the provider-contract note in the
  [testing strategy](quality/testing-strategy.md#contract-tests).
- **Lease drill (MP-14, part).** Against the real candidate: a lapsed lease is
  reclaimed, completing with a lapsed lease is rejected, and a live lease is
  respected. This covers database semantics only, not a killed Node process, more
  than 20 candidates or an intermediate invoice cursor.
- **Measured provider behaviors** now live in the
  [reliability design](architecture/mercadopago-reliability-design.md#verified-provider-behaviors-2026-09-23):
  `X-Idempotency-Key` is ignored, `payer_email` is required, the search does not
  filter by `external_reference`, and the test seller's credentials cannot create
  refunds (MP-09/10 need a productive account).
- **Dashboard.** A canceled subscription with paid access remaining now reads as
  canceled (access-until date, no cancel button, a distinct badge), reviewed on
  production (#198–#202). A rejected payment now explains its reason (#203),
  covered by tests but not yet seen on a real rejection.
- **CI.** Builds no longer download Google Fonts (#207) after four transient
  failures in one day.

Merged since the previous update: PRs #190–#208 (acceptance workflow, evidence
records, the canceled-plan and rejection-reason UI, discovery page size and
account resolution, webhook rejection naming and locale-aware return URL,
vendored fonts).

The nightly monitoring run of 2026-09-24 07:59 UTC passed all three jobs
(production smoke, email worker health, database advisors); see the
[operational evidence register](quality/operational-evidence.md).

### Worker rollout update — 2026-09-22

The authorized 011e rollout now has current Cloud evidence for the deployed
Node route, Vault/scheduler circuit, and both worker modes running unattended.
`cron.job_run_details` shows the 5-minute recovery job (14) at 1493/1493
`succeeded` from 2026-09-17 14:35 UTC through 2026-09-22 18:55 UTC, and the
hourly reconciliation job (15) at 22/22 `succeeded` from 2026-09-21 21:00 UTC
through 2026-09-22 18:00 UTC — zero non-succeeded rows for either job across
that window. `private.billing_worker_health` correlates both modes' latest row
to `last_status_code=200` at the same timestamp as the latest cron run. This
verifies sustained basic operation only, and confirms Cloud migration parity
(159/159 versions match `main`).

The evidence does not identify a provider resource, prove a recovery repair,
show a fully omitted provider invoice, or exercise multi-batch progress,
injected provider failure, process interruption, lease reclaim, or replay in
Cloud. Those requirements remain **[NO VERIFICADO]** and are owned by 011e/011f
until recorded with sanitized scenario evidence.

### Runtime verification update — 2026-09-10

The historical record reports that a Mercado Pago **sandbox** lifecycle was exercised against the production
deployment (`project-a89lv.vercel.app`, the canonical domain — not
`iroko-pipec80-labs.vercel.app`). What this run actually verified:

- Checkout → `billing.subscriptions` `active`, `checkout_intents` `confirmed`,
  invoice `paid`, events `invoice_paid` + `subscription_updated`.
- Cancellation → `canceled` with `canceled_at` and a `subscription_canceled`
  event. This required fixing an adapter bug (Mercado Pago returns the
  cancelled preapproval as `cancelled`; the code only matched `canceled`, so
  cancellations previously landed on `incomplete`) — PR #179.
- The four Phase 2/6 billing migrations (`20260909*`) were missing from linked
  Cloud and were applied manually with `supabase db push` — **CI/CD does not
  apply migrations to Cloud**; check `supabase migration list --linked` after
  every merge that touches `supabase/migrations/`.
- Deployment protection was moved to "Standard" (production public, previews
  still behind Vercel Auth) and a firewall rule exempts `/api/webhooks/` from
  Bot Protection so provider callbacks reach the endpoint.

After that run, formal internal acceptance evidence and worker activation
remained pending (secret, Vault entries, firewall rule, schedules and actual
health/results). Two sandbox applications were reported; environment coherence
needs verification. Payment failures already persist separately from the
subscription lifecycle; the missing requirement is visible payment health,
not inventing a Mercado Pago `past_due` transition. Current runtime, Cloud,
provider configuration and migration parity were not re-inspected on
2026-09-11: **[NO VERIFICADO]**. The
[matrix](exec-plans/deferred/011-billing/011-mercadopago-v1-chile-acceptance.md) owns all closure
gates, including renewal, paid-through access and recovery.

Merged to `main` since PR #152: #153, #159, #161, #171–181, #187, #188 and
PRs #190–#208 (Mercado Pago reliability slice, dependency updates, the QA fix
and its documentation, the v1 local gap closure, the Cloud acceptance workflow,
evidence records and the 2026-09-22/23 follow-up fixes).
No subsequent v2 certification phase for Stripe / Paddle / Lemon Squeezy is
closed. An existing Stripe adapter and registry entry are present; their
existence is not certification. Paddle/Lemon Squeezy remain planned adapters.

### Historical Mercado Pago planning update — 2026-09-09

The [reliability roadmap](exec-plans/deferred/011-billing/011-mercadopago-reliability-roadmap.md)
defines bounded follow-up work inside Plan 011, with a
[design supplement](architecture/mercadopago-reliability-design.md) and
[Accepted ADR 0003](adr/0003-mercadopago-reliability-boundaries.md).
Agreed product scope: no Mercado Pago trial for now; persistent financial
anomalies with alerts, without automatic access revocation. Prices and plan
slugs are unchanged.

This planning pass refreshed and inspected `origin/main` at `954e5d5`. It does
not refresh the platform-wide verification date
above. Current CI, Cloud, deployment and sandbox health are **[NO VERIFICADO]**.
No application code or Cloud resources were changed in this documentation pass.
The accepted design was approved for sequential local implementation; its
coordination/recovery/anomaly foundation is now present at `66bc9b2`. Rollout
and provider operations remain separately authorized work.

### Earlier verification boundary

This document was checked against the repository tree, configuration, and
versioned plans. The commit-bound CI and Vercel Preview evidence for PR #152 is
recorded in the operational evidence register. The application runtime, linked
Supabase project, payment-provider sandbox, Sentry, PostHog, email delivery,
and a separate post-merge `main` run were not revalidated in this documentation
update. Treat them as **[NO VERIFICADO]** until a plan or runbook records fresh
evidence.

A passing focused test proves only the exercised scope. It does not close a
plan, certify a provider, or establish launch readiness by itself.

### Evidence from the 2026-08-20 documentation audit

| Check                                                     | Result                                         | Meaning                                                                                     |
| --------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `pnpm typecheck`                                          | Pass                                           | Current TypeScript tree type-checks                                                         |
| `pnpm lint`                                               | Pass                                           | Current ESLint rules pass                                                                   |
| Full `pnpm test`                                          | Not green in this run: 766 passed, 1 timed out | The timed-out billing test passed 7/7 in isolation; full-suite stability remains unverified |
| Versioned/new Markdown internal links                     | Pass: 0 broken links detected                  | Does not validate external URLs or runtime behavior                                         |
| Documentation checker unit tests                          | Pass: 4/4                                      | Covers internal targets, URL-encoded paths and forbidden stale references                   |
| Build, E2E, pgTAP, linked Supabase and external providers | Not run                                        | **[NO VERIFICADO]**                                                                         |

## Documentation maturity and release gates

The earlier numeric documentation assessments were qualitative historical
opinions, not completion percentages or release gates. Current status uses
implemented, tested locally, verified at provider, pending operations and
outside v1, with evidence bounded to its revision and scenario. The following
platform documentation audit inventory remains historical (2026-08-20):

| Area                       | Current position                                                                         | Remaining gate                                                                       |
| -------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Shared entry point         | `AGENTS.md`, thin `CLAUDE.md`, this file and `docs/index.md` are prepared in this change | Commit/merge them and keep them synchronized                                         |
| Status authority           | Priority and evidence order declared                                                     | Prevent stale secondary status files from being treated as current                   |
| Architecture and decisions | Overview and ADR process exist                                                           | Add ADRs only for material decisions and keep architecture coverage current          |
| Plans and evidence         | Active/completed split exists                                                            | Remove placeholders and require exact closure evidence                               |
| Module documentation       | Eight guides curated and prepared for version control                                    | Keep them synchronized with module contracts and refresh runtime evidence separately |
| Design system              | Poppy/Cobalt/Geist root accepted; generated and historical material classified           | Keep specification/runtime parity and add fresh visual evidence per material change  |
| Documentation automation   | Dedicated checker and workflow prepared in this change                                   | Merge it and require the `Documentation` check on protected branches                 |
| Operational truth          | Dated evidence register exists; current Cloud rows are unverified                        | Re-run runtime/Cloud checks before making current claims                             |

The MVP freeze gates are defined in the [root roadmap](../ROADMAP.md). Billing
evidence is valid only for its recorded Mercado Pago scenarios; a four-provider
claim still requires the deferred provider certifications. Commercial
distribution additionally requires reactivating Plan 013 for licensing,
packaging, support and buyer onboarding if selling is chosen.

## Known documentation and tooling debt

- The root roadmap owns freeze direction and order; its superseded detailed
  predecessor is preserved in [documentation history](history/README.md).
- The canonical design-system root is accepted in ADR 0002. The generated
  handoff and historical previews remain intentionally preserved; full PDF
  visual inspection and per-screen production parity are **[NO VERIFICADO]**.
- The eight guides in `docs/modules/` are current at static-code level as of
  2026-08-20; their runtime and Cloud behavior remains **[NO VERIFICADO]**.
- In the platform-wide audit table, initial data is cross-account, but filters
  and `Cargar más` still call `getAccountAuditLogs`; remediation is proposed in
  Plan 014 T3.
- The documentation workflow is versioned. Its current enforcement as a
  required branch-protection check is **[NO VERIFICADO]** in this local audit.

Fresh operational status and expiry rules live in the
[operational evidence register](quality/operational-evidence.md).

## How this file stays current

Update this file in the same pull request when any of these change:

- product position or supported deployment model;
- active-plan priority, status, or dependency order;
- a material architecture boundary;
- the verification status of a previously unverified capability.

Do not copy task-level checklists here. Link to the bounded execution plan and
put exact commands and evidence there.
