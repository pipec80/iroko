# Plan 012.4 — CSP y secretos

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement task-by-task. Checkboxes track execution, not planning approval.

**Goal:** aislar secretos, cerrar recuperaciones inseguras y endurecer scripts y
enlaces conservando los consumidores existentes y la observabilidad.

**Architecture:** mantener Next/proxy/Supabase existentes. Secreto dedicado y
contratos estrictos para impersonación; gates puros para mock/uploads; nonce
por documento SSR; navegación validada en entrada, SQL y render. No introducir
servicios, paquetes ni una nueva arquitectura de billing.

**Tech Stack:** Next 16.4.1, React 19/Compiler, TypeScript strict, Zod, Supabase
Postgres, Sentry 10.67.0, PostHog, Vitest, Playwright y pgTAP instalados.

**Spec:** [PR4 del Plan 012](012-security-hardening-and-pricing-truth.md#pr-4--chorecsp-and-secrets-hardening), cruzado con el
[inventario estático fechado](../../audits/2026-10-14-plan-012-4-readiness.md).

**Estado (2026-10-15):** plan aprobado para ejecución. La implementación y
aceptación 012.4 siguen pendientes. El documento se preparó originalmente en
`codex/014-t1-robot-permissions`; iniciar el trabajo desde una rama nueva basada
en `main` después de integrar este handoff documental. Las cuatro DB accidentales
permanecen preservadas/excluidas.

Destinos de referencia, a renovar antes de ejecutar: local `saas-boilerplate`
(API54321/DB54322); Supabase `rgrxlygtmvavqzkjyywg`; Vercel Iroko
`prj_gEe5cFBOgMxmCCNisaRzZW2xZBiL`, equipo
`team_WnEm7dz6VjfsNDl8jFd5VBke`; alias `project-a89lv.vercel.app`.
Estos IDs no son secretos ni prueba de acceso actual. El gate Vercel exige
VERCEL_PROJECT_ID coincidente además del contexto/flag descritos abajo.

## Restricciones globales

- Solo herramientas/dependencias instaladas. Servicios Free, sin tarjetas;
  verificar capacidades reales y no activar upgrades o recursos pagados.
- Primera ejecución local en `saas-boilerplate`; sin Cloud writes, deploy, push
  ni merge. Preparación Cloud y aplicación requieren autorización específica
  posterior, sobre selección exacta y destinos renovados.
- Preservar 012.1/012.2/012.3, Robot pendiente y material ignorado. No reabrir
  drift accounts/service_role ni confianza CF/XFF del hook como correcciones
  implícitas; siguen en el [registro 012.3](../../audits/2026-10-14-plan-012-3-follow-ups.md).
- Variables nuevas en `src/env.ts`; no valores reales en Git, stdout, argv,
  screenshots o fixtures. Variables públicas no contienen secretos.
- Migraciones nuevas creadas con `supabase migration new <nombre>`, contenido
  manual y espejo simultáneo por excepción Windows. No editar SQL aplicado.
- Mantener firmas RPC existentes y RLS; regenerar tipos solo si cambia un
  contrato expuesto. No crear middleware.ts ni refactorizar Realtime/estilos.
- La aceptación completa distingue implementación, local, Git y Cloud. Runtime
  no ejecutado queda **[NO VERIFICADO]**; ningún test histórico se cuenta como nuevo.

## Decisiones propuestas

1. `IMPERSONATION_COOKIE_SECRET`: exactamente 64 hex, generado con 32 bytes
   aleatorios, servidor únicamente; requerido sin fallback a Supabase. Cookie
   v2 firmada incluye propósito admin-return, admin/target/session UUID,
   issuedAt/expiresAt y tokens no vacíos. TTL 35 minutos, manteniendo cap SQL
   de impersonación 30 minutos. Cookies viejas/rotadas no se aceptan.
2. Expiry: cierre atómico de fila target solo si authenticated, target coincide,
   claim app_metadata.impersonated_by coincide con admin, motivo expired y
   expires_at <= clock_timestamp después de lock. Backend requiere rol
   service_role verificado; UID nulo solo no basta. Salida manual conserva
   restaurar admin verificado → cerrar su fila. Ninguna cookie UUID sola autoriza.
3. Mock: conservar secreto dedicado, exigir 64 hex generados con 32 bytes
   aleatorios y mantener envelope actual de dos segmentos; parser
   canónico, comparación constante y schemas checkout/evento disjuntos. En
   producción TODOS los consumidores requieren ALLOW_MOCK_BILLING=true,
   cualquiera sea el proveedor default. TTL/jti/checkout de un solo uso quedan
   como seguimiento explícito; no se certifica anti-replay con dedupe webhook.
4. Links: HTTPS absoluto o ruta de aplicación de un solo slash, máximo 2000
   caracteres en forma canónica. Ausente/blanco significa sin navegación.
   Rechazar otros protocolos, //host, backslashes, controles y credenciales.
   TS canonicaliza; SQL valida conservadoramente formas canónicas seguras, sin
   intentar recrear todo WHATWG URL. Render histórico inválido: texto sin anchor.
5. CSP global de scripts con nonce de 16 bytes aleatorios por documento;
   producción sin unsafe-inline/unsafe-eval para scripts. Mantener allowlists
   actuales inicialmente, sin strict-dynamic. Styles unsafe-inline permanece
   como excepción; no se promete CSP sin excepciones ni cambios visuales.
6. Uploads/build Sentry: SENTRY_UPLOAD_SOURCE_MAPS enum true/false opcional,
   ausente=false. Token presente no autoriza. Requerir flag true, CI=true,
   token y contexto confiable: GitHub repo pipec80/iroko, ref main, evento push
   o workflow_dispatch; o Vercel preview/production del proyecto Iroko esperado.
   Rechazar pull_request/pull_request_target y validación local. Sin contexto
   suficiente, denegar. No depender de protected environments pagados.

## Foco de revisión y ownership

Cinco fallos a cubrir: cookie inválida/rotada con sesión target todavía activa;
llamada SQL directa con target/adminclaim ajeno; link histórico malicioso por
broadcast/email; nonce perdido en next-intl/soft navigation/caché; token Sentry
heredado que dispara release/telemetry aunque no suba maps.

- Agente identidad: cookie/actions/expiry y sus unitarios/E2E.
- Agente SQL/Vault: migraciones, espejos y pgTAP de expiry, links y ACL necesarias.
- Agente enlaces: helper/schema/notify/render/email y unitarios.
- Agente CSP: proxy/layout/provider/captcha y pruebas CSP.
- Coordinador: `src/env.ts`, `.env.example`, `next.config.ts`, workflows,
  gate Sentry, integración y documentación. Estos archivos no tienen ownership
  compartida: agentes entregan requisitos/patches al coordinador.

Identidad y enlaces pueden avanzar en paralelo tras baseline; SQL se aplica
secuencialmente. Upload gate precede a cualquier build/E2E nuevo. CSP depende
del baseline de render y gate; aceptación final depende de todos.

## Tarea 1 — Baseline, consumidores y gate seguro de build

**Archivos:** crear `src/lib/sentry-build-policy.ts` y
`src/lib/__tests__/sentry-build-policy.test.ts`; modificar `src/env.ts`,
`next.config.ts`, `.env.example`, `.github/workflows/ci.yml` y
`src/lib/__tests__/local-sentry.test.ts`; conservar `local-validation.test.ts`.
Crear `scripts/run-plan-0124-local.mjs` y su prueba Node de guards, reutilizando
el patrón de aislamiento anterior sin ejecutar scripts ignorados a ciegas.

**Interfaces:** `isSentryUploadAuthorized(input: SentryBuildContext): boolean`
es pura. Input nombra flag, CI, token-presente, localValidation y metadatos
GitHub/Vercel; nunca registra el token. `LOCAL_VALIDATION` conserva su contrato.

- [ ] Renovar Git/índice, CLI Windows y labels/puertos/ledger del stack oficial;
      inventariar servicios/consumidores de readiness. Registrar presencia/config
      separada de runtime. No imprimir supabase status con claves sin filtrar.
- [ ] RED unitario: flag ausente/false, token sin flag, CI ausente, PR/PRtarget,
      repo/ref/proyecto incorrectos y localValidation devuelven false; contextos
      confiables explícitos true. Flag inválido falla validación de env.
- [ ] GREEN: cuando gate off usar sourcemaps.disable=true, release.create=false,
      release.finalize=false, telemetry=false; omitir setCommits/deploy y efectos de
      monitores auxiliares de build. Mantener wrapper/tunnel y SDK runtime normales.
- [ ] Quitar token Sentry del env global de jobs no confiables; pasarlo solo al
      paso/contexto aprobado. Conservar builds sin secretos. No generar token nuevo.
- [ ] Ejecutar `pnpm test sentry-build-policy local-sentry local-validation`;
      build local con destinos loopback, token sintético y egreso bloqueado/observado:
      cero intentos Sentry de build y ningún map público. Registrar matriz real
      de rutas estáticas/dinámicas y tamaños; build no habilita upload por sí solo.

El runner acepta solo `--build` o `--e2e`: copia de fuentes sin .env, claves
locales capturadas en RAM, dependencias ya instaladas y comprobadas, sin instalar.
Rechaza markers hosting, PLAYWRIGHT_BASE_URL y destinos remotos; no reutiliza
servidores ajenos. Levanta/cierra solo procesos propios. Evita que Playwright
importe secretos Cloud desde .env.local. Intercepta PostHog/Turnstile y conserva
MAILPIT local; cualquier intento de egreso de build queda observado como fallo.
Comandos de aceptación: `node --test scripts/run-plan-0124-local.test.mjs`,
`node scripts/run-plan-0124-local.mjs --build` y posteriormente `--e2e`.

**Entrega:** gate y baseline reproducibles. **Siguiente paso:** identidad/mock y links.

## Tarea 2 — Impersonación recuperable y secreto dedicado

**Archivos:** `src/lib/impersonation-cookie.ts`, su `.test.ts`,
`src/app/[locale]/dashboard/admin/accounts/[accountId]/impersonation-actions.ts`
y test existente; `src/app/api/impersonation/expire/route.ts` y su test;
`src/test/e2e/impersonation.spec.ts`; `supabase/schemas/public.sql`;
migración nueva `impersonation_expiry_contract`; nuevo
`supabase/tests/database/50_impersonation_expiry_contract.test.sql` (renovar
ordinal antes de crearlo). Coordinador agrega secreto en env/fixtures/CI.

**Interfaces:** conservar signImpersonationCookie/verifyImpersonationCookie,
ampliando `AdminReturnPayload` para binding y usando un envelope v2 interno;
verify devuelve null ante
cualquier invalidez. Conservar begin/end RPC signatures y grants permitidos.

Mantener separados payload y envelope: payload contiene accessToken,
refreshToken, adminUserId, targetUserId y sessionId; sign añade version=2,
purpose=admin-return, issuedAt/expiresAt enteros Unix en segundos del servidor,
con duración exactamente 2100 segundos. Verify valida todo el envelope y
devuelve el payload tipado o null. El reloj del cliente no fija el TTL.

- [ ] RED cookie: secreto dedicado distinto de Supabase; firma exacta hex64,
      exactamente dos segmentos y base64url canónico, TTL y UUID/propósito correctos;
      vacío, payload incompleto, futuro/expirado, cookie v1 y rotación A→B rechazados.
- [ ] RED pgTAP y HTTP local real: expiry target con fila/claim correcto permitido;
      preexpiry, motivo manual, otra fila/target/adminclaim, anon y authenticated sin
      sub denegados. Reproducir antes la diferencia route/SQL con fixture MFA real;
      observar sesión/fila/cookies, no solo redirect.
      Incluir positivos admin dueño manual y service_role sin UID verificado,
      contrastados con el negativo authenticated sin sub.
- [ ] GREEN SQL aplica condiciones conjuntas bajo lock; no ampliar ACL para
      resolver permisos. Route valida identidad y session UUID; intenta cierre
      seguro, hace signOut(scope:local) y borra cookies auxiliares aun con error RPC;
      returnTo interno seguro, sin bucle login/dashboard ni sesión target restante.
- [ ] GREEN inicio/manual: compensar errores después de begin y antes/después
      de verifyOtp; comprobar compensación, no tragar error. Restauración verifica
      admin real, binding de sesión/target/cookie y orden restore→RPC. No usar solo
      getSession/cookie como prueba de identidad.
      Tras verifyOtp parcial, restaurar/verificar admin antes de compensar con RPC
      dueño; si falla restauración, signOut y recuperación dirigida. Nunca permitir
      cierre target antes de expiry para resolver esa compensación.
- [ ] Ejecutar unitarios de cookie/actions/expire, SQL50 y E2E impersonation
      con admin MFA/aal2 real local. Cero filas/usuarios/leases fixture tras cleanup.
      Invalidar cookie no garantiza cerrar fila antes de expiry: probar recuperación
      autenticada del admin mediante RPC existente o runbook operativo de cierre
      dirigido. Antes de rotar/desplegar, las sesiones activas afectadas deben estar
      cerradas; no restaurar firmando con la clave Supabase anterior.

Comandos focalizados: `pnpm test impersonation-cookie impersonation-actions api/impersonation/expire`;
`pnpm supa:test supabase/tests/database/50_impersonation_expiry_contract.test.sql`.
El runner `--e2e` incluye `src/test/e2e/impersonation.spec.ts` sin
PLAYWRIGHT_BASE_URL; un skip de fixtures/MFA no se cuenta como aceptación.

**Entrega:** identidad y recuperación observadas. **Siguiente paso:** mock/Vault.

## Tarea 3 — Mock y Vault sin ampliar billing

**Archivos:** `src/lib/billing/signing.ts`, `providers/mock.ts`, `registry.ts`,
`src/app/[locale]/billing/mock-checkout/page.tsx`,
`src/app/[locale]/dashboard/billing/actions.ts`, unitarios signing/mock/registry
y acciones billing; schemas de payload junto a signing/provider. Para Vault:
espejos `private.sql`/`webhooks.sql` solo si la matriz demuestra una corrección;
pgTAP nuevo de ACL, manteniendo tests10/45 y workers existentes.

**Interfaces:** verificación devuelve unknown/null antes de aplicar schema
concreto; no `verifyMockPayload<T>` con cast. Gate único de mock usa producción
y opt-in, aplicado también a page/action/verificador y cancelación.

- [ ] RED mock: default no-mock no elude gate; producción sin opt-in rechaza
      cada consumidor; token con tercer segmento/hex/base64 no canónicos o payload
      checkout usado como evento se rechaza. Sin gate, no crear evento ni checkout.
- [ ] GREEN conservar MOCK_BILLING_SECRET dedicado con formato fuerte validado
      en env, fixtures/CI sintéticos separados y comparación HMAC constante;
      límites de entrada y Zod estricto para checkout y eventos normalizados. No
      cambiar slugs, precios, reducer, lifecycle ni contrato de proveedores reales.
- [ ] Levantar matriz local de ACL efectivos de Vault: PUBLIC/anon/authenticated/
      service_role/owners/membresías/defaults y helpers por firma. Consultar nombres,
      cardinalidad y privilegios; no decrypted_secret. Metadatos Cloud solo lectura
      cuando haya acceso confirmado. No asumir que todo service_role debe perder acceso.
- [ ] RED/GREEN de denegaciones clientes y controles positivos de email, billing,
      webhook worker, endpoint-secret CRUD y HMAC exacto. Si hay exceso real, nueva
      migración+espejo acotados al consumidor revisado; ninguna revocación automática
      de funciones legítimas ni rotación masiva de secretos operativos.
- [ ] Ejecutar unitarios signing/mock/registry/billing, workers y pgTAP pertinentes;
      documentar explícitamente que TTL/replay del checkout sigue sin implementarse.
      Fixture válido no hace requests a proveedores de pagos reales ni Resend.

Si la configuración existente no cumple el formato fuerte, preparar sustitución
de ese secreto mock para la etapa autorizada; no modificar su valor ahora.
La sustitución invalida checkouts mock firmados anteriormente, que se reemiten;
el MVP no exige aceptar firmas antiguas ni rotar las claves de otros servicios.

Comandos: `pnpm test billing/__tests__/signing billing/providers/__tests__/mock billing/__tests__/registry dashboard/billing/__tests__/actions`;
`pnpm supa:test` tras cualquier corrección de Vault y `pnpm test:functions` para
email Edge. Comprobar Deno instalado antes, sin instalar Deno ni librerías
faltantes; ausencia queda NO VERIFICADO.

**Entrega:** gates/validadores y matriz Vault revisada. **Siguiente paso:** enlaces.

## Tarea 4 — Navegación segura en entrada, SQL y render

**Archivos:** crear `src/lib/validation/navigation-link.ts` y test; modificar
`validation/admin.ts`, formulario/acciones anuncios, `notifications/index.ts`,
`components/notifications/notification-bell.tsx`, `email/templates/notification.tsx`
y sus tests. SQL: `announcements.sql`, `notifications.sql`, helper puro en
`private.sql`, migración nueva `navigation_link_contract`, pgTAP51 libre.

**Interfaces:** `normalizeNavigationLink(value)` devuelve unión tipada válida
con href/null o invalid_link; `getSafeNavigationHref(value): string | null`
falla cerrado al render. Email resuelve rutas internas contra SITE_URL validado;
la política de transporte webhook/SSRF permanece independiente.

- [ ] RED fixtures compartidos: aceptar HTTPS/path/query/hash y rutas internas
      actuales, null/blanco sin enlace. Rechazar javascript (también mayúsculas),
      data/vbscript/file/ftp/mailto/http externo, //host, backslash, controles,
      credenciales, malformados y longitud >2000. SQL prueba formas canónicas.
      Rechazar controles/backslashes antes de trim; revalidar después de normalizar
      para impedir que `/a/..//host` produzca un href `//host`. Medir longitud
      canónica tras percent-encoding; comprobar idempotencia y TS acepta → SQL acepta.
- [ ] GREEN entradas: anuncio y notify validan antes de INSERT o email; formulario
      admite rutas internas (no depender de type=url). Conservar invitación/equipo/
      billing. En UI/email, dato histórico inválido mantiene contenido sin anchor/CTA.
- [ ] Preflight DB cuenta datos por categoría, sin volcar links/tokens. SQL helper
      invoker puro con privilegios mínimos para constraints; RPC conserva firma,
      ACL y admin/MFA. Constraints protegen escritura directa incluso service_role.
      Separar válidos normalizables de inválidos: normalizar los primeros antes del
      constraint; solo inválidos pasan a NULL en link, preservando las filas.
      Revisar conteos antes de aplicar. Probar positivos INSERT service_role y RPC
      admin/MFA sin grants genéricos. Sin nuevas suscripciones ni broadcasts.
- [ ] RED/GREEN RPC directa inválida antes de persistir, INSERT directo inválido
      denegado y equivalencia TS/SQL sobre corpus canónico. Ausencia/blanco siempre
      sin navegación; no prometer parser WHATWG completo en Postgres.
- [ ] Ejecutar tests helper, acciones anuncios, notify, inbox/email, pgTAP51 y
      regresiones webhook registration/destination/transport/worker de012.2.

Comandos: `pnpm test navigation-link announcements/__tests__/actions notifications email/__tests__/templates`;
`pnpm supa:test supabase/tests/database/51_navigation_link_contract.test.sql`;
`pnpm test webhooks` para conservar el contrato 012.2.

**Entrega:** ningún enlace inválido observable es clickeable. **Siguiente paso:** CSP.

## Tarea 5 — CSP de scripts con nonce coherente

**Archivos:** `src/proxy.ts`, `src/proxy.test.ts`, `src/app/layout.tsx`,
ThemeProvider y `src/components/auth/captcha-field.tsx`; crear
`src/components/providers/csp-nonce-provider.tsx` y `src/test/e2e/csp.spec.ts`;
conservar analytics/sentry-tunnel E2E. No cambiar cacheComponents ni rutas i18n.

**Interfaces:** buildCspHeader recibe opciones tipadas con nonce/modo/orígenes;
`CspNonceProvider` transporta el nonce server a clientes y `useCspNonce()` lo
consume. ThemeProvider recibe nonce; Turnstile usa scriptOptions.nonce.
El provider conserva el nonce del documento vivo durante navegación, prefetch
y server actions; no lo sustituye por el nonce de una respuesta RSC posterior.

- [ ] Gate de render: contrastar build nuevo contra baseline. Si aparecen rutas
      estáticas que convertiría la propuesta global, documentar impacto y detener
      ese cambio para revisión; no adoptar cobertura parcial silenciosamente.
- [ ] RED proxy: nonce nuevo por documento, cliente no lo elige; CSP request y
      response coinciden. Preservar headers internos next-intl, cookies auth,
      redirects, locale y controles de caché. API/assets/ingest/tunnel no se rompen.
- [ ] GREEN generar nonce seguro, sobrescribir headers entrantes nonce/CSP y
      propagar al render basándose en respuesta next-intl. RootLayout declara
      SSR con connection(), lee nonce servidor, lo pasa a tema/provider/CAPTCHA.
      No cache compartido de HTML con nonce; no relajar no-store de sesiones.
- [ ] En producción script-src sin unsafe-inline/eval; conservar allowlists y
      styles inline con excepción. Reportes CSP se derivan del DSN configurado y
      se deshabilitan sin DSN/local-validation; no conservar destino hardcodeado
      ajeno ni enviar reportes reales desde pruebas locales. DSN público no es secreto.
- [ ] Chromium sobre build productivo local: nonce/header/HTML, script sin nonce
      bloqueado mediante resultado observable, scripts legítimos ejecutan, tema,
      hidratación, login/CAPTCHA, server action, prefetch/soft navigation/reload,
      cuatro idiomas, error/not-found. PostHog interceptado: consentimiento/revocación/
      impersonación intactos. Sentry runtime/mock gates preservados; cero egreso real.
      Incluir montaje tardío de Turnstile tras navegación y documentos error/not-found
      en paths con punto o prefijos excluidos por el matcher actual. Demostrar
      cobertura real antes de denominar global a la política.

Comandos: `pnpm test src/proxy.test.ts sentry-build-policy local-sentry` y
`node scripts/run-plan-0124-local.mjs --e2e`. El runner incluye csp.spec.ts,
impersonation.spec.ts, analytics.spec.ts y sentry-tunnel.spec.ts; cuenta tests
realmente ejecutados. El widget Turnstile real se comprueba en la etapa Cloud
autorizada; el config estándar que elimina su site key no acredita esa prueba.

**Entrega:** CSP aplicada y consumidores locales observados. **Siguiente paso:** aceptación.

## Tarea 6 — Aceptación, documentación e integración

- [ ] Ejecutar pgTAP completo contra stack oficial comprobado, unitarios completos,
      typecheck, lint, formato focalizado, build/E2E seguros, check-docs y diff.
      Contar TAP y resultados reales; sin asumir los conteos históricos de012.3.
- [ ] Revisión independiente por cada entrega y del diff exacto final; resolver
      hallazgos, conservar workers/callbacks y límites de pruebas no ejecutadas.
- [ ] Actualizar SECURITY.md, módulo impersonación (proxy.ts, no middleware.ts),
      comentarios CSP/webhook obsoletos, env ejemplos/CI, Plan012/current-state y
      auditoría de ejecución; integrar commits locales selectivos con hooks. No
      git add global ni archivos privados/caches. No exigir formato al generado DB.
- [ ] Preparar una etapa Cloud separada: identidad, migraciones, matriz Vault y
      presencia de secretos en metadatos. Nuevo secreto antes del código que lo
      requiere; cerrar sesiones activas afectadas antes de invalidar cookies.
      No escribir secretos o desplegar con la autorización de012.3.
- [ ] Tras autorización específica: deployment de prueba sellado, uploads off
      salvo prueba de upload expresamente habilitada, CSP browser sin violaciones
      atribuibles; un evento browserSDK Sentry y uno PostHog tras consentimiento,
      confirmados en los proveedores con ID saneado. Máximo tres intentos por prueba,
      sin PII ni volumen continuo. Verificar herramientas Free; recepción no
      accesible queda NO VERIFICADO, nunca sustituirla por envelope200.
- [ ] Comprobar Turnstile real y navegación/login bajo CSP en el candidato;
      no desactivar Bot Protection o ampliar WAF globalmente para aprobar el ensayo.
- [ ] Verificar impersonación MFA real, mock solo opt-in, workers y cleanup;
      comparar advisors con baseline, clasificar avisos intencionales. Reasignación
      de dominio requiere destino concreto y autorización; rollback conserva un
      deployment compatible con el secreto nuevo, no vuelve a firmar con Supabase.

**Resultado esperado:** implementación y aceptación local primero; Cloud y Git
registrados por separado. No declarar cierre012.4 hasta recepción observable de
Sentry/PostHog y aceptación del candidato, manteniendo excepciones explícitas.

## Seguimientos y excepciones que no se esconden

- style-src unsafe-inline se conserva; eliminar atributos style/librerías es
  trabajo posterior, no motivo para afirmar que ya desapareció esa excepción.
- Checkout mock sigue como token bearer sin TTL/jti ni promesa de un solo uso.
  Su limitación queda registrada con criterio futuro: una confirmación repetida
  no debe generar otra transición si se aprueba implementar anti-replay.
- La limpieza de sesión/cookies no equivale al cierre de una fila SQL: ante
  cookie dañada/rotada, recuperación del admin y cierre dirigido son parte del
  runbook y de la aceptación, sin conceder permisos por un UUID de cookie.
- Analytics/SpeedInsights de Vercel están montados incondicionalmente. No
  certificar consentimiento general a partir del gate de PostHog; revisar esa
  política en su frente correspondiente, sin rediseñarla aquí.
- Rutas estáticas descubiertas, capacidad Free insuficiente o receipts inaccesibles
  son gates explícitos de revisión/evidencia, no justificación para inventar PASS.

**Siguiente paso recomendado:** revisar este plan y comenzar por la tarea1,
con agentes por ownership, sin instalaciones ni escrituras Cloud.
