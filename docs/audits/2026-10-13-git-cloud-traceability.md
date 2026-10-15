# Integración Git y contraste Cloud — 2026-10-13

## Veredicto y alcance

Árbol clasificable para integración selectiva; no aprobar un commit global.
012.1 SQL y 012.2 operativo conservan su aceptación acotada. Los cambios de
aplicación Robot de 014 **no están desplegados** en el candidato selectivo de
012.2, aunque su migración SQL sí está aplicada. La configuración local de
validación/Sentry tampoco forma parte de ese despliegue.

Trabajo autorizado: inventario, contraste de lectura, propuesta de commits e
inicio del inventario 012.3. Coordinación con tres agentes: clasificación Git,
procedencia del deployment y seguridad/rate limiting. No staging, commit,
push, merge, instalación, deploy ni escritura Cloud en este bloque.

## Snapshot Git y preservación

- Rama: `codex/014-t1-robot-permissions`.
- HEAD: `dfa228fb63e762a77beb291b828561d4547ed2e9`.
- Índice vacío. Snapshot anterior a estos nuevos informes: **113 rutas**,
  36 modificadas y 77 nuevas, contando archivos y no directorios agrupados.
- [Inventario exhaustivo](2026-10-13-git-integration-inventory.csv): 113 filas
  únicas y cero diferencias frente al snapshot; ownership y hunks compartidos.
- Cuatro DB de caché Windows en `%SystemDrive%/` quedan fuera de todos los
  commits. Se preservaron, al igual que `test-results` y material ignorado.
- Git no pudo leer el ignore global del usuario bajo el sandbox; los conteos
  usan las exclusiones efectivamente accesibles. La guía personal sigue local.

No ejecutar `scripts/prepare-local-acceptance.mjs` como empaquetador selectivo:
su selección tracked/untracked también recogería esas cuatro DB. Se necesita
una lista permitida o exclusión explícita antes de reutilizarlo con ese fin.
No se modificó el script durante esta inspección.

## Cloud renovado en lectura

MCP autenticado identifica `rgrxlygtmvavqzkjyywg`, nombre `iroko`,
estado `ACTIVE_HEALTHY`, PostgreSQL 17.6.1.141. A las 20:16:28 UTC:
163 migraciones, última `20261013143645`, endpoints y entregas en cero.

Las **163 versiones ordenadas** coinciden exactamente con los nombres locales:
MD5 del string separado por comas `aaf49be6e4a156d4361849a5c71cdd21` en ambos
destinos. Es un control de identidad del ledger; no un hash criptográfico de
seguridad ni una comparación exhaustiva de definiciones/ACL/esquema efectivo.

| Versión        | Nombre en Cloud                    |
| -------------- | ---------------------------------- |
| 20261008120000 | robot_reference_rbac               |
| 20261008130000 | revoke_excess_grants               |
| 20261009180000 | webhook_safe_node_delivery         |
| 20261013143645 | webhook_validation_context_columns |

Job 9 `process-webhook-deliveries` activo, `* * * * *`; a las 20:17 UTC,
58 ejecuciones desde la activación y cero con estado `failed`. Ese conteo SQL
no vuelve a certificar todas las respuestas HTTP. Entrega/HMAC y cinco wakes
HTTP 200 mantienen su evidencia propia en la [aceptación](2026-10-13-plan-012-2-cloud-acceptance.md).

## Procedencia de hosting y diferencias

Vercel MCP renovó deployment `dpl_4SXbR25CKn6VpdTzxm95LvvaGKQt`, READY,
proyecto `iroko` / `prj_gEe5cFBOgMxmCCNisaRzZW2xZBiL`.
Alias `project-a89lv.vercel.app` apunta a ese ID. Source `cli`, metadata vacía,
sin procedencia `gitSource`; la trazabilidad depende del paquete sellado.
La etiqueta de hosting `production` corresponde al MVP/test del propietario.

Archivo C81: SHA256
`c81ef6c05504513e5fcb89054a4f9390d9c9ad271dc2b4fc13236e7bbefad1d7`.
Se renovó su hash y la comparación de **972/972 fuentes** del stage contra
HEAD más los 27 overlays del manifiesto: cero diferencias. Los **970/970**
hashes del dry-run de upload guardado coinciden hoy con el stage.
De la lista remota, truncada por la herramienta, se contrastaron 311 archivos:
cero diferencias. Paridad remota completa de 970: **[NO VERIFICADO]**.

| Diferencia actual frente al paquete                                         | Significado                                                                               |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `src/env.ts`: cuatro líneas LOCAL_VALIDATION/NEXT_PUBLIC_LOCAL_VALIDATION   | Configuración local no desplegada; WEBHOOK_WORKER_SECRET sí incluido.                     |
| `supabase/schemas/webhooks.sql`: grant SELECT de tres columnas y comentario | Seguimiento SQL aplicado después del empaquetado, sin cambio Node.                        |
| Migración 20261013143645 y test46                                           | Ausentes del paquete previo; integrar como corrección posterior aplicada.                 |
| Robot page/config/helpers y Next/Sentry/harness pendientes                  | El stage conserva HEAD para esos archivos; no atribuir sus correcciones al deployment.    |
| Espejos SQL billing/private/public y test05                                 | Cambios actuales no empaquetados; las migraciones 014/012.1 sí están incluidas/aplicadas. |

Los otros 25 overlays coinciden byte a byte con el árbol actual. HEAD puro no
reproduce el deployment: requiere los overlays y la configuración operativa
externa. Un futuro despliegue del árbol combinado incluirá cambios adicionales
y necesita su propia aceptación.

## Propuesta de commits, sin ejecutarlos

| Orden | Mensaje propuesto                                                     | Unidad revisable                                                               |
| ----- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 1     | `docs(review): close plan 016 t1 static coverage`                     | Matrices, lotes y cierre estático sobre su candidato histórico.                |
| 2     | `chore(lint): exclude local rehearsal checkouts`                      | Solo exclusiones ESLint de scratch/worktrees.                                  |
| 3     | `test(local): isolate validation targets and disable sentry uploads`  | Next/Sentry, hunks env locales, harness y fixtures que los importan.           |
| 4     | `fix(robot): enforce module availability and live tenant roles`       | Ruta/config, migración014, hunks Robot del espejo y test43/E2E.                |
| 5     | `fix(db): revoke excess api role privileges`                          | Migración012.1, espejos/hunks grants, test05/44 y evidencia.                   |
| 6     | `fix(webhooks): pin delivery transport to validated public addresses` | Transporte, RPC/tickets, worker, hunks env worker, tipos, migración09 y tests. |
| 7     | `fix(webhooks): grant worker validation context columns`              | Migración13, hunk espejo y test46; sin regenerar tipos.                        |
| 8     | `docs(webhooks): record rollout and bounded cloud acceptance`         | Runbook, SQL de inspección e informes/estado de aplicación real.               |
| 9     | `fix(ci): avoid logging privileged retry headers`                     | Cambio nightly independiente.                                                  |
| 10    | `docs(project): clarify mvp environments and local stack ownership`   | Contrato MVP/local, consolidación y trazabilidad de este bloque.               |

Separar hunks de `src/env.ts`, `supabase/schemas/public.sql`, espejo webhook,
plan012 y current-state. Referencias a archivos nuevos deben viajar en el mismo
commit o uno posterior. Las matrices CSV requieren validación estructural de
identidades/filas/estados: su diff amplio no es meramente finales de línea.
No reescribir migraciones ya aplicadas ni regenerar tipos indiscriminadamente.
Cada commit futuro necesita revisión del staged exacto y checks proporcionales;
el resultado histórico del árbol combinado no certifica cada estado intermedio.

## Correcciones documentales y validación

Se precisó en Plan014 y current-state: SQL Cloud aplicado versus aplicación
Robot no desplegada/aceptación funcional Cloud no verificada. El checkpoint
histórico del subplan016 y su referencia en current-state ahora remiten al
cierre estático del 8 de octubre; no se alteraron sus checklists históricos.

Ejecutado ahora:

- `pnpm test src/app/api/v1/account src/app/api/v1/webhooks/validate src/lib/api-keys src/lib/webhooks/__tests__/registration.test.ts --maxWorkers=1`:
  **4 archivos / 27 pruebas aprobadas**. El intento inicial bajo sandbox falló
  por EPERM antes de tests; el coordinador repitió con acceso autorizado.
- CLI detectadas sin instalación: Supabase 2.110.0, Vercel 59.15.1.
- Formato focalizado aprobado; `node scripts/check-docs.mjs`: 139 documentos
  aprobados; `git diff --check`: aprobado. CSV: 113 filas únicas, índice Git
  vacío. Revisión independiente final: sin correcciones obligatorias.
  No se repitió toda la aceptación012.2.

Siguiente paso: revisar la selección de commits y su cierre por staged exacto.
En paralelo documental queda el [inventario012.3](2026-10-13-plan-012-3-rate-limit-inventory.md);
no cerrar ese frente como cubierto por el hook existente.
