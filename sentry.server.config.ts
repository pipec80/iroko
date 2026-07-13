import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Separa production / preview / development en issues y alertas.
  // Fallback 'local' (no NODE_ENV): los builds de producción locales (E2E de
  // Playwright) no deben mezclarse con la producción real de Vercel.
  environment: process.env.VERCEL_ENV ?? 'local',

  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  tracePropagationTargets: [
    'localhost',
    /^https:\/\/[^/]+\.supabase\.co/,
    /^https:\/\/iroko\.vercel\.app/,
  ],

  beforeSend(event) {
    const msg = event.exception?.values?.[0]?.value ?? '';
    if (/ChunkLoadError|Loading chunk|NetworkError/.test(msg)) return null;
    // Next 16 (cacheComponents): interrupción esperada del prerender cuando el
    // layout usa cookies() — React la maneja y la ruta cae a dynamic. Es señal
    // de control de Next, no un error (IROKO-6 era esto desde los E2E locales).
    if (/During prerendering, `cookies\(\)` rejects|HangingPromiseRejectionError/.test(msg)) {
      return null;
    }
    return event;
  },

  debug: false,
});
