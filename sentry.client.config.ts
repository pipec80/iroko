import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  tracePropagationTargets: [
    'localhost',
    /^https:\/\/[^/]+\.supabase\.co/,
    /^https:\/\/iroko\.vercel\.app/,
  ],

  // GDPR: mask all inputs and text in Session Replay
  replaysSessionSampleRate: 0.05,
  replaysOnErrorSampleRate: 1.0,
  integrations: [
    Sentry.replayIntegration({
      maskAllInputs: true,
      maskAllText: true,
    }),
  ],

  // Drop noise: network errors and chunk load failures are not actionable
  beforeSend(event) {
    const msg = event.exception?.values?.[0]?.value ?? '';
    if (/ChunkLoadError|Loading chunk|NetworkError/.test(msg)) return null;
    return event;
  },

  debug: false,
});
