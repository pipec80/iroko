# Plan 014 — Corrección de superficies de referencia

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans
> to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Estado:** propuesto para revisión; investigación/documentación autorizada,
implementación no iniciada. Prioridad P0 para T1, P1 para T2/T3.

**Goal:** cerrar la exposición del ejemplo robot, la validación incorrecta de
orígenes de imágenes y la pérdida de contexto en auditoría de plataforma.

**Architecture:** mantener rutas/Server Actions y RLS como límites distintos.
Los flags controlan disponibilidad de aplicación; SQL valida roles vivos.
Reutilizar los RPCs de auditoría, sin consultas service-role nuevas.

**Tech Stack:** Next.js 16, React 19, TypeScript strict, Supabase/RLS, Vitest,
pgTAP y Playwright existentes; ninguna dependencia nueva.

**Spec:** [estrategia](../../architecture/product-strategy.md) y hallazgos
RS-01/02/03 de la [auditoría](../../audits/2026-09-24-reusable-saas-readiness.md).
Baseline: `f82d2fbe381014c80a090ba3c36c99e4778111c3`.

## Global Constraints

- Leer `TESTING-PLAN.md` antes de escribir/modificar pruebas.
- No crear `middleware.ts`; conservar `src/proxy.ts`.
- Ninguna dependencia nueva; TypeScript strict y sin `any`.
- Conservar datos, ramas, contratos billing y slugs `free` / `pro` / `scale`.
- SQL: migración nueva + espejo; no reescribir migraciones aplicadas.
- Ejecución DB/E2E solo en entorno local desechable identificado; no resetear
  el entorno existente del mantenedor por suposición.
- Cloud, pagos, push/merge/deploy requieren autorización propia.
- Un PR por tarea; resultado RED/GREEN y revisión del diff antes del siguiente.

## Review Focus

1. URL directa o acción guardada con robot apagado: denegar antes de acceder a datos (T1).
2. JWT con rol antiguo, viewer u otro tenant mediante PostgREST/RPC: denegar escritura en SQL (T1).
3. Host con prefijo parecido, userinfo o puerto no autorizado: no confiar en una comparación textual (T2).
4. Filtros/paginación de auditoría plataforma: no cambiar a consulta de cuenta ni perder identificadores (T3).
5. Error al paginar/filtrar: mostrar fallo sin borrar resultados válidos ni avanzar cursor (T3).

## T1 — Robot oculto y permisos reales

**Files:**

- Modify: `src/app/[locale]/dashboard/robot/page.tsx`, `src/lib/robot-config.ts`,
  `src/config/app.config.ts` (comentario de alcance).
- Modify: `src/lib/__tests__/robot-config.test.ts`, `supabase/schemas/public.sql`.
- Create: `src/app/[locale]/dashboard/robot/__tests__/page.test.tsx`.
- Create: `supabase/migrations/20260924180000_robot_reference_rbac.sql` y
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

- [ ] **RED aplicación.** En los tests existentes añadir mock mutable de
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

- [ ] **RED base de datos.** Crear fixture transaccional con cuenta A, owner,
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

- [ ] **Implementación mínima.** Guard de flag al inicio de página y de ambas
      acciones, antes de crear cliente/parsear. Reutilizar `requireAccountRole`
      para mutaciones con roles editor; la base sigue siendo autoridad final.
      En la nueva migración reemplazar el chequeo de membresía de
      `replace_robot_config` por rol vivo owner/admin/member, conservando la
      transacción. Sustituir las políticas permisivas de escritura de routines,
      contacts, memories y bucket robot_configs por la matriz indicada; no añadir
      una policy restrictiva dejando otra permisiva equivalente activa. Mantener
      lectura tenant-scoped, `search_path=''` y grants mínimos del RPC.

- [ ] **GREEN y cierre.** Aplicar solo a DB desechable; probar desde navegador
      autenticado `/es/dashboard/robot` con flag falso y comprobar página no
      disponible, sin depender del sidebar. Repetir unit/SQL; regenerar tipos solo
      si cambió esquema expuesto. Ejecutar typecheck/lint y E2E
      `pnpm test:e2e robot-disabled`. Registrar que un flag de aplicación no elimina
      esquemas ni revoca por sí mismo el acceso SQL permitido a roles autorizados.
      Actualizar auditoría RS-01 y revisar migración/espejo. Commit local sugerido:
      `fix: enforce robot reference availability and roles`.

## T2 — Origen confiable de imágenes

**Files:** `src/lib/storage.ts`, `src/lib/__tests__/small-helpers.test.ts`.
**Interfaces:** conservar `storageUrl(path): string | null`; rutas relativas
continúan construyendo CDN, HTTPS del origen exacto y host Google permitido
continúan admitidos. No ampliar permisos de HTTP absoluto en este cambio.

- [ ] **RED.** Añadir al describe existente:

  ```ts
  it.each([
    'https://proj.supabase.co.attacker.example/a.png',
    'https://proj.supabase.co@attacker.example/a.png',
    'https://proj.supabase.co:444/a.png',
    'https://user:pass@proj.supabase.co/a.png',
  ])('rejects an untrusted absolute image URL: %s', (value) => {
    expect(storageUrl(value)).toBeNull();
  });
  ```

  Ejecutar `pnpm test src/lib/__tests__/small-helpers.test.ts`; observar fallo.

- [ ] **Implementar.** Tras parsear y exigir HTTPS, rechazar `username` y
      `password`; comparar `parsed.origin` con `new URL(SUPABASE_URL).origin`.
      Para Google mantener hostname exacto y puerto HTTPS estándar. Conservar
      `null` ante URL inválida. No cambiar CSP como sustituto del chequeo.
- [ ] **GREEN.** Ejecutar el archivo, typecheck/lint y comprobar casos
      existentes de Google, CDN relativo, URL inválida, HTTP y ausencia de path.
      Actualizar RS-02 con SHA/resultado. Commit:
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

- [ ] **RED.** Extender el test con mock de `getPlatformAuditLogs`, respuestas
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
  Ejecutar `pnpm test src/components/dashboard/activity/__tests__/audit-log-table.test.tsx`.

- [ ] **Implementar.** Elegir loader por variante en un único punto tipado,
      adaptar filas plataforma y utilizarlo desde filtros/cargar más. Actualizar
      datos/cursor solo si la respuesta fue exitosa. Reutilizar componentes de
      estado/error existentes; no rediseñar la pantalla.
- [ ] **GREEN.** Unit de tabla y `pnpm test "dashboard/admin/audit/__tests__"`,
      typecheck/lint. Revalidar autorización `platform_admin + aal2` con SQL 19 y
      comprobar paginación/filtro en navegador con dos cuentas en entorno
      desechable. Quitar la limitación del módulo solo con esa evidencia. Commit:
      `fix: preserve platform audit scope across interactions`.

## Cierre del plan

- [ ] Las tres tareas tienen regresión observada RED/GREEN y revisión de diff.
- [ ] Migración/espejo coherentes y evidencia de SQL/RLS real para T1.
- [ ] Unit completo, typecheck, lint y checks documentales en el candidato.
- [ ] E2E afectados y build del candidato sin ocultar configuración requerida.
- [ ] Estado de Cloud separado; no marcar rollout hecho por pasar localmente.
- [ ] Actualizar auditoría/estado, y mover a completed solo al cumplir el alcance.

No modifica Plan 011 ni resuelve RS-04/05/06/07/08/09/10. Plan 012 conserva
hardening/pricing; Plan 015 conserva modularidad y adopción. No se ejecuta
ningún paso de implementación durante la investigación documental.
