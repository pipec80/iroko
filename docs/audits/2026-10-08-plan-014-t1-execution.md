# Plan 014 T1 — registro de ejecución

Plan: [014](../exec-plans/active/014-reference-surface-correctness.md).
Fecha: 2026-10-08. Rama: `codex/014-t1-robot-permissions`.
Base: `dfa228fb63e762a77beb291b828561d4547ed2e9`.
Estado: 014-T1 aceptado localmente; SQL, build webpack, E2E y checks finales aprobados.

## Propiedad y supervisión

| Frente       | Archivos / contrato                                                  | Estado                                                                   |
| ------------ | -------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Aplicación   | robot-config, página Robot, comentario appConfig y unitarios propios | Agente implementador; RED antes del guard, GREEN después                 |
| Datos        | migración aditiva, espejo public.sql y pgTAP Robot                   | Agente implementador; no aplicar a DB sin identificar destino desechable |
| Preflight    | toolchain y condiciones de unit/SQL/E2E                              | Agente de lectura; Docker inaccesible, Sentry gate pendiente             |
| Coordinación | documentación, evidencias, revisión independiente y checks comunes   | Agente principal                                                         |

No compartir ownership de fuentes entre agentes; preservar cambios de terceros.
No installs, Cloud, deploy, push, merge ni limpieza de recursos del mantenedor.

## Preflight y decisiones (primera implementación)

| Interfaces / tareas  | Contraste                                                                     | Decisión                                                                     |
| -------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Aplicación/SQL       | Flag gobierna disponibilidad; RPC/RLS deben verificar roles vivos             | Dos capas distintas; SQL no confía en UI/JWT antiguo                         |
| Tests/implementación | Plan requiere errores module_disabled/not_authorized, sin efectos en apagado  | Guard antes de crear cliente/parsear; test helper real con frontera RPC mock |
| SQL/espejo           | Historia aplicada no se reescribe; número43 y timestamp deben estar libres    | Migración nueva + espejo en el mismo cambio                                  |
| App/E2E              | E2E requiere usuario real y build/start; fixture selecciona primer contenedor | Preparar spec, no ejecutarlo sin target local identificado y gate Sentry     |

Ruling: reutilizar el checkout actual en una rama local acotada y preservar
los documentos de016-T1 — evita mover cambios pendientes. Coste si equivocado:
separación manual del diff; no hay push/commit automático.
Ruling: adaptar la coordinación Superpowers a PowerShell y registro versionado
por tarea, sin instalar herramientas ni scripts — fuentes tienen ownership
separada y revisión final. Coste si equivocado: trabajo adicional de trazabilidad.
Ruling: no declarar RED/GREEN SQL o E2E sin ejecución — Docker pipe ausente y
gate Sentry no disponible. Coste: aceptación014-T1 permanece abierta.

## Reglas locales y prácticas

Las ocho reglas se leen por consumidores; no se publican sus textos locales.
Aplican TS strict/import type, validación de entradas, roles vivos y contratos de
fallo; SQL search_path/grants/RLS por operación, pruebas negativas con controles
positivos. Excepciones conocidas: env.js antiguo frente env.ts; use cache sin
Cache Components; M3 frente Iroko; recetas SQL/Realtime no se copian sin contraste;
CREATE OR REPLACE no regranta PUBLIC universalmente. No se introducen cambios
Realtime, memoización manual ni nueva arquitectura.

## Evidencia pendiente

Registrar resultados RED/GREEN focalizados, revisión del diff, typecheck/lint,
formato y checks de documentos. SQL/E2E/Cloud separados como [NO VERIFICADO]
hasta ejecutar en entorno autorizado. No confundir código implementado con
migración aplicada ni cierre del plan.

## Resultados de implementación local (antes de runtime)

- Aplicación: flag al inicio de página y acciones; lectura con membresía viva;
  escritura owner/admin/member mediante el helper existente. Viewer, membresía
  revocada y claim obsoleto tienen regresiones unitarias.
- SQL: migración `20261008120000_robot_reference_rbac.sql` y espejo simultáneo;
  RPC null-safe con rol vivo y políticas originales modificadas por operación.
  DELETE de dominio solo owner; limpieza Storage permitida a roles editores.
- pgTAP: fixture transaccional con 240 aserciones contadas estáticamente; ocho
  actores, aislamiento de cuentas, WITH CHECK y ACL. No ejecutado contra DB.
- E2E: spec de URL directa y reload con fixture autenticado existente;
  comprueba not-found traducido y ausencia de controles Robot. No ejecutado.

## Verificación registrada (primera implementación)

| Comando / contraste                                                                             | Resultado                                       | Alcance                                                                      |
| ----------------------------------------------------------------------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------- |
| `pnpm test src/lib/__tests__/robot-config.test.ts "dashboard/robot/__tests__"` antes del cambio | RED: 10 fallos esperados, 22 aprobados          | Reporte del implementador; mock incompleto corregido antes de RED definitivo |
| Mismo comando tras el cambio                                                                    | GREEN: 2 archivos, 32 pruebas aprobadas, exit 0 | Ejecución local del implementador                                            |
| Migración frente a espejo                                                                       | RPC y bloque de políticas idénticos             | Comparación estática del implementador                                       |
| pgTAP                                                                                           | GREEN: 240 aserciones sin fallos                | DB desechable identificada; ver resultados SQL posteriores                   |
| Build / Playwright / Cloud                                                                      | [NO VERIFICADO]                                 | Gate Sentry y aislamiento del entorno pendientes; ninguna escritura Cloud    |

Revisión independiente aprobada estáticamente. Verificación integrada del coordinador: No regenerar tipos: no
cambian tablas, columnas ni firmas expuestas. T2 y T3 no se implementan en este
lote. El flag de aplicación no revoca el acceso SQL autorizado por sí mismo.

| Comando actual del coordinador                                                 | Resultado                                                                                                                                  |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm test src/lib/__tests__/robot-config.test.ts "dashboard/robot/__tests__"` | exit 0; 2 archivos/32 pruebas aprobadas; duración 6.08 s                                                                                   |
| `pnpm typecheck`                                                               | exit 0, sin errores                                                                                                                        |
| `pnpm lint`                                                                    | exit 0; cero errores y cuatro warnings de non-null assertion en el spec existente `mercadopago-cloud-acceptance.spec.ts`, fuera del cambio |

## Revisión inicial y siguiente gate (antes de runtime)

Revisor independiente `code-reviewer`: aprobación estática local limitada,
sin blockers ni hallazgos high/medium pendientes. Certeza alta sobre el diff;
no equivale a aceptación operativa. Detectó que faltaba comprobar B después
del RPC exitoso: corregido con nueve assertions para owner/admin/member.
El coordinador confirmó 240 assertions, nueve post-RPC de aislamiento, fixture
transaccional y paridad exacta RPC/policies entre migración y espejo.

Prettier focalizado, `node scripts/check-docs.mjs` (121 Markdown) y
`git diff --check`: aprobados. No hay cambios de firma/esquema expuesto que
requieran regenerar tipos. Los cambios previos de016-T1 siguen preservados;
no se realizaron commits ni escrituras remotas.

Para aceptar T1 resta identificar una DB local desechable con Docker operativo,
ejecutar migraciones y pgTAP, y resolver el gate de Sentry antes de build/E2E.
La fixture E2E existente selecciona el primer contenedor DB: debe confirmarse
el destino aislado antes de ejecutarla. No usar un reset del entorno del
mantenedor para resolver esta precondición. RED SQL no fue observado; no
presentar el conteo estático como una suite aprobada.

T1 conserva abiertos RED base de datos y GREEN/cierre. T2 y T3 quedan en su
orden posterior, sin cambios de código en esta entrega.

## Extensión autorizada: aceptación aislada — 2026-10-08

El mantenedor autorizó avanzar los cuatro gates y coordinar agentes especializados.

- [x] Docker: comprobar stack existente y crear proyecto desechable separado,
      puertos propios, sin .env.local/.temp/seed heredados ni jobs salientes.
- [x] SQL: ejecutar fixture antes de014 (RED), aplicar únicamente a destino
      aislado y repetir pgTAP (GREEN); contar TAP real, no solo exit de psql.
- [x] Sentry: modo local explícito que impida plugin/uploads e init SDK,
      rechace destinos Cloud y preserve comportamiento normal; RED/GREEN propios.
- [x] Navegador: harness con selector exacto DB, variables locales explícitas,
      build y URL directa/reload; cleanup de usuario incluso ante fallo.

Ownership paralela: agente Docker solo scratch y recursos locales nuevos;
agente Sentry config/env/init y sus pruebas; agente harness fixtures/helpers,
config y runner aislado con sus pruebas; coordinador documentación y ejecución.
Revisor fresco al terminar. No se instala software ni modifica Cloud.

Ruling: implementar únicamente el gate Sentry de012.4 necesario para aceptación
014-T1, sin abrir CSP/Vault/impersonación — autorización explícita de resolver
este gate. Coste si equivocado: revisar el límite del lote antes de integrar.
Ruling: conservar el stack del mantenedor y fijar proyecto DB exacto — la
fixture anterior elegía el primer contenedor. Coste: configuración aislada
adicional, evitando evidencia que provenga del entorno incorrecto.

Se releyeron las ocho reglas locales por consumidores. TS/JS: configuración
pura, validación y fallos explícitos; SQL: aislamiento, roles vivos y TAP real;
React/Next: sin middleware nuevo ni memoización manual; pruebas: RED/GREEN
observable y cleanup; Realtime: sin cambios en canales. Se mantienen las
excepciones documentadas de env.ts, CREATE OR REPLACE, diseño y recetas locales.

### Preflight actual de aceptación

Docker29.8.1 responde. Stack existente `saas-boilerplate` conservado;
proyecto aislado en preparación: `iroko-014-20261008`, puertos55320–55329.
CLI Supabase2.110 no acepta db.settings para cron; red Docker internal
impide conexión host del CLI en este Windows. Ruling: bootstrap sin migrations,
cron.launch_active_jobs=off verificado antes baseline; SQL por docker exec al
contenedor exacto. Para E2E cualquier bridge requiere jobs inactivos y secretos
heredados retirados solo del proyecto desechable. No afirmar aislamiento de
red internal donde no esté efectivo.

El comando `supabase services` del preflight leyó metadatos linked (read-only);
no se repitió ni se realizaron mutaciones Cloud. Copia aislada excluye .temp,
.env y seed del mantenedor. Browser Chromium ya instalado; fuentes Geist
vendorizadas, sin dependencia de descarga Google durante build.

Se corrigió el SHA histórico de inspección IoT en current-state: sustitución
global del conteo231→240 lo había alterado accidentalmente. La corrección
preserva `993ff4b5903a852231067858ee3ce9096431a651` como evidencia histórica.

### Reanudación tras límite de uso

La revisión automática no pudo aprobar la creación de la copia temporal por
límite de uso; la acción no se ejecutó y no fue declarada insegura. El usuario
solicitó reanudar tras restablecer tokens. Se relanzaron SQL/entorno, revisión
Sentry/harness y navegador; se preservaron archivos y DB aislada existentes.

Revisión fresca del gate/harness: aprobación estática limitada, sin hallazgos
críticos/high/medium confirmados. Precondición E2E adicional: atestar puerto API
publicado por gateway del mismo proyecto DB, no inferirlo por URLs loopback.
Sugerencia no bloqueante: ampliar cobertura de fallos setup/cleanup del fixture.

Verificación actual del coordinador:
`pnpm test src/lib/__tests__/local-validation.test.ts src/lib/__tests__/local-sentry.test.ts src/test/local-e2e-target.test.ts src/lib/__tests__/robot-config.test.ts "dashboard/robot/__tests__"`
→ exit 0, 5 archivos/74 pruebas aprobadas. `pnpm typecheck` → exit 0.
Lint y suite unitaria completa en ejecución. Build/E2E todavía no ejecutados.

### Resultado SQL observado y gate de calidad

Destino exacto: `supabase_db_iroko-014-20261008`, puerto55322, proyecto y
label comprobados. Se aplicaron159 migraciones baseline antes de014.

| Ejecución                              | Resultado observado                                                               |
| -------------------------------------- | --------------------------------------------------------------------------------- |
| Fixture43 antes de014                  | plan 240,240 TAP, 56 fallos; psql exit0 no representa GREEN                       |
| Aplicación014 al proyecto desechable   | exit0                                                                             |
| Misma fixture43 después de014          | plan 240,240 TAP, 0 fallos; exit0, ROLLBACK                                       |
| Control posterior del proyecto aislado | cronOFF,0 jobs activos,0 Vault,0 solicitudes net pendientes,0 usuarios de fixture |
| `pnpm test` completo actual            | exit0,103 archivos/1088 pruebas aprobadas,133.23s                                 |
| Prettier de gate/harness               | exit0                                                                             |

Logs locales ignorados: `.superpowers/014-validation/docker/robot43-red.log`,
`014-apply.log`, `robot43-green.log`; el coordinador contó directamente TAP y
comprobó los240 resultados. Los logs de bootstrap/status pueden contener
credenciales locales; no publicarlos ni confundirlos con evidencia pública.

Ruling: añadir `SET LOCAL storage.allow_delete_query='true'` tras BEGIN en
fixture43 — Storage actual protege DELETE SQL directo, incluso seed privilegiado.
El ajuste es transaccional y no cambia RLS/grants/roles. Revisión independiente
puntual aprobó las dos líneas, plan 240 y ROLLBACK. Coste si equivocado: revalidar
compatibilidad de fixture con otra versión Storage, sin alterar producción.

CLIstart terminó exit 0 pero solo quedóDB: no declarar stack operativo por exit code.
AgenteAPI asumió bootstrap de Auth/PostgREST/Kong/Mailpit con imágenes cacheadas,
variables desechables y sin reejecutar migrations ni tocar stack del mantenedor.

### API aislada y arranque de navegador

El CLI early-return no levantó servicios API. Se arrancaron exclusivamente
imágenes cacheadas (`--pull=never`) de Auth, REST, Kong y Mailpit, sin copiar
variables del mantenedor. Auth health y REST root devolvieronHTTP200; el gateway
solo publica Auth/REST. Storage/Realtime no levantados, no necesarios para
Robot apagado. Red bridge dedicada; no afirmar aislamiento internal E2E.

El coordinador verificó Docker inspect: Kong running, label
`iroko-014-20261008`, binding127.0.0.1:55321; DB running con mismo label,
puerto55322. REST apunta al contenedor DB aislado. Mailpit55324; URLsAuth33014.
Claves RNG/HS256 desechables de dos días, guardadas en status-env.json ignorado,
no impresas. No hubo mutaciones Cloud ni cambios del stack del mantenedor.

La copia temporal sin env fue preparada. `pnpm build` bloqueó por
ERR_PNPM_UNSAFE_MODULES_DIR (junction de dependencias fuera scratch), antes de
Next. Ruling: ejecutar CLI instalado de Next y sitemap directamente, sin
install; registrar variante de build. Coste si equivocado: comparar con build
canónico en checkout aislado con dependencias propias en futura integración.

`pnpm lint` encontró un error nuevo `unicorn/no-useless-undefined` en
local-sentry.test.ts, más cuatro warnings previos deMercadoPago. Implementador
corrige solo el test y repetirá verificación; no registrar lintGREEN aún.

### Calidad final tras corrección de lint

Se corrigió únicamente el test Sentry: valor ausente nombrado conserva la
semántica de vi.stubEnv y su restauración. Verificación enfocada posterior:
30 pruebas/2 archivos aprobados y ESLint específico sin errores. El coordinador
repitió `pnpm lint`: exit0,0 errores y las mismas4 advertencias previas del
specMercadoPago fuera del cambio. Prettier focal y git diff --check aprobados.
La suite completa103/1088 se ejecutó antes de esta corrección del test; no cambió
código de aplicación después de su GREEN.

Next por defecto falló con Turbopack: symlink node_modules apunta fuera del
filesystem root de la copia aislada. Variante webpack en curso; no confundir
ese límite del harness con un build canónico aprobado. Auth aislado tiene el
hook custom_access_token activo, URI coherente con configuración y EXECUTE
verificado para supabase_auth_admin, sin reinicios ni mutaciones adicionales.

### Build y primer E2E observados

Next CLI instalado `build --webpack`: exit0,118 páginas y TypeScript aprobado;
warnings require-in-the-middle/OpenTelemetry presentes. Next-sitemap CLI
instalado: exit0. Nextstart puerto33014 y Playwright CLI Chromium con
playwright.isolated.config: exit0,1/1 aprobado en6.7s. Acceso autenticado real,
URL directaRobot apagado y recarga comprobados. BUILD_ID
`4aLV3CPrCR0q27Y8p0iTh`; coordinador confirmó nueve hashes source=scratch y
.last-run.json passed sin failedTests. Servidor propio detenido; puerto33014 libre.

No instalar paquetes: pnpm11 rechazó el junction y NextTurbopack rechazó su
filesystem root. El GREEN corresponde a variante webpack con CLI ya instalado,
no a un build canónico Turbopack aprobado. Entorno sanitizado, copia sin .env,
Nexttelemetry desactivada; gate Sentry omitió plugin e init. Cloud sigue
[NO VERIFICADO], sin escrituras.

Primer cleanup: usuarios/profiles/memberships0, pero quedó una cuenta personal
huérfana. FKcreated_bySETNULL preserva cuentas tras borrarAuth. SQLread-only
confirmó que no era baseline; no declararcleanup total por ausencia deusuarios.
Se autorizó fixture retirar únicamente su propia cuenta personal antesAuthdelete,
probar fallos setup/cleanup, repetir E2E y comprobar todos los conteos0.
Nueva revisión independiente del ajuste de harness en curso.

### Corrección de lifecycle de fixture

Cuenta personal huérfana identificada como propia fixture (triggerid=NEW.id),
retirada solo porUUID exacto/typepersonal/created_byNULL del proyecto desechable;
DELETE devolvió1, baselineaccounts0. No se borraron cuentas de terceros ni teams.

Fixture ahora validaUUID antesSQL y elimina únicamente
id=userId AND type=personal AND created_by=userId antesAuthdelete. Ambos pasos
se intentan incluso ante falloSQL; un cleanupfallido hace fallar un test que
había pasado, y preserva/reporta el error original de setup/browser si existía.
Revisor independiente aprobóhelper/fixture/pruebas sin hallazgos bloqueantes.

REDnuevohelper:4 fallos observados por implementador. GREEN del coordinador:
`pnpm test src/test/local-auth-cleanup.test.ts src/test/local-e2e-target.test.ts`
→ exit0,2 archivos/16 pruebas,2.16s. Typecheck y lintowned posteriores aprobados
por implementador. Se sincronizósolofixture/helper a scratch, app/buildsin cambios;
segundaE2E yconteosresiduales en curso. No es necesario recompilar aplicación
por cambios exclusivos del harness de Playwright.

## Resultado de aceptación funcional local

La segunda E2E aprobó 1/1 en 6.0 s con el mismo BUILD_ID. El coordinador
comprobó la identidad del helper y fixture entre checkout y scratch, y leyó
.last-run.json: passed y failedTests vacío. Consulta SQL de solo lectura:
usuarios, perfiles, cuentas, membresías, jobs activos y secretos Vault en cero;
cron desactivado. Servidor temporal propio detenido y puerto 33014 libre.

SQL y E2E satisfacen la aceptación funcional de 014-T1 en local. La suite unitaria, typecheck y lint del árbol final aprobaron el cierre local.
El build verificado usa webpack y herramientas existentes en entorno aislado;
Turbopack canónico sigue no verificado. Cloud, proveedores, merge y deploy
quedan fuera del cierre. No se ejecutó la suite pgTAP completa ni E2E de todos
los módulos; 016-T2 sigue abierto.

Recomendación siguiente: 012.1 — Grants. Inventariar privilegios efectivos en
la DB aislada y contrastar consumidores y roles antes de proponer revokes.
Preservar datos y recursos del mantenedor; ninguna escritura Cloud autorizada.

## Cierre y recomendación

014-T1 cerrado para aceptación local. Checklist del plan actualizado, revisión
independiente aprobada y evidencia actual completa para su alcance.

| Check final      | Resultado                                                                      |
| ---------------- | ------------------------------------------------------------------------------ |
| `pnpm test`      | exit 0; 104 archivos y 1092 pruebas aprobadas; 114.96 s                        |
| `pnpm typecheck` | exit 0, sin errores                                                            |
| `pnpm lint`      | exit 0; cero errores, cuatro warnings previos fuera del lote                   |
| pgTAP Robot      | RED 240/56 fallos; GREEN 240/0; DB desechable                                  |
| Build + sitemap  | Next CLI webpack y next-sitemap instalado: exit 0                              |
| E2E final        | Chromium 1/1 aprobado; login real, URL directa, recarga y cleanup sin residuos |

Turbopack canónico, Cloud, providers, pgTAP completo y E2E de todos los módulos:
**[NO VERIFICADO]**. No commits, push, merge ni deploy. El proyecto desechable
local queda disponible para continuación; la app temporal está detenida. Sus
claves locales expiran en dos días y no son credenciales de Cloud.

Siguiente prioridad recomendada: **012.1 — Grants**. Comenzar con inventario
read-only de privilegios de tablas, funciones y esquemas para anon,
authenticated y service_role, contrastar consumidores y diseñar revokes con
regresiones antes de aplicar cambios. T2/T3 de014 y el resto de012.4 no se retiran.
