# Plan 012.4 — Inventario estático previo a ejecución

Fecha: 2026-10-14. Estado: revisión de fuentes; no aceptación de cambios.
Rama `codex/014-t1-robot-permissions`, baseline `fad800b`. Al comenzar solo
permanecían las cuatro DB accidentales de `%SystemDrive%/`, preservadas.

Se leyeron AGENTS, índice, estado actual, arquitectura, PR4 del Plan 012,
TESTING-PLAN y las ocho reglas locales. Tres agentes revisaron en paralelo CSP,
secretos/impersonación y consumidores de enlaces. El coordinador cruzó sus
resultados con fuentes. No se leyeron valores de `.env`, Vault o tokens; no se
modificaron código, DB, proveedores ni dependencias en este inventario.

## Fuentes y conclusiones

| Superficie | Evidencia actual | Trabajo que justifica |
| --- | --- | --- |
| Impersonación | `src/lib/impersonation-cookie.ts:12` firma con `SUPABASE_SECRET_KEY`. Payload sin TTL propio; parser no exige cadenas no vacías ni hex canónico. | Secreto servidor dedicado, cookie versionada/validada y rotación sin fallback privilegiado. |
| Expiración | `src/app/api/impersonation/expire/route.ts` usa la sesión target para cerrar; `public.end_impersonation_session` en `supabase/schemas/public.sql` autoriza admin dueño o UID nulo. La ruta borra cookies auxiliares sin signOut. | Reproducir denegación/flujo real; cierre target estrictamente expirado y signOut local incondicional. No se afirma exploit ni resultado HTTP ejecutado. |
| Inicio parcial | `impersonation-actions.ts` crea fila antes de recuperar sesión y generar/verificar magic link. | Compensación observada de fallos posteriores, sin filas activas que bloqueen al admin. |
| Mock billing | `src/lib/billing/signing.ts` usa clave propia; comparación simple, split permisivo y cast genérico. `registry.ts` siempre registra mock; page/action también verifican tokens fuera del registry. | Parser y HMAC estrictos, schemas por propósito y opt-in aplicado a cada consumidor. No basta gatear el proveedor default. |
| Replay mock | Checkout firmado contiene accountId/planSlug/interval/successUrl/cancelUrl, sin iat/exp/jti. Repetir confirmación genera otro eventId con Date.now. | Registrar limitación: dedupe de webhook no demuestra checkout de un solo uso. TTL/jti/replay quedan fuera del mínimo propuesto. |
| Vault | Consumidores en `private.sql`, `webhooks.sql` y email queue: URLs/secretos separados billing, webhook, email y endpoint individual. Comentarios no prueban ACL efectivas. | Matriz de propietarios/ACL/membresías/defaults/helpers y pruebas de consumidores, sin volcar valores ni revocar por nombre. |
| Anuncios | `validation/admin.ts` usa `.url()` sin allowlist explícita; `announcements.sql` solo trim/nullif. | Validación TS y SQL de navegación, manteniendo firma RPC y autorización admin/MFA. La aceptación runtime de protocolos concretos por Zod no se probó aquí. |
| Notificaciones | `notifications/index.ts` persiste link y lo pasa a email sin validación runtime; `notification-bell.tsx` lo entrega al anchor. | Proteger entrada, tabla y render de datos históricos. Conservar rutas de invitación, equipo y billing. |
| Email | `email/templates/notification.tsx` usa startsWith('http') o concatena SITE_URL. | Resolución por URL/origen configurado; no emitir CTA para enlaces inválidos. No se atribuye javascript ejecutable al email actual sin prueba. |
| Webhooks | UI muestra texto; registro/transporte 012.2 ya validan HTTPS, DNS, tickets y conexión fijada. | Mantener SSRF y regresiones. Corregir comentario obsoleto de pg_net; no sustituir política de transporte por helper de navegación. |
| CSP | `proxy.ts` permite scripts unsafe-inline en producción; unsafe-eval solo dev. No propaga nonce al render. | Nonce por documento, request/response coherentes, CSP de scripts endurecida. |
| Render/nonce | RootLayout llama getLocale; request config espera requestLocale. Next-intl documenta fallback a headers; el build Cloud anterior mostró rutas dinámicas. generateStaticParams no prueba SSG por sí solo. | Confirmar matriz con build nuevo; SSR explícito para nonce, sin asumir gratis un cambio de caché. |
| Consumidores de scripts | ThemeProvider/next-themes acepta nonce; Turnstile acepta scriptOptions.nonce. Analytics/SpeedInsights están montados en layout. | Propagación server→client del nonce; probar hidratación, tema, CAPTCHA y navegación real. |
| Estilos | Hay style attributes y librerías que los generan. Nonce no autoriza esos atributos. | Mantener styles unsafe-inline como excepción; no prometer CSP sin todas las excepciones. |
| Upload Sentry | next.config mantiene wrapper, authToken, maps, release/telemetry. LOCAL_VALIDATION evita wrapper/SDK solo en loopback explícito. SDK instalado 10.67.0 soporta sourcemaps.disable en webpack y Turbopack, pero eso solo no impide release/telemetry. | Gate explícito de efectos de build; preservar runtime/tunnel con uploads off. |
| Runner E2E | playwright.config.ts carga .env.local, puede reutilizar servidor y elimina la site key Turnstile. PLAYWRIGHT_BASE_URL evita servidor local y algunos fixtures de impersonación se saltan cuando existe. | Runner aislado sin .env real, identidad loopback y servidor propio. No presentar el E2E estándar como prueba del widget real. |
| Observabilidad | PostHog usa /ingest y consentimiento. El gate local Sentry no desactiva PostHog. Un envelope200 directo no prueba CSP del browser SDK. | Local sin egreso real; Cloud posterior con evento browser Sentry y evento PostHog consentido, ambos recibidos en proveedor. |

## Servicios y límite gratuito

Fuentes/configuración inventariadas: Supabase, GitHub CI/CD, Cloudflare
Turnstile, PostHog, Resend, Sentry, Vercel y billing mock/Stripe/Mercado Pago.
La presencia de implementación/configuración no renueva salud del proveedor.
El usuario confirmó planes gratuitos y ausencia de tarjetas; no es una auditoría
independiente de billing. No asumir Observability Plus, retención pagada,
entornos protegidos privados de pago ni más reglas WAF disponibles.

El cierre 012.3 y sus destinos se conservan como evidencia fechada; no se
revalidaron en Cloud durante este inventario. ACL Vault actuales, presupuesto
de eventos y recepción Sentry/PostHog: **[NO VERIFICADO]**. Un probe local de
Zod del agente quedó bloqueado por EPERM antes de ejecutar; no es un RED.

## Decisiones propuestas para el plan

- Nonce global para scripts de documentos SSR, manteniendo styles inline.
  Confirmar cobertura real y efecto en caché/Free antes de convertir rutas que
  se descubran estáticas; no aceptar cobertura parcial como cierre global.
- Nuevo `IMPERSONATION_COOKIE_SECRET`, 32 bytes aleatorios codificados en
  64 caracteres hex; nunca usar Supabase como fallback.
- Expiry target permitido solo para su fila realmente expirada, motivo expired
  y claim firmado de admin coincidente. UID nulo no identifica backend por sí
  solo. Logout/cookies y cierre SQL son resultados distintos que deben probarse.
- Mock conserva clave dedicada y formato de dos segmentos, con payload estricto
  por consumidor. TTL/replay no se introducen silenciosamente.
- Navegación admite HTTPS absoluto o ruta interna con un solo slash; no
  http externo, protocolos ejecutables, userinfo, controles ni backslashes.
  Email local puede usar SITE_URL HTTP loopback como base configurada.
- Uploads Sentry off por defecto, incluso si hay token heredado. Habilitación
  explícita solo en build CI confiable; bloquear PR y PRtarget. Runtime no se
  desactiva como efecto lateral de esa decisión.

## Reglas y contradicciones registradas

Aplicar TypeScript strict/import type/Zod; helpers pequeños y contratos claros;
React Compiler sin memoización manual; ninguna nueva middleware.ts; validación
de links sin refactor visual ni de Realtime. Tests observables por capa según
TESTING-PLAN. SQL con search_path/grants explícitos, RLS preservada y esquema
no público nombrado. JSDoc explica contratos/fallos, no repite tipos.

Prevalecen `src/env.ts` sobre referencias antiguas a env.js, y la excepción
Windows de migración manual+espejo sobre recetas db diff/stop. No cachear nonce
ni decisiones de sesión con use cache. Los ejemplos de Realtime no autorizan
políticas USING(true) ni migraciones de canales en esta tarea. La paleta vigente
de AGENTS prevalece sobre la referencia histórica Material Design 3; no hay
trabajo visual. Las recetas Git no autorizan fetch/pull/reset/push/merge ni
eliminar ramas o material pendiente. El comentario CSP sobre SSG y referencias
a middleware.ts en documentación de impersonación requieren corrección.

## Referencias primarias consultadas

- [Next.js: CSP y render dinámico](https://nextjs.org/docs/app/guides/content-security-policy).
- [next-intl: render estático y setRequestLocale](https://next-intl.dev/docs/routing/setup).
- [Sentry 10.67.0: opciones de build](https://github.com/getsentry/sentry-javascript/blob/10.67.0/packages/nextjs/src/config/getBuildPluginOptions.ts).

La documentación Next actual puede describir una revisión posterior a la
instalada 16.3.5; se cruzó con los paquetes instalados, sin actualizarlos.
Siguiente paso: revisar el [plan ejecutable propuesto](../exec-plans/active/012-4-csp-and-secrets.md).
