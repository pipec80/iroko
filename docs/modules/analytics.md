# PostHog — analítica de producto

> **Plan 006** · PR [#109](https://github.com/pipec80/iroko/pull/109) · Rama histórica `feat/posthog-integration`
> Estado actual: integración, consentimiento y taxonomía verificados estáticamente el
> 2026-08-20. La recepción de eventos en PostHog Cloud y la configuración de producción están
> **[NO VERIFICADO]** en esta revisión.

## 1. Qué es esto

Analítica de producto tipada, multi-tenant y consciente del consentimiento, complementaria a
Sentry (errores) y Vercel Analytics/Speed Insights (infraestructura) — nunca reemplaza a
ninguno de los dos. Instrumenta el funnel de negocio completo: signup → onboarding → primer
proyecto → billing, más eventos operativos (invitaciones, API keys, webhooks, límites de plan).

**Lo que NO incluye:**

- Session Replay (deshabilitado explícitamente).
- Autocapture (deshabilitado explícitamente) — solo eventos definidos en la taxonomía más
  `$pageview` automático.
- Feature flags de PostHog (`advanced_disable_feature_flags: true`) — los flags del producto
  siguen viviendo en `feature_flags`/`is_flag_enabled()` (una sola fuente de verdad, ver
  `src/lib/flags/index.ts`).
- Contenido de negocio (nombre de proyecto, texto de documentos, montos de pago, emails).

## 2. Decisiones de arquitectura

| #   | Decisión               | Valor                                                                                                                                   |
| --- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Cloud vs. self-host    | PostHog Cloud **US**, proyecto 538546 (org Pipeclabs)                                                                                   |
| 2   | Ingest                 | Reverse proxy first-party `/ingest` vía `rewrites()` en `next.config.ts` — nunca ingest directo contra `*.posthog.com`                  |
| 3   | Residencia / retención | US; retención por defecto del proyecto de PostHog (no se modificó)                                                                      |
| 4   | Consentimiento         | Cookie `cookie_consent.analytics` (`src/lib/cookie-consent.ts`). El SDK no se carga hasta el opt-in — ni un byte antes                  |
| 5   | Taxonomía              | `src/lib/analytics/events.ts` — un schema Zod `.strict()` por evento. Propiedad desconocida o sensible → excepción, no envío silencioso |
| 6   | Identidad              | `distinct_id` = UUID de `auth.users` (`claims.sub`). Group `account` = `account_id` del JWT. Nunca email                                |
| 7   | Session Replay         | Deshabilitado (`disable_session_recording: true`)                                                                                       |
| 8   | Autocapture            | Deshabilitado (`autocapture: false`). `$pageview` sí, con URL saneada                                                                   |
| 9   | Feature flags          | Deshabilitados en PostHog — DB sigue siendo la única fuente de verdad                                                                   |
| 10  | Borrado / export       | Ver [`gdpr.md`](gdpr.md) §6 — el RPC local no elimina automáticamente la persona en PostHog                                             |

### Por qué reverse proxy en vez de ingest directo

Con el proxy, el bundle de `posthog-js`, sus assets estáticos y la ingesta de eventos son
same-origin (`'self'`) — la CSP (`src/proxy.ts`) no necesita ningún `*.posthog.com`, y los
eventos no quedan expuestos a ad-blockers que sí bloquean dominios de terceros conocidos. El
coste es que `/ingest` tiene que excluirse del matcher de `proxy.ts` (mismo patrón que
`sentry-tunnel`) para que next-intl no intercepte el POST del SDK con una redirección de
locale.

### Por qué pageviews sí pero autocapture no

Autocapture manda texto de botones y labels tal cual — riesgo de PII sin control alguno. Los
pageviews son necesarios para cualquier funnel y sí son controlables: `before_send` en
`src/lib/analytics/client.ts` pasa `$current_url`/`$pathname` por `sanitizeUrl()`
(`src/lib/analytics/sanitize.ts`), que reemplaza UUIDs, el slug de proyecto y valores
sensibles de query (`token`, `email`, `code`) antes de que salgan del navegador.

### `account_switched` — definido, no instrumentado

El org switcher ya ejecuta `switchAccount` desde
`src/components/layout/org-switch-button.tsx`: valida membresía, llama al RPC
`switch_account`, refresca la sesión y redirige al dashboard. El evento
`account_switched`, sin embargo, sigue reservado en `events.ts` y no está instrumentado; por
lo tanto, el cambio de cuenta funciona pero esa métrica no se emite.

## 3. Consentimiento e identidad — cómo funciona

- **Init perezoso**: `AnalyticsProvider` (`src/components/providers/analytics-provider.tsx`),
  montado en `Providers` junto al `CookieConsentBanner`, se suscribe a
  `cookie-consent.ts`'s store vía `useSyncExternalStore`. Solo cuando `hasConsent('analytics')`
  es `true` se hace `await import('posthog-js')` — antes de eso, cero bytes del SDK se
  descargan.
- **Revocación**: un link "Preferencias de cookies" en el footer público
  (`src/components/layout/cookie-preferences-link.tsx`) llama a `reopenConsentBanner()` — abre
  el banner de nuevo sin borrar la elección previa hasta que el visitante guarde una nueva.
  Rechazar allí llama a `disableAnalytics()`: `opt_out_capturing()` + `reset(true)` + se
  descarta la instancia — la próxima captura requiere un nuevo `initAnalytics()`.
- **Identidad**: el mismo `AnalyticsProvider` escucha `supabase.auth.onAuthStateChange()` y,
  en cada cambio, llama a `getClaims()` (nunca lee `session.user.app_metadata` directamente —
  `account_id`/`impersonated_by` solo existen en el JWT que emite el custom access token hook).
  Con claims → `identify(claims.sub)` + `group('account', account_id)`. Sin claims (logout) →
  `resetAnalytics()`.
- **Impersonación**: si `claims.app_metadata.impersonated_by` está presente, se llama
  `pauseCapturing()` (`opt_out_capturing()` sin descartar la instancia) — cero eventos durante
  toda la impersonación, sin importar qué acciones tome el admin como el usuario objetivo.
  Al terminar, `resumeCapturing()`.

## 4. Captura server-side

`src/lib/analytics/server.ts` (`server-only`) expone `captureServer()`, usada donde el cliente
no tiene una señal de completitud confiable (server actions, webhooks, route handlers). Crea un
cliente `posthog-node` por llamada (`flushAt: 1, flushInterval: 0`), captura, y siempre
`shutdown()` — necesario porque una Server Action puede terminar el proceso apenas retorna.

Un fallo de entrega (PostHog caído) se loguea con `logger.error` y **nunca** se propaga — un
evento de analítica no puede romper la operación de negocio que instrumenta (mismo patrón que
el envío de emails de invitación en `team/actions.ts`). Una violación de la taxonomía (propiedad
desconocida) sí lanza — es un bug propio, no una falla operacional.

**Deduplicación**: `subscription_activated` pasa `insertId` (el `externalEventId` del webhook)
como `$insert_id` de PostHog. Doble red contra reprocesamiento: `apply_subscription_event` ya es
idempotente por `external_event_id` (devuelve `'duplicate'`, que `handleProviderWebhook` usa
para saltar la captura por completo), y `$insert_id` cubre cualquier reintento que sí llegara a
capturarse dos veces.

**Atribución sin usuario (webhooks)**: un webhook de proveedor de pago no trae un usuario
autenticado. `webhook-handler.ts` resuelve el `owner` de la cuenta vía
`accounts_memberships` (admin client) y usa su UUID como `distinct_id` — la identidad estable
más cercana disponible para atribuir el evento a una persona real en vez de a la cuenta sola.

## 5. Taxonomía de eventos

Fuente de verdad: `src/lib/analytics/events.ts`. Cada evento documentado abajo con: pregunta de
negocio, disparador, propiedades permitidas, lado de captura, requisito de identidad.

| Evento                          | Pregunta de negocio                       | Disparador                                                               | Lado   | Propiedades                         |
| ------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------ | ------ | ----------------------------------- |
| `signup_started`                | ¿Cuántos empiezan el form de signup?      | Submit del form (`(auth)/signup/page.tsx`)                               | client | `method`                            |
| `signup_completed`              | ¿Cuántos signups terminan con éxito?      | `signUpAction` tras `auth.signUp()` OK                                   | server | `method`                            |
| `account_created`               | ¿Cuántas cuentas nuevas se provisionan?   | idem — el trigger de DB crea la cuenta personal en la misma transacción  | server | `account_type`                      |
| `login_completed`               | ¿Cuántos logins exitosos, con o sin MFA?  | `signInAction` (sin MFA) o `verifyMfaAction` (con MFA)                   | server | `method`                            |
| `mfa_challenge_completed`       | ¿Cuánta fricción/adopción tiene MFA?      | `verifyMfaAction` tras verificar el código                               | server | —                                   |
| `onboarding_step_completed`     | ¿Dónde abandona el wizard?                | `confirmOrgName`                                                         | server | `step`                              |
| `onboarding_completed`          | ¿Cuántos terminan el wizard?              | `completeOnboarding`                                                     | server | —                                   |
| `account_switched`              | (reservado — ver §2)                      | —                                                                        | —      | —                                   |
| `invitation_sent`               | ¿Cuánta invitación de equipo hay?         | `inviteMembers` (éxito, `count > 0`)                                     | server | `role`, `invited_count`             |
| `invitation_accepted`           | ¿Cuántas invitaciones se aceptan?         | `GET /auth/accept-invitation`                                            | server | —                                   |
| `project_created`               | Paso clave del funnel de activación       | `createProject`                                                          | server | `type`, `tone`                      |
| `document_uploaded`             | ¿Se usa la feature de documentos?         | `createDocument`                                                         | server | —                                   |
| `plan_viewed`                   | ¿Cuánto tráfico llega a pricing?          | Mount de `pricing/page.tsx` o `billing-tab.tsx`                          | client | `source`                            |
| `checkout_started`              | ¿Cuánta intención de compra hay?          | `startCheckout`                                                          | server | `plan_slug`, `interval`             |
| `subscription_activated`        | Conversión real a pago                    | `webhook-handler.ts`, solo `type: 'subscription_created'` y no-duplicado | server | `plan_slug`, `interval`, `provider` |
| `subscription_cancel_requested` | ¿Cuánto churn se solicita?                | `cancelSubscription` (ambas ramas: mock y proveedor real)                | server | —                                   |
| `api_key_created`               | ¿Se usa la feature de API keys?           | `createApiKey`                                                           | server | `has_expiration`                    |
| `webhook_created`               | ¿Se usa la feature de webhooks salientes? | `createWebhookEndpoint`                                                  | server | `event_count`                       |
| `feature_limit_reached`         | ¿Qué límites empujan a upgrade?           | `inviteMembers`, rama `seat_limit_reached`                               | server | `limit_key`                         |

Todos los eventos server-side llevan `distinctId` (UUID) y, cuando hay cuenta activa,
`accountId` (para `group('account', ...)`). Ningún evento incluye email, nombre, contenido de
proyecto/documento, montos de pago, tokens ni valores de formulario — el schema `.strict()` de
cada evento lo hace imposible en tiempo de ejecución, no solo por convención.

**Retención y volumen esperado**: bajo (SaaS en fase temprana) — muy por debajo del límite del
plan gratuito de PostHog (1M eventos/mes). Owner de la taxonomía: equipo de producto/founder.

## 6. Cómo agregar un evento nuevo

1. Definí la pregunta de negocio primero — si no hay una decisión que dependa de la respuesta,
   no lo agregues (YAGNI).
2. Agregá el schema en `eventSchemas` (`src/lib/analytics/events.ts`) con `.strict()` y solo
   las propiedades mínimas necesarias — nunca contenido de usuario, nunca PII.
3. Capturalo desde el lado correcto: `track()` (`src/lib/analytics/client.ts`) si es una
   intención de UI sin contraparte server confiable; `captureServer()`
   (`src/lib/analytics/server.ts`) si necesitás una señal de completitud confiable o el evento
   vive en un webhook/route handler. Nunca los dos para el mismo evento sin una key de
   deduplicación (`insertId`).
4. Agregalo a la tabla de §5 de este doc.
5. Escribí el test: para eventos server-side, una aserción "captura en éxito" y otra "no
   captura en la rama de error" en el `__tests__/actions.test.ts` correspondiente (ver el
   patrón ya usado en los 12 archivos tocados por este plan).

## 7. Testing

- **Unitarios** (`src/lib/analytics/__tests__/`): `events.test.ts` (schemas aceptan su forma
  válida, rechazan propiedades desconocidas y una batería de claves sensibles),
  `sanitize.test.ts` (URLs con UUID/slug/token/email quedan normalizadas), `client.test.ts`
  (no-op sin consentimiento, validación antes de capturar, pausa/reanuda, disable limpia
  identidad), `server.test.ts` (no-op sin token, `$insert_id`, `shutdown()` siempre, no
  propaga fallos de red).
- **Por acción**: cada `actions.ts` tocado tiene aserciones de que `captureServer` se llama en
  el camino feliz con las propiedades exactas, y que **no** se llama en las ramas de error.
- **E2E** (`src/test/e2e/analytics.spec.ts`): consentimiento (nada antes de aceptar, empieza al
  aceptar, nada al rechazar, se detiene al revocar desde el footer), funnel completo
  signup→onboarding→proyecto sin PII en ningún request, e impersonación sin eventos. Todo
  intercepta `**/ingest/**` — nunca sale a la red real, aunque `.env.local` tenga un token real.
  Requiere que CI tenga `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` como GitHub Actions secret (ver §8) —
  sin token, `initAnalytics()` no hace nada y 5 de los 7 escenarios fallan.
- **Gotcha de `posthog-js` bajo Playwright:** el SDK trae un filtro de bots activo por defecto
  que revisa `navigator.webdriver`, `navigator.userAgent` (con `"headlesschrome"` hardcodeado en
  su blocklist) y `navigator.userAgentData.brands`. Playwright dispara las tres señales, así que
  `capture()` se descarta en silencio — sin request de red, sin excepción, sin log (el logger de
  `posthog-js` también está gateado tras un flag de debug). `interceptIngest()` neutraliza esto
  vía `unmaskFromBotDetection()` (spoofea las tres señales con `page.addInitScript`) — sólo en el
  test, nunca tocar esto en código de producción.

## 8. Habilitación en producción

El cierre de PR #109 fue revalidado en la auditoría de plataforma del
2026-08-10: PostHog quedó integrado tras consentimiento, sin autocapture ni
Session Replay, y Vercel Analytics/Speed Insights usan la misma decisión de
consentimiento. La tabla siguiente describe el estado previo al merge y se
mantiene únicamente como contexto histórico. No representa el estado actual de
los secretos o del proveedor; eso está **[NO VERIFICADO]**.

| Dónde (antes del merge)          | Variable                            | Estado                                |
| -------------------------------- | ----------------------------------- | ------------------------------------- |
| `.env.local` (local, gitignored) | `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` | ✅ ya está                            |
| GitHub Actions (repo secret)     | `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` | ❌ falta — bloquea el job `E2E` de CI |
| Vercel — Preview                 | `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` | ❌ falta                              |
| Vercel — Production              | `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` | ❌ falta (a propósito, ver abajo)     |

`NEXT_PUBLIC_POSTHOG_HOST` y `POSTHOG_HOST` no requieren configuración — `src/env.ts` ya trae
defaults seguros (`/ingest` y `https://us.i.posthog.com`).

Ante una futura reconfiguración de producción o reemplazo del token:

1. Confirmar el token de PostHog en las env de Vercel (Production), no solo Preview.
2. Verificar en el proyecto de PostHog (vista **Activity**, `environment = production`) que los
   primeros eventos reales no llevan PII — repetir la revisión manual de §7 contra tráfico real.
3. Monitorear volumen la primera semana contra el límite del plan.

Rollback: apagar `appConfig.features.analytics` (`src/config/app.config.ts`) — el provider deja
de montarse, ningún `track()`/`captureServer()` hace nada. Revocar/rotar el token de PostHog si
se sospecha exposición.
