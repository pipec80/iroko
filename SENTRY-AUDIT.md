# Auditoría de Sentry — buenas prácticas (Next.js)

> Comparación de la configuración actual del proyecto contra la documentación
> oficial de Sentry para Next.js (`docs.sentry.io/platforms/javascript/guides/nextjs`,
> guía "Manual Setup" para Next.js 15+ con Turbopack y App Router), con foco en
> el plan **free (Developer)** de Sentry.
>
> Versiones del proyecto: `@sentry/nextjs` 10.67, Next.js 16.2, App Router,
> Turbopack, deploy en Vercel.

## Resumen ejecutivo

La integración está **muy bien hecha en general** — la mayoría de las
recomendaciones oficiales ya están aplicadas. Hay **1 problema crítico**
(el túnel de Sentry chocando con el proxy de next-intl, que muy probablemente
está perdiendo los eventos del navegador en producción), **1 desactualización**
(el archivo de cliente usa la convención vieja) y varias mejoras opcionales.

| #   | Hallazgo                                                                                                                                       | Severidad      |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| 1   | `/sentry-tunnel` no está excluido del matcher del proxy → el túnel se rompe con la redirección de locale — **✅ aplicado en esta rama**        | 🔴 Crítico     |
| 2   | `sentry.client.config.ts` es la convención vieja → renombrar a `instrumentation-client.ts` + hook de navegación — **✅ aplicado en esta rama** | 🟠 Recomendado |
| 3   | Falta `Sentry.setUser` → los issues no se pueden correlacionar con usuarios                                                                    | 🟡 Opcional    |
| 4   | Revisar `dataCollection` (v10.57+) para alinear con la postura GDPR ya adoptada en Replay                                                      | 🟡 Opcional    |
| 5   | Logs de Sentry + integración Pino disponibles, no activados (decisión razonable en plan free)                                                  | 🟡 Opcional    |
| 6   | `ignoreErrors` es más idiomático que el regex en `beforeSend` para filtrar por mensaje                                                         | 🔵 Cosmético   |

## Lo que ya está bien (alineado con la doc oficial)

- ✅ **`withSentryConfig`** con `org`/`project`, `authToken` desde env,
  `silent` fuera de CI, `widenClientFileUpload: true` — idéntico al ejemplo oficial.
- ✅ **`instrumentation.ts`** con `register()` por runtime y
  `export const onRequestError = Sentry.captureRequestError` — exactamente lo
  que pide la doc para capturar errores de Server Components, middleware y proxies.
- ✅ **`global-error.tsx`** con `captureException` en `useEffect` — calcado del
  ejemplo oficial (incluye `<html>`/`<body>` como corresponde).
- ✅ **`captureException` en todos los `error.tsx`** (root, auth, dashboard) —
  la doc lo exige explícitamente: "Add `captureException` in every error boundary".
- ✅ **Separación de environments** (`VERCEL_ENV` con fallback `'local'` para
  E2E) — buena práctica que la doc ni siquiera detalla tan bien.
- ✅ **`tracesSampleRate` 0.1 en prod / 1.0 en dev** — exactamente los valores
  del ejemplo oficial.
- ✅ **Replay conservador**: `replaysSessionSampleRate: 0.05` (la doc sugiere
  0.1; 0.05 es incluso mejor para plan free) + `replaysOnErrorSampleRate: 1.0`
  - `maskAllText`/`maskAllInputs` (GDPR). El CSP ya tiene `worker-src blob:`
    que Replay necesita.
- ✅ **Filtrado de ruido** en `beforeSend` (ChunkLoadError, NetworkError,
  interrupciones de prerender de Next 16) — la doc recomienda filtrar
  precisamente este tipo de errores no accionables; clave en plan free
  (5k errores/mes).
- ✅ **Wrapper de Server Actions** (`withServerAction` en `src/lib/server-action.ts`)
  que captura throws inesperados con tag y re-lanza, ignorando
  `NEXT_REDIRECT`/`NEXT_NOT_FOUND` — cumple el patrón "if you catch and don't
  re-throw, call captureException" de la doc.
- ✅ **Tree-shaking** (`removeDebugLogging`) y `automaticVercelMonitors` para crons.
- ✅ **DSN y auth token validados en `src/env.ts`** y documentados en `.env.example`.
- ✅ **CSP** con el origin de ingest en `connect-src` y `report-uri` hacia Sentry.

## Hallazgos

### 1. 🔴 El túnel de Sentry choca con el proxy (eventos del navegador probablemente perdidos)

`next.config.ts` configura `tunnelRoute: '/sentry-tunnel'`, así que el SDK del
navegador envía **todos** los eventos de cliente (errores, replays, trazas) por
POST a `/sentry-tunnel`, que un rewrite de `withSentryConfig` reenvía a Sentry.

El problema: el matcher de `src/proxy.ts` —

```
'/((?!api|_next/static|_next/image|favicon.ico|manifest.json|.*\\..*).*)'
```

— **sí matchea `/sentry-tunnel`** (no empieza con `api`, no tiene punto). Con
`localePrefix: 'always'` en next-intl, el proxy responde a ese POST con un
**307 → `/es/sentry-tunnel`**, ruta donde el rewrite del túnel ya no matchea
→ **404** y el evento se pierde. El SDK no hace fallback al envío directo
cuando el túnel falla.

La doc oficial lo advierte textualmente para Next.js 16:

> "If you're using Next.js proxy/middleware that intercepts requests, exclude
> the tunnel route. The file is called `proxy.ts` in Next.js 16+"
>
> ```ts
> export const config = {
>   matcher: ['/((?!sentry-tunnel|_next/static|_next/image|favicon.ico).*)'],
> };
> ```

**Fix** — añadir `sentry-tunnel` al negative lookahead del matcher:

```ts
source: '/((?!api|sentry-tunnel|_next/static|_next/image|favicon.ico|manifest.json|.*\\..*).*)',
```

**Verificación**: tras deployar, lanzar un error de prueba desde el navegador
en producción y confirmar que llega a Issues. En la pestaña Network se debe ver
`POST /sentry-tunnel` → 200 (hoy debería verse el 307 → 404 que confirma el bug).

_Nota:_ los eventos de **servidor** no pasan por el túnel (Node envía directo),
por eso los issues de servidor (p. ej. IROKO-6) sí llegaban — el bug afecta
solo al lado cliente.

### 2. 🟠 Migrar `sentry.client.config.ts` → `instrumentation-client.ts`

La convención actual del SDK (y de Next.js 15+) es inicializar el cliente en
`instrumentation-client.ts`. La doc oficial:

> "If you previously had a file called `sentry.client.config.(js|ts)`, you can
> safely rename this to `instrumentation-client.(js|ts)` for all Next.js versions."

Además, el archivo nuevo debe exportar el hook de navegación del App Router,
sin el cual las navegaciones del router no se instrumentan como spans:

```ts
// instrumentation-client.ts (mismo contenido actual + esta línea)
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
```

Pasos: renombrar el archivo (raíz o `src/`, ambas valen), añadir el export, y
listo — `instrumentation.ts` no cambia (solo maneja server/edge).

### 3. 🟡 `Sentry.setUser` — correlacionar issues con usuarios

No hay ningún `setUser` en el código. Sin él, no se puede saber a cuántos ni a
cuáles usuarios afecta un issue. Compatible con la postura GDPR del proyecto:
basta con setear **solo el UUID** de Supabase (sin email):

```ts
// tras resolver la sesión (client y/o server)
Sentry.setUser(user ? { id: user.id } : null);
```

### 4. 🟡 Revisar `dataCollection` (SDK ≥ 10.57)

El SDK 10.x introdujo la opción `dataCollection`, que por defecto recoge
contexto rico: `userInfo` (incluye IP), cookies, headers, **bodies de
request/response**, query params y variables locales de stack frames. Dado que
el proyecto ya adoptó una postura estricta de privacidad en Replay
(mask all), conviene decidir explícitamente en los tres archivos de init:

```ts
dataCollection: {
  // Ejemplo de postura conservadora, ajustar según necesidad de debugging:
  userInfo: false,   // no IP ni user automático (setUser manual con solo id)
  cookies: false,
  httpBodies: [],    // no capturar bodies (pueden contener PII de formularios)
},
```

Trade-off: menos contexto para debuggear. Mínimo recomendado: dejar constancia
explícita de la decisión (aunque sea con los defaults), como ya se hace con Replay.

### 5. 🟡 Sentry Logs + integración Pino (opcional en plan free)

El proyecto usa Pino en servidor (`src/lib/logger.ts`). Desde SDK 10.18 existe
`Sentry.pinoIntegration()` + `enableLogs: true`, que enviaría esos logs
estructurados a Sentry con atributos consultables, correlacionados con trazas
y errores.

En **plan free** la cuota de logs es limitada, así que si se activa:

```ts
// sentry.server.config.ts
enableLogs: true,
integrations: [Sentry.pinoIntegration({ levels: ['warn', 'error', 'fatal'] })],
```

- Filtrar a `warn`+ para proteger la cuota (la doc muestra el filtro `levels`).
- `beforeSendLog` disponible para descartar ruido o atributos sensibles
  (el logger Pino ya redacta passwords/tokens/emails, lo cual ayuda).

Decisión válida también: **no activarlo** y seguir con Pino → stdout de Vercel.
Con la cuota free, errores + trazas + replays son más valiosos que logs.

### 6. 🔵 `ignoreErrors` en lugar de regex en `beforeSend`

Para filtrar por mensaje, la opción idiomática es `ignoreErrors` (se evalúa
antes y es más barata que `beforeSend`):

```ts
ignoreErrors: [/ChunkLoadError/, /Loading chunk/, /NetworkError/],
```

`beforeSend` queda entonces solo para lógica que realmente necesita inspeccionar
el evento (como el caso de `HangingPromiseRejectionError` del server, que
igualmente podría moverse a `ignoreErrors`). Funcionalmente lo actual es
correcto; esto es solo limpieza.

## Consejos específicos para el plan free

Cuotas aproximadas del plan Developer (verificar en Settings → Usage & Billing):
~5.000 errores/mes, ~50 replays/mes, cuota limitada de spans y logs.

1. **Replays**: con `replaysSessionSampleRate: 0.05`, 50 replays/mes se agotan
   con ~1.000 sesiones mensuales. Si el tráfico crece, considerar bajarlo a
   `0` y quedarse solo con `replaysOnErrorSampleRate: 1.0` — los replays de
   error son los que de verdad valen.
2. **Trazas**: `0.1` está bien de partida. La doc recomienda vigilar
   Settings → Stats (categoría _spans_) y ajustar. Si se agota, bajar a `0.05`
   o usar `tracesSampler` para excluir rutas de bajo valor (health checks,
   assets).
3. **Errores**: el filtrado de ruido ya implementado es la mejor defensa de la
   cuota. Revisar Issues periódicamente y añadir patrones nuevos a
   `ignoreErrors` (extensiones de navegador, bots, etc.).
4. **Spike protection**: viene activada por defecto a nivel de organización —
   confirmar que está ON en Settings → Spike Protection.
5. **Alertas**: en plan free hay alertas por email — configurar al menos una
   alerta de "new issue" en production para no depender de entrar al dashboard.

## Plan de acción sugerido

1. **✅ Aplicado en esta rama**: fix del matcher del proxy (#1) + rename a
   `src/instrumentation-client.ts` con `onRouterTransitionStart` (#2).
   **Pendiente de verificar tras el deploy**: abrir el preview/producción con
   DevTools → Network y confirmar que `POST /sentry-tunnel` devuelve 200
   (antes del fix: 307 → 404).
2. **Corto plazo**: `Sentry.setUser({ id })` (#3) y decisión explícita sobre
   `dataCollection` (#4).
3. **Cuando haga falta**: evaluar logs con Pino (#5) según cuota disponible,
   y limpieza de `ignoreErrors` (#6).
