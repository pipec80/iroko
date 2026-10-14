# Plan 012.3 — Rate limiting e integración selectiva

Estado: implementación, aceptación local e integración de código aprobadas;
cierre documental incluido en la selección final. Cloud no aplicado.
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
- Sin instalaciones, Cloud, deploy, push ni merge. Preservar cambios ajenos.

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
aisladas, credenciales ausentes/inválidas401, spoof ignorado y cuenta101429 con
Retry-After válido; ChromiumRobot1PASS. El fallo500 posterior queda cubierto
por unitarios y frontera DB REST400, sin nueva provocación Next500 tras el fix.

Integración: trece unidades lógicas revisadas en nueve commits de
código y un commit documental final, agrupando destinos y enlaces para evitar
estados intermedios rotos. Los nueve commits de código están confirmados con
hooks y enumerados en el registro local; este documento forma parte de la
selección documental final. Limpieza manual: cero eventos IP/cuenta, cuentas y
usuarios fixture; ledger166. La migración aplicada164 conserva su SHA256 y
bytes originales; el check de diff reconoce CRLF sin desactivar espacios reales.

Siguiente paso: confirmar el commit documental y preparar la etapa Cloud y
deployment autorizada por separado. Sin push, merge ni deploy en esta etapa;
la aceptación local no aplica estos cambios Cloud.
