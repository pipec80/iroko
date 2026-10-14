# Plan 012.3 — Rate limiting e integración selectiva

Estado: implementación, aceptación local e integración de código aprobadas;
migraciones Cloud aplicadas y candidato READY. RPC y endpoint mediante CLI
aprobados; WAF publicado, candidato público aceptado y alias estable promovido.
Repetición pública estable aprobada; alcance operativo Cloud 012.3 aceptado.
Evidencia y harness Cloud integrados en el commit local `54dba97`; push/merge pendientes.
Plan padre: [012](012-security-hardening-and-pricing-truth.md).

## Contrato aprobado

- API cuenta: 100 admisiones en cualquier ventana móvil de 300 segundos,
  compartidas por todas las claves de una cuenta.
- Protección previa IP: 300 admisiones en 300 segundos, incluyendo claves
  ausentes/inválidas. Sin servicios ni dependencias nuevos.
- RPC `admit_account_api_request(p_client_ip inet, p_key_hash text default null)`
  exclusiva de service_role; deriva cuenta de la clave y devuelve decisión,
  account_id y retry_after_seconds. Eventos privados, locks IP → cuenta y reloj
  PostgreSQL después del lock. Rechazos por cuota no añaden eventos al presupuesto que los rechaza; un rechazo por cuenta conserva la admisión IP previa.
- 401 solo para credenciales rechazadas positivamente, 429 con Retry-After por
  cuota, 503 por indisponibilidad/identidad no confiable, 500 por lectura posterior.
- Vercel: header canónico validado; local explícito: bucket compartido sin
  confiar en headers entrantes. Sin bypass desplegable de pruebas.
- Hook: corregir headers de error y serializar por IP; preservar semántica de
  rollback. Excepción exacta POST/RPC/service_role verificado, no exención global.
- Migraciones nuevas, espejos simultáneos; no reescribir historia aplicada.
- Etapa local original: sin instalaciones, Cloud, deploy, push ni merge.
  La etapa Cloud autorizada posterior se registra abajo. Preservar cambios ajenos.

## Ownership y entregas

- [x] Baseline exacto del stack oficial, rama, índice y cambios pendientes.
- [x] Agente pruebas: harness HTTP local, 100/101, rollback, conexiones reales
  concurrentes y cleanup limitado a fixtures propios. Registrar RED antes del fix.
- [x] Agente SQL: hook y admisión en secuencia, espejos, pgTAP, ACL/RLS y
  mantenimiento indexado acotado, conservando tareas anteriores.
- [x] Agente TypeScript: resolución de IP, admisión tipada, endpoint y unitarios
  RED/GREEN; conservar verificación anterior para otros consumidores.
- [x] Coordinador: tipos locales, aceptación integrada, revisión independiente,
  documentación e integración Git selectiva.

## Gates de aceptación

- HTTP hook: 100 escrituras persistidas, 101 → 429 JSON correcto, ninguna
  mutación rechazada y contador estable; RED/GREEN del parser PostgREST.
- Cuenta100/101, IP300/301, claves múltiples/rotadas/revocadas/expiradas,
  aislamiento, ventana móvil sin doble ráfaga, errores y recuperación.
- Concurrencia real mismo minuto/frontera e IP/cuenta; reservas conservadas tras
  fallos posteriores y rollback del hook preservado.
- ACL cliente denegada, excepción exacta del hook y regresiones webhook/workers.
- Suite SQL completa, unitarios, typecheck, lint, formato focalizado, docs y diff.
  Build/E2E pertinentes con gate local; resultados incompletos NO VERIFICADO.
- Inventario actualizado, revisión semántica CSV, selección por hunks y commits
  locales coherentes. Excluir cachés Windows; sin git add global.

## Registro de ejecución

Baseline: rama `codex/014-t1-robot-permissions`, HEAD
`dfa228fb63e762a77beb291b828561d4547ed2e9`, 116 rutas pendientes, índice vacío.
Docker oficial renovado: once contenedores `saas-boilerplate` activos; DB54322,
API54321. Acceso bajo sandbox denegado, inspección autorizada fuera del sandbox
aprobada. No se creó otro entorno.

Ruling: usar agentes por ownership en el checkout actual, preservando las
fuentes pendientes; un checkout de HEAD omitiría los cambios ya aceptados.

La DB local pasó de 163 a 165 migraciones con `20261013210434` y
`20261013210436`. La segunda tuvo un fallo de parser CASE con rollback antes
de corregirse y aplicarse. Cloud y deployment permanecen fuera de esta etapa.

El ensayo Next.js real detectó un permiso SELECT previo faltante de
`service_role` sobre cuentas (42501). La salida500 se infirió de ACL/código;
el fallo del harness ocultó la respuesta y no se preservó su status HTTP. La nueva
migración `20261014012941` concede solo cuatro columnas requeridas y su espejo;
el destino local queda en 166. Test49: RED real42501 y GREEN7 assertions PASS.
No se reescribió historia aplicada; no se requirieron cambios de tipos.
SuiteSQL49/999 y E2E Next.js/Robot aprobados. El primer intento tuvo además un
fallo de limpieza del harness: se limpiaron exactamente sus dos cuentas y bucket
IP, se corrigió el finally y la repetición confirmó limpieza y servidor detenido.

RED real: solicitud101 devolvió 500/PGRST121; otro ensayo concurrente admitió
101 al cruzar minuto. GREEN: hook HTTP10 comprobaciones, admisión HTTP7 y
pgTAP48 archivos/992 assertions, todos aprobados. La lectura REST fallida
posterior preservó reservas; no equivale a aceptación del flujo Next completo.

Resultados, límites y pendientes en el
[registro local](../../audits/2026-10-13-plan-012-3-local-execution.md).
Las sesiones interrumpidas no cuentan como PASS. Nuevas verificaciones:
typecheck aprobado, lint sin errores y cuatro warnings previos, 142 documentos
aprobados, diff limpio y 947 comprobaciones semánticas CSV aprobadas; inventario
actualizado a 132 rutas. Unitarios renovados aprobados: 112 archivos y 1.281
pruebas, exit 0, con runner threads y un worker. El runner fork anterior se
canceló y no constituye aceptación. El build webpack aislado terminó con exit
0, incluyendo TypeScript y generación de páginas/rutas, antes de la corrección
SQL posterior. No se ejecutaron
Turbopack canónico ni postbuild de sitemap mediante pnpm; hosting/headers
canónicos siguen **[NO VERIFICADO]**. E2E local real aprobado: dos respuestas200
aisladas, credenciales ausentes/inválidas 401, spoof ignorado y cuenta101429 con
Retry-After válido; ChromiumRobot1PASS. El fallo500 posterior queda cubierto
por unitarios y frontera DB REST400, sin nueva provocación Next500 tras el fix.

Integración: trece unidades lógicas revisadas en nueve commits de
código y un commit documental final, agrupando destinos y enlaces para evitar
estados intermedios rotos. Los nueve commits de código están confirmados con
hooks y enumerados en el registro local; este documento forma parte de la
selección documental final. Limpieza manual: cero eventos IP/cuenta, cuentas y
usuarios fixture; ledger 166. La migración aplicada164 conserva su SHA256 y
bytes originales; el check de diff reconoce CRLF sin desactivar espacios reales.

Siguiente paso registrado al cierre local: confirmar el commit documental y preparar la etapa Cloud y
deployment autorizada por separado. Sin push, merge ni deploy en esta etapa;
la aceptación local no aplica estos cambios Cloud.

## Etapa Cloud — 2026-10-14

La etapa siguiente fue autorizada después del cierre local. Se aplicaron las
tres migraciones exactas mediante `supabase db push --linked --yes`, exit 0,
en `rgrxlygtmvavqzkjyywg`; ledger 166. Postflight confirmó igualdad de fuentes
local/Cloud del hook, admisión y cleanup; ACL/RLS/índices y mantenimiento
esperados. Los grants amplios anteriores de service_role sobre accounts en
Cloud se preservaron; no se afirma paridad de grants mínimos con el local ni
se ejecutan allí las assertions negativas del test49. Advisors sin nuevos WARN;
dos INFO nuevos por tablas privadas con RLS y sin políticas, acceso denegado.

La RPC Cloud aprobó siete comprobaciones y limpieza de cuentas, claves, eventos
y counters fixture. El candidato `dpl_4AK3JX5bMMkgtavTnteEnr77Fcoe` está READY;
build Turbopack, TypeScript y sitemap aprobados. Cinco comprobaciones mediante
CLI oficial de Vercel confirmaron 200 por cuenta, 401, identidad canónica resistente
a spoof y ocho solicitudes concurrentes por la última plaza con un 200/siete 429
y Retry-After; otra cuenta siguió funcionando. Cleanup retiró cuentas, claves y
eventos de cuenta; los eventos IP reales compartidos se conservan para TTL 300 s,
sin purgar el bucket ni atribuir IDs por una diferencia concurrente de snapshots.

El primer acceso HTTPS público sin bypass devolvió 429 HTML de Vercel Security
Checkpoint. No es prueba del 429 de aplicación. La excepción WAF propuesta
abarca solo GET, ruta exacta `/api/v1/account` y dos hosts revisados; nueve
comprobaciones locales de alcance aprobadas (dos positivas y siete negativas). Su publicación y la promoción del dominio
estable fueron autorizadas explícitamente. La primera publicación falló y el
readback conservó versión 5, draft null y tres reglas existentes, sin cambio
verificado. Una preflight pública obtuvo 401 JSON; el ensayo público completo
falló en el primer identityProbe no JSON, cero checks y dos cuentas fixture
retiradas. Se corrigió el reporte que marcaba aceptación pública antes de
completar el ensayo; esa ejecución no es PASS. En ese momento el alias estable
todavía servía 012.2; el CLI reportó un alias predeterminado del candidato pese a
`--skip-domain`, efecto registrado.

El diagnóstico identificó el límite de tres reglas WAF (HTTP 400): la misma
política autorizada se incorpora como dos grupos OR adicionales en la tercera
regla del worker, conservando íntegros su condición previa, secreto, nombre y
acción y las otras dos reglas. No se añade una cuarta regla ni se amplía la
ruta/método/hosts. Publicación posterior PASS, exit 0: readback versión 6,
draft null y tres reglas; comparación completa de los branches/metadata previos,
otras reglas y protecciones preservada. Los branches nuevos coinciden con el
fingerprint autorizado. La aceptación pública posterior se registra abajo;
publicación WAF por sí sola no equivale a aceptación pública de la API.

La repetición posterior pública del candidato aprobó cinco comprobaciones,
exit 0, sin bypass y cleanup true con cero cuentas fixture. El alias estable se
promovió al candidato autorizado mediante CLI y se verificó por MCP. La misma
suite pública sobre el dominio estable aprobó cinco comprobaciones, exit 0,
HTTPS sin bypass y cleanup de fixtures. La correlación de bucket
IP acredita resistencia al spoof ensayado, sin segunda fuente independiente de
IP externa. La confianza de headers CF/XFF heredados del hook SQL en Cloud
permanece **[NO VERIFICADO]**.

Alcance operativo Cloud 012.3 aceptado. Final MCP: ACTIVE_HEALTHY, ledger 166,
cero cuentas/claves fixture, cero eventos de cuenta huérfanos y cero deliveries;
cleanup cron 7 succeeded a 15:20 UTC. Revisión independiente sin bloqueadores con
consistencia documental tras el PASS estable. Quedan **[NO VERIFICADO]** los
fallos 503/500 provocados a través de Next Cloud y la confianza CF/XFF heredada;
el drift service_role/accounts se conserva como seguimiento separado.
No se renueva aceptación de todos los proveedores por esta ejecución.
Este cierre y sus harness se integraron en el commit local `54dba97`.
Los [seguimientos pendientes](../../audits/2026-10-14-plan-012-3-follow-ups.md)
registran qué no se ejecutó y los criterios para retomarlo.
Siguiente paso: concretar 012.4; push/merge pendientes.
Evidencia y límites en el [registro Cloud](../../audits/2026-10-14-plan-012-3-cloud-execution.md).
