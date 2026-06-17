## Reporte de Estado Arquitectónico

**Fecha:** 2026-06-17 | **Rama:** fase-1 | **Auditor:** Staff Engineer Review (estático, sin modificaciones de código)

---

### Alcance

Análisis de los 4 pilares transversales: **a11y** (accesibilidad), **i18n** (internacionalización), **p13n** (personalización/multi-tenancy), **o11y** (observabilidad). Basado en lectura estática de los archivos clave — no se ejecutó ningún test de usuario ni análisis dinámico.

---

## 1. a11y — Accesibilidad

### Estado Actual

**Sólido en primitivas UI.** Los 14 componentes en `src/components/ui/` derivan de Radix UI, que provee ARIA roles, focus trapping, keyboard navigation y gestión de anuncios para screen readers de forma built-in (Dialog, DropdownMenu, Tabs, Sheet, Label).

Los elementos nativos HTML (`<select>`, `<textarea>`, `<button>`, `<input>`) usados en formularios custom sí tienen `<label>` asociado mediante `htmlFor`/`id` en todos los casos revisados (`invite-dialog.tsx`, `profile-tab.tsx`).

### Archivos Detectados

- `src/components/ui/` (14 componentes Radix)
- `src/components/dashboard/team/invite-dialog.tsx` — `<select>` con `id="invite-role"` + `<label htmlFor="invite-role">`
- `src/components/dashboard/account/profile-tab.tsx` — `<select>` locale/timezone con labels
- `eslint.config.mjs` — sin `eslint-plugin-jsx-a11y`

### Diagnóstico Rápido

| Ítem                               | Estado                          |
| ---------------------------------- | ------------------------------- |
| Primitivas Radix con ARIA          | ✅ Built-in                     |
| Labels en formularios nativos      | ✅ Presente                     |
| `jsx-a11y` en ESLint               | ❌ No configurado               |
| Skip-link para teclado (dashboard) | ❌ Ausente                      |
| `alt` text en imágenes/avatares    | ⚠️ No verificable estáticamente |
| Focus visible personalizado        | ⚠️ Solo outline del browser     |

### Brecha Técnica

1. **Sin `jsx-a11y`**: errores de accesibilidad (imágenes sin `alt`, `onClick` en elementos no interactivos, heading hierarchy) no son detectados en CI. El ESLint actual cubre seguridad y calidad de código pero no accesibilidad web.
2. **Sin skip-link**: usuarios de teclado deben tabular por toda la sidebar antes de llegar al contenido principal del dashboard. Patrón estándar: `<a href="#main-content" className="sr-only focus:not-sr-only">`.
3. **`<button>` con `style={{ border: 0 }}`** en `invite-dialog.tsx`: override inline que podría suprimir indicadores de foco en algunos navegadores.

---

## 2. i18n — Internacionalización

### Estado Actual

**Implementación madura.** next-intl 4 con `localePrefix: 'always'` — todas las rutas prefijadas (`/es/`, `/en/`). Navegación completamente tipada desde `@/i18n/routing.ts`. `setRequestLocale()` presente en todos los layouts y pages del servidor. El locale del perfil de usuario se persiste en DB y se aplica como redirect al guardar (implementado en esta fase).

### Archivos Detectados

- `src/i18n/routing.ts` — define locales `['en', 'es']`, defaultLocale `'es'`, `localePrefix: 'always'`
- `src/config/app.config.ts` — `defaultLocale: 'es'`, `locales: ['es', 'en']` (duplicados)
- `messages/en.json`, `messages/es.json` — mensajes tipados
- `src/app/[locale]/dashboard/account/actions.ts` — `getLocale()` + `redirect()` con locale correcto
- `src/components/dashboard/members/members-table.tsx` — `toLocaleDateString(undefined, ...)` — locale no anclado

### Diagnóstico Rápido

| Ítem                               | Estado                                         |
| ---------------------------------- | ---------------------------------------------- |
| Rutas prefijadas con locale        | ✅ `localePrefix: 'always'`                    |
| Navegación tipada (Link, redirect) | ✅ Desde `@/i18n/routing`                      |
| `setRequestLocale()` en layouts    | ✅ Presente                                    |
| Locale persistido en DB            | ✅ Implementado                                |
| Source of truth único para locales | ❌ Duplicado en `routing.ts` y `app.config.ts` |
| Locale next-intl aplicado a fechas | ⚠️ `undefined` = locale del browser            |
| Plurales/ICU message format        | ⚠️ No usado (aceptable hoy)                    |

### Brecha Técnica

1. **Duplicación de locales**: `routing.ts` y `app.config.ts` definen independientemente los mismos locales y defaultLocale. Si en el futuro se añade `'pt'` a uno y se olvida el otro, el routing y el config divergen. La solución canónica es que `app.config.ts` importe `routing.locales`.
2. **Locale de fechas**: `members-table.tsx` usa `toLocaleDateString(undefined, {...})` — `undefined` resuelve al locale del browser OS, no al locale de la sesión next-intl. Para coherencia debe pasarse el locale de la request: `new Date(member.joined_at).toLocaleDateString(locale, {...})`.
3. **Sin fallback explícito**: next-intl en producción muestra la key cruda si una traducción falta. No hay config de `onError` ni `getMessageFallback` en el `i18nConfig`.

---

## 3. p13n — Personalización / Multi-tenancy

### Estado Actual

**Arquitectura de white-labeling sólida.** `src/config/app.config.ts` centraliza nombre, brand, URLs, email de soporte, feature toggles y tokens de tema. Los feature toggles son build-time constants (no `process.env` en runtime), lo que es correcto para un boilerplate re-skinnable.

La protección de rutas opera en dos capas: `src/proxy.ts` (edge, redirect a `/login`) + `src/app/[locale]/dashboard/layout.tsx` (server component, re-check con `getClaims()`). El comentario en el layout documenta explícitamente el "defense in depth".

### Archivos Detectados

- `src/config/app.config.ts` — config singleton (name, brand, features, theme)
- `src/lib/supabase/middleware.ts` — `updateSession()`, auth guard edge
- `src/app/[locale]/dashboard/layout.tsx` — double-check server component
- `src/app/[locale]/dashboard/page.tsx` — quick links filtrados por `appConfig.features.*`
- `src/components/layout/app-sidebar-client.tsx`, `app-topbar-client.tsx` — consumen `appConfig`

### Diagnóstico Rápido

| Ítem                                  | Estado                                  |
| ------------------------------------- | --------------------------------------- |
| White-labeling centralizado           | ✅ `app.config.ts`                      |
| Feature toggles build-time            | ✅ Sin `process.env` en componentes     |
| Auth guard doble capa                 | ✅ proxy + layout                       |
| `getClaims()` en lugar de `getUser()` | ✅ JWT local, sin roundtrip             |
| Locale/timezone de usuario en DB      | ✅ Guardado                             |
| Timezone aplicado a renderizado       | ❌ Ignorado al formatear fechas         |
| Feature overrides por tenant/plan     | ❌ No implementado (YAGNI correcto hoy) |
| Colores de tema override en runtime   | ❌ Solo CSS vars estáticas              |

### Brecha Técnica

1. **Timezone ignorado**: el perfil guarda `timezone` pero ningún componente lo lee al formatear fechas/horas. Un usuario con timezone `America/New_York` ve las fechas en UTC. Impacto bajo ahora (solo `joined_at`), pero se acumulará.
2. **`appConfig.theme`** apunta a CSS variable names (`var(--color-poppy)`) pero no existe mecanismo de override en runtime — el white-labeling de colores requiere recompilación. Aceptable para un boilerplate, debe documentarse como limitación de diseño.

---

## 4. o11y — Observabilidad

### Estado Actual

**Cobertura de errores completa.** Sentry registrado en los tres runtimes (nodejs, edge, client) vía `src/instrumentation.ts`. `onRequestError = Sentry.captureRequestError` captura automáticamente errores de Server Components y Route Handlers sin instrumentación manual por página.

Pino logger con campos tipados y auto-redacción de PII (`password`, `token`, `email`, auth headers) en todos los entornos.

CSP en `proxy.ts` incluye `report-to` apuntando a Sentry — las violaciones de Content Security Policy también fluyen como eventos.

### Archivos Detectados

- `src/instrumentation.ts` — registro Sentry nodejs + edge, `onRequestError`
- `sentry.server.config.ts` — `tracesSampleRate: 0.1` prod / `1.0` dev
- `sentry.client.config.ts` — traces + Session Replay (5% sesiones, 100% en error), `tracePropagationTargets`
- `src/proxy.ts` — CSP `report-to` Sentry endpoint
- `src/lib/logger.ts` — Pino, campos tipados, redacción PII

### Diagnóstico Rápido

| Ítem                                 | Estado                     |
| ------------------------------------ | -------------------------- |
| Sentry en server/edge/client         | ✅ Los tres runtimes       |
| Captura automática RSC errors        | ✅ `onRequestError`        |
| Structured logging (Pino)            | ✅ Con redacción PII       |
| CSP violations → Sentry              | ✅ `report-to` configurado |
| Session Replay                       | ✅ Habilitado              |
| `tracePropagationTargets` en server  | ❌ Solo en cliente         |
| `beforeSend` filtro de ruido         | ❌ Ausente                 |
| Replay privacy (`maskAllText`)       | ❌ No configurado          |
| Guard dev vs prod en instrumentation | ⚠️ Sentry activo en dev    |

### Brecha Técnica

1. **`tracePropagationTargets` ausente en server config**: `sentry.client.config.ts` lo tiene (localhost, supabase, iroko.vercel.app) pero `sentry.server.config.ts` no. Esto puede romper el distributed tracing entre el servidor Next.js y las llamadas a Supabase.
2. **Sin `beforeSend`**: errores conocidos y manejados (`refresh_token_not_found` en `middleware.ts`) llegarán a Sentry como incidentes. Un `beforeSend` que filtre por error code evita falsos positivos en alertas.
3. **Session Replay sin privacy config**: `replayIntegration()` sin `maskAllInputs: true` captura el contenido de campos de formulario en las grabaciones. Con datos de usuario (email, timezone, nombre) esto puede tener implicaciones GDPR.
4. **`tracesSampleRate: 1.0` en dev con DSN de prod**: si el desarrollador usa la DSN de producción localmente, cada request de desarrollo consume cuota de Sentry. Convención segura: usar `SENTRY_DSN` distinta por entorno o añadir `enabled: process.env.NODE_ENV === 'production'` en server config.

---

## Resumen de Brechas Prioritarias

| #   | Pilar | Brecha                                                  | Esfuerzo | Impacto |
| --- | ----- | ------------------------------------------------------- | -------- | ------- |
| 1   | o11y  | Session Replay sin `maskAllInputs` (GDPR)               | Bajo     | Alto    |
| 2   | o11y  | `tracePropagationTargets` en server config              | Bajo     | Medio   |
| 3   | i18n  | Locale duplicado en `routing.ts` y `app.config.ts`      | Bajo     | Medio   |
| 4   | a11y  | `jsx-a11y` ESLint plugin ausente                        | Bajo     | Medio   |
| 5   | i18n  | `toLocaleDateString(undefined)` ignora locale next-intl | Bajo     | Bajo    |
| 6   | p13n  | Timezone del perfil no aplicado a renderizado de fechas | Medio    | Bajo    |
| 7   | a11y  | Skip-link para navegación por teclado                   | Medio    | Medio   |
| 8   | o11y  | `beforeSend` filtro de errores conocidos                | Medio    | Bajo    |

_Esfuerzo: Bajo = < 1h, Medio = 2-4h. Impacto evaluado para la audiencia actual del boilerplate._
