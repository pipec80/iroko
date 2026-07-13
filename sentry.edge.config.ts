import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Separa production / preview / development en issues y alertas.
  // Fallback 'local' (no NODE_ENV): los builds de producción locales (E2E de
  // Playwright) no deben mezclarse con la producción real de Vercel.
  environment: process.env.VERCEL_ENV ?? 'local',

  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  debug: false,
});
