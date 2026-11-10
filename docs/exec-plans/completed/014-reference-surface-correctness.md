# Plan 014 — Corrección de superficies de referencia

## Cierre local — 2026-11-05

**Completed localmente.** T1 conserva su evidencia histórica; T2/T3 aceptados con
unit20/20 + tabla9/9 + acción4/4, tipos/lint PASS, SQL19 15/15 y build/browser
productivo confinado1/1 sin skips/flaky. Cleanup verificado sin fixtures restantes.
[Comandos, revisión y límites](../../audits/2026-11-05-plan-014-t2-t3-execution.md).
Cloud y gate integrado016 no se aceptan por este cierre. Siguiente015 →016.

## Checkpoints históricos — 2026-11-05

**Ejecución posterior autorizada el05/11:** T2 implementado con RED5/GREEN20;
T3 implementado con regresiones focalizadas. SQL19/build/browser siguen pendientes
por Docker local no disponible y recursos acotados; el plan permanece activo.
Comandos y resultados en la [auditoría](../../audits/2026-11-05-plan-014-t2-t3-execution.md).
El bloque siguiente conserva el checkpoint previo a la autorización de ejecución.

**Estado:** plan existente, parcialmente implementado. T1 conserva su aceptación
local histórica; **T2 y T3 siguen pendientes**. Esta actualización documental
queda para revisión del mantenedor: no autoriza comenzar código, fixtures,
servicios ni operaciones Cloud. La próxima ejecución requiere su siguiente OK.

| Tarea | Resultado                                                   | Estado                                                                        |
| ----- | ----------------------------------------------------------- | ----------------------------------------------------------------------------- |
| T1    | Robot oculto y permisos efectivos                           | Aceptado localmente; preservar evidencia y exclusión, sin reabrir la vertical |
| T2    | Orígenes de imágenes comparados como URLs                   | Pendiente; corregir helper y regresiones focalizadas                          |
| T3    | Auditoría global coherente al filtrar, paginar y reintentar | Pendiente; reutilizar acción/RPC existentes                                   |

012 y el contrato acotado del padre017 están cerrados. Orden vigente:
**014-T2 → 014-T3 → 015 → 016**, según el [roadmap](../../../ROADMAP.md).
El cierre de014 acepta sus reparaciones locales; no acepta MVP, reutilización
ni Cloud. Los bloques fechados de octubre conservan decisiones/resultados
históricos; sus ramas, candidatos y permisos no son instrucciones actuales.

Inspección documental/estática del05/11 sobre `main` en `032f1a3`: T2 conserva
`startsWith(SUPABASE_URL)` y T3 consulta cuenta durante interacciones globales.
Evidencia previa del05/11: `pnpm test src/lib/__tests__/small-helpers.test.ts src/components/dashboard/activity/__tests__/audit-log-table.test.tsx "dashboard/admin/audit/__tests__"`
pasó3 archivos/16 tests, pero no cubre esas regresiones. No es aceptación deT2/T3
ni renovación deSQL/browser/Cloud; no se repite durante esta edición documental.

**Dirección vigente 2026-10-28:** [ADR0005](../../adr/0005-replicable-saas-mvp-and-bounded-acceptance.md).
Preservar cierre RBAC deRobotT1 y sus límites, sin implementar una vertical para
aceptar el núcleo. T2 imágenes/T3 auditoría se exigen en las superficies ofrecidas.
015-T1 comprueba exclusión de editor/Robot en rutas/acciones; ocultar navegación
no basta. No reabrir las reparaciones aceptadas sólo por esta decisión documental.

**Coordinación histórica — 2026-10-20:** T2/T3 conservan las tareas de este
documento y sus criterios; el [registro central](../active/freeze-remediation-register.csv)
las vincula a RS-02/S-04 y RS-03. Se ejecutan después de 017 P1 y 012.5;
016 valida el candidato integrado después de 015. El estado Cloud y los
builds descritos más abajo son observaciones fechadas; no renovar aceptación
funcional Robot por una validación global posterior. D-06 (reemplazo concurrente
Robot) tiene reparación separada en 017.2-T5; no reabre el cierre RBAC de T1.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans
> to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Checkpoint histórico — 2026-10-13:** T1 aceptado localmente el 2026-10-08 (SQL, build webpack y E2E). Migración SQL aplicada a Cloud el 2026-10-09 y ledger renovado el 2026-10-13; los cambios de aplicación Robot no estaban incluidos en el deployment selectivo de 012.2. Aceptación funcional Robot Cloud y build canónico Turbopack no verificados en ese checkpoint. Véase el [contraste de integración](../../audits/2026-10-13-git-cloud-traceability.md).
La prioridad histórica P0 no representa un P0 explotado confirmado por 016-T1.

**Goal:** cerrar la exposición del ejemplo robot, la validación incorrecta de
orígenes de imágenes y la pérdida de contexto en auditoría de plataforma.

**Architecture:** mantener rutas/Server Actions y RLS como límites distintos.
Los flags controlan disponibilidad de aplicación; SQL valida roles vivos.
Reutilizar los RPCs de auditoría, sin consultas service-role nuevas.

**Tech Stack:** Next.js 16, React 19, TypeScript strict, Supabase/RLS, Vitest,
pgTAP y Playwright existentes; ninguna dependencia nueva.

**Spec:** [estrategia](../../architecture/product-strategy.md) y hallazgos
RS-01/02/03 de la [auditoría](../../audits/2026-09-24-reusable-saas-readiness.md).
Baseline histórico de planificación: `f82d2fbe381014c80a090ba3c36c99e4778111c3`.
Renovar branch/HEAD, estado y manifiesto del contenido antes de implementar.

## Global Constraints

- Leer `TESTING-PLAN.md` antes de escribir/modificar pruebas.
- No crear `middleware.ts`; conservar `src/proxy.ts`.
- Ninguna dependencia nueva; TypeScript strict y sin `any`.
- Conservar datos, ramas, contratos billing y slugs `free` / `pro` / `scale`.
- SQL: migración nueva + espejo; no reescribir migraciones aplicadas.
- DB/browser: reutilizar el stack local oficial `saas-boilerplate`, definido en
  `supabase/config.toml`, con fixtures propias retirables y destino loopback
  verificado. No crear otro stack ni resetear por interpretar «desechable».
  Preservar credenciales, fuentes, procesos ajenos y datos no pertenecientes a fixtures.
- Cloud, pagos, push/merge/deploy requieren autorización propia.
- Un PR por tarea; resultado RED/GREEN y revisión del diff antes del siguiente.
  Preparar cambios separados; esta planificación no autoriza commit/push/PR/merge.

## Servicios gratuitos y presupuesto de validación

El mantenedor confirma que Supabase, Vercel, Cloudflare, Resend, PostHog,
Sentry, GitHub y las demás integraciones se utilizan gratis/en capa Free.
Es una restricción de presupuesto declarada, no una auditoría de cuentas.
Antes de operar un proveedor, consultar documentación oficial vigente y estado
de cuenta de solo lectura cuando corresponda: capacidad disponible, cuota y
consumo relevante. No asumir funcionalidades, retención o capacidad de pago.
No instalar herramientas, ampliar planes, añadir tarjetas ni generar cargos.
Si falta capacidad, escoger un método gratuito acotado o registrar bloqueo;
no sustituir evidencia faltante por PASS. No hace falta consultar proveedores
para correr un helper unitario sin red. T2/T3 no requieren servicios nuevos.

Antes de cada ejecución pesada, registrar RAM disponible, procesos propios,
destino y selección. Empezar con **un worker** y archivos secuenciales; no
solapar unitarios, SQL, build y navegador. Mantener los límites de heap existentes;
no aumentarlos ni terminar procesos ajenos como solución automática. Detener
procesos propios al terminar. Dos fallos con igual firma y sin evidencia nueva
obligan a detener ese método y registrar causa/alternativa, no otra suite completa.

Aplicar confinamiento del [runbook](../../runbooks/freeze-candidate-validation.md):
sin sourcemaps, telemetría, correo o pagos reales desde pruebas. No debilitar
guards, assertions, umbrales ni fixtures para conseguir verde. No ampliar el
runner017: su allowlist no incluye automáticamente auditoría014. Usar navegador
manual reproducible o automatización existente adecuada al caso, con candidato,
configuración, controles y cleanup registrados.

| Momento    | Validación necesaria                                                                                          |
| ---------- | ------------------------------------------------------------------------------------------------------------- |
| T2         | Archivo unitario del helper; no requiere Docker, build ni navegador                                           |
| T3         | Tabla y acción admin, SQL19 por runner oficial, recorrido browser acotado                                     |
| Lote T2/T3 | Una pasada de tipos/lint y controles documentales; repetir sólo si cambios posteriores invalidan el resultado |
| Final016   | Suite completa/cobertura, SQL completo, build y recorridos integrados del candidato posterior a015            |

Para browserT3 reutilizar un runtime/build local válido sólo si sirve exactamente
el contenido/configuración a aceptar. Si no existe, preparar **un** build confinado
según el runbook y ejecutarlo antes del navegador, nunca en paralelo. Registrar
bundler y límites. Si no cabe, conservar la aceptación browser pendiente y acordar
un método alternativo; no aceptar T3 únicamente por unitarios. El build integrado
final sigue en016; un build anterior sólo se reutiliza con justificación de vigencia.

## Reglas y prácticas obligatorias

Leer las ocho reglas locales según los archivos y sus consumidores. Contrastar
TypeScript, JavaScript, SQL, React/Next, pruebas y Realtime; registrar aplicación,
excepciones y contradicciones. Prevalecen AGENTS y los contratos ejecutables:
`src/env.ts`, React Compiler, `cacheComponents: false` y diseño Iroko.
CREATE OR REPLACE conserva ACL existentes; no inferir regrants PUBLIC universales.

Lectura2026-11-05: `code-quality.md`, `git-workflow.md`,
`jsdoc-documentation.md`, `software-principles.md`, `supabase-realtime.md`,
`supabase-setup.md`, `testing-standards.md`, `typescript-nextjs.md`.
Aplicación: TypeScript estricto/import type, JS asíncrono con errores observables,
límites servidor/cliente, SQL/RLS existentes y pruebas de comportamiento según
TESTING-PLAN. Realtime no cambia: no migrar canales por esta tarea. Excepciones
por autoridad superior: `src/env.ts` (no env.js), `cacheComponents:false` (no
introducir use cache), React Compiler (sin memoización manual), diseño Iroko
(no Material3), cuatro idiomas completos. No ejecutar sincronización remota,
limpieza de ramas o suites generales por una receta local de Git. Antes de código
Next, leer las guías pertinentes instaladas en `node_modules/next/dist/docs/`.

## Ejecución histórica autorizada — 2026-10-08 (T1)

- Rama local: `codex/014-t1-robot-permissions`; base actual `dfa228fb63e762a77beb291b828561d4547ed2e9`.
- Autorización del mantenedor: comenzar 014-T1 y trabajar con agentes paralelos.
- Preservar documentación previa de 016-T1; no incluirla silenciosamente en una corrección de Robot.
- [Registro de ejecución](../../audits/2026-10-08-plan-014-t1-execution.md).
- Preflight original con Docker inaccesible; superado con proyecto desechable `iroko-014-20261008`, separado del entorno del mantenedor.
- Gate local Sentry implementado y probado; build webpack y E2E aislados aprobados sin uploads. Build canónico Turbopack y Cloud siguen no verificados.

## Review Focus

1. URL directa o acción guardada con robot apagado: denegar antes de acceder a datos (T1).
2. JWT con rol antiguo, viewer u otro tenant mediante PostgREST/RPC: denegar escritura en SQL (T1).
3. Host con prefijo parecido, userinfo o puerto no autorizado: no confiar en una comparación textual (T2).
4. Filtros/paginación de auditoría plataforma: no cambiar a consulta de cuenta ni perder identificadores (T3).
5. Error o interacción solapada: conservar filtro aplicado/filas/cursor coherentes,
   mostrar fallo y permitir reintento sin mezclar consultas (T3).

## T1 — Robot oculto y permisos reales

**Files:**

- Modify: `src/app/[locale]/dashboard/robot/page.tsx`, `src/lib/robot-config.ts`,
  `src/config/app.config.ts` (comentario de alcance).
- Modify: `src/lib/__tests__/robot-config.test.ts`, `supabase/schemas/public.sql`.
- Create: `src/app/[locale]/dashboard/robot/__tests__/page.test.tsx`.
- Create: `supabase/migrations/20261008120000_robot_reference_rbac.sql` y
  `supabase/tests/database/43_robot_reference_rbac.test.sql` (verificar antes
  de ejecutar que el nombre/número siga libre; si cambió, actualizar este plan).
- Create: `src/test/e2e/robot-disabled.spec.ts`.

**Interfaces:** mantener `uploadRobotConfigAction(prev, FormData)` y
`getDownloadUrl(path)`. Con flag falso: página `notFound()`, acciones
`{ error: 'module_disabled' }`, sin clientes/efectos externos. Con flag verdadero:
escritura/reemplazo para owner/admin/member vivos, lectura para membresías
vivas; viewer no escribe. RPC conserva firma y transacción; denegación SQL
`42501`/`not_authorized`. Borrado directo de filas del dominio: solo owner.
Limpieza de archivos reemplazados del propio tenant: roles editores, igual que
la subida; no generalizar esta regla a documentos de otros módulos.

- [x] **RED aplicación.** En los tests existentes añadir mock mutable de
      `appConfig`, restaurarlo en `beforeEach` y fijar `robot=true` para casos que
      prueban parsing. Añadir:

  ```ts
  it('denies a valid upload when the example is disabled', async () => {
    appConfig.features.verticals.robot = false;
    const form = makeUploadForm(await makeXlsxFile(validSheets));
    expect(await uploadRobotConfigAction(PREV, form)).toEqual({ error: 'module_disabled' });
    expect(mocks.storageUpload).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  ```

  Mockear `@/config/app.config` con
  `{ appConfig: { features: { verticals: { robot: true } } } }` e importar el
  singleton. Añadir caso equivalente para `getDownloadUrl`, y test de página
  donde `notFound` lanza `NEXT_NOT_FOUND` y `createClient` no se llama.
  Ejecutar `pnpm test src/lib/__tests__/robot-config.test.ts "dashboard/robot/__tests__"`.
  Observar el fallo por ausencia del guard, no por mocks incompletos.

- [x] **RED base de datos.** Crear fixture transaccional con cuenta A, owner,
      admin, member, viewer y usuario de cuenta B siguiendo los fixtures y
      `pg_temp.act_as` de `29_rbac_matrix.test.sql`. Añadir un caso por actor para
      RPC, INSERT/UPDATE/DELETE de cada `robot_*` y `storage.objects` del bucket.
      Para viewer verificar SQLSTATE y ausencia de efectos; para UPDATE/DELETE
      verificar filas, no solo ausencia de excepción. Para JWT obsoleto bajar el
      rol real a viewer y mantener claim member. Ejemplo de aserción con el UUID
      de cuenta A fijado en `00000000-0000-0000-0000-000000004310`:

  ```sql
  SELECT throws_ok(
    $$SELECT public.replace_robot_config(
      '00000000-0000-0000-0000-000000004310', '[]', '[]', '[]')$$,
    '42501', 'not_authorized', 'viewer cannot replace robot configuration');
  ```

  Contar explícitamente los asserts en `plan(...)`; finalizar con
  `finish()`/`ROLLBACK`. Probar también anon, miembro eliminado y cuenta B.
  `pnpm supa:test` sobre la base desechable debe mostrar las regresiones.

- [x] **Implementación mínima.** Guard de flag al inicio de página y de ambas
      acciones, antes de crear cliente/parsear. Reutilizar `requireAccountRole`
      para mutaciones con roles editor; la base sigue siendo autoridad final.
      En la nueva migración reemplazar el chequeo de membresía de
      `replace_robot_config` por rol vivo owner/admin/member, conservando la
      transacción. Sustituir las políticas permisivas de escritura de routines,
      contacts, memories y bucket robot_configs por la matriz indicada; no añadir
      una policy restrictiva dejando otra permisiva equivalente activa. Mantener
      lectura tenant-scoped, `search_path=''` y grants mínimos del RPC.

- [x] **GREEN y cierre.** Aplicar solo a DB desechable; probar desde navegador
      autenticado `/es/dashboard/robot` con flag falso y comprobar página no
      disponible, sin depender del sidebar. Repetir unit/SQL; regenerar tipos solo
      si cambió esquema expuesto. Ejecutar typecheck/lint y E2E
      `pnpm test:e2e robot-disabled`. Registrar que un flag de aplicación no elimina
      esquemas ni revoca por sí mismo el acceso SQL permitido a roles autorizados.
      Actualizar auditoría RS-01 y revisar migración/espejo. Commit local sugerido:
      `fix: enforce robot reference availability and roles`.

**Evidencia de cierre local T1:** [registro](../../audits/2026-10-08-plan-014-t1-execution.md).
SQL240/0, unitarios1092, typecheck/lint aprobados y E2E1/1; build verificado
con webpack en copia aislada por límite del junction de Turbopack. Sin Cloud,
merge ni deploy. Recomendación siguiente según orden acordado:012.1—Grants.

## T2 — Origen confiable de imágenes

**Files:** `src/lib/storage.ts`, `src/lib/__tests__/small-helpers.test.ts`.
**Interfaces:** conservar `storageUrl(path): string | null`; rutas relativas
continúan construyendo CDN, HTTPS del origen exacto y host Google permitido
continúan admitidos. No ampliar permisos de HTTP absoluto en este cambio.

- [x] **RED.** Añadir al describe existente:

  ```ts
  it.each([
    'https://proj.supabase.co.attacker.example/a.png',
    'https://proj.supabase.co@attacker.example/a.png',
    'https://proj.supabase.co:444/a.png',
    'https://user:pass@proj.supabase.co/a.png',
    'https://user:pass@lh3.googleusercontent.com/a.png',
    'https://lh3.googleusercontent.com:444/a.png',
    'https://lh3.googleusercontent.com.attacker.example/a.png',
  ])('rejects an untrusted absolute image URL: %s', (value) => {
    expect(storageUrl(value)).toBeNull();
  });
  ```

  Ejecutar `pnpm test src/lib/__tests__/small-helpers.test.ts --maxWorkers=1 --no-file-parallelism`;
  observar fallo de los casos vulnerables. No exigir que fallen controles ya seguros.
  Conservar positivos de CDN relativo, origen exacto y Google, incluido HTTPS443;
  comprobar HTTP denegado, URL inválida y path vacío/null/undefined.

- [x] **Implementar.** Tras parsear y exigir HTTPS, rechazar `username` y
      `password`; comparar `parsed.origin` con `new URL(SUPABASE_URL).origin`.
      Para Google mantener hostname exacto y puerto HTTPS estándar. Conservar
      `null` ante URL inválida. No cambiar CSP como sustituto del chequeo.
- [x] **GREEN.** Repetir el comando focalizado y comprobar casos
      existentes de Google, CDN relativo, URL inválida, HTTP y ausencia de path.
      Actualizar RS-02 y su alias S-04 con SHA/resultado y revisión del diff.
      Tipos/lint al cierre del lote según el presupuesto anterior. Commit sugerido:
      `fix: validate image origins with parsed URLs`.

## T3 — Auditoría de plataforma coherente al interactuar

**Files:**

- `src/components/dashboard/activity/audit-log-table.tsx` y su test existente.
- `src/app/[locale]/dashboard/admin/audit/page.tsx`.
- `src/app/[locale]/dashboard/admin/audit/actions.ts` solo si necesita una
  adaptación tipada; conservar su autorización SQL.
- `messages/en.json`, `es.json`, `pt.json`, `fr.json` para error de carga.
- `docs/modules/platform-admin.md`.

**Interfaces:** conservar variante `account` como default. Para `platform`,
usar `getPlatformAuditLogs` y mapear cada resultado con el mismo contrato que
la carga inicial (`accountId`/`impersonatorId` a columnas actuales); cursor
`{ createdAt, id }`, `action` y `resourceType` se mantienen. Ningún string SQL
ni secreto nuevo en cliente. No añadir filtros que el producto no tiene.

**Contrato de interacción:** separar filtro solicitado del aplicado. Sólo al
éxito se confirman filtro/filas/cursor; si falla, restaurar selects al filtro
aplicado, conservar filas/cursor y ofrecer reintento explícito de la solicitud
fallida. Paginar siempre usa el filtro aplicado. Serializar solicitudes: bloquear
selects, cargar más y reintento mientras hay una solicitud y proteger la entrada
del handler contra doble invocación antes del siguiente render. Sin nueva librería.
El reintento conserva tipo de operación (filtro/página) y argumentos fallidos;
al comenzar otra intención se descarta el error/reintento anterior. Nunca volver
a usar un cursor viejo tras paginar o aplicar otro filtro. Añadir regresión de
fallo seguido de operación distinta exitosa: no queda reintento obsoleto disponible.

- [x] **RED.** Extender el test con mock de `getPlatformAuditLogs`, respuestas
      paginadas y `fireEvent`/`waitFor`. Con `variant="platform"`, seleccionar el
      filtro de acción y hacer clic en cargar más. Esperar la fila de otra cuenta
      y que `getAccountAuditLogs` no haya sido llamado. Caso concreto de filtro:

  ```ts
  fireEvent.change(
    screen.getByRole('combobox', {
      name: es.ActivityLog.filter_action_label,
    }),
    { target: { value: 'create' } },
  );
  await waitFor(() =>
    expect(getPlatformAuditLogs).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'create' }),
    ),
  );
  expect(getAccountAuditLogs).not.toHaveBeenCalled();
  ```

  Agregar cursor real al fixture y comprobar fila/columna devuelta, no solo
  llamadas. Ante `{ data: null, error: 'fetch_failed' }`, conservar filas y
  cursor, mostrar mensaje traducido y permitir reintento. Mantener caso account
  que nunca consulta plataforma y caso sin cursor que no ofrece otra página.
  Añadir regresiones de filtro fallido seguido de paginación (usa filtro aplicado),
  reintento que sí aplica el solicitado, excepción de transporte con conservación
  de estado y liberación de controles, y doble interacción con promesa pendiente
  (una sola solicitud; sin mezcla/duplicación de filas). Probar filtro de recurso
  además de acción y que cuenta nunca consulta plataforma. Ejecutar
  `pnpm test src/components/dashboard/activity/__tests__/audit-log-table.test.tsx --maxWorkers=1 --no-file-parallelism`.

- [x] **Implementar.** Elegir loader por variante en un único punto tipado,
      adaptar filas plataforma y utilizarlo desde filtros/cargar más. Actualizar
      filtro aplicado/datos/cursor solo si la respuesta fue exitosa. Capturar
      también errores lanzados y liberar bloqueo en finally. Reutilizar componentes de
      estado/error existentes; no rediseñar la pantalla.
- [x] **GREEN.** Repetir unit de tabla y ejecutar después
      `pnpm test "dashboard/admin/audit/__tests__" --maxWorkers=1 --no-file-parallelism`.
      Revalidar autorización `platform_admin + aal2` mediante
      `pnpm supa:test supabase/tests/database/19_platform_admin.test.sql`, con
      destino local comprobado y runner oficial; no invocar directamente
      `supabase test db`. No se prevé cambiar SQL ni regenerar tipos.
      En navegador local, admin+AAL2 y eventos propios de dos cuentas: filtrar,
      cargar otra página, comprobar cuenta/impersonador y simular un fallo de
      carga controlado seguido de reintento. Fijar suficientes eventos para
      superar el límite de página; comprobar cleanup de fixtures y sesiones.
      Preservar negativos SQL de no-admin/AAL1. Quitar la limitación del módulo
      sólo con esa evidencia. Commit sugerido:
      `fix: preserve platform audit scope across interactions`.

## Cierre del plan

- [x] T1 conserva su evidencia histórica; T2/T3 tienen RED/GREEN focalizado y revisión de diff. No recrear T1 para rellenar este checklist.
- [x] Preservar migración/espejo y evidencia SQL/RLS deT1; SQL19 y browserT3 aceptados con positivos/negativos y cleanup.
- [x] `pnpm typecheck`, `pnpm lint`, `pnpm docs:check`, formato de archivos tocados y `git diff --check` aprobados para el lote. Registrar comandos exactos y límites.
- [x] Browser/build según presupuesto anterior, sin ocultar configuración requerida. Suite completa/cobertura y aceptación integrada pertenecen a016, sin rebajar sus gates.
- [x] Estado de Cloud separado; no marcar rollout hecho por pasar localmente.
- [x] Actualizar auditoría/estado, y mover a completed solo al cumplir el alcance.

No modifica Plan 011 ni resuelve RS-04/05/06/07/08/09/10. Plan 012 conserva
hardening/pricing; Plan 015 conserva modularidad y adopción. No se ejecuta
ningún paso de implementación durante la investigación documental.
