import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Tracing — 10% en prod, 100% en dev para ver todas las transacciones
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Propagación a Supabase y al propio site
  tracePropagationTargets: [
    'localhost',
    /^https:\/\/[^/]+\.supabase\.co/,
    /^https:\/\/iroko\.vercel\.app/,
  ],

  // Session Replay: 5% de sesiones normales, 100% cuando hay error
  replaysSessionSampleRate: 0.05,
  replaysOnErrorSampleRate: 1.0,
  integrations: [Sentry.replayIntegration()],

  // No mostrar logs de Sentry en consola
  debug: false,
});
