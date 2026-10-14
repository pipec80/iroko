# Plan 012.1 — Ensayo del historial completo

Fecha: 2026-10-09. Rama: `codex/014-t1-robot-permissions`.
Alcance: reproducción local desde cero, atomicidad 014/012 y advisors comparables.
Sin instalaciones, escrituras Cloud, commits, push, merge ni deploy.

## Resultado observado

161 migraciones originales ejecutadas: 159 históricas, luego
`20261008120000_robot_reference_rbac.sql` y
`20261008130000_revoke_excess_grants.sql`. Los 161 hashes SHA256 permanecen
intactos. El ledger del ensayo se registra explícitamente por el runner; no se
presenta como historial generado por la CLI ni como paridad Cloud.

SQL completo de aplicación reproducido sin parches a migraciones. Aceptación
pgTAP consolidada: **44 archivos / 884 aserciones, cero fallos pendientes**.
La secuencia de ejecución y la adaptación de entorno de la fixture 42 se
detallan abajo; no se presenta como una única corrida final sin incidencias.

## Destino y bootstrap de plataforma

DB nueva: `supabase_db_iroko-012-history-20261009`, etiqueta de proyecto
`iroko-012-history-20261009`. PostgreSQL 17.6, imagen local Supabase
`17.6.1.141`, igual versión de imagen que el Cloud observado. Red Docker
`Internal=true`, sin gateway ni mounts compartidos; los contenedores previos
permanecen intactos. Puerto solicitado loopback 55332 no accesible desde Windows
en esta red interna. No se abrió egress para habilitarlo.

La configuración oficial de PostgreSQL carga supautils; postgres continúa sin
superusuario. Cron arranca con `cron.launch_active_jobs=off`, antes de cualquier
migración. No se ejecutó seed.sql ni se copiaron datos/configuración/secretos del
stack del mantenedor o Cloud. Los planes de catálogo incluidos en migraciones
históricas sí forman parte del replay.

Prerrequisitos oficiales desde imágenes ya instaladas:

- Storage API 1.66.4: 60 archivos tenant originales, hashes conservados, orden
  numérico, propietario supabase_storage_admin, install_roles=false y search_path
  storage/public/extensions. Los índices concurrentes se ejecutan fuera de una
  transacción, como exige su SQL.
- Auth 2.193.0: comando oficial auth migrate; 77 versiones observadas en auth.schema_migrations.
- Realtime 2.113.4: herramientas oficiales migrate y Release.seeds; metadata en
  _realtime y objetos de tenant en realtime. Helpers efímeros, solo red interna y
  credenciales nuevas desechables. No se arrancó un servidor de aplicación.

Intentos preliminares preservados: falta de supautils al crear moddatetime;
storage.objects ausente en migración 23; auth.jwt ausente en migración 33;
realtime.messages ausente en migración 52. Un intento de bootstrap Realtime con
metadata en public colisionó con feature_flags; se corrigió el contexto oficial
_realtime y se repitió desde una DB vacía. También se corrigieron en el runner la
separación por EOF y la ejecución de índices concurrentes de Storage. Ninguno
se resolvió modificando migraciones de aplicación.

## Atomicidad y preservación

Para cada migración pendiente se ejecutó el archivo original seguido de SELECT
1/0 mediante psql -1 -v ON_ERROR_STOP=1. Ambos fallaron deliberadamente con exit 1,
y los snapshots antes/después del rollback resultaron idénticos. Luego se aplicó
cada archivo y su registro de ledger en una transacción real: exit 0.

No se afirma atomicidad universal del historial: la migración histórica
20260729014653 contiene BEGIN/COMMIT propios.

Comparación 014 aplicada → 012 aplicada:

| Control                                                          | Resultado                 |
| ---------------------------------------------------------------- | ------------------------- |
| Privilegios administrativos efectivos retirados                  | 105                       |
| ACL de funciones cambiadas                                       | 10 firmas exactas         |
| CRUD de anon/authenticated/service_role/supabase_auth_admin      | Cero cambios              |
| Policies, RLS, propietarios y cuerpos/configuración de funciones | Sin cambios               |
| Roles, membresías, esquemas y secuencias                         | Sin cambios               |
| Defaults service_role y supabase_admin                           | Sin cambios               |
| service_role SELECT accounts/profiles/accounts_memberships       | Positivos antes y después |

Los tres SELECT resuelven la divergencia de catálogo del bootstrap manual
anterior; no prueban por sí solos circuitos operacionales externos.

## Advisors comparables

Ejecutado el SQL oficial incluido en Supabase CLI **2.110.0** mediante psql dentro
del contenedor, usando la misma consulta y destino en los tres puntos. Fuente:
[lints.sql fijado](https://github.com/supabase/cli/blob/v2.110.0/apps/cli-go/internal/db/advisors/templates/lints.sql).
SHA256: `3c757bdbd8eec9b46b061356ac64d0cd71bc951f4c9aef1172dcee6f7f525b24`.
Wrapper: BEGIN READ ONLY, setup oficial, query original agregada a JSON, ROLLBACK.
No se presenta como ejecución del comando CLI, cuyo acceso TCP estaba bloqueado.

| Punto          | Hallazgos            | Diferencias            |
| -------------- | -------------------- | ---------------------- |
| 159 — baseline | 66: 65 INFO / 1 WARN | Baseline capturado     |
| 160 — tras 014 | 66                   | JSON completo idéntico |
| 161 — tras 012 | 66                   | JSON completo idéntico |

INFO: 61 unused_index, tres rls_enabled_no_policy y un no_primary_key.
WARN: search_path mutable de billing.assert_provider_price_matches_plan.
Cero hallazgos nuevos o alterados en este conjunto de reglas. No retirar índices
por estadísticas de una DB vacía. Esta captura renueva la comparación local que
faltaba en el ensayo anterior.

El snapshot de reglas de la CLI no incluye los avisos de ejecución SECURITY
DEFINER 0028/0029 ni la configuración Auth de contraseñas filtradas. No demuestra
que los 57 WARN del dashboard Cloud desaparezcan; su clasificación previa sigue
en el [registro de Grants](2026-10-08-plan-012-1-grants-execution.md).

## Evidencia y revisión

Artefactos locales ignorados en `.superpowers/012-history-rehearsal/`:
bootstrap-final.ps1, replay.sh, apply-final.sh, image-provenance.json,
source-hashes.json/source-preservation.log, final-baseline-logs,
final-apply-summary.log, snapshots por etapa, preservation-summary.log y las tres
capturas advisors JSON. Credenciales efímeras de logs de bootstrap se redactaron.

Revisión independiente de seguridad aprobó aislamiento, fuentes oficiales,
rollback y comparación de advisors/catálogos. Root verificó 161 versiones,
identidad, preservación y arrays completos de advisors.

Siguiente paso recomendado: preparar la etapa Cloud 014 → 012 para autorización
explícita, con preflight de identidad/historial/ACL y verificación posterior. No
hay autorización de aplicación Cloud en este ensayo ni se declara paridad.

## PgTAP y corrección del destino de la fixture 42

Primera ejecución completa: 44 archivos, 882 TAP observados, cero not-ok y un
error SQL de entorno. 43 archivos satisfacen sus planes; 42 observa 47/49 y falla
al resolver host.docker.internal:54322. Esa conexión está fijada al stack habitual,
no al proyecto desechable. La red interna evitó usar ese destino.

Se conserva la fuente original y su hash. Solo la entrada de ejecución cambia
las dos conexiones dblink a 127.0.0.1:5432 del mismo contenedor. Los intentos por
socket y TCP con trust fueron rechazados por dblink: el usuario postgres no es
superusuario y necesita autenticación efectiva por contraseña. Se añadió una
regla HBA temporal limitada a database postgres/user postgres/127.0.0.1/32 con
scram-sha-256, recarga sin restart y contraseña local aleatoria generada únicamente
en memoria. No se concedieron privilegios ni se cambió owner/superusuario.

Repetición focalizada 42: **49/49, exit 0**, incluidas las dos sesiones concurrentes
y SKIP LOCKED. Matriz final consolidada: los 43 archivos aprobados inicialmente
más 42 repetido = **44 archivos / 884 aserciones válidas**. Las ejecuciones de
aceptación observan 882 + 49 = 931 líneas TAP; los intentos diagnósticos se
registran aparte. No se suma como cobertura adicional ni se oculta la primera
corrida incompleta.

Para 16/29/32 se incorpora metadata de buckets org-assets/documents desde la
configuración dentro de sus transacciones y se revierte al terminar. Todas las
fuentes de tests permanecen intactas. Runner y evidencias: acceptance/run-suite.ps1,
acceptance/replay-42.ps1 y acceptance/results (summary inicial, logs y resultado42).

La afirmación anterior de pgTAP íntegramente aislado queda acotada para fixture42:
su endpoint fijo no acreditaba aislamiento respecto al stack habitual. Este
ensayo sí prueba la concurrencia contra el destino desechable exacto. No se
modifica la fixture versionada dentro de este lote; su parametrización portable
queda como mejora del harness separada de Grants.

## Cierre local y limpieza final

HBA original restaurado: comparación exacta de bytes true, pg_reload_conf true
y cero reglas SCRAM temporales. La contraseña efímera solo deja su verificador
en el rol postgres de esta DB nueva; no se conserva ni imprime su valor.

Comprobación final: cero usuarios, perfiles, cuentas, membresías, probes de tablas
y buckets, secretos Vault, solicitudes net pendientes y registros de los UUID
concurrentes de la fixture42. Cron launch off y cero jobs activos; las diez
definiciones originales se conservan desactivadas como aislamiento operacional
posterior a las capturas del historial. Ledger 161.

Cero cambios SHA256 de las 161 migraciones y las 44 fuentes de tests. Evidencia:
acceptance/results/effective-summary.json, effective-totals.json, isolation-final.log,
concurrency-cleanup.log y fixture42-config-preparation.log. Root leyó los resultados
y verificó de nuevo el HBA restaurado y ausencia de regla temporal.

Veredicto: aceptación local SQL del historial y de 012.1 completada, con
adaptaciones de bootstrap y harness explícitas. No renueva pruebas de aplicación,
tráfico Realtime, providers, instalación de cliente ni evidencia Cloud. No se
repitieron Vitest/typecheck/lint porque esta etapa no cambia código de aplicación
ni fuentes SQL versionadas. Formato focalizado, check-docs y diff se verifican
al cerrar los documentos.

Checks documentales finales observados: Prettier focalizado exit 0;
node scripts/check-docs.mjs exit 0 (123 Markdown); git diff --check exit 0.
Revisión independiente final: aprobada sin correcciones pendientes, con verificación
propia del HBA restaurado, totales consolidados y cleanup.
