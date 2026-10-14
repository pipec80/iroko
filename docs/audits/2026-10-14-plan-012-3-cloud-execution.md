# Plan 012.3 — Aplicación Cloud y aceptación de hosting

Fecha: 2026-10-14. Estado: alcance operativo Cloud 012.3 aceptado. Migraciones
aplicadas, WAF acotado publicado, candidato y dominio estable aceptados por
HTTPS público sin bypass. Integración documental final en curso; sin push ni merge.
Plan: [012.3](../exec-plans/active/012-3-rate-limiting.md).
Baseline aceptado: [ejecución local](2026-10-13-plan-012-3-local-execution.md).

## Autorización, destino y alcance

El usuario solicitó terminar la etapa Cloud de 012.3, verificar CLI Windows,
MCP y Supabase y trabajar con agentes en paralelo. El coordinador ejecuta las
mutaciones autorizadas; este registro separa intención, evidencia y resultados.
No se requieren instalaciones ni push o merge.

- Supabase esperado: `rgrxlygtmvavqzkjyywg`.
- Dominio esperado: `project-a89lv.vercel.app`.
- Baseline comunicado por el coordinador tras consulta autenticada:
  Supabase ACTIVE_HEALTHY, PostgreSQL 17.6.1.141, región us-east-2,
  ledger 163 y máximo 20261013143645; deployment anterior
  `dpl_4SXbR25CKn6VpdTzxm95LvvaGKQt` READY conserva el alias de pruebas.
- Herramientas comprobadas por el coordinador: Supabase CLI 2.110.0, psql 18.4,
  Vercel CLI 59.15.1 autenticado y stack Docker oficial con diez servicios activos.
- Dry-run de las tres migraciones: PASS comunicado por el coordinador; no
  equivale a aplicación ni aceptación del deployment.
- Verificación histórica local: ledger 166, 999 assertions SQL y 1.281 unitarios.
  Es evidencia anterior, no una ejecución Cloud de estas pruebas.

Migraciones aplicadas por el coordinador mediante CLI, en este orden:

1. `20261013210434_account_api_hook_rate_limit_contract.sql`.
2. `20261013210436_account_api_durable_admission.sql`.
3. `20261014012941_account_api_summary_columns.sql`.

La DB debe admitir la RPC antes de promover código que depende de ella. No
reescribir migraciones aplicadas. Si aparece historia remota inesperada,
detener la aplicación y reconciliar antes de continuar.

## Matriz de comprobaciones

| Capa | Evidencia requerida | Estado actual |
| --- | --- | --- |
| Herramientas | Resolución CLI/versiones, autenticación y permisos actuales, MCP estructurado | PASS comunicado por coordinador |
| Preflight SQL | Identidad verificada externamente, ledger, hook, mantenimiento, fingerprints | PASS, baseline 163 y snapshot privado |
| Aplicación SQL | Tres versiones exactas, resultado por migración, ledger esperado 166 | PASS, exit 0; ledger 166 y máximo 20261014012941 |
| Postflight SQL | Fuentes, ACL/RLS/índices, columnas SELECT y cron | PASS con drift preexistente de grants de cuentas, descrito abajo |
| PostgREST Cloud | RPC accesible solo al backend y decisiones durables | Siete comprobaciones PASS, exit 0; no equivale a comprobar todos los métodos de la excepción del hook en Cloud |
| Hosting | Build, revisión exacta, configuración, identidad IP canónica, ausencia de modo local | Build Turbopack, TypeScript y sitemap PASS, 45 s; READY. Bucket canónico observado mediante CLI |
| Endpoint | 200 aislado, 401, última plaza →429, Retry-After y presupuestos compartidos | Cinco comprobaciones PASS CLI, cinco PASS HTTPS público del candidato y cinco PASS HTTPS público estable |
| Abuso y concurrencia | IP 300/301, claves múltiples, última plaza concurrente y ventana móvil | RPC PASS; endpoint ocho concurrentes: un 200 y siete 429 |
| Regresiones | Conservación de configuración, fuentes y protecciones previas | Comparaciones SQL/WAF aprobadas y cero deliveries; no se renovó funcionalmente cada callback/worker/billing Cloud |
| Limpieza | Fixtures propios retirados, sin borrar buckets compartidos | RPC: cero cuentas/claves/eventos/counters. Deployment: cero cuentas/claves/eventos de cuenta; eventos IP reales preservados para TTL |

Scripts de lectura preparados:
[preflight](../../scripts/sql/0123-cloud-preflight.sql) y
[postflight](../../scripts/sql/0123-cloud-postflight.sql).
Usan un único resultado JSON, transacción READ ONLY y timeout 15 s; no emiten claves, cuerpos de funciones,
comandos cron ni contenido Vault. Un nombre de DB no acredita el proyecto:
comprobar primero el destino mediante metadata autenticada del proveedor.

El postflight compara el fingerprint previo del comando cron quitando solo la
sentencia añadida por la migración; confirmar también jobid, horario y estado.
La admisión debe quedar ejecutable por service_role y denegada a
anon/authenticated/PUBLIC; el cleanup, exclusivamente al propietario. Las dos
tablas de eventos mantienen RLS y ningún grant directo cliente/backend.
La migración añade únicamente SELECT de id/name/slug/type. Esto describe su
delta, no los permisos efectivos Cloud: el preflight encontró CRUD amplio
preexistente de service_role sobre accounts y el rollout lo preservó.
El local aceptado usa lectura acotada por columnas; por tanto existe drift y
no se afirma paridad de privilegios mínimos ni se ejecutan en Cloud las
assertions negativas del test49 que suponen ausencia de permisos más amplios.
Revisar ese drift en un cambio acotado posterior requiere inventariar sus
consumidores; no revocar permisos heredados dentro de esta aplicación 012.3.

Validación de estos scripts en el stack local desde este agente: bloqueada por
permisos sandbox de Docker (`npipe/docker_engine`), sin ejecución SQL. Pendiente
la comprobación por el coordinador con acceso autorizado. No contar como PASS.

## Aplicación y deployment observados

Resultados comunicados por el coordinador desde las ejecuciones reales:

- `supabase db push --linked --yes`: aplicación de las tres migraciones exactas,
  exit 0. Ledger Cloud 166,
  última versión 20261014012941.
- RPC: EXECUTE solo service_role, sin PUBLIC/anon/authenticated. Tablas de
  eventos: RLS activo, cero políticas y cero grants directos clientes/backend.
  Tres índices válidos por tabla. Cleanup privado denegado a roles API.
- Cron de limpieza conserva jobid 7, propietario postgres, activo y cada cinco
  minutos. Fingerprint de su comando previo: `45b99eda8e192aa83deb24282e732459`;
  el postflight recuperó ese mismo fingerprint al quitar solo el cleanup nuevo.
  Fingerprint nuevo comienza por `84bca`.
- Fingerprints de fuentes Cloud reportados con prefijos `85ee9d` para hook,
  `ea59b` para admisión y `77688` para cleanup. Los prefijos identifican la
  observación; el coordinador confirmó igualdad local/Cloud de las tres fuentes
  comparando sus fingerprints completos.
- Advisors de seguridad: antes 59 WARN / 4 INFO; después 59 WARN / 6 INFO. Los dos INFO
  adicionales corresponden a RLS sin políticas en las tablas privadas nuevas,
  con acceso directo denegado. No aumentaron los WARN. Conservar clasificación;
  no crear políticas de acceso solo para silenciar esos avisos.
- Candidato de despliegue: `dpl_4AK3JX5bMMkgtavTnteEnr77Fcoe`, READY, en
  [URL inmutable](https://iroko-p4u6wjxq9-pipec80-labs.vercel.app). Build
  Turbopack, TypeScript y postbuild sitemap PASS en 45 s. Candidato revisado con
  986 archivos, 98.421 líneas y overlays; source-set SHA256
  `59c93a50c8b533e680be0a30bcfb83c3079e76c9a65c66a03d41511dd3aa4442`.
  Selección unitaria del candidato: 56 pruebas PASS comunicadas.

Comando: `vercel deploy .superpowers/0123-cloud/candidate --prod --skip-domain --yes --no-color`.
El deploy usó `--skip-domain`, pero el CLI reportó automáticamente el alias
predeterminado `iroko-pipec80-labs`. No afirmar ausencia global de efectos en
aliases. La comprobación posterior del coordinador confirmó que el dominio
estable `project-a89lv.vercel.app` todavía apuntaba al deployment anterior 012.2
antes de la promoción posterior registrada abajo. Su promoción se ejecutó
después de aceptar el candidato, no solamente por estar READY.

## Ensayos Cloud acotados

Los harness versionados `test-check-request-local.mjs` y
`test-account-api-local.mjs` rechazan destinos remotos deliberadamente. No se
debe quitar ese guard ni presentarlos como ejecutados en Cloud. Un ensayo Cloud
separado debe fijar proyecto/origen exactos, rechazar redirects y mantener
credenciales solamente en memoria.

Se preparó el harness separado `scripts/test-account-api-cloud.mjs`, con guard
`--execute`, ref enlazada exacta y origen HTTPS fijado, sin overrides ni redirects.
CLI/API keys permanecen capturados en memoria, errores sanitizados y cleanup
en finally limitado a fixtures propios. Node syntax check PASS; invocarlo sin
`--execute` rechaza antes de red. Revisión independiente aprobada; ejecución
Cloud completa por el coordinador: siete comprobaciones PASS, exit 0; cleanup
confirma cero cuentas, claves, eventos y counters fixture.
Este harness cubre RPC/PostgREST, no identidad canónica ni endpoint Vercel.

Para SQL/PostgREST, usar dos cuentas UUID y claves aleatorias exclusivas de la
ejecución, hashes nuevos y direcciones sintéticas de documentación que no
existan en eventos/counters. Registrar solo conteos y estados. Verificar:

- ACL por rol; la excepción no se extiende a otra RPC, otro método ni rol.
- Cuenta 100/101 con dos claves, rotación, revocación/expiración y otra cuenta.
- IP 300/301 antes de verificar credenciales; rechazos sin ampliar su ventana.
- Ocho peticiones concurrentes por la última plaza IP y cuenta: una admisión.
- Reloj PostgreSQL y expiración 300 s, sin modificar reloj del servidor.
- Reserva conservada frente a lectura posterior fallida, en transacción aparte.

Una IP sintética enviada como argumento RPC prueba el algoritmo, no confianza
de headers. Para el hook Cloud, el borde puede sobrescribir headers sintéticos;
no atribuir a fixtures una prueba cuyo contador real pertenece a otro bucket.
El RED/GREEN del parser y carrera del hook ya tiene evidencia local; distinguir
esa evidencia de cualquier smoke Cloud.

Para Vercel, comprobar URL inmutable del deployment antes del alias. Realizar
GET account desde el borde con una clave fixture, comprobar campos y aislamiento,
credenciales ausentes/incorrectas 401 y cuenta 101 → 429 con Retry-After entre 1 y 300.
Comparar el bucket efectivo en DB frente a intentos de falsificar
CF/XFF/x-vercel-forwarded-for: el cliente no debe escoger identidad. Una cabecera
reflejada sin correlación con el bucket no acredita confianza. No consumir 300
solicitudes sobre una IP compartida sin aislar antes el alcance del ensayo.

`scripts/test-account-api-deployment.mjs` completó cinco comprobaciones mediante
`vercel curl` oficial: dos cuentas con 200 y campos propios, credenciales
ausentes/inválidas 401 consumiendo IP, bucket canónico resistente a headers
falsificados simples y listas, ocho solicitudes concurrentes por la última
plaza (un 200, siete 429 con Retry-After) y cuenta independiente funcional tras
agotar la primera. La concurrencia usa una fixture precargada con 99 admisiones;
no describirla como 101 peticiones sucesivas a Next. Cleanup confirma cero cuentas,
claves y eventos de cuenta propios.

El transporte público HTTPS sin bypass devolvió 429 HTML de Vercel Security
Checkpoint; el transporte CLI devolvió401 JSON de la aplicación. Son respuestas
de capas distintas: el HTML del WAF no acredita429 del limitador ni permite
cerrar aceptación pública. Se preparó una regla acotada a GET y ruta exacta
`/api/v1/account` en dos hosts revisados; nueve comprobaciones locales de alcance PASS (dos positivas y siete negativas).
El usuario autorizó explícitamente publicar esa regla y promover el dominio
estable al candidato indicado. El primer intento del helper de publicación
falló; readback conservó versión 5, draft null y las tres reglas anteriores,
sin cambio verificado. El coordinador diagnostica un único reintento de la
misma regla autorizada; no ampliar el alcance durante esa recuperación.

El diagnóstico del CLI confirmó HTTP 400 `Number of rules exceeds limit: 3`:
no puede añadirse una cuarta regla. La misma política autorizada se representa
añadiendo dos grupos OR a la tercera regla existente
`rule_012_2_authenticated_outbound_webhook_worker_yG3nTl`. Se conservan completos
el branch previo del worker, su secreto, nombre y acción, y las dos primeras
reglas; siguen siendo tres reglas. Los grupos nuevos mantienen exactamente los
dos hosts, GET y `/api/v1/account` autorizados. SHA256 de los grupos añadidos:
`040b1aa6305dbd78da09f5242804b42a7fcdf6dc8f48293cd8c5664086417956`.
El helper valida payload y readback; entrega el secreto por stdin capturado,
nunca como argumento de proceso. La revisión automática admitió esa ejecución.
Aplicación y publicación de esta representación: PASS, exit 0 comunicado por
el coordinador; readback versión 6, draft null y tres reglas. Comparación completa
preservó el branch original y metadata/acción de la tercera regla, las otras
dos reglas y las demás protecciones. Los dos branches añadidos conservan el
SHA256 autorizado. La ejecución pública completa posterior del candidato aprobó
cinco comprobaciones, exit 0, sin bypass: 200 por cuenta, 401, correlación del
bucket canónico frente a spoof, última plaza concurrente con un 200/siete 429 y
Retry-After, y aislamiento de otra cuenta. Cleanuptrue, cuentas fixture cero.
El log privado de la ejecución es `.superpowers/0123-cloud/public-candidate.log`;
no versionar credenciales ni material privado.

Promoción autorizada mediante
`vercel alias set iroko-p4u6wjxq9-pipec80-labs.vercel.app project-a89lv.vercel.app --scope pipec80-labs --no-color`:
PASS, exit 0. Consulta MCP posterior confirmó el alias apuntando a
`dpl_4AK3JX5bMMkgtavTnteEnr77Fcoe`. La repetición de las mismas cinco pruebas
públicas sobre el dominio estable aprobó cinco checks, exit 0, HTTPS real sin
bypass. Log privado: `.superpowers/0123-cloud/public-stable.log`.

La comprobación IP correlaciona eventos DB con solicitudes controladas y
confirma resistencia al spoof ensayado. No hubo verificación independiente de
la IP externa contra una segunda fuente; no afirmar esa certeza adicional.
La confianza de los headers heredados CF/XFF del hook SQL permanece
**[NO VERIFICADO]** en Cloud, separada de la identidad Vercel del endpoint.

En un ensayo anterior a la publicación WAF definitiva, una preflight `--public`
obtuvo 401 JSON, pero el ensayo público
completo falló con respuesta no JSON en el primer identityProbe. Resultado:
cero checks completos, cuentas fixture retiradas (dos creadas, cero restantes),
sin aceptación pública. Un bug del reporte marcaba el transporte público como
aceptado antes de completar la ejecución; el coordinador lo corrigió para usar
un flag de finalización y reportar no aceptación al fallar. No atribuir PASS
a ese reporte anterior. Las cinco comprobaciones previas mediante CLI oficial
siguen siendo evidencia válida de ese transporte, no del público.

No forzar indisponibilidad de Supabase ni retirar grants para provocar 503/500
del deployment. Si no se inyectan esos fallos de forma aislada, conservar su
aceptación unitaria/local y marcar la provocación Cloud **[NO VERIFICADO]**.

## Limpieza y recuperación

Los finally retiran claves, cuentas y eventos de cuenta fixture. La prueba RPC
puede limpiar sus IPs sintéticas exclusivas después del preflight de ausencia.
La prueba deployment usa una IP real compartida: conserva sus eventos IP para
expiración natural de 300 segundos y mantenimiento; no purga el bucket ni intenta
atribuir con certeza IDs de eventos mediante una diferencia concurrente de
snapshots. No afirmar cero eventos globales como criterio de limpieza. No se
crearon entregas webhook ni leases en estos ensayos.

Si falla el deployment, conservar el anterior y revisar logs sin secretos. Si
ya se promovió, restaurar el alias anterior conocido y registrar ambos IDs.
Mantener las migraciones nuevas: borrar cuotas o funciones mientras existen
consumidores desplegados no es una recuperación segura. Cualquier corrección
SQL requiere migración posterior revisada.

## Resultado y siguiente paso

Alcance operativo Cloud 012.3 aceptado: RPC siete checks PASS; endpoint cinco
checks PASS mediante CLI, cinco PASS en candidato público y cinco PASS en
dominio estable público, ambos sin bypass. Las repeticiones públicas verifican
los mismos cinco escenarios; no son quince escenarios distintos. Alias estable
confirmado por MCP al deployment autorizado.

Comprobación final MCP: Supabase ACTIVE_HEALTHY, ledger 166 con última versión
20261014012941; cero cuentas fixture `0123-%`, cero claves fixture
`0123 Deployment`, cero eventos de cuenta huérfanos y cero webhook deliveries.
La última ejecución del cron de cleanup7, 15:20 UTC, terminó succeeded. Los
eventos IP reales conservan TTL; estos ceros no afirman ausencia de actividad
normal ni purga de buckets compartidos. Revisión independiente sin bloqueadores,
condicionada a consistencia documental tras el PASS estable incorporado aquí.

Consulta MCP de runtime logs del deployment nuevo, niveles error/fatal, ventana
de 30 minutos: cero grupos devueltos (`No errors returned`). La consulta inicial
de una hora falló 400 por retención del plan Hobby; la repetición válida de 30
minutos aprobó. Esta observación acotada no acredita ausencia global de errores,
monitorización completa ni aceptación de Sentry fuera de este despliegue.

Límites que permanecen **[NO VERIFICADO]**: provocación 503/500 a través de Next
Cloud; confianza operativa CF/XFF heredada del hook SQL; IP externa contrastada
contra una fuente independiente; renovación funcional de todos los proveedores
y callbacks. Se mantiene como seguimiento el drift preexistente de grants
service_role/accounts, sin falsa afirmación de mínimo privilegio Cloud.
Estos límites no invalidan el alcance de admisión/API aceptado ni se declaran
resueltos por los checks anteriores.

Checks de cierre: `supabase db push --linked --dry-run` devolvió
`upToDate: true`, cero migraciones, seeds y roles pendientes. `pnpm lint`
terminó con exit 0, cero errores y cuatro warnings preexistentes de non-null
assertion en el E2E de Mercado Pago. Ambos harness aprobaron `node --check`;
formato focalizado, `node scripts/check-docs.mjs` (143 Markdown) y
`git diff --check` completan la verificación documental.

La integración local de esta evidencia y sus harness quedó registrada en el
commit `54dba97`. Push y merge pendientes. La
[tabla de seguimientos](2026-10-14-plan-012-3-follow-ups.md) reúne lo no ejecutado,
las diferencias heredadas y los criterios para retomarlos.
Siguiente paso recomendado: concretar el plan ejecutable 012.4 desde el alcance
documentado del Plan 012, con inventario actual de CSP, secretos y consumidores.
