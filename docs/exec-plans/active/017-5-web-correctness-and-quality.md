# 017.5 — Web correctness and quality Implementation Plan

**Alcance vigente 2026-10-28:** [ADR0005](../../adr/0005-replicable-saas-mvp-and-bounded-acceptance.md).
T11 y su runner SQL atestado se conservan. Se retira del camino crítico sólo
el runner development del editor. Priorizar riesgos y usabilidad esencial de
superficies ofrecidas; disponer P2 secundarios con dueño/retorno. T10 coordina
con015-T1 la selección explícita de CI para el MVP, sin esconder fallos, bajar
umbrales ni omitir pruebas de exclusión. No modificar CI durante esta entrega
documental ni declarar que ya soporta el candidato.

> **Ejecución:** aplicar el [contrato común de 017](017-freeze-remediation.md#contrato-de-ejecución-independiente-del-modelo--2026-10-27). No requiere plugins específicos.

**Goal:** Corregir pendientes P2 concretos de interfaz, autenticación, CI y pruebas sin ampliar el producto.

**Architecture:** Mantener rutas, componentes, RPCs y herramientas actuales; reparar cada contrato en su frontera y validar su consumidor. Los candidatos condicionados empiezan con reproducción y pueden cerrarse sin cambio ejecutable si la evidencia demuestra ausencia del defecto.

**Tech Stack:** Next.js 16, React 19 Compiler, TypeScript strict, Supabase, Vitest, Playwright, GitHub Actions y Node.js.

**Spec:** [017 — freeze remediation](017-freeze-remediation.md). Estado: **ejecución local parcial**; consultar CSV y [evidencia P2](../../audits/2026-10-22-017-5-p2-execution.md). Base `a2feb3de9ca95bef5b18c7f6d2b4a4e88f6f899f`; renovar árbol y contenido al ejecutar.

## Cómo retomar este hijo

Leer las filas de su tarea en el [registro único](freeze-remediation-register.csv).
**Files/Interfaces** delimitan el cambio; **Resultado y límite** y los escenarios
fijan la aceptación. Los pasos RED/crear/implementar solo aplican a lo ausente o
regresado: primero inspeccionar lo ya existente. Dependencias, bloqueo, destinos,
gates compartidos y revisión por lote se rigen por el padre. Evidencia pendiente
no implica falta de código. No ejecutar otro plan al cerrar este hijo.

## Global Constraints

- Orden: P1 de 017, 012.5/014, este bloque P2, 015 y validación integrada 016-T2. T11 puede adelantarse si bloquea SQL/E2E de P1.
- No instalar dependencias, modificar Cloud, proveedores, branch protection, deploy, push ni merge por este documento.
- Conservar React Compiler, `src/proxy.ts`, `src/env.ts`, `cacheComponents: false`, cuatro locales y tokens Iroko.
- Reusar stack `saas-boilerplate`; identificar destino de cada test que escribe. Build/E2E requieren local validation y upload Sentry deshabilitado según spec común.
- N18/N25/N26/N29 pertenecen a 017.1; N09 a 012.5; S10 a 015. N24/N30 tienen corrección actual: no abrir otra reparación sin regresión demostrada.
- Cada tarea registra resultado focal y evidencia; distinguir ejecución existente y pendiente mediante el CSV. Revisión y gates se comparten por lote según el padre.

## Review Focus

- Segundo intento tras fallo de autenticación sin CAPTCHA: T5 debe seguir habilitado.
- Respuesta antigua después de filtro nuevo: T8 debe descartarla sin borrar resultados vigentes.
- Cancelación CI: T10 no debe convertirla en verde.
- Negativo Storage por ruta inválida: T11 requiere primero control positivo de editor.
- Interfaz que anuncia éxito pero conserva estado anterior: T6/T7 deben comprobar datos y feedback.

## Reglas y excepciones

Leídas las ocho reglas locales (typescript-nextjs, testing-standards, supabase-setup, supabase-realtime, software-principles, jsdoc-documentation, git-workflow, code-quality) y `TESTING-PLAN.md`. Aplicar import type, no any, Zod en fronteras, errores visibles, mocks acotados y assertions observables. `env.ts` prevalece sobre env.js histórico; no añadir use cache ni manual useMemo/useCallback. Tokens Iroko prevalecen sobre M3 antiguo. Migración manual + espejo según excepción Windows; no copiar recetas SQL/asyncEffect incorrectas de Realtime. Las pruebas de Tabs cubren lógica propia modificada: excepción justificada a «no testear primitivas visuales». La regla Git no autoriza limpiezas/pull/merge. Releer design-system si una reparación necesita cambios visuales fuera de feedback existente.

## Convención de ejecución

Cada tarea termina con sus tests focalizados; typecheck, lint y revisión independiente
se ejecutan una vez por lote coherente según el padre. Un fallo propio impide cerrar
esa tarea aunque otra pase. Los criterios de revisión bajo cada tarea son puntos
para esa revisión compartida, no convocatorias separadas. Los commits sugeridos
son nombres opcionales, no autorización ni obligación de un commit por tarea.

## Task 017.5-T1: Origen y rutas sitemap — N02/N03

**Resultado y límite:** XML generado usa SITE_URL y excluye rutas privadas en cuatro locales. No tratar sitemap/robots como autorización ni cambiar rutas.

**Files:** Modify `next-sitemap.config.js`; create `scripts/__tests__/sitemap-config.test.cjs`; generated `public/sitemap*.xml`/`public/robots.txt` solo mediante generación cuando existan versionados.

**Interfaces:** Consumir `SITE_URL` como único origen configurado; fallback localhost únicamente para generación local. `transform(config, path)` devuelve null para segmentos dashboard/auth y rutas login/signup/forgot-password/reset-password/confirmation, con o sin `en/es/pt/fr`. No consumir `NEXT_PUBLIC_APP_URL`; no eliminar rutas públicas legales/producto/pricing.

- [ ] Escribir tabla de rutas con `node:test`: `/es/dashboard`, `/fr/dashboard/account`, `/en/auth/callback`, `/pt/login` => null; `/es/pricing` => entrada pública. Configurar SITE_URL A y variable antigua B: `assert.equal(config.siteUrl, A)`.
- [ ] Ejecutar `node --test scripts/__tests__/sitemap-config.test.cjs`, comprobar rojo por patrón/origen.
- [ ] Implementar filtro compartido dentro config y robots coherente; rechazar origen configurado inválido con error claro, sin emitir sitemap apuntando a otro dominio.
- [ ] Repetir tests y `pnpm exec next-sitemap` tras build local permitido; inspeccionar XML generado sin rutas privadas y con origen esperado.
- [ ] Criterio de revisión del lote: no cambiar auth ni interpretar robots como control de acceso. Commit: `fix: align sitemap origin and locale exclusions`.

## Task 017.5-T2: Recuperación global — N08

**Resultado y límite:** Botón de recuperación llama reset sin exponer error privado. No prometer recuperación de errores persistentes ni cambiar observabilidad.

**Files:** Modify `src/app/global-error.tsx`; create `src/app/__tests__/global-error.test.tsx`.

**Interfaces:** `GlobalError({error, reset}: {error: Error & {digest?: string}; reset: () => void})`. Mantener captura Sentry y boundary html/body requerido para global-error; botón accesible llama reset una vez, sin depender de providers fallidos.

- [ ] Test `should retry without exposing error details`: click botón, `expect(reset).toHaveBeenCalledOnce()`; mensaje privado de error no aparece.
- [ ] `pnpm test src/app/__tests__/global-error` debe fallar antes de corrección.
- [ ] Añadir callback de recuperación y texto mínimo autónomo; conservar captura y no enviar secretos en UI.
- [ ] Repetir test; comprobar fallo recuperable local con boundary real, registrando si recuperación no es posible por error persistente.
- [ ] Criterio de revisión del lote: probar accesibilidad del botón y no prometer recuperación de todo error. Commit: `fix: expose global error recovery`.

## Task 017.5-T3: Traducciones administrativas — N10

**Resultado y límite:** Admin FR/PT conserva claves/ICU y no muestra inglés pendiente o claves crudas. No cambiar oferta comercial ni permisos.

**Files:** Modify `messages/fr.json`, `messages/pt.json`; read `messages/en.json`, `messages/es.json`. Create `scripts/__tests__/admin-translations.test.cjs`.

**Interfaces:** Preservar namespaces/claves/tokens ICU; traducir valores ingleses administrativos pendientes. Nombres de productos, roles técnicos y siglas legítimas pueden mantenerse mediante allowlist explícita de claves, no una comparación ciega de todos los valores.

- [ ] Inventariar hojas de Admin/Impersonation/ActivityLog iguales a EN y clasificar traducción pendiente o nombre propio.
- [ ] Crear test de paridad de claves, placeholders ICU y muestras `Admin.accounts_search_placeholder`, `Admin.announcements_title` distintas del inglés. `node --test scripts/__tests__/admin-translations.test.cjs` debe identificar valores pendientes.
- [ ] Traducir FR/PT con significado equivalente, sin alterar pricing/promesas de 012.5 ni permisos.
- [ ] Repetir test; renderizar páginas administrativas locales FR/PT y verificar ausencia de claves crudas, truncamiento funcional y texto inglés no permitido.
- [ ] Review gate lingüístico y técnico; commit `fix: complete administrative translations`.

## Task 017.5-T4: Límites y selección de uploads — N11/N12

**Resultado y límite:** Selección inválida no envía el archivo anterior y transporte/servidor/UI respetan techo verificado. No incrementar capacidad ni afirmar límite Cloud sin evidencia.

**Files:** Modify `src/components/dashboard/robot/excel-upload.tsx`, `src/components/dashboard/account/profile-tab.tsx`, `src/components/dashboard/org-settings/general-tab.tsx`, `src/app/[locale]/dashboard/account/actions.ts`, `src/app/[locale]/dashboard/org/settings/actions-logo.ts`, `next.config.ts`; create `src/lib/validation/upload-limits.ts`, `src/components/dashboard/robot/__tests__/excel-upload.test.tsx`. Extend `src/app/[locale]/dashboard/org/settings/__tests__/actions-logo.test.ts`.

**Interfaces:** `MAX_UPLOAD_BYTES = 5 * 1024 * 1024` como techo común existente; no incrementar capacidad funcional. Alinear bodySizeLimit a `6mb` para multipart, con validación servidor de 5 MiB por archivo y rechazo de campos adicionales sobredimensionados; verificar presupuesto del runtime destino antes de aceptar límite efectivo. Si el runtime impone menos de 5 MiB, reducir explícitamente techo UI/servidor a ese valor comprobado y registrar decisión, nunca anunciar un tamaño imposible.

- [ ] Tests selección A válida seguida de B inválida: botón disabled, A no se envía. Parametrizar 5MiB-1/5MiB/5MiB+1; rechazo de transporte muestra error y permite seleccionar otra vez.
- [ ] `pnpm test src/components/dashboard/robot/__tests__/excel-upload` y tests existentes account/actions: registrar rojo.
- [ ] Limpiar file/input/preview al rechazar selección; capturar rechazo asíncrono, usar límite común y respetar tipos/MIME existentes. No habilitar Robot por corregir su componente.
- [ ] Unitarios verdes y prueba HTTP multipart local real de frontera; si infraestructura Cloud no se consulta, límite Cloud `[NO VERIFICADO]` y no declarar aceptación allí.
- [ ] Criterio de revisión del lote: tamaño, tipo, error y presupuesto de transporte coherentes; commit `fix: align upload validation and selection state`.

## Task 017.5-T5: Reintento Auth, retorno y CAPTCHA — N13/N14/N15

**Resultado y límite:** Reintento Auth conserva readiness, next seguro e invitación/MFA; N15 solo cambia si se reproduce. No desactivar CAPTCHA ni anti-enumeración.

**Files:** Modify `src/app/[locale]/(auth)/login/page.tsx`, `signup/page.tsx`, `forgot-password/page.tsx`, `(auth)/actions.ts`, `src/components/auth/captcha-field.tsx`; read `src/lib/auth/safe-redirect.ts`, `src/app/[locale]/auth/accept-invitation/route.ts`; create `src/test/e2e/auth-form-contracts.spec.ts`, `src/components/auth/__tests__/auth-form-contracts.test.tsx`.

**Interfaces:** Mantener nombres de acciones actuales. Password y MFA/recovery reciben hidden `next` saneado mediante safeRedirectPath; acciones respetan precedencia onboarding y continuación de invitación. Sin site key, reset mantiene ready=true. Magic-link incluye su propio captchaToken cuando existe site key; no reutilizar token consumido por password.

- [ ] Reproducir N15 con cliente/GoTrue local configurado para exigir token mediante dobles de frontera; registrar configuración efectiva. Si protección no aplica a ese flujo, documentar evidencia y cerrar condición sin cambiar comportamiento ni inferir bypass.
- [ ] Tests: dos envíos tras primer error sin site key; con key botón espera token nuevo; magic-link transmite token solo del formulario correcto. Invitado anónimo termina aceptación correcta tras password y MFA, `next=https://evil.example` no sale del origen.
- [ ] Ejecutar `pnpm test src/components/auth/__tests__/auth-form-contracts` y tests de acciones Auth; rojo por contrato real.
- [ ] Implementar readiness/return path y, solo si reproducción N15 confirma falta, integrar CAPTCHA magic-link. No degradar anti-enumeración, safe redirects ni MFA.
- [ ] Unitarios y `pnpm test:e2e src/test/e2e/auth-form-contracts.spec.ts --project=chromium` local; comprobar membresía/estado aceptado, no solo URL.
- [ ] Criterio de revisión del lote: tokens single-use, reintento y retorno validado; commit `fix: preserve authentication form contracts`.

## Task 017.5-T6: Sesión actual y revocación — N16/N17

**Resultado y límite:** Sesión actual se identifica por claim; revocar refresca supervivientes y fallo conserva filas con error visible. No derivar identidad del orden de la lista.

**Files:** Modify `src/components/dashboard/account/sessions-tab.tsx`, `sessions-tab-client.tsx`, `src/app/[locale]/dashboard/account/actions.ts`; create `src/components/dashboard/account/__tests__/sessions-tab-client.test.tsx`.

**Interfaces:** Añadir `currentSessionId: string | null` a props del cliente, obtenido del claim verificado `session_id`; nunca derivar por índice. Conservar acciones existentes y volver a consultar `listMySessions(): Promise<SessionRow[]>` tras revocación exitosa; actualizar lista solo con resultado válido y presentar error explícito en fallo. Ausencia de session_id no identifica arbitrariamente una fila.

- [ ] Test con sesión actual segunda en lista: solo su fila tiene badge/protección. Revoke-all exitoso muestra únicamente supervivientes retornados; error conserva filas y muestra aviso.
- [ ] `pnpm test src/components/dashboard/account/__tests__/sessions-tab-client` rojo.
- [ ] Implementar identidad y refresco sin copiar props una sola vez como autoridad permanente; mantener checks backend.
- [ ] Repetir test y flujo local de dos sesiones reales con updated_at invertido; comprobar sesión ajena revocada y actual usable.
- [ ] Criterio de revisión del lote: no confundir lista vacía con fallo; commit `fix: identify and refresh authenticated sessions`.

## Task 017.5-T7: Feedback de formulario — N19/N20

**Resultado y límite:** Cada envío confirmado limpia solo su snapshot y permite una segunda subida; edición posterior se conserva. No crear otra abstracción genérica de formularios.

**Files:** Modify `src/components/dashboard/account/security-tab.tsx`, `profile-tab.tsx`; create `src/components/dashboard/account/__tests__/account-feedback.test.tsx`.

**Interfaces:** Conservar SettingsActionState y acciones actuales. Comparar identidad de resultado de cada envío, no únicamente string success; limpiar dirty/selección solo del snapshot enviado y confirmado, sin borrar ediciones posteriores.

- [ ] Test email/password editados -> éxito visible; dos uploads sucesivos con `avatar_updated` -> input vacío/botón disabled ambas veces. Editar durante request -> no borrar edición nueva.
- [ ] `pnpm test src/components/dashboard/account/__tests__/account-feedback` rojo.
- [ ] Implementar seguimiento de envío y resultado; mensajes de error permanecen visibles y se pueden reintentar.
- [ ] Repetir tests y flujo local de dos avatars con reload verificando segunda imagen persistida.
- [ ] Criterio de revisión del lote: preservar fix S02 de 017.1 y no duplicarlo aquí; commit `fix: reconcile account form feedback`.

## Task 017.5-T8: Administración — N21/N22/N23

**Resultado y límite:** Detalle fuera de primeras 100 cuentas es accesible al admin autorizado; respuestas antiguas no pisan búsqueda y errores son fieles. No descargar todas las cuentas ni relajar AAL2.

**Files:** Modify `src/app/[locale]/dashboard/admin/accounts/actions.ts`, `accounts-table.tsx`, `[accountId]/page.tsx`, `src/app/[locale]/dashboard/admin/alerts/alert-form.tsx`, `src/app/[locale]/dashboard/admin/announcements/announcement-form.tsx`; extend tests existentes de accounts/actions y accounts-table; create `src/components/dashboard/account/__tests__/admin-error-feedback.test.tsx`. Modify SQL public/migration/types solo para lookup por ID autorizado.

**Interfaces:** Añadir `getAdminAccount(accountId: string): Promise<{data: AdminAccountEntry | null; error?: string}>`, RPC `public.get_admin_account(p_account_id uuid)` con el mismo row shape y autorización viva/AAL2 que `get_admin_accounts`; reusar serialización AdminAccountEntry, no paginar todo para encontrar ID. Tabla utiliza generación monotónica compartida búsqueda/paginación; resultado obsoleto no reemplaza ni concatena. Formularios usan error genérico traducido para códigos desconocidos, preservando errores específicos de permiso/validación.

- [ ] Tests cuenta fuera de primeras100 -> detalle real; no-admin/AAL1 -> denegado. Promesas búsqueda A/B invertidas y loadMore A resuelto con filtro B -> solo B visible. Fallo genérico no muestra not_platform_admin.
- [ ] `pnpm test "admin/accounts/__tests__" src/components/dashboard/account/__tests__/admin-error-feedback` rojo por los tres contratos.
- [ ] Implementar lookup con migración manual/espejo y ACL equivalente; renovar tipos localmente. Añadir generación al estado, preservar resultados ante error y feedback fiel.
- [ ] Repetir unitarios; `pnpm supa:test` local verifica RPC con admin y negativos; browser confirma cuenta101 accesible desde búsqueda.
- [ ] Criterio de revisión del lote: no relajar autorización ni introducir descarga global de cuentas; commit `fix: preserve administrative lookup and request state`.

## Task 017.5-T9: Primitivas y boundary 404 — N27/N28

**Resultado y límite:** Tabs transmite orientación y teclado; 404 solo se cambia si se demuestra fallo. No refactorizar boundaries por hipótesis.

**Files:** Modify `src/components/ui/tabs.tsx`, `src/app/not-found.tsx` solo si reproducción lo requiere; read `src/app/layout.tsx`; create `src/components/ui/__tests__/tabs.test.tsx`, `src/test/e2e/not-found-contract.spec.ts`.

**Interfaces:** Tabs prop `orientation: 'horizontal' | 'vertical'` se transmite a Radix Root, no únicamente data-attribute. Mantener contrato root not-found con un único html/body efectivo y enlaces existentes; no tocar global-error de T2 por confundir boundaries.

- [ ] Reproducir orientación vertical con teclado/ARIA y 404 sin locale en navegador/HTML recibido. Si Next maneja html/body sin anidamiento/error, cerrar N28 con evidencia y corregir solo comentario contradictorio; no inventar fallo hidratación.
- [ ] Test vertical `expect(tablist).toHaveAttribute('aria-orientation','vertical')`, flechas verticales cambian foco. E2E 404 comprueba una raíz/body, texto visible y cero errores hidratación.
- [ ] Ejecutar `pnpm test src/components/ui/__tests__/tabs` y E2E local; registrar rojo solo donde exista defecto.
- [ ] Pasar orientation al Root; corregir markup del 404 únicamente cuando evidencia lo exija. Repetir ambos controles.
- [ ] Review gate de condición, accesibilidad y comportamiento framework; commit `fix: align tabs and not-found contracts` o commit documental si N28 no requiere código.

## Task 017.5-T10: Gates CI — S05/S06

**Resultado y límite:** Cancelled/failure/desconocido bloquean E2E Status y Build depende de security. No modificar branch protection; coordinar R01 exclusivamente con T11.

**Files:** Modify `.github/workflows/ci.yml`; create `scripts/check-e2e-status.mjs`, `scripts/__tests__/check-e2e-status.test.mjs`; actualizar guía CI correspondiente en ejecución.

**Interfaces:** Exportar `acceptE2eResults(results: readonly string[], allowSkipped: boolean): boolean`; true solo para success o skipped autorizado. CLI recibe `E2E_RESULT`, `WEBKIT_RESULT`, `ALLOW_SKIPPED`, exit1 para cancelled/failure/desconocido. Workflow establece allowSkipped únicamente para eventos/ramas donde jobs E2E son intencionalmente omitidos según sus if actuales; nunca por observar resultado skipped. Añadir job `security` a Build.needs con su nombre real verificado en YAML.

- [ ] Test tabla success/success=>true, success/cancelled=>false, skipped/skipped=>false sin permiso y true con permiso; unknown=>false. Inspección estructural exige security en needs.
- [ ] `node --test scripts/__tests__/check-e2e-status.test.mjs` rojo.
- [ ] Implementar función/CLI y consumirla desde E2E Status, mantener always() del agregador y política de dependabot explícita.
- [ ] Repetir test; revisar matriz de condiciones PR/main/dependabot/manual y YAML con herramienta ya instalada. No instalar validador.
- [ ] Criterio de revisión del lote: distinguir gate de repositorio de branch protection remota `[NO VERIFICADO]`. Ninguna configuración GitHub se modifica; commit `fix: fail CI gates on cancelled or unaudited runs`.

## Task 017.5-T11: Fixtures SQL y Storage discriminantes — D09/D10

**Resultado y límite:** Comando local y CI pasan por runner atestado, fixtures solo afectan IDs propios y Storage tiene positivos/negativos discriminantes. Resolver R01/R04/R05 antes de aceptación mutante; no debilitar el guard.

**Files:** Modify `package.json` (script supa:test), `.github/workflows/ci.yml`, `supabase/tests/database/42_billing_reconciliation_state.test.sql`, `supabase/tests/database/54_billing_recovery_fencing.test.sql`, `src/lib/billing/__tests__/discovery-persistence.test.ts`, `src/test/e2e/rbac-matrix.spec.ts`; read/reuse `src/test/local-e2e-target.ts`, `src/test/e2e/helpers.ts`; conservar/ampliar `scripts/run-reconciliation-db-test.mjs`, `scripts/__tests__/run-reconciliation-db-test.test.mjs`. R04/R05 se implementan exclusivamente aquí; 017.3 aporta contrato y aceptación, sin duplicar ownership.

**Interfaces:** Exportar `runReconciliationDbTest(target: {project: string; container: string}, testPaths: readonly string[] = []): Promise<void>` en runner Node; validar target mediante los contratos existentes de local-e2e-target antes de ejecutar psql sin shell. Mantener prueba dblink de dos sesiones reales. Conexión debe resolver al mismo postgres local identificado, no `host.docker.internal:54322` fijo; comprobar database/cluster objetivo antes de confirmar fixtures fuera de transacción. Runner recibe proyecto/contenedor identificados desde config oficial, no DSN Cloud. Teardown identifica IDs propios; falla explícitamente si no pudo limpiar y deja instrucciones de reset exclusivamente local.

**Cableado obligatorio:** cambiar el script existente `supa:test` a `node scripts/run-reconciliation-db-test.mjs`. El runner valida el proyecto/contenedor, crea la atestación local, ejecuta la suite completa mediante `supabase test db --local` cuando testPaths está vacío y pasa los paths recibidos como argumentos separados cuando no lo está. No usar shell/interpolación de DSN. Conservar salida y exit code de la suite; el nuevo script no puede omitir test42 ni reemplazarlo por mocks.

**Reanudación R01/R04/R05:** el script de package ya está cableado; no recrearlo.
En `.github/workflows/ci.yml`, job `db-tests`, preparar Node/pnpm y dependencias
del runner siguiendo los jobs existentes y sustituir la llamada directa a
`supabase test db` por `pnpm supa:test`. Runner importa TypeScript; cambiar solo
el comando no basta. Añadir control estructural del wiring y documentar que el
pase real de GitHub requiere su ejecución, no una inspección YAML.

Antes de correr test54 o discovery opt-in, aislar sus candidatos según 017.3-T1/T2.
Comprobar que proyecto local correcto no se confunde con cola vacía. No quitar
atestación ni ampliar permisos del producto para facilitar esas pruebas.

**Guard SQL contra bypass:** antes del primer dblink/INSERT remoto, test42 exige `iroko_test_guard.target_attestation`, creada exclusivamente por el runner tras comprobar destino. El schema de harness no pertenece al producto ni lleva migración: la fila contiene run_id UUID, project_id, system_identifier del cluster y expires_at; comparar project_id oficial, identidad de `pg_control_system()` y expiración vigente. Si tabla/fila/identidad falta o es incorrecta, fallar antes de cualquier efecto. Las conexiones dblink deben resolver al mismo cluster verificado (socket local del contenedor), con comparación de system_identifier en la conexión remota antes de confirmar fixtures. Teardown finally elimina fixtures propios y schema de harness, y reporta cualquier residuo; una atestación expirada nunca habilita un run posterior. No introducir una bandera global permanente que desactive la protección.

- [ ] Revalidar D10 en `rbac-matrix.spec.ts:464–481`: la URL `probe-${label}.txt` omite el segmento de usuario. El informe antiguo lo atribuye incorrectamente a qa-storage-realtime. Si al ejecutar el plan ya existen ruta válida y control positivo, cerrar con ejecución/evidencia en lugar de duplicar la corrección.
- [ ] D09: prueba del comando habitual pnpm supa:test debe demostrar que entra al runner; proyecto distinto/host remoto se rechaza antes de SQL y el fallo intermedio limpia. Ejecutar test42 directamente sin atestación debe fallar antes del primer dblink/INSERT; repetir con identidad equivocada y atestación expirada. Control positivo: runner sobre instancia oficial ejecuta todos los casos concurrentes y deja cero residuos. D10: ruta `${accountId}/${editorUserId}/probe.txt` conforme a política efectiva del bucket; editor sube/lee, viewer y usuario de cuenta B no pueden escribir ni sobrescribir ese objeto. Negativo con path inválido no sustituye estos controles.
- [ ] Ejecutar `node --test scripts/__tests__/run-reconciliation-db-test.test.mjs` y `pnpm test src/test/local-e2e-target.test.ts`. Registrar rojo y preflight: proyecto, contenedor vivo, origen loopback y nombres de recursos permitidos.
- [ ] Implementar target/teardown y positivos Storage; no relajar RLS/grants ni cambiar política para hacer pasar test. Reusar cleanup ya corregido de N30.
- [ ] `pnpm supa:test` y `pnpm test:e2e src/test/e2e/rbac-matrix.spec.ts --project=chromium` solo local. Verificar ausencia de fixtures/leases propios tras fallo inyectado.
- [ ] Criterio de revisión del lote: concurrencia real preservada, negativos discriminan permisos y el destino no depende de host externo. Commit `test: isolate database and storage acceptance fixtures`.

## Cierre y trazabilidad

- [ ] Cada ID está actualizado en registro central con tarea, SHA y evidencia o condición no reproducida explícita.
- [ ] Tests/build/browser/SQL no ejecutados se marcan `[NO VERIFICADO]`; ningún P2 se cierra por el título de una tarea.
- [ ] Cada aceptación focal y el gate compartido del lote pasan; una revisión independiente del lote cubre los criterios de tarea. Registrar desviaciones sin declarar «freeze completo».
- [ ] Documentación current-state/capabilities se actualiza solo tras ejecución; 016-T2 valida el candidato integrado después de 015.
