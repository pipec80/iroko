# 017.1 — Auth, identidad y privacidad Implementation Plan

**Alcance vigente 2026-10-28:** [ADR0005](../../adr/0005-replicable-saas-mvp-and-bounded-acceptance.md).
Priorizar acceso/identidad y privacidad de capacidades ofrecidas; reutilizar
reparaciones aceptadas. Un caso Realtime pequeño basta para el patrón, sin
plataforma colaborativa. No depender del editor/Robot ni de su runner. S09 y
otros riesgos accesibles no se difieren sólo para acelerar cierre; desactivar
una integración exige comprobar su efecto real, no sólo ocultar UI.

> **Ejecución:** aplicar el [contrato común de 017](017-freeze-remediation.md#contrato-de-ejecución-independiente-del-modelo--2026-10-27). No requiere plugins específicos.

**Goal:** Corregir contratos de contraseña, aislamiento de estado cliente y privacidad con pruebas negativas y controles positivos.

**Architecture:** Conservar Supabase como autoridad de identidad y autorización; particionar y limpiar el estado cliente sin sustituir RLS. Sanear telemetría antes de serializar y cancelar continuaciones asíncronas por generación. Las correcciones no cambian la oferta ni el modelo de permisos.

**Tech Stack:** Next.js 16, React 19 con React Compiler, TypeScript, TanStack Query 5, Supabase Auth/Realtime, PostHog, Pino, Vitest y Playwright.

**Spec:** [017 — Freeze remediation](017-freeze-remediation.md).

Ejecución local T1–T8 en curso: [evidencia](../../audits/2026-10-20-017-1-p1-execution.md), [MFA T7](../../audits/2026-10-26-017-1-t7-mfa.md) y [coordinación](../../audits/2026-10-20-017-p1-execution.md). El registro central conserva la disposición por tarea; las aceptaciones pendientes siguen **[NO VERIFICADO]**. Base inspeccionada:
`a2feb3de9ca95bef5b18c7f6d2b4a4e88f6f899f`; renovar SHA y git status al ejecutar.
Fuente: [auditoría revalidada](../../audits/2026-10-19-freeze-code-and-documentation-revalidation.md).
Responsable de implementación: frente Auth/identidad/privacidad de 017;
revisión independiente: seguridad y React. Cierre y registro: coordinador 017/016-T3.
El registro único es `freeze-remediation-register.csv` junto a este plan; no duplicar estados en otro inventario. Fase A precede 012.5/014; fase B se ejecuta después de 014 y antes de 015 conforme a la cola de 017/ROADMAP.

## Cómo retomar este hijo

Leer las filas de su tarea en el [registro único](freeze-remediation-register.csv).
**Files/Interfaces** delimitan el cambio; **Resultado y límite** y los escenarios
fijan la aceptación. Los pasos RED/crear/implementar solo aplican a lo ausente o
regresado: primero inspeccionar lo ya existente. Dependencias, bloqueo, destinos,
gates compartidos y revisión por lote se rigen por el padre. Evidencia pendiente
no implica falta de código. No ejecutar otro plan al cerrar este hijo.

## Global Constraints

- Esta aprobación documenta trabajo; no declara implementación ni aceptación. Sin instalaciones, cambios de proveedores, Cloud, deploy, push o merge implícitos.
- Reusar Supabase local `saas-boilerplate`; antes de fixtures comprobar URL loopback, project_id, contenedor y labels mediante helpers existentes. No crear otro stack ni tocar datos ajenos.
- Conservar `src/proxy.ts`, `reactCompiler: true`, `cacheComponents: false`, navegación next-intl y `src/env.ts`. Sin `any`, `useMemo`/`useCallback` manuales ni nueva biblioteca de estado.
- No cambiar SQL/ACL en estas tareas. Si una corrección demuestra necesidad SQL, registrar ampliación concreta antes de implementarla: migración manual Windows + espejo, search_path vacío, ACL efectiva conservada. CREATE OR REPLACE conserva ACL existente; no asumir regrant universal a PUBLIC.
- Leer AGENTS, docs/index/current-state, 017 y TESTING-PLAN antes de ejecutar. Los resultados antiguos no sustituyen pruebas del nuevo SHA. S-10 pertenece exclusivamente a 015-T1.
- Antes de cualquier ajuste de integración, actualizar inventario de consumidores Supabase, GitHub CI/CD, Cloudflare, PostHog, Resend, Sentry, Vercel y billing sin consultar secretos. Free-tier y sin tarjetas; no contratar servicios.
- Por tarea: regresión focal cuando existe defecto, corrección mínima y GREEN; revisión y gates por lote según el padre. No repetir implementaciones aceptadas ni marcar ejecución por redactar el plan. Commit solo dentro de autorización vigente.

## Reglas aplicadas y discrepancias

Se leyeron las ocho fuentes `.codex/rules/`: `typescript-nextjs.md`,
`code-quality.md`, `testing-standards.md`, `software-principles.md`,
`jsdoc-documentation.md`, `git-workflow.md`, `supabase-setup.md`,
`supabase-realtime.md`. TS/JS: imports type, validación en fronteras, errores
tipados y funciones pequeñas. React/Next: límites servidor/cliente y estado
derivado por identidad. Testing: mocks solo de fronteras y resultados observables;
el permiso histórico de no probar providers no impide regresiones de lógica crítica.
Realtime: conservar broadcast privado, cancelar después de setAuth y retirar
el canal exacto; no migrar protocolos ni copiar policies permisivas de ejemplos.
SQL: no aplica cambio de esquema en este lote. Contradicciones resueltas por código
y AGENTS: env.js → env.ts; receta use cache no aplica con Cache Components false;
Material 3 no sustituye Iroko; recetas de migración automática no aplican en Windows;
git-workflow no autoriza pull/merge/limpieza ajena. JSDoc documenta contratos y
efectos, no repite firmas. Sin cambios visuales de diseño.

## Review Focus

- Contraseña incorrecta con sesión válida debe dejar password sin cambios — tarea 1, GoTrue real.
- URL malformada o token doblemente codificado no debe filtrarse en payload — tarea 2.
- Respuesta antigua tras cambio usuario/cuenta no puede repoblar estado visible — tarea 3.
- Revocación mientras import/setAuth sigue pendiente debe prevalecer — tareas 4–5.
- Cierre MFA antes de enroll y fallo de compensación deben quedar observables — tarea 7.

## Fase A — P1 y aislamiento prioritario

### 017.1-T1: contraseña actual — S-02

**Resultado y límite:** Contraseña actual incorrecta no cambia la contraseña; correcta permite el cambio con comprobación GoTrue. Conservar políticas de reautenticación; no cambiar Auth Cloud.

**Files:** modificar `src/app/[locale]/dashboard/account/actions.ts` y
`src/app/[locale]/dashboard/account/__tests__/actions.test.ts`; crear
`src/test/e2e/password-settings.spec.ts`. Reusar fixtures de Auth y helpers locales;
revisar/corregir el comentario de `supabase/config.toml` que equipara secure_password_change con contraseña actual, sin cambiar configuración Cloud por inferencia.

**Interfaces:** conservar `updatePasswordFromSettingsAction` y su estado de formulario;
enviar a `supabase.auth.updateUser` `{ password, current_password }` conforme al SDK
instalado, retirando `@ts-expect-error` y la propiedad currentPassword.

**Precondición Auth efectiva:** distinguir reautenticación por sesión reciente/nonce
de la exigencia de contraseña actual. `secure_password_change=true` no demuestra
la segunda. El SDK instalado documenta que `current_password` requiere
`GOTRUE_SECURITY_UPDATE_PASSWORD_REQUIRE_CURRENT_PASSWORD=true` en Auth.
Antes del E2E, registrar versión y presencia/valor de ese único setting no secreto
en el Auth local identificado, mediante inspección de configuración soportada.
Si falta, preparar su activación local por el mecanismo soportado de la versión
instalada, como parte autorizada de esa ejecución; no inventar una clave config.toml
ni trasladar un cambio a Cloud. Sin esa precondición, el E2E negativo se registra
no verificado y S-02 no se cierra. Referencia: [Password security](https://supabase.com/docs/guides/auth/password-security),
secciones de reautenticación y contraseña actual; contrastar versión al ejecutar.

- [ ] Agregar caso unitario `sends current_password to Auth`: afirmar payload exacto y ausencia de currentPassword; errores Auth mantienen contrato visible, no registran contraseñas.
- [ ] Ejecutar `pnpm test "dashboard/account/__tests__/actions"`; observar RED de contrato.
- [ ] Corregir payload mínimo y ejecutar mismo comando hasta GREEN.
- [ ] Confirmar la precondición Auth efectiva anterior y crear E2E con usuario local efímero: contraseña actual incorrecta muestra error; nueva contraseña no autentica y vieja sí. Con correcta, éxito visible y nueva contraseña autentica en contexto independiente. Cleanup en finally, sin imprimir secretos ni HAR con credenciales. Mantener también la reautenticación configurada; verificar ambas políticas por separado.
- [ ] Ejecutar `node scripts/run-plan-017-local.mjs password-settings.spec.ts` en destino local identificado; ambos caminos deben pasar. Si GoTrue rechaza contrato esperado, investigar versión/configuración antes de dar por cerrado; mock verde no basta.
- [ ] Revisión de contrato y evidencia; commit propuesto `fix: enforce current password in account settings`.

### 017.1-T2: saneamiento de analítica y payload — S-09 / N-29

**Resultado y límite:** Payload real decodificado con evento de control no contiene marcadores Auth ni email sintético. Sanear copias del SDK; no añadir tracking ni enviar a PostHog real.

**Files:** modificar `src/lib/analytics/sanitize.ts`, `client.ts`,
`__tests__/sanitize.test.ts`, `__tests__/client.test.ts` en ese directorio y
`src/test/e2e/analytics.spec.ts`.

**Interfaces:** conservar `sanitizeUrl(url: string): string` y `sanitizePath(pathname: string): string`;
añadir `sanitizeAnalyticsProperties(properties: Record<string, unknown>): Record<string, unknown>`.
Política técnica: URLs de telemetría conservan solamente pathname saneado; eliminar
query, fragment, credenciales y origen. Para URL relativa procesar con base fija
`https://analytics.invalid`; entrada no interpretable produce `:redacted`.
Procesar propiedades URL conocidas del SDK (`$current_url`, `$pathname`, `$referrer`,
`$initial_current_url`, `$initial_referrer`) y estructuras `$set`/`$set_once` con
objeto plano; retirar propiedades de campaña/query que puedan conservar valores
de URL. Inventariar propiedades reales del SDK instalado en before_send para que
no sobreviva una segunda copia del mismo token; conservar taxonomy validada.

- [ ] Añadir tabla: token_hash, access_token, refresh_token, code, email, next anidado/codificado, fragmento y URL malformada. `JSON.stringify(output)` no contiene ningún marcador sintético; `/es/pricing` permanece reconocible; UUID/slug siguen anonimizados.
- [ ] Ejecutar `pnpm test src/lib/analytics/__tests__/sanitize.test.ts src/lib/analytics/__tests__/client.test.ts` para RED; implementar política y repetir GREEN.
- [ ] Extender E2E con consentimiento positivo y página Auth de token sintético; interceptar envío en navegador hacia sumidero local, capturar POST body descomprimido/decodificado según formato real. Afirmar al menos un evento de control, y ausencia de marcador/email en URL, headers y cuerpo. No enviar a PostHog real; sin control positivo, cero tráfico no prueba saneamiento.
- [ ] Ejecutar `node scripts/run-plan-017-local.mjs analytics.spec.ts`; conservar casos de consentimiento/impersonación y registrar cuerpo inspeccionado sin datos reales.
- [ ] Revisión independiente de todas las copias URL; commit propuesto `fix: remove auth URL data from analytics payloads`.

### 017.1-T3: aislamiento por usuario y cuenta — N-01 / N-06 / N-25

**Resultado y límite:** Cambio de usuario/cuenta/impersonación no muestra estado anterior ni atribuye eventos a la cuenta previa. Mantener RLS y proveedor de identidad; no rediseñar navegación.

**Coordinación con 017.4-T1:** ese lote incorporará
`DocumentDraftProvider({ userId, accountId, children })` en dashboard/layout,
fuera de PageTransition y con key por identidad, y `useDocumentDraftRegistry()`
con `get`, `put`, `remove(docId, expectedContent)` y `clear`; la revisión de origen
del borrador se conserva según 017.4-T1/T2. Consumir `clear`
al confirmar logout, cambio de identidad/cuenta o impersonación y descartar
callbacks del scope anterior. Antes de salir, advertir sobre borradores pendientes:
una transición fallida no borra silenciosamente el borrador. Registro exclusivamente
en memoria; no usar sessionStorage. No introducir dependencia de ejecución hacia
017.4: antes de existir el provider, la integración de borradores es no-op.
017.1-T3 acepta cachés/notificaciones de forma independiente; 017.4-T1 implementa
la composición y demuestra en regresión conjunta confirmación, cancelación y fallo
de transición, limpieza de identidad y conservación del borrador cuando la salida falla.

**Files:** modificar `src/components/providers/query-provider.tsx`,
`analytics-provider.tsx`, `src/components/layout/app-topbar-client.tsx`,
`src/components/dashboard/org-settings/api-keys-tab.tsx`, `webhooks-tab.tsx`,
`src/components/dashboard/account/mfa-setup.tsx`, `src/hooks/use-org-entitlements.ts`,
`src/hooks/use-notifications.ts` y `src/hooks/__tests__/use-notifications.test.ts`.
Crear `src/lib/query-identity.ts`, `src/lib/__tests__/query-identity.test.ts` y
`src/test/e2e/identity-cache.spec.ts` y `src/components/providers/__tests__/analytics-provider.test.tsx`.

**Interfaces:** nuevo `IdentityScope = { userId: string; accountId: string; impersonatedBy: string | null }`;
`identityQueryKey(scope: IdentityScope, resource: string): readonly string[]`
produce `['identity', userId, accountId, impersonatedBy ?? '', resource]`.
Resolver scope desde claims verificados vigentes del consumidor; mientras identidad
no se conoce, queries deshabilitadas y ningún dato de identidad anterior renderizado.
Todas las invalidaciones usan la misma clave. Cancelar y retirar queries del scope
anterior al logout/cambio, y bloquear resultados tardíos por generación. La transición
de impersonación por Server Action exige comprobación de claims al navegar, no solo
onAuthStateChange. No inferir permiso de la clave; RPC/RLS permanecen autoridad.
`useNotifications(userId)` conserva firma; estado visible pertenece siempre al userId
actual. Analytics mantiene usuario y accountId como dimensiones separadas del group.

- [ ] Tests RED: A con caché caliente → B con fetch pendiente/fallido muestra cero datos A; respuesta A tardía no aparece en B; MFA A no aparece B; logout elimina estado; mismo usuario cuenta A→B actualiza group B sin identify duplicado. Sin claims, no ejecutar query protegida.
- [ ] Implementar helper y consumidores; notifications devuelve lista vacía inmediatamente al cambiar propietario, no solo tras resolver carga B. Aislar componentes por identidad cuando sea necesario y cancelar callbacks viejos.
- [ ] Ejecutar `pnpm test src/lib/__tests__/query-identity.test.ts src/hooks/__tests__/use-notifications.test.ts src/components/providers/__tests__/analytics-provider.test.tsx` hasta GREEN; probar group en el provider real con fronteras Auth/SDK mockeadas.
- [ ] Crear E2E A→B entre cuentas y logout/login entre usuarios, con datos distinguibles, caché caliente y navegación sin hard reload; cubrir entrada/salida de impersonación autorizada local. Afirmar contenido y peticiones por identidad, no solo URL.
- [ ] Ejecutar `node scripts/run-plan-017-local.mjs identity-cache.spec.ts active-account.spec.ts impersonation.spec.ts`. N-06 requiere esta evidencia integrada; no afirmar fuga SQL a partir de UI.
- [ ] Revisión React/seguridad; commit propuesto `fix: isolate client state across identity transitions`.

## Fase B — P2, después de 014 y antes de 015

### 017.1-T4: continuaciones Realtime — N-07

**Resultado y límite:** Cleanup previo a setAuth impide subscribe tardío y no retira el canal nuevo. Conservar protocolo broadcast y firmas existentes.

**Files:** modificar `src/hooks/use-notifications.ts`, `use-announcements.ts`,
`use-presence.ts`, tests existentes `src/hooks/__tests__/use-notifications.test.ts`,
`use-presence.test.ts` y `use-announcements.test.ts`.
**Interfaces:** conservar firmas de hooks y canales; cada efecto posee su canal y
generación. Tras `setAuth(): Promise<void>`, comprobar efecto activo antes de subscribe.

- [ ] Tests con promesa diferida: cleanup antes de resolver setAuth → subscribe cero; nuevo efecto suscribe exactamente una vez; rechazo Auth no deja unhandled rejection; cleanup viejo no elimina canal nuevo.
- [ ] Ejecutar `pnpm test src/hooks/__tests__/use-notifications.test.ts src/hooks/__tests__/use-announcements.test.ts src/hooks/__tests__/use-presence.test.ts`; corregir solo regresión demostrada de cancelación/error y repetir la misma selección.
- [ ] Revisar broadcast privado y aislamiento de callback; commit propuesto `fix: cancel stale realtime subscriptions`.

### 017.1-T5: revocación y persistencia de consentimiento — S-11 / N-26

**Resultado y límite:** Revocación prevalece sobre import pendiente y persistencia fallida permite reintento. No construir otro sistema de consentimiento.

**Files:** modificar `src/lib/analytics/client.ts`, `__tests__/client.test.ts`,
`src/components/providers/analytics-provider.tsx`; ampliar el test creado en 017.1-T3:
`src/components/providers/__tests__/analytics-provider.test.tsx`.
**Interfaces:** conservar `initAnalytics(): Promise<void>` / `disableAnalytics(): void`;
epoch interno incrementado al deshabilitar aun sin instancia. Init comprueba epoch
después del import; llamadas concurrentes comparten init activo. Persistencia DB
marca sincronizado solo después de UPDATE sin error; fallo mantiene estado pendiente
y permite reintento en siguiente evento Auth/consentimiento, sin bucle de efectos.

- [ ] Test RED import pendiente → disable → resolver → init/capture cero; nueva concesión explícita permite un init. Test UPDATE falla → evento Auth repite mismo consentimiento → persiste; usuario impersonado nunca sobrescribe consentimiento objetivo.
- [ ] Implementar epoch/single flight y estado de sincronización; ejecutar `pnpm test src/lib/analytics/__tests__/client.test.ts src/components/providers/__tests__/analytics-provider.test.tsx` hasta GREEN.
- [ ] Ejecutar E2E analytics focalizado sin tráfico externo; revisión y commit propuesto `fix: honor consent revocation during analytics startup`.

### 017.1-T6: redacción de email — S-12

**Resultado y límite:** Log Pino real conserva diagnóstico seguro sin destinatario/asunto/token, aun cuando el proveedor los repite. No alterar la entrega de correo.

**Files:** modificar `src/lib/email/index.tsx`, `src/lib/logger.ts`,
`src/lib/email/__tests__/send-email.test.ts`; crear `src/lib/__tests__/logger-redaction.test.ts`.
**Interfaces:** conservar `sendEmail(to, subject, react): Promise<void>`; log de fallo
solo action, proveedor y status/código seguro; retirar destinatario/asunto/texto bruto
del proveedor. Redactar `to` y `*.to` como defensa adicional. No cambiar entrega.

- [ ] Test RED con email/asunto/token sintéticos y error proveedor que los repite: output JSON de Pino no contiene ninguno; mantiene action/proveedor/código. Prueba usa logger real y sink de memoria, no solo spy de logger.error.
- [ ] Minimizar contexto y mensajes seguros; pruebas de envío siguen comprobando destinatario/subject correctos hacia proveedor y fallo observable hacia caller sin filtrar texto bruto a logs.
- [ ] Ejecutar `pnpm test src/lib/__tests__/logger-redaction.test.ts src/lib/email/__tests__/send-email.test.ts`; GREEN y revisión; commit propuesto `fix: redact recipient data in email failure logs`.

### 017.1-T7: enroll MFA tardío — N-18

**Resultado y límite:** Cerrar enroll tardío no deja QR ni elimina factores verificados; un fallo permite reintentar en el mismo montaje (R03). Conservar el SDK y el flujo MFA.

**Files:** modificar `src/components/dashboard/account/mfa-setup.tsx`; crear
`src/components/dashboard/account/__tests__/mfa-setup.test.tsx`.
**Interfaces:** conservar MfaSetup; generación por intento. Al cerrarse/desmontarse,
resultado tardío de enroll compensa únicamente el factor no verificado de ese intento
mediante `supabase.auth.mfa.unenroll({ factorId })`; nunca borrar factor verificado.

- [ ] RED: cerrar antes de enroll resuelto → no QR visible y unenroll exacto una vez; reabrir antes de resolver viejo no altera nuevo; éxito verificado no se elimina; compensación fallida presenta error seguro y refresca listado para recuperar, no éxito silencioso.
- [ ] Implementar generación/compensación y ejecutar `pnpm test src/components/dashboard/account/__tests__/mfa-setup.test.tsx` hasta GREEN. No imprimir QR, secreto TOTP ni códigos.
- [ ] R03: error de enroll, excepción y QR ausente liberan el intento terminado; siguiente clic en el mismo montaje inicia una nueva llamada. Compensar solo el factor no verificado propio; respuesta del intento anterior no modifica el nuevo. Añadir esas regresiones al mismo test, sin otro controlador MFA.
- [ ] Revisión de recursos tardíos y claves de tarea 3; commit propuesto `fix: compensate cancelled MFA enrollment`.

### 017.1-T8: disposición explícita Vercel Analytics / SpeedInsights

**Resultado y límite:** Conservar la decisión opt-in y aceptación local registradas en FOLLOW-CONSENT mientras sigan válidas. No reabrir la elección de producto ni reinstalar SDKs.

**Files de evidencia:** `src/app/[locale]/layout.tsx`, `src/lib/cookie-consent.ts`,
`src/components/cookie-consent-banner.tsx`, wrapper `src/components/providers/vercel-analytics-consent.tsx` y cierre 012.4. Actualizar registro de
decisión en la evidencia de ejecución 017.1, sin modificar SDK/layout en esta tarea.
**Interfaces:** no produce API nueva. La política opt-in está decidida en
FOLLOW-CONSENT; implementador y revisor preservan ese contrato y su evidencia.

- [ ] Inspeccionar wrapper existente `src/components/providers/vercel-analytics-consent.tsx` y fila FOLLOW-CONSENT: opt-in y browser local ya registrados. Conservar esa decisión; solo revalidar si cambia su superficie.
- [ ] Si hay regresión, los controles siguen siendo cero script/envío sin consentimiento, evento positivo aceptado y cero eventos después de revocar, con SDK interceptado. Desmontar por sí solo no basta. Comando: `node scripts/run-plan-017-local.mjs vercel-analytics-consent.spec.ts`; no acredita proveedor ni cumplimiento legal.

## Cierre del lote

- [ ] Ejecutar `pnpm typecheck`, `pnpm lint` y unitarios afectados con SHA identificado; registrar comandos y resultados, incluidos fallos. El coordinador serializa suites compartidas.
- [ ] E2E solo en local identificado, Sentry upload desactivado mediante contrato existente y env validado, sin omitir validación de variables. Registrar aceptación de fase A separada de fase B.
- [ ] Reviewer distinto inspecciona diff y pruebas adversariales; cada ID recibe estado, evidencia, propietario y límite runtime. Vincular en 016-T3; no declarar cerrado 016-T2 por focused tests.
- [ ] Conservar decisión Vercel en FOLLOW-CONSENT; los cierres técnicos S/N no absorben otros seguimientos. SQL, Cloud y proveedores no renovados quedan **[NO VERIFICADO]**.
