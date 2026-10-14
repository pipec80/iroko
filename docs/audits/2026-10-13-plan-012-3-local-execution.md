# Plan 012.3 — Ejecución local y límites de aceptación

Fecha: 2026-10-13. Estado: implementación, aceptación local e integración de
código aprobadas; cierre documental incluido en la selección final.
Cloud pendiente de etapa autorizada.
Plan: [012.3](../exec-plans/active/012-3-rate-limiting.md).

## Destino y preservación

Baseline: rama `codex/014-t1-robot-permissions`, HEAD
`dfa228fb63e762a77beb291b828561d4547ed2e9`, 116 rutas pendientes e índice
vacío al iniciar. Los cambios existentes y las cachés Windows ajenas se
preservaron. No se creó otro entorno.

El destino fue el stack oficial `saas-boilerplate`: once contenedores activos,
API loopback 54321 y PostgreSQL 54322. Su baseline tenía 163 migraciones.
Se aplicaron únicamente en local:

- `20261013210434_account_api_hook_rate_limit_contract.sql`.
- `20261013210436_account_api_durable_admission.sql`.
- `20261014012941_account_api_summary_columns.sql` (corrección posterior al ensayo
  Next.js real).

El destino local alcanzó primero 165 y después 166 migraciones. La primera ejecución de la segunda
migración falló por un error de parser en una expresión CASE y se revirtió;
se corrigió antes de su aplicación exitosa. No se reescribieron migraciones
previamente aplicadas. Los espejos SQL y los tipos locales se actualizaron.

No hubo llamadas ni escrituras Cloud en esta ejecución. El último estado Cloud
observado anteriormente era 163 migraciones; no se renueva aquí esa observación
ni se modifica el deployment. Las cuotas nuevas todavía no están desplegadas.

El primer ensayo del endpoint Next.js real encontró un permiso previo faltante:
`service_role` no podía leer la cuenta (42501). Se infirió la salida500 del
endpoint a partir de esa ACL y del código, pero el fallo del harness ocultó la
respuesta y no se preservó su status HTTP. La tercera migración concede
únicamente SELECT de `id`, `name`, `slug` y
`type`, con espejo en `api-keys.sql`; no cambia tipos expuestos ni reescribe las
migraciones ya aplicadas. El test49 planeó siete assertions: RED ejecutó dos
aprobadas antes de abortar con 42501 en el SELECT real; GREEN aprobó las siete.
La revisión independiente de esta corrección fue aprobada. La repetición de la
suite SQL completa aprobó 49 archivos/999 assertions, exit 0. El ensayo Next.js
real y Chromium Robot también aprobó, con fixtures retirados y servidor detenido.

El primer intento también expuso un fallo del harness al detener el proceso,
que ocultó la respuesta y dejó dos cuentas propias y un bucket IP. Se limpiaron solo
esos identificadores, y se corrigieron el manejo de `signalCode` y el bloque
`finally` antes de repetir. No se atribuye aceptación a ese intento fallido.

## Hook: RED y GREEN observados

El harness `node scripts/test-check-request-local.mjs` restringe su destino a
loopback, rechaza redirects, usa credenciales locales en memoria y limpia sus
fixtures. La IP sintética permite probar el hook; no acredita headers de hosting.

RED HTTP real: tras 100 escrituras persistidas, la solicitud 101 devolvió
HTTP 500/PGRST121, en lugar de 429. El contador permaneció en 100 y la limpieza
se comprobó. Un ensayo concurrente anterior también admitió una solicitud 101
al cruzar un minuto, evidenciando la carrera entre buckets.

GREEN después de la migración: diez comprobaciones y limpieza aprobadas.
Se observaron 100 escrituras, solicitud 101 con HTTP 429 y cuerpo parseable,
ausencia de mutación rechazada, rollback del contador ante operación fallida,
concurrencia en el mismo minuto y en frontera de minuto, bloqueo entre
conexiones reales y aislamiento entre IPs.

La corrección usa un objeto para `detail.headers` y serializa por IP mediante
lock transaccional. Conserva el umbral y la semántica de rollback del hook.

## API cuenta: admisión durable

La nueva RPC `admit_account_api_request(inet,text)` solo admite `service_role`.
Deriva la cuenta de la clave y reserva en PostgreSQL antes de consultar la
cuenta. El presupuesto por IP es 300/300 segundos; el de cuenta, 100/300
segundos compartidos entre claves. La ventana es móvil y el orden de locks es
IP → cuenta. Las tablas privadas no conceden acceso directo al cliente.

La excepción del hook está limitada a POST, ruta exacta de esa RPC y rol
verificado. El mantenimiento conserva tareas anteriores y elimina como máximo
5.000 eventos vencidos por tabla y ejecución.

`node scripts/test-account-api-local.mjs`: siete comprobaciones y limpieza
aprobadas, incluyendo excepción HTTP exacta, IP300/301, cuenta100/101, ocho
solicitudes paralelas compitiendo por una plaza de cuenta, ocho por una plaza de
IP y expiración con reloj real de PostgreSQL. Una lectura REST real posterior
falló con HTTP 400/42703 y las reservas permanecieron confirmadas. Esto prueba
la frontera transaccional de la DB; no es una ejecución completa del fallo a
través del servidor Next.js.

El código del endpoint diferencia 401 confirmado, 429 con Retry-After, 503 por
admisión/identidad indisponible y 500 por lectura posterior. Valida estrictamente
las respuestas RPC y normaliza IP, incluyendo IPv4 representada como IPv6.
La identidad local explícita usa un bucket común e ignora headers arbitrarios.
La identidad alojada usa únicamente el header canónico de Vercel; su confianza
operativa sigue **[NO VERIFICADO]** hasta la etapa de hosting autorizada.

## Verificaciones y revisión

| Verificación | Resultado registrado |
| --- | --- |
| pgTAP completo, `pnpm supa:test` | 49 archivos / 999 assertions PASS, exit 0; duración 55 s |
| Test49, lectura real cuenta | RED 42501 tras dos assertions; GREEN siete assertions PASS |
| HTTP hook local | 10 comprobaciones y cleanup, PASS |
| HTTP admisión API local | 7 comprobaciones y cleanup, PASS |
| Unitarios focalizados TypeScript | Primera ejecución GREEN: 40 pruebas; cambios posteriores incluidos en la suite completa aprobada |
| Unitarios completos | 112 archivos / 1.281 pruebas PASS, exit 0; duración 549,08 s |
| `pnpm typecheck` | PASS en ejecución renovada, exit 0 |
| `pnpm lint` | Cero errores; cuatro warnings anteriores de Mercado Pago |
| Documentos y diff | 142 documentos aprobados; diff PASS con CRLF reconocido y controles de espacios activos |
| Matrices CSV e inventario | 947 comprobaciones semánticas aprobadas; inventario actualizado a 132 rutas |
| Build webpack aislado | PASS, exit 0; compilación, TypeScript y generación de páginas/rutas terminadas |
| E2E Next.js/Robot | HTTP real aprobado; Chromium Robot una prueba PASS; cleanup y detención del servidor confirmados |
| Limpieza final manual | Cero eventos IP, eventos cuenta, cuentas fixture y usuarios Auth fixture; ledger local166 |
| Cloud y hosting de 012.3 | **[NO VERIFICADO]**, fuera de esta etapa |

La revisión estática independiente previa no identificó bloqueadores en el
cambio acotado; no sustituye las verificaciones finales ni acredita hosting.

Comando unitario renovado:
`node node_modules/vitest/vitest.mjs run --maxWorkers=1 --pool=threads --reporter=verbose`.
La ejecución anterior con runner fork se canceló con resultado -1 por
estancamiento y no constituye aceptación; el PASS corresponde a la ejecución
posterior con threads.

El ensayo renovado del servidor Next.js observó dos respuestas 200 limitadas a
su cuenta, credenciales ausentes401, inválidas401, headers arbitrarios ignorados
y solicitud101 por cuenta429 con Retry-After válido, sin añadir evento de cuenta
rechazado. Chromium Robot aprobó una prueba: 32,2 s total, 20,2 s de test.
El harness confirmó limpieza de fixtures y detención de su servidor.
La persistencia frente a un fallo posterior se acredita por capas: error REST
real400/42703 con reservas conservadas y unitarios que esperan500 del endpoint.
No se provocó un nuevo fallo500 a través de Next.js después de corregir SELECT.

El archivo de tipos se normalizó a LF conservando el estilo existente: 86 líneas
añadidas y ninguna retirada respecto de HEAD; 78 pertenecen al trabajo previo
de 012.2 y ocho a la RPC nueva de 012.3. Se preserva esa distinción al integrar.

El intento de build en copia mediante pnpm fue rechazado con
`ERR_PNPM_UNSAFE_MODULES_DIR` antes de modificar dependencias. No se instaló nada.
Se continuó con el CLI Next ya instalado y `--webpack`, en copia aislada sin
variables Cloud. El build completo terminó con exit 0, incluyendo TypeScript
(2,2 minutos), páginas y rutas. Emitió warnings de dependencia dinámica
Sentry/OTel, sin errores. El snapshot contiene el código actual antes del
formato final; el build Turbopack canónico y el postbuild de sitemap mediante
pnpm no se ejecutaron. Este resultado no acredita hosting.

La migración aplicada `20261013210434` conserva sus bytes originales: SHA256
`1cb03d6052bcad3df837ffc3f91f12dedb75525b1917c51ee937cfedc92289e5`.
Para validar diffs sin confundir CRLF con espacios sobrantes se usa
`git -c core.whitespace=trailing-space,space-before-tab,cr-at-eol diff --check`;
los controles de espacios reales permanecen activos. No se reescribió SQL
aplicado para satisfacer formato.

## Integración y siguiente paso

Nueve commits locales de código confirmados con hooks:

| Commit | Unidad |
| --- | --- |
| `e718439` | ESLint y exclusión de scratch |
| `38278c9` | Gate local de aceptación |
| `d18acf2` | Robot |
| `b43fbff` | Grants mínimos |
| `0e45afd` | Webhook seguro |
| `af8fbbc` | Grants del contexto de validación |
| `feedbc0` | Diagnóstico CI sin secretos |
| `441e755` | Contrato HTTP y concurrencia del hook |
| `71ae75d` | Admisión API y corrección de lectura, ledger166 |

Se conservan trece unidades lógicas de revisión, agrupadas en estos nueve
commits de código y un commit documental final. Este registro se incluye en la
selección documental, cuya confirmación corresponde al coordinador. Los
documentos enlazados se integran juntos para evitar enlaces rotos intermedios.
Se revisaron hunks compartidos y matrices CSV.
Excluir `%SystemDrive%/`; no usar `git add .`. Sin instalaciones, push, merge
ni deploy.

Siguiente paso recomendado: confirmar el commit documental final y preparar
aplicación Cloud y deployment como etapa separada, con autorización explícita.
