# 017.4 — Editor integrity Implementation Plan

## Disposición vigente — diferido, 2026-10-28

Por [ADR0005](../../adr/0005-replicable-saas-mvp-and-bounded-acceptance.md),
N04/N05/R02 no son parte de la oferta MVP. No ejecutar ni optimizar su runner
para desbloquear el núcleo. Conservar reparación, pruebas y fallos históricos;
no hay aceptación browser. Las tareas y checklists siguientes son contrato de
retorno, NO una orden de ejecución durante el cierre actual.

RS-05/015-T1 debe demostrar exclusión efectiva de Projects/editor en la
configuración MVP; sigue pendiente en código. No basta ocultar el botón. Si
se decide ofrecerlo, reabrir este hijo, verificar revisión origen/CAS y sus
escenarios por un método adecuado, sin reducir cobertura ni afirmar PASS previo.

> **Ejecución:** aplicar el [contrato común de 017](017-freeze-remediation.md#contrato-de-ejecución-independiente-del-modelo--2026-10-27). No requiere plugins específicos.

**Goal:** Evitar pérdida silenciosa de borradores y sobrescritura de documentos entre sesiones concurrentes.

**Architecture:** Mantener el editor y las Server Actions existentes. Separar el estado de borrador de la última revisión persistida y hacer compare-and-swap (CAS) en PostgreSQL; la UI conserva el borrador si falla el guardado o hay conflicto.

**Tech Stack:** Next.js 16, React 19 Compiler, TypeScript strict, Supabase PostgreSQL, Vitest y Playwright.

**Spec:** [017 — freeze remediation](017-freeze-remediation.md). Ejecución local iniciada 2026-10-20; [evidencia](../../audits/2026-10-20-017-p1-execution.md) y [revisión independiente](../../audits/2026-10-21-017-p1-independent-review.md). El registro central conserva la disposición por tarea. Base `a2feb3de9ca95bef5b18c7f6d2b4a4e88f6f899f`, sin commit. El CAS de T2 pasó dos veces en dos sesiones browser independientes el 2026-10-22. T1 sigue pendiente: en la segunda corrida la acción interceptada nunca se observó y el selector de cuenta agotó el timeout antes de editar; ninguno constituye aceptación de borrador.

## Cómo retomar este hijo

Leer las filas de su tarea en el [registro único](freeze-remediation-register.csv).
**Files/Interfaces** delimitan el cambio; **Resultado y límite** y los escenarios
fijan la aceptación. Los pasos RED/crear/implementar solo aplican a lo ausente o
regresado: primero inspeccionar lo ya existente. Dependencias, bloqueo, destinos,
gates compartidos y revisión por lote se rigen por el padre. Evidencia pendiente
no implica falta de código. No ejecutar otro plan al cerrar este hijo.

## Global Constraints

- Solo correcciones N04/N05; no colaboración en tiempo real, autosave remoto offline ni nueva oferta.
- 017.4-T2 requiere la invariante documento/proyecto/cuenta D04 de 017.2 integrada y probada.
- Reutilizar `saas-boilerplate`; verificar identidad local antes de SQL/E2E. Cloud, deploy, push y merge requieren autorización independiente.
- Sin dependencias nuevas; preservar React Compiler, `src/proxy.ts`, `src/env.ts` y `cacheComponents: false`.
- Windows: migración manual y espejo SQL en el mismo cambio; generar tipos cuando cambie el esquema.
- Conservar cambios ajenos, secretos, datos de otros proyectos y los gates de Sentry/local validation.
- Un check unitario no cierra aceptación SQL ni browser. Consultar el CSV para distinguir comandos ya ejecutados de escenarios pendientes; no recrear CAS ni migraciones existentes.

## Review Focus

- Salir antes de 800 ms: T1 debe preservar el borrador o impedir una salida silenciosa.
- Guardado rechazado al navegar: T1 debe conservar contenido y permitir reintento.
- Cambiar documento con un save pendiente: T1 debe evitar aplicar su resultado al documento nuevo.
- Dos sesiones parten de la misma revisión: T2 debe aceptar exactamente una y señalar conflicto en la otra.
- Usuario sin permiso, documento borrado o de otra cuenta: T2 no debe revelar contenido ni aceptar el write.

## Reglas aplicadas

Leídas las ocho fuentes `.codex/rules/{typescript-nextjs,testing-standards,supabase-setup,supabase-realtime,software-principles,jsdoc-documentation,git-workflow,code-quality}.md` y `TESTING-PLAN.md`. Aplicar tipos estrictos/import type, errores tipados, funciones pequeñas, pruebas observables y documentación del contrato CAS. La regla antigua `env.js` se resuelve a `src/env.ts`; no activar `use cache` con cacheComponents deshabilitado. M3 histórico no sustituye tokens Iroko. La excepción Windows prevalece sobre `db diff`; verificar ACL efectiva, sin asumir que cada CREATE OR REPLACE repone PUBLIC. Realtime no se introduce; sus ejemplos de effects asíncronos/SQL no son recetas para copiar. No ejecutar instrucciones genéricas de pull/merge/limpieza por estar en una regla.

## Task 017.4-T1: Borrador y navegación — N04

**Resultado y límite:** Navegación conserva borrador en memoria y fallo de save no anuncia guardado; restauración conserva revisión de origen (R02). No añadir persistencia durable ni reescribir navegación.

**Files:**

- Modify: `src/components/dashboard/projects/markdown-editor.tsx`.
- Modify: `src/app/[locale]/dashboard/projects/[slug]/doc/[docId]/page.tsx`.
- Modify: `src/app/[locale]/dashboard/layout.tsx`, `src/components/layout/dashboard-layout.tsx`.
- Create: `src/components/providers/document-draft-provider.tsx`, `src/components/providers/__tests__/document-draft-provider.test.tsx`.
- Create: `src/hooks/use-document-draft.ts`, `src/hooks/__tests__/use-document-draft.test.tsx`.
- Create: `src/components/dashboard/projects/__tests__/markdown-editor.test.tsx`.
- Create: `src/test/e2e/document-editor.spec.ts`.
- Modify: `messages/en.json`, `messages/es.json`, `messages/pt.json`, `messages/fr.json`.

**Interfaces:**

- Consumir el contrato CAS de T2 ya implementado: `saveDocument(docId, content, expectedRevision): Promise<SaveDocumentResult>`. No volver a la firma antigua sin revisión.
- Producir `useDocumentDraft({docId, userId, accountId, initialContent, initialRevision, save}: {docId: string; userId: string; accountId: string; initialContent: string; initialRevision: number; save: (content: string, expectedRevision: number) => Promise<SaveDocumentResult>}): {content: string; dirty: boolean; saving: boolean; error: boolean; canEdit: boolean; setContent(value: string): void; restore(snapshot: DocumentDraft): void; flush(): Promise<boolean>}`.
- `flush()` resuelve true solo cuando el contenido más reciente está confirmado; colapsa cambios pendientes, serializa guardados propios y resuelve false conservando el borrador ante error. Un resultado anterior no limpia un borrador posterior.
- Mantener debounce de 800 ms. Guardado manual y navegación propia del editor usan el mismo flush. Navegación al proyecto solo procede si flush devuelve true.
- Para navegación SPA fuera del enlace propio, conservar borrador exclusivamente en memoria. Crear `DocumentDraftProvider({userId, accountId, children}: {userId: string; accountId: string | null; children: React.ReactNode})` y montarlo en `DashboardRouteLayout`, alrededor de DashboardLayout y fuera de PageTransition. Derivar identidad de claims verificados del layout; key del provider compuesta por userId/accountId. Una cuenta null no habilita edición ni reutiliza un borrador anterior.
- Conservar registro por instancia e integrar `type DocumentDraft = {content: string; pending: boolean; baseRevision: number}`. `get(docId)` retorna ese snapshot y `put(docId, draft)` lo conserva; `remove(docId, expectedContent)` no elimina edición posterior. `baseRevision` es la última revisión confirmada del snapshot editado, no la revisión fresca al restaurarlo. Adaptar hook, provider y editor juntos; sin singleton ni persistencia adicional.
- Al volver al documento durante la misma sesión SPA, ofrecer restaurar/descartar explícitamente; nunca sobrescribir automáticamente contenido servidor. Mantener borradores mientras provider vive y eliminar al guardar snapshot coincidente o descartar. El provider instala `beforeunload` si algún borrador está dirty/pending, incluso después de desmontar editor. Advertir que forzar salida/recarga cierra el borrador: no prometer recuperación después de hard reload, cierre de pestaña o caída del proceso.
- No escribir contenido en sessionStorage/localStorage/IndexedDB, cookies ni servidor auxiliar. Antes de logout/cambio de usuario/cuenta/impersonación, advertir de borradores y permitir guardar/cancelar. Tras transición confirmada, 017.1-T3 ejecuta `clear()` y descarta resultados asíncronos de la identidad anterior; durante transición no se muestra contenido bajo identidad nueva. Remount con key es defensa adicional. Una transición fallida conserva el borrador de la identidad original. No interceptar internals del router ni añadir dependencias.

- [ ] **Step 1 — Escribir regresiones.** `should preserve latest draft when an older save finishes`: editar A, iniciar save, editar B, resolver A; `expect(result.current.dirty).toBe(true)` y `expect(result.current.content).toBe('B')`. `should retain draft after rejected flush`: `expect(await flush()).toBe(false)`. Editor: click volver a los 100 ms; navegación no ocurre hasta resolución exitosa y contenido guardado es el último.
- [ ] **Step 2 — Confirmar rojo.** `pnpm test src/hooks/__tests__/use-document-draft src/components/dashboard/projects/__tests__/markdown-editor`; fallo debe describir pérdida/estado/ausencia de contrato, no fixture roto.
- [ ] **Step 3 — Implementar hook/provider y adaptación.** Usar refs para operación pendiente, identificación de documento y snapshot enviado; cleanup del editor cancela timer pero conserva borrador en provider. Diferenciar pendiente, error y confirmado en mensajes de los cuatro idiomas. Test provider: desmontar/remontar editor conserva borrador; cambiar key de identidad lo vacía; `remove(docId, 'A')` no borra contenido B; clear impide recuperar cualquier documento anterior.
- [ ] **Step 4 — Aceptación browser local.** En `document-editor.spec.ts`, editar y salir por enlace a los 100 ms: al volver contenido coincide. Navegar por sidebar/back con dirty y volver: ofrecer restauración en memoria; confirmarla recupera texto exacto. Probar reload con interacción previa: cancelar aviso conserva borrador; aceptar salida lo descarta y carga versión persistida, con advertencia previa clara. Probar rechazo de save y navegación a otro doc con promesa pendiente. Dos documentos no intercambian contenido; cambio de identidad no permite restaurar borrador anterior.
- [ ] R02: A edita revisión 0 y sale conservando borrador; B guarda revisión 1; A vuelve y restaura. Se conserva `baseRevision=0`, se señala conflicto sin sobrescribir B y el texto A permanece recuperable. Probar también restauración sin cambio servidor y snapshot posterior a un save confirmado. Si se añade un caso browser, actualizar la cobertura exacta del runner en el mismo cambio; no reducir casos existentes.
- [ ] **Step 5 — Verificación.** Repetir unitarios de hook/editor/provider; ejecutar `node scripts/run-plan-017-local.mjs document-editor.spec.ts` con preflight local del spec común. Resultado: asserts verdes y cleanup confirmado; si navegador no soporta aviso en una salida, registrar esa limitación y no afirmar protección universal ni recuperación durable.
- [ ] **Step 6 — Criterio de revisión del lote.** Revisor comprueba pérdida <800 ms, fallo, identidad de borrador y ausencia de «saved» prematuro. Registrar SHA/comandos y límites. Commit local sugerido tras autorización de implementación: `fix: preserve document drafts across navigation`; no push.

## Task 017.4-T2: Compare-and-swap persistente — N05

**Resultado y límite:** Dos sesiones con revisión igual no se sobrescriben y restaurar un borrador viejo no adopta silenciosamente revisión nueva. Conservar CAS SQL y permisos; no añadir colaboración en vivo.

**Files:**

- Create: `supabase/migrations/20261020174000_document_revision_cas.sql` (si timestamp ya ocupado, elegir el siguiente libre y registrar el nombre).
- Modify: `supabase/schemas/public.sql`, `src/types/database.ts`.
- Modify: `src/lib/project-documents.ts`, `src/lib/__tests__/project-documents.test.ts`.
- Modify: `src/app/[locale]/dashboard/projects/[slug]/doc/[docId]/actions.ts`, `page.tsx`.
- Modify: `src/app/[locale]/dashboard/projects/[slug]/doc/__tests__/actions.test.ts`.
- Modify: hook/editor/tests de T1 y los cuatro catálogos de mensajes.
- Create: `supabase/tests/database/0174_document_revision.test.sql`.

**Interfaces:**

- Columna `public.documents.revision integer NOT NULL DEFAULT 0 CHECK (revision >= 0)`. Trigger BEFORE UPDATE asigna `NEW.revision = OLD.revision + 1` en toda actualización; un cliente no elige/reduce la revisión y una escritura fuera del editor también invalida snapshots antiguos.
- RPC `public.save_document_revision(p_document_id uuid, p_content text, p_expected_revision integer) RETURNS TABLE(revision integer)`, SECURITY INVOKER y search_path vacío. UPDATE con id, revisión esperada y `deleted_at IS NULL`, bajo RLS vigente, devuelve revisión nueva. Cero filas es conflicto/no disponible; no retornar contenido de otra cuenta para distinguirlos. Revoke PUBLIC/anon, grant authenticated; no relajar grants/RLS de D04.
- Exportar `type SaveDocumentResult = {success: true; revision: number} | {success: false; error: 'invalid_input' | 'not_authenticated' | 'conflict_or_unavailable' | 'save_failed'}` y `saveDocument(docId: string, content: string, expectedRevision: number): Promise<SaveDocumentResult>`.
- Exportar `updateContentAtRevision(id: string, content: string, expectedRevision: number): Promise<number | null>` en `project-documents.ts`; usar RPC y conservar update genérico para consumidores que no guardan texto. Validar UUID y revisión entera >=0 en la acción; preservar límite de contenido SQL existente.
- Editor recibe `initialRevision: number`; envía la última confirmada y la avanza solo con success. Conflicto conserva borrador, suspende autosave y ofrece recargar versión servidor explícitamente; nunca retry automático con revisión nueva ni sobrescritura forzada.

- [ ] **Step 1 — Escribir regresiones SQL/actions.** Dos sesiones autenticadas autorizadas leen revisión 0: save A devuelve 1; save B con 0 devuelve cero filas; SELECT final contiene A/revisión1. Una UPDATE legítima fuera de RPC incrementa revisión. Cliente no puede asignar revisión negativa o antigua. Anon/otra cuenta/viewer/documento borrado no guardan; verificar comportamiento contra política vigente y D04.
- [ ] **Step 2 — Confirmar rojo.** `pnpm test "doc/__tests__/actions" src/lib/__tests__/project-documents` y `pnpm supa:test` solo tras preflight local. Documentar fallo por ausencia de CAS. Si el runner SQL concurrente apunta a host no identificado, adelantar 017.5-T11 antes de ejecutarlo.
- [ ] **Step 3 — Implementar migración/espejo y contrato.** Evitar SELECT de revisión seguido de UPDATE sin condición atómica. Regenerar tipos con `pnpm supa:gen:types` después de aplicar migración únicamente en local autorizado. Adaptar todos los productores/consumidores en este mismo cambio; comprobar grants efectivos y rollback transaccional.
- [ ] **Step 4 — Probar la UI y dos sesiones.** Extender `document-editor.spec.ts`: dos contextos leen misma revisión, A guarda, B intenta guardar; B muestra conflicto y mantiene borrador; reload de A conserva A. Recarga explícita de B muestra servidor sin write adicional. `expect(result.error).toBe('conflict_or_unavailable')` en acción con cero filas; error RPC distinto produce save_failed.
- [ ] **Step 5 — Verificación.** `pnpm supa:test supabase/tests/database/0174_document_revision.test.sql`, unitarios anteriores y T1, E2E de editor local. Typecheck/lint/revisión se comparten en el lote. Revalidar migración y espejo; Cloud/paridad linked permanecen `[NO VERIFICADO]`. La aceptación concurrente usa sesiones separadas, no respuestas invertidas de una sola pestaña.
- [ ] **Step 6 — Criterio de revisión del lote.** Revisor comprueba CAS real, autorización, borrador ante conflicto y ningún camino de actualización que deje revisión obsoleta. Registrar evidencia por N05 y dependencia D04. Commit sugerido: `fix: reject stale document writes`.

## Cierre del subplan

- [ ] N04/N05 tienen evidencia separada de unitarios, SQL y browser sobre candidato identificado.
- [ ] D04 y limpieza de borradores al cambiar identidad están integrados; ninguna aceptación depende de mocks para demostrar RLS.
- [ ] Actualizar registro y documentación de editor con límites reales; una revisión del lote satisface este hijo, sin otra revisión global redundante.
- [ ] El cierre no acepta todo 017, ni sustituye 016-T2/T3, ni autoriza deploy/merge.
