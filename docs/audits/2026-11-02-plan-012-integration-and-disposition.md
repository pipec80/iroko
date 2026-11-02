# Plan 012 — integración, sincronización y disposición,2026-11-02

El mantenedor autorizó publicar/fusionar la rama012.5, sincronizar Supabase
local/Cloud, volver a main y reorganizar el trabajo pendiente. No pidió resetear
datos, instalar herramientas, pagar servicios ni reactivar Robot/editor.
Integración publicada: [PR241](https://github.com/pipec80/iroko/pull/241);
consultar su estado y checks en GitHub antes de atribuir el merge a un SHA.
Implementación pricing `436228963bf87a073040fbdc2f644c348ee9c40b`.

## Veredicto por alcance

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

Reproducción webpack final:5/7 aprobados,2 fallidos,0 skips/flaky; segundo caso
Auth URL agotó su presupuesto después del error de manifiesto. Runtime detenido
y cleanup del runner completado. No se contabiliza como aceptación. Tras el
cambio de selección, `node --test scripts/run-plan-0124-local.test.mjs
scripts/__tests__/run-plan-017-local.test.mjs` aprobó63/63; conserva pruebas de
confinamiento, defaults y lifecycle. La siguiente corrida CI valida el recorrido.
