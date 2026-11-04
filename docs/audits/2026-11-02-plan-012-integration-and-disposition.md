# Plan 012 — integración, sincronización y disposición,2026-11-02

El mantenedor autorizó publicar/fusionar la rama012.5, sincronizar Supabase
local/Cloud, volver a main y reorganizar el trabajo pendiente. No pidió resetear
datos, instalar herramientas, pagar servicios ni reactivar Robot/editor.
Integración publicada: [PR241](https://github.com/pipec80/iroko/pull/241);
consultar su estado y checks en GitHub antes de atribuir el merge a un SHA.
Implementación pricing `436228963bf87a073040fbdc2f644c348ee9c40b`.

## Resultado final y reconciliación documental —2026-11-02

PR241 fusionado por squash en `7ea19539372948868aec04dda9528e9d2f9ca9d0`;
todos sus checks terminaron en SUCCESS. Checkout local en main limpio e igual
a origin/main; rama012.5 local/remota retirada, material ignorado preservado.
El árbol del squash coincide con el último candidato `e63ffc9`.

CI final: E2E general87 aprobados/2 skips; CSP confinado21/21 y017 confinado8/8,
estos dos últimos con0 skips/unexpected/flaky y0 intentos prohibidos de egress
Node o ejecución hija. El runtime production de017 acepta esos escenarios;
no demuestra reparación de los fallos development registrados más abajo.
Quality, Build, Documentation, unitarios, SQL/tipos, seguridad y WebKit verdes.

Vercel fijo `project-a89lv.vercel.app`: `dpl_7KRmqmJcciGf6cxnAZ5KLxMUvGaP`,
READY, mismo SHA del merge. La consulta HTTP pública encontró Vercel Security
Checkpoint: visualización Cloud **[NO VERIFICADO]**, sin cambiar WAF ni intentar
compras. Consulta Cloud posterior confirma177 migraciones, última20261026113000.
No se confunde disponibilidad del deployment con aceptación de flujo.

La revisión documental posterior encontró resúmenes obsoletos:012 aún activo,
exclusión browser bloqueada y entrada015-T1 anterior. Se corrigieron los puntos
de entrada; las auditorías fechadas y ADR aceptados conservan su historia.

| Documento revisado manualmente                   | Resultado vigente                                                                                  |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| README raíz, docs/index y docs/current-state     | 012 cerrado por entregables;014/015/016/017 abiertos; tabla de progreso y cola alineadas           |
| ROADMAP y docs/exec-plans/README                 | Triage017 →014-T2/T3 →resto017 →015 →016; no ejecutar otra vez012.5                                |
| docs/adr/README y ADR0005                        | Decisión aceptada preservada; exclusión local no equivale a reutilización ni MVP aceptado          |
| Arquitectura: system-overview y product-strategy | Núcleo primero; exclusión local acotada, composición/reutilización pendientes                      |
| Arquitectura: documentation-freeze-structure     | Listas antiguas identificadas como baseline histórico, no cola vigente                             |
| docs/capabilities                                | Projects/editor excluidos con guards y navegador local; editor y reutilización no aceptados        |
| Plan014                                          | T1 con cierre acotado; T2 imágenes y T3 auditoría pendientes                                       |
| Plan015                                          | Prerrequisito de exclusión local aceptado; composición/configuración, recetas y ensayos pendientes |
| Plan016                                          | T0/T1 históricos cerrados; revisión/validación/consolidación final T2/T3 pendientes después de015  |
| Plan017 y CSV central                            | Reparaciones y evidencias parciales preservadas; seguimientos y obligaciones finales abiertos      |

El verificador documental recorre archivo por archivo los Markdown versionados
y no ignorados: enlaces relativos y patrones obsoletos. Este control automático
no equivale a leer semánticamente cada auditoría histórica ni a revisar todo el
código. La revisión manual anterior cubre autoridad, estado, secuencia y límites;
no se ejecutaron las implementaciones014/015/017 ni la aceptación final016.

Validación de esta reconciliación: `node scripts/check-docs.mjs` PASS187
Markdown; `node scripts/check-design-system.mjs` PASS7 tokens/4 guías/fuentes;
`git diff --check` PASS. Formato con la configuración documental de CI.
Revisión independiente del diff frente a planes y CSV: sin bloqueantes;
no renueva comprobaciones de proveedores ni aceptación de código.
Las correcciones documentales posteriores a PR241 requieren su propia
publicación; no se atribuyen al SHA ya fusionado.

## Veredicto por alcance

### Acotación017 y utilidad de pruebas — decisión posterior2026-11-02

El mantenedor pidió limitar017 al MVP sobre servicios gratuitos y detener el
ciclo de tests que agota RAM o falla antes del escenario. El criterio es valor
observable y riesgo, no completar todo el inventario ni aumentar capacidad.

- Mantener como cierre017 dos lotes: seguridad/configuración
  RL-F01/RL-F03/FOLLOW-MOCK y privacidad N-25/N-26/S-11. Son seis IDs/cinco tareas;
  no equivalen a cinco defectos confirmados. Verificar primero evidencia vigente.
- Transferir a016-V2/V3 los otros dieciséis IDs funcionales, sin cambiar sus
  estados, aceptación ni resultados históricos.016 los recibe explícitamente:
  siete recorridos/controles agrupables, no dieciséis suites nuevas. Cada
  escenario necesita evidencia reutilizada o comprobación/disposición específica.
  -017 puede cerrar después de sus dos lotes, revisión y gates proporcionales;
  deja de depender del fin015/016. No está cerrado por editar el contrato.
- No eliminar tests ni umbrales; no alterar guards, secretos, providers, CI,
  protección de rama o selección de suites desplegada. Este cambio es documental.
  Ningún P0/P1 confirmado de superficie ofrecida puede aceptarse por traslado.
- No usar pruebas de carga, resiliencia empresarial, SLA ni editor/Robot
  diferidos como requisito de017. Una cuenta A→B, dos sesiones o un evento
  Realtime son controles funcionales pequeños; no requieren simular cientos de
  clientes ni una prestación de pago. Mantenerlos sólo donde se ofrece capacidad.
- No repetir builds por ID; aprovechar una revisión construida/evidencia CI
  válida. Para lo faltante, método manual reproducible o automatización
  existente confinada, ejecución serial y presupuesto definido antes. Después
  de dos fallos iguales sin información nueva, bloquear ese método y cambiar
  estrategia; no consumir otra vez toda la RAM ni declarar aceptación.

Verificación de plataforma en esta revisión: workflowCI tiene calidad, SQL,
unitarios/cobertura, E2E y build, sin comando de despliegue Vercel. MCP de Vercel
confirma proyecto fijo y último deployment production READY; no expone aquí un
gate Actions→promoción. No se afirma que ese gate esté configurado. La integración
Git de Vercel permite despliegue automático, independiente del build de Actions;
compilar/desplegar no prueba permisos o recorridos. No se cambió esa integración.

Fuentes oficiales consultadas2026-11-02:
[Vercel Git](https://vercel.com/docs/git),
[Deployment Checks](https://vercel.com/docs/deployment-checks),
[Supabase Realtime limits](https://supabase.com/docs/guides/realtime/limits) y
[GitHub Actions billing](https://docs.github.com/en/actions/concepts/billing-and-usage).
Realtime Free admite200 conexiones simultáneas y100 mensajes/s; un control de
evento/cleanup de uno o dos clientes no exige una cuota de pago. Actions privado
usa cuota incluida; consumo restante de esta cuenta y minutos disponibles
**[NO VERIFICADO]**. No se instalaron herramientas ni activaron servicios pagos.

Reglas aplicadas: jerarquía AGENTS/ADR0005 y evidencia antes de afirmaciones;
TS/JS/React/SQL/Realtime sin cambios ejecutables, pruebas sin modificaciones.
No se crea un plan nuevo ni se ejecuta la optimización del runner. Las secciones
anteriores/inferiores de esta auditoría conservan la secuencia previa a esta decisión.

Revisión independiente de la acotación: sin bloqueantes. Comparación del CSV
contra HEAD confirma16 transferencias, todasP2, con state y acceptance idénticos;
ningún P1 trasladado ni PASS añadido. Si un escenario revela P1 real, se escala
y repara antes de entregar. Checker documental187 Markdown y diff-check PASS;
no se ejecutaron pruebas funcionales ni se renovó aceptación por este cambio.

Las cinco entregas de012 tienen cierre de su alcance aprobado: grants, SSRF,
rate limiting, CSP/secretos y pricing. Se conserva la aceptación fechada de cada
una. El cierre del padre es por entregables con seguimientos explícitos; no
significa seguridad exhaustiva, paridad total de grants, pago MP real ni MVP
aceptado. Los seis seguimientos RL originales siguen abiertos con receptor,
condición y evidencia propios; RS-09 conserva partial para ese agregado.

## Supabase Cloud — operación ejecutada

- Destino renovado por CLI/MCP: `iroko`, ref `rgrxlygtmvavqzkjyywg`; enlace
  local coincide. Repo/local177, Cloud169 antes de aplicar.
- Revisión independiente de las ocho migraciones existentes: sin DROP TABLE ni
  eliminación de contenido al aplicar; recovery cambia su firma y fencing.
- Vercel estable `project-a89lv.vercel.app`: deployment
  `dpl_AdXzsKfWd9Qd5syfSQQFx7AEhYcy`, READY, SHA
  `71c04ccdaee8c013627f45c927d50d34c5212291`. Ese código usa
  `apply_billing_recovery_result` con lease_token; no se infirió desde main local.
- Preflight Cloud:0 documentos inconsistentes;1 documento/1 proyecto;0 recovery
  processing; columnas/constraints/triggers nuevos ausentes; sin dependientes
  adicionales del DROP claim; trigger owner anterior presente.
- Se pausó solo cron14 `billing-recovery-worker`, originalmente activo cada5min.
  Antes de DDL:0 cron running,0 processing y última respuesta HTTP200 completada.
  Se preservaron reconciliation, correo, webhooks y demás schedulers.
- `supabase db push --linked --dry-run` enumeró exactamente las ocho versiones
  desde20261020100000 hasta20261026113000; `supabase db push --linked --yes`
  aplicó las ocho, exit0, sin seed/roles ni cambios al historial para simular éxito.
- Postflight: Cloud177, última20261026113000; nuevo get_admin_account,
  apply_billing_recovery_result, columna revision y lease_token presentes;
  apply denegado a anon y permitido a service_role, complete antiguo revocado
  al service_role. Se conservan1 documento/1 proyecto y0 inconsistencias.
- Las quince funciones afectadas coinciden por huella de pg_get_functiondef
  local/Cloud al normalizar CR/LF. El primer hash literal difería en once por
  finales Windows; la comparación normalizada dio0 diferencias, sin reescribir
  funciones. Esta muestra no incluye todos los grants/configuraciones del entorno.
- Cron14 restaurado a active=true y `*/5 * * * *`;0 processing al verificar.
  Dry-run posterior: upToDate=true, migrations=[]; no se reinició ni borró DB.
- Ejecución programada posterior observada a19:10:01UTC: recovery HTTP200 y
  claimed0. Acredita reanudación sin casos; no prueba recuperación de un pago.
- Catálogo Cloud leído: Free/Plus/Pro mensualCLP0/19990/102990, límites de
  miembros2/10/50. La aceptación local no se convierte en una compra Cloud.

Límite confirmado: Cloud conserva SELECT/INSERT/UPDATE/DELETE amplios de
service_role en public.accounts, diferencia RL-F03 respecto del local. Esta
sincronización acredita migraciones y los contratos revisados, no paridad
exhaustiva. Reconciliation conserva un caso provider_fetch_failed:429;
HTTP200 con failed1 no prueba salud. No se forzaron pagos/reintentos proveedor.

## Transferencias de seguimiento — sin declarar PASS

| ID     | Receptor y responsable lógico                 | Estado/condición conservados                                                                                                                                                                            |
| ------ | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RL-F01 | 017.1-T9, seguridad Auth/Data API             | evidence-pending: inventario entrada directa/proxies; ensayo CF/XFF ausentes/privados/falsos y bucket efectivo; triage antes de protección general por IP                                               |
| RL-F02 | 016-V4, aceptación Cloud                      | evidence-pending: 503 limitador y500 posterior a admisión mediante inyección aislada autorizada, sin indisponibilidad global ni bypass desplegable                                                      |
| RL-F03 | 017.2-T6, datos/permisos                      | decision-pending: matriz consumidores/grants accounts; conservar o reducir explícitamente; si reduce, migración+mirror y regresión por runner atestado; no usar negativas locales49 como baseline Cloud |
| RL-F04 | 016-V4, identidad de red                      | evidence-pending: correlación de origen independiente cuando se renueve evidencia o cambie hosting/proxy; sin exponer IPs/contratar servicios                                                           |
| RL-F05 | Matriz011 por integración, coordinación016-V4 | evidence-pending: conservar escenarios propios MP/callbacks y protocolos de cada servicio; smoke genérico no certifica pagos/correo/analytics                                                           |
| RL-F06 | Runbook V4, operación WAF                     | evidence-pending: retomar ante cambio hosts/deployment/secreto/reglas; revisar OR/hosts, autenticación y negativas; sin ampliar cuota ni desactivar WAF                                                 |

Las condiciones completas originales permanecen en el
[registro012.3](2026-10-14-plan-012-3-follow-ups.md). No se cambia ningún ID a
corrected por transferirlo. Una reproducción que confirme P0/P1 de superficie
ofrecida bloquea la entrega y exige reparación antes de usuarios reales.

## Orden siguiente y agrupación

1. **Triage acotado seguridad017.1-T9/017.2-T6**, antes de reparaciones P2:
   verificar RL-F01/F03 y decidir riesgo/consumidores; no repetir el núcleo017
   ya aceptado. Si revela P1, corregir primero con regresión.
2. **014-T2/T3** como bloque pequeño: orígenes de imágenes y auditoría global.
   Conservar una tarea/PR por corrección según su contrato. Puede coordinarse
   con el lote web017.5, sin fusionar IDs ni ampliar su alcance.
3. **Resto017 ofrecido**, por subsistema: privacidad/identidad y web/fixtures;
   cerrar evidencias/disposiciones y no volver a implementar corrected-local.
4. **015**, configuración/composición y prueba de reutilización: instalación
   independiente, marca, una extensión neutral y actualización conservando
   datos/personalización. Coordinar checks comunes con017 sin duplicar catálogo.
5. **016-T2/T3**, revisión final independiente y gate integrado después del
   último cambio015. T0/T1 históricos cerrados no significan que016 esté completo.

015 y016 tienen resultados diferentes y se conservan separados. 014 tiene
reparaciones concretas y puede cerrar antes;017 conserva tareas técnicas y
decisiones pendientes. Robot/editor siguen diferidos con exclusión vigente.
No se ejecutaron aquí nuevas reparaciones014/015/017 ni la aceptación016.

## Reglas, revisión y validación

Revisión independiente de migraciones y disposición RL realizada antes de
aplicar/documentar. Las ocho reglas locales mantienen TS/import type, JS
asíncrono, RSC, SQL/ACL, pruebas observables y contratos; Realtime no cambia.
Excepciones: env.ts, cacheComponents=false, tokens Iroko frente a Material3 y
migraciones manuales+mirror en Windows. No se creó migración nueva.

El primer check Documentation del PR falló por formato de seis Markdown: se
usó la configuración CI `.prettierignore-docs`, sin relajar reglas. Los hooks
normales no formateaban esos documentos con el ignore general; no se atribuye
el PASS local del checker de enlaces a formato CI.

Los resultados finales de CI y el estado de merge están enlazados enPR241.
No fusionar con checks fallidos, no usar admin/bypass ni force push. El retorno
a main debe verificar igualdad con origin/main y preservar todo material local
ignorado y otros proyectos.

El primer E2E de CI aprobó la suite general y0124, pero017 quedó7 aprobados/1
fallido en analytics durante impersonación (expect visible). El reporte HTML
publicado no contenía el detalle del runner confinado. Se añadió artifact de
fallo con solo `e2e-results.json` y `owned-next-server-diagnostics.json` de017;
son resultados sanitizados de specs fijas, no reportes crudos. `safeTestFailure`
acepta ahora únicamente la ubicación adicional fija fixtures/platform-admin.ts
y línea/columna. RED reproducido para ubicación perdida; GREEN28/28 de los
tests del runner017, con revisión independiente de privacidad. No cambian
guards, tiempos, assertions, cobertura ni comportamiento de producto.

La reproducción local webpack identificó el fallo antes de la comprobación de
analítica: fixture platform-admin.ts105 esperaba el heading Cuentas, pero la
página mostraba Runtime Error de Next16.4.2, «Manifest file is empty». La fuente
instalada load-manifest.external.js lanza ese error al leer un manifiesto vacío;
no es prueba de un envío de analytics durante impersonación. Se propagó la
selección de compiler al servidor aislado y017 pasa a Turbopack, compilador
habitual del proyecto. RED de argumentos: la selección turbopack seguía
produciendo --webpack; GREEN conserva defaults0124, loopback y rechazo de
valores arbitrarios. Se registra compiler en evidencia; mismos escenarios,
assertions y guards. La aceptación real requiere el resultado posterior del
runner/CI, no se infiere del test de argumentos.

La segunda corrida CI (c3000e9) aprobó Documentation, calidad/unit/SQL/seguridad
y WebKit, pero el E2E general quedó86 aprobados/2 skips/1 fallo. Falló
team.spec.ts171 antes de la eliminación: getByText coincidía con dos copias
DOM del mismo correo, una oculta, y Playwright rechazó la ambigüedad incluso
en sus retries. No llegó al bloque017; su cambio de compilador no se considera
aceptado por esta corrida. Se acotó el locator a elementos visibles, exigiendo
uno antes y cero después de confirmar la eliminación, con presupuestos iguales.
Un experimento browser sin servicios reprodujo el strict-mode original y
comprobó la selección visible; el recorrido real sigue dependiendo del CI.

La corrida3fef5c7 superó E2E general y CSP;017 quedó7/8,0 skips/flaky. El
diagnóstico nuevo ubicó timeout en analytics.spec.ts398: login/MFA/listado
pasaron y el clic Ver como retornó, pero no apareció el input del diálogo.
La reproducción local Turbopack mostró página administrativa normal con botón
enfocado y diálogo cerrado, sin overlay de manifiesto. Esto no demuestra la
causa exacta del fallo CI ni fallo de autorización/inicio de impersonación.

Ruling de método:017 usa ahora runtime production y compilador Turbopack,
ambos ya soportados por runLocalValidation. El build completo precede a los
mismos ocho casos; guards, SDK sintético, sumideros, cero retries/skips/flaky y
acceptance exacta permanecen. Los presupuestos base de producción son más
estrictos que los de compilación development. Revisión independiente del
método sin bloqueantes. Un PASS acepta los escenarios del producto en ese
runtime; no certifica reparación de HMR/hidratación de desarrollo. Costo:
build adicional y límites del entorno development conservados explícitamente.

La reproducción local Turbopack finalizó6/7, mismo timeout del diálogo, sin
skips/flaky; runtime detenido, usuarios propios0 y guard SQL ausente. Las
pruebas de infraestructura del método permanecen63/63. Un intento dentro del
sandbox falló por EACCES de loopback/EPERM de junction; repetición autorizada
fuera del sandbox pasó63/63, sin modificar los guards ni atribuir el rechazo
del sistema a un fallo del producto.

Reproducción webpack final:5/7 aprobados,2 fallidos,0 skips/flaky; segundo caso
Auth URL agotó su presupuesto después del error de manifiesto. Runtime detenido
y cleanup del runner completado. No se contabiliza como aceptación. Tras el
cambio de selección, `node --test scripts/run-plan-0124-local.test.mjs
scripts/__tests__/run-plan-017-local.test.mjs` aprobó63/63; conserva pruebas de
confinamiento, defaults y lifecycle. La siguiente corrida CI valida el recorrido.
