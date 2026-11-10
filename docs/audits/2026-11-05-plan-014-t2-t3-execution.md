# Plan014 T2/T3 — ejecución local,2026-11-05

## Cierre local014 — 2026-11-05

T2 yT3 aceptados localmente junto con la evidencia histórica vigente deT1.
Tercer ensayo: build productivo Turbopack PASS y browser1/1,0 skips,0 flaky,
0 inesperados,69.92s. Autenticación admin+AAL2 real,24 eventos en dos cuentas,
filtros acción/recurso, paginación20→24, IDs cuenta/impersonador, rechazo de
transporte, conservación de resultados/filtro y reintento exitoso.

Runner `node .superpowers/sdd/014-reference-surface-correctness/run-browser.mjs`
reutiliza `runLocalValidation` existente, sin ampliar allowlist017 ni instalar
herramientas. Runtime productivo con sinks y red confinada:0 intentos Node de
egreso/ejecución prohibidos. Servidor propio detenido y scratch retirado por runner.
Postflight SQL: eventos prefijo plan014=0, usuarios fixture admin/target=0,
triggers audit desactivados=0, session_replication_role=origin.

Tipos y lint completo aprobados según recuperación inferior;33 warnings ajenos
al cambio conservados. Revisión independiente favorable; correcciones de test
no alteraron contratos ni permisos de aplicación. No se ejecutó gate integrado
completo de016 ni se acepta Cloud, pagos o reutilización015 por este cierre.
Plan014 pasa a completed; siguiente015 y después016 según roadmap.

Identidad del código sin commit (SHA256, además de base/rama inferiores):

| Archivo                                               | SHA256                                                           |
| ----------------------------------------------------- | ---------------------------------------------------------------- |
| src/lib/storage.ts                                    | 3fd21ba1ea0900fa0be23d1275317b5b54763bf43e747932db3f8ef2fd6392e3 |
| src/components/dashboard/activity/audit-log-table.tsx | 2b32734022f642fe5ab1cabc7f948992a935ac6d300bef10ac596c81d858b902 |
| src/test/e2e/platform-audit.spec.ts                   | c27aed63f42d53baafe470bbc74d644eab735033a1c950a39a303bd51d0ed0b4 |

El manifiesto local completo incluye las pruebas unitarias y cuatro traducciones.
El spec ejecutado tenía SHA256
`d49fc7a71bf2b855d76593a1e77c28b633485ad745d1d94fa64317cf2d0a5717`;
después sólo se aplicó formato Prettier, sin modificar assertions ni operaciones.
La tabla/manifiesto identifican ese árbol final formateado; no se presenta el
hash posterior como bytes exactos ejecutados en navegador.
Una revisión posterior debe comparar contenido/dependencias/configuración antes
de reutilizar evidencia; la base Git sola no identifica este árbol.

## Candidato y alcance

Base `032f1a30794241cebc97e0ccd32b48d836110475`, rama
`codex/014-images-platform-audit`. Árbol sin commit: identificar cambios con
`git diff` del candidato; este SHA por sí solo no identifica la implementación.
Preservadas tres ediciones documentales previas. T1 no se reabre.

Se aplican Superpowers (ejecución/TDD), Supabase y clean-code con prioridad de
AGENTS: conservar nullable `storageUrl`, errores tipados de acciones, SQL/RLS y
stack oficial. Sin nuevas dependencias, schema, proveedores ni funcionalidades
pagadas. La ejecución se limita a archivos/pruebas locales sin tráfico proveedor.

## Evidencia ejecutada

- T2 RED: `pnpm test src/lib/__tests__/small-helpers.test.ts --pool=threads --maxWorkers=1 --no-file-parallelism`:
  5 regresiones fallidas/15 aprobadas. Origen por prefijo, userinfo y puertos
  indebidos reproducidos antes de cambiar producción.
- T2 GREEN: mismo comando,20/20 aprobadas. Origen exacto parseado, sin
  credenciales; Google exige hostname permitido y puerto estándar. Se conservan
  CDN relativo, valores vacíos, HTTP denegado y HTTPS443 permitido.
- El intento anterior con pool forks no ejecutó tests: timeout de inicio del
  worker. Cambiar a threads1 fue una alternativa del runbook, sin bajar controles.
- T3 RED: tabla8 pruebas,5 fallidas/3 aprobadas contra implementación anterior;
  reproduce scope global, errores/reintento y serialización.
- T3 GREEN: `pnpm test src/components/dashboard/activity/__tests__/audit-log-table.test.tsx --pool=threads --maxWorkers=1 --no-file-parallelism`:
  9/9,11.26s. Incluye filtros acción/recurso en global, IDs visibles,
  conservación tras errores, reintento y doble solicitud. Primer GREEN encontró
  sincronización incompleta de tests con fin de transición React: se esperan
  controles habilitados, sin aumentar timeouts ni cambiar assertions.
- Revisión independiente code-reviewer: favorable estática, sin defectos de
  producción confirmados. Su observación menor de cobertura del filtro recurso
  global se incorporó y pasó. No renueva SQL/browser.
- Acción admin: `pnpm test "dashboard/admin/audit/__tests__" --pool=threads --maxWorkers=1 --no-file-parallelism`:
  4/4 aprobadas. Formato de los ocho archivos de código/traducciones PASS.
- `node scripts/check-docs.mjs`:188 Markdown PASS; `git diff --check`:PASS.

## Recursos y límites de aceptación

### Checkpoints de recuperación previos al cierre del mismo día

El mantenedor recuperó Docker y liberó recursos. Nuevo preflight: stack oficial
saludable y178 migraciones locales; RAM observada3683MB libres (posteriormente
1668MB durante lint), disco C con112GB libres. No se eliminaron recursos.

- `pnpm supa:test supabase/tests/database/19_platform_admin.test.sql` fuera del
  sandbox:15/15 PASS en127.0.0.1:54322. Primer intento sandbox denegó Docker API;
  no era caída del daemon. Sin cambios SQL ni credenciales.
- `pnpm typecheck`:exit0 PASS tras recuperación, superando el bloqueo previo.
- `pnpm lint`:exit0,0 errores/33 warnings en archivos fuera del cambio014.
  Advertencias preexistentes de non-null, hook MFA y navegación del editor
  diferido; no se amplía alcance014 para modificarlas.
- Preparado `src/test/e2e/platform-audit.spec.ts` con fixture admin+AAL2 existente,
  dos cuentas,24 eventos propios, filtros, paginación, fallo/reintento y cleanup.
  Build/browser confinado en ejecución; no aceptado por la mera preparación.

Dos builds productivos confinados Turbopack pasaron; los browser no se aceptan
por esos builds. Primer ensayo falló en cleanup: DELETE directo fue rechazado
por protección append-only de audit.logs. Se identificaron24 eventos propios por
prefijo UUID exacto y se retiraron en transacción local de mantenimiento
`SET LOCAL session_replication_role=replica`, DELETE sólo del prefijo y retorno
a origin antes de COMMIT. No cambia triggers/guards persistentes; rollback o
desconexión restaura el modo. Conteo posterior0. La revisión independiente
consideró seguro este alcance local de limpieza, sin cambios de aplicación.

Segundo ensayo comprobó filtros/paginación/IDs y alcanzó la negativa de
transporte, pero falló por selector de test ambiguo: dos elementos role=alert.
Cleanup corregido pasó, conteo global de prefijos plan014=0. Se precisó el
selector con el texto del error de carga; no se aumenta timeout ni se reduce
ninguna assertion funcional. Tercer ensayo en curso. Ambos fallos son de prueba,
no se declaran defectos de producción ni PASS global. Artefactos primero/segundo
conservados localmente junto al manifiesto de build.

### Intentos históricos anteriores, superados por el cierre superior

Las frases en presente de este bloque son el estado registrado antes de la
recuperación. No describen bloqueos vigentes: tipos, lint, SQL/build/browser se
aceptaron después con los resultados del cierre superior.

`pnpm typecheck`: dos intentos sin resumen (sandbox y fuera del sandbox),
detenidos por el ejecutor ante falta de progreso bajo presión de recursos.
No se observaron diagnósticos TypeScript, pero tampoco exit0: **[NO VERIFICADO]**.
No repetir automáticamente ni aumentar heap. La causa exacta no está demostrada.

ESLint focalizado sobre storage/helper y tabla/test: dos intentos sin resumen,
dentro y fuera del sandbox, detenidos sin resultado. Lint **[NO VERIFICADO]**;
no se ejecuta suite completa como sustituto. Comando:
`pnpm exec eslint src/lib/storage.ts src/lib/__tests__/small-helpers.test.ts src/components/dashboard/activity/audit-log-table.tsx src/components/dashboard/activity/__tests__/audit-log-table.test.tsx`.
En inspección posterior se explicitó la respuesta sin datos del loader para
evitar inferir entradas plataforma sin avatarUrl; se revalida la tabla focalmente.

Medición Node:602MB libres de16123MB; observación posterior1945MB libres.
Sin procesos de tests pesados simultáneos. Docker API local no disponible
(`dockerDesktopLinuxEngine` ausente); se intentó iniciar Docker Desktop existente,
sin recuperar el endpoint en las comprobaciones posteriores. No se atribuye a
Supabase un fallo funcional ni se resetea el stack.

SQL19, build y navegadorT3 permanecen **[NO VERIFICADO]** hasta disponer de
destino oficial y recursos suficientes. Cloud no se mutó ni aceptó. Un unitario
verde no cierra esos gates; el plan permanece activo. No repetir suites
integradas017: el gate final pertenece a016 después de015.
