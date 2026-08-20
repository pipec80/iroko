# Legal + Cookie Consent (páginas legales + banner)

> **Tarea F3-C5** · PR [#66](https://github.com/pipec80/iroko/pull/66) · Rama histórica `feat/f3-c5-legal-cookies`
> Estado actual: páginas, consentimiento, integración analítica y pruebas verificadas
> estáticamente el 2026-08-20; el PR está mergeado. El E2E actual y la conformidad legal del
> contenido están **[NO VERIFICADO]**.
>
> Las cifras de tests e incidentes de las secciones 5–8 son evidencia histórica del PR, no un
> certificado vigente del repositorio.

## 1. Qué es esto

Cierra el requisito legal mínimo del MVP: dos páginas públicas (Términos de Servicio /
Política de Privacidad) y un banner de consentimiento de cookies estilo GDPR/ePrivacy
(Aceptar todo / Rechazar no esenciales / Personalizar), todo apagable con un flag sin borrar
código. El copy legal es placeholder razonable de SaaS — esto es estructura + wiring, no
redacción legal real.

## 2. Feature flag

`appConfig.features.cookieConsent` (`src/config/app.config.ts`), default `true`. En `false`,
el banner nunca se monta (gate en `src/components/providers/index.tsx`):

```tsx
{
  appConfig.features.cookieConsent && <CookieConsentBanner />;
}
```

## 3. Persistencia — cookie del navegador, no DB

El consentimiento es del **visitante anónimo**, no un dato de negocio del tenant — no hay
tabla, todo vive en `src/lib/cookie-consent.ts`:

- Cookie `cookie_consent`, valor JSON `{ necessary: true, analytics: boolean, marketing: boolean }`.
- `httpOnly=false` (el cliente necesita leerla para no re-mostrar el banner), `SameSite=Lax`,
  `path=/`, 1 año de expiración.
- `parseConsentCookie(cookieString)`: función pura, nunca lanza — JSON corrupto o shape
  inválido resuelve a `null` (tratado como "no consentido"). Es el núcleo testeado con Vitest.
- `hasConsent(category: 'analytics' | 'marketing')`: lee `document.cookie` en runtime. Desde
  Plan 006, `AnalyticsProvider` (`src/components/providers/analytics-provider.tsx`) lo consulta
  vía `useSyncExternalStore` antes de cargar `posthog-js` — ver [`analytics.md`](analytics.md)
  §3. `marketing` sigue sin consumidor: el repo no tiene ninguna herramienta de marketing hoy.
- `writeConsentCookie(state)`: escribe la cookie desde las 3 acciones del banner.

## 4. Banner (`CookieConsentBanner`)

`'use client'`, montado globalmente en el barrel `src/components/providers/index.tsx` (dentro
del `I18nProvider`, con acceso a `useTranslations('CookieConsent')`) — cubre todo el sitio
(public, auth, dashboard). **No** se montó literalmente junto a `<Analytics />` en
`[locale]/layout.tsx` como sugería el prompt original: ahí `<Analytics />`/`<SpeedInsights />`
quedan fuera del `I18nProvider`, y el banner necesita traducciones.

Tres acciones:

- **Aceptar todo** → `{ analytics: true, marketing: true }`.
- **Rechazar no esenciales** → `{ analytics: false, marketing: false }`.
- **Personalizar** → expande 2 toggles (analytics/marketing); "necesarias" siempre `true`, no
  editable. Botón "Guardar preferencias".

Al montar, si ya hay cookie de consentimiento válida, el banner no se renderiza (`null`).

## 5. Testing

- **Vitest** (`src/lib/__tests__/cookie-consent.test.ts`, 8 tests): parsing sin cookie, cookie
  válida mixta, JSON corrupto (no lanza, retorna `null`), shape inválido, `hasConsent` real
  contra `document.cookie` (jsdom).
- **Playwright** (`src/test/e2e/legal-cookies.spec.ts`, 5 tests): banner en primera visita +
  persistencia tras reload, flujo de personalizar con toggle individual, render 200 de
  `/es/legal/terms`, `/en/legal/terms`, `/es/legal/privacy`.
- **Limitación de entorno conocida**: la suite e2e completa (los ~12 specs corridos juntos, cada
  uno con su propio build de producción vía `next build && next start`) crasheó 3 veces
  consecutivas en esta máquina Windows con el código `3221225794` (agotamiento de recursos,
  Docker/Supabase local + builds repetidos), en un punto distinto del build cada vez — no
  relacionado al código de esta tarea. El spec nuevo se verificó **standalone** con su propio
  build, 5/5 verde. CI corre la suite completa sin esta limitación.

## 6. Bug pre-existente encontrado y ARREGLADO en este PR: locale incorrecto en toda la app

Durante el QA manual (`next start`, build de producción) se detectó que **todo** el route group
`(public)` servía contenido en `es` para cualquier locale ≠ `es` — confirmado también en páginas
preexistentes no tocadas por esta tarea (`/en/contact`, `/en/pricing`). Bug real, transversal a
toda la app, no introducido por C5 — pero arreglado en esta misma rama (política del repo: los
bugs encontrados, viejos o nuevos, se arreglan donde se encuentran, no se dejan solo documentados).

**Diagnóstico (con dos hipótesis descartadas antes de dar con la causa real):**

1. **Primera hipótesis, descartada:** los headers `x-nextjs-prerender: 1` / `x-nextjs-postponed: 1`
   (Partial Prerendering vía `cacheComponents: true`) sugerían un problema de caché estático no
   diferenciado por locale — confirmado además que `cacheComponents` + `next-intl` es una
   incompatibilidad real y documentada por el propio mantenedor
   (github.com/amannn/next-intl/issues/1493, sin workaround estable todavía — `next/root-params`
   existe pero aún tiene un issue abierto del lado cliente en `BaseLink`/`usePathname` con
   Suspense). Se apagó `cacheComponents` (`next.config.ts`) como mitigación, pero el bug
   **persistió** incluso con `cacheComponents: false` — descartando esta hipótesis como la causa
   real (aunque queda apagado igual, porque la incompatibilidad con next-intl es real e
   independiente del bug de abajo).

2. **Causa raíz real, confirmada:** `src/proxy.ts` componía el middleware de next-intl
   (`intlMiddleware(request)`) con el de Supabase (`updateSession`), pero al construir la
   respuesta final **descartaba `intlResponse` y creaba un `NextResponse.next()` nuevo desde
   cero**, copiando solo sus cookies. `next-intl` necesita que su respuesta se propague tal cual
   porque internamente setea un **header de request** (`x-next-intl-locale`) sobre su propio
   `NextResponse.next({request: {headers}})` — ese header es lo que `getRequestConfig` lee
   downstream vía `headers()` para resolver el locale en cada Server Component. Al reconstruir la
   respuesta desde cero, ese header se perdía silenciosamente, y **todo locale caía al
   `defaultLocale` (`es`)** en el render real de la página — aunque el middleware sí detectaba el
   locale correcto a nivel de URL/cookie (`NEXT_LOCALE` se seteaba bien, por eso no era obvio).

**Fix aplicado** (`src/proxy.ts`): basar la respuesta final en `intlResponse` (agregando las
cookies de Supabase sobre esa misma respuesta) en vez de crear un objeto nuevo. Verificado con
curl directo en build de producción: `/en/contact`, `/fr/contact`, `/pt/contact`, `/es/contact`
ahora sirven cada uno su idioma correcto, igual que las páginas legales nuevas.

**`cacheComponents` queda deshabilitado** (`next.config.ts`) — no por este bug (que era 100%
independiente), sino porque su incompatibilidad con next-intl sigue siendo real y sin workaround
maduro. Revisar `next/root-params` en una sesión futura cuando next-intl cierre el issue del lado
cliente, si se quiere recuperar PPR.

**Nota menor, no arreglada (cosmética, diseño pre-existente intencional):** el `<html lang="es">`
del layout raíz (`src/app/layout.tsx`) queda hardcodeado en el HTML inicial servido por el
servidor para cualquier locale — `LocaleHtmlLang` (`src/components/layout/locale-html-lang.tsx`)
lo corrige client-side vía `useEffect` tras la hidratación. Esto es un patrón deliberado
pre-existente (el layout raíz está por encima de `[locale]` y no conoce el locale en su propio
render), no algo introducido por este bug — afecta solo a crawlers/lectores de pantalla que no
ejecutan JS antes de leer el atributo `lang`. Queda anotado por si se quiere resolver a futuro
(requeriría mover `<html>` al layout de `[locale]`, un cambio de estructura más grande).

## 7. Segundo bug encontrado por CI y arreglado: `role="dialog"` colisionaba con diálogos reales

Tras abrir el PR, CI (`E2E Tests`) falló con un `strict mode violation` de Playwright en
`getByRole('dialog')` — resolvía a 2 elementos: el diálogo real de Radix (crear proyecto,
invitar/remover miembro) y el banner de cookies. Antes de este PR el banner **nunca se
renderizaba** en ningún e2e existente (porque el bug de locale de la sección 6 impedía que
`CookieConsent.*` cargara, o directamente porque el banner no existía) — al arreglar el bug de
locale, el banner empezó a aparecer de verdad en los flujos de dashboard, y ahí chocó.

**Causa real:** el banner usaba `role="dialog"`, que además era semánticamente incorrecto desde
el inicio — no es modal (no bloquea la interacción con el resto de la página, no atrapa el foco),
así que nunca debió compartir el rol ARIA de un diálogo modal real.

**Fix:** `role="region"` en `src/components/cookie-consent-banner.tsx`. Verificado con
`projects.spec.ts` (que fue el que falló en CI) corriendo solo con `--workers=1` — pasó limpio,
descartando que el fallo original fuera por el rol en sí y no por contención de recursos del
paralelismo de Playwright en la máquina local.

## 8. Tercer bug, el más importante: hydration mismatch (React #418) causaba duplicados de DOM

Tras el fix del rol, CI siguió fallando — esta vez `settings.spec.ts` y `team.spec.ts`, con el
mismo patrón "locator resolvió a 2 elementos" (input `given_name`/`current_password` duplicado,
texto de email de miembro duplicado). **La primera atribución que se hizo acá fue incorrecta**:
se asumió que era el mismo flake pre-existente ya documentado en el cierre de F3-C6 (memoria de
sesión anterior) y se dejó anotado como "scope ajeno, no bloqueante". Investigación más profunda
(pedida explícitamente por el usuario, con la sospecha correcta de que podía estar relacionado a
trabajo reciente) encontró que **era un bug real introducido por este mismo PR**, no un flake.

**Causa raíz:** `CookieConsentBanner` leía `document.cookie` de forma síncrona dentro del
inicializador de `useState` (`useState(() => hasStoredConsent())`). En el servidor
(`document === undefined`) esto siempre daba `true` (banner oculto); en el cliente, durante la
primera hidratación, leía la cookie real — produciendo un mismatch genuino entre el HTML
server-rendered y el primer render del cliente en **cada carga de página**, sin excepción.
Confirmado con `page.on('pageerror')`: aparecía `Minified React error #418` (hydration failed)
en cada navegación de prueba.

Cuando React detecta un mismatch de hidratación, descarta y vuelve a renderizar todo el subárbol
afectado del lado del cliente. Como `CookieConsentBanner` vive dentro del barrel `Providers` que
envuelve `{children}`, esa "regeneración" afectaba potencialmente **toda la página** debajo — y
cuando la aserción de un test caía justo en medio de esa transición, veía temporalmente nodos
duplicados (el árbol viejo aún no desmontado + el nuevo ya commiteado). Esto explica por qué era
intermitente (a veces el test corría antes/después de la ventana de duplicación) y por qué
`given_name`/`current_password`/emails de miembro aparecían "duplicados" sin que su código fuente
tuviera JSX duplicado en ningún lado (confirmado leyendo `profile-tab.tsx`/`security-tab.tsx`
completos — ninguno repite el campo).

**Fix:** reemplazar el `useState` inicializador por `useSyncExternalStore` — el snapshot de
servidor siempre devuelve `true` (igual que antes, sin mismatch posible), y el snapshot de
cliente lee la cookie real solo después de que React complete la hidratación. Un estado local
separado (`dismissedOverride`) oculta el banner al instante tras aceptar/rechazar/guardar, sin
depender de que el store externo se re-sincronice. Verificado con `legal-cookies.spec.ts` +
`settings.spec.ts` corriendo limpio repetidas veces (12/12), y `pnpm validate` completo (518/518).

**Lección de proceso:** la primera hipótesis ("es un flake ajeno ya documentado") se aceptó
demasiado rápido por parecerse superficialmente a un caso anterior. El patrón real (mismatch de
hidratación intermitente) solo se confirmó capturando `console`/`pageerror` del navegador durante
la reproducción — sin eso, hubiera quedado mal atribuido indefinidamente.

**Test de regresión agregado** (a pedido del usuario: "¿esto se pudo predecir en los tests?"):

- `src/test/e2e/hydration.spec.ts` — nuevo test `no hydration mismatch on first render @smoke`,
  navega a `/es` y falla si aparece `React error #418/#423/#425` en consola.
- `src/test/e2e/fixtures/auth.ts` — el fixture `authenticatedPage` ahora escucha `pageerror`
  durante TODO el test y falla automáticamente si detecta un hydration mismatch, sin importar
  qué página/flujo lo dispare. Esto cubre cualquier test autenticado futuro, no solo estos dos.

Regla durable derivada del incidente: nunca leer `document.cookie` o `localStorage` en un
inicializador de `useState`; para estado externo del navegador, usar `useSyncExternalStore`.

## 9. Fuera de scope (decisión de producto, no técnica)

- MDX para el contenido legal (diferido a F4).
- Página `/legal/cookies` separada — el banner ES la superficie de cookies.
- La integración analítica ya existe y consume esta decisión de consentimiento; reemplazar el
  proveedor o ampliar categorías sigue fuera del alcance de este módulo.
- Versionado de aceptación de términos (re-pedir consentimiento si cambian) — decisión de
  negocio de una fase futura.
