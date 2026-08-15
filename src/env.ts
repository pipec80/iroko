import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  // GitHub Actions passes unset secrets as empty strings.
  // SKIP_ENV_VALIDATION=1 lets CI build without real credentials
  // (used for Dependabot PRs where secrets are unavailable).
  skipValidation: process.env.SKIP_ENV_VALIDATION === '1',

  server: {
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    SITE_URL: z.string().url().default('http://localhost:3000'),
    SUPABASE_SECRET_KEY: z.string().min(1),
    SENTRY_AUTH_TOKEN: z.string().min(1).optional(),
    RESEND_API_KEY: z.string().min(1),
    FROM_EMAIL: z.string().email(),
    // Catcher de email local (Mailpit, incluido en el stack de Supabase CLI).
    // Cuando está definida, TODOS los emails de la app van ahí en vez de a
    // Resend — así se pueden ver y testear sin proveedor real ni dominio
    // verificado. Se gatea con esta variable y no con NODE_ENV a propósito:
    // la suite E2E corre `next build && next start`, es decir en modo
    // producción, contra el stack local (mismo motivo documentado en
    // src/proxy.ts para el CSP). Vacía o ausente en producción.
    MAILPIT_URL: z.string().url().optional(),
    BILLING_DEFAULT_PROVIDER: z.string().default('mock'),
    MOCK_BILLING_SECRET: z.string().min(1),
    STRIPE_SECRET_KEY: z.string().min(1).optional(),
    STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
    MERCADOPAGO_ACCESS_TOKEN: z.string().min(1).optional(),
    MERCADOPAGO_WEBHOOK_SECRET: z.string().min(1).optional(),
    // Injected automatically by Vercel — never set manually. Absent outside Vercel.
    VERCEL_ENV: z.enum(['production', 'preview', 'development']).optional(),
    // Server-side posthog-node client. The real ingest host — never the
    // same-origin `/ingest` proxy path, which only exists inside a request.
    POSTHOG_HOST: z.string().url().default('https://us.i.posthog.com'),
  },
  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
    NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
    // Cloudflare Turnstile site key. When set, CAPTCHA is shown on auth forms.
    // Pair with [auth.captcha] secret in supabase/config.toml.
    // Local test key (always passes): 1x00000000000000000000AA
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().optional(),
    // Optional by design (COMMANDMENTS.md): a missing token must never break
    // the app. analytics/client.ts fails loud in dev, stays a no-op in prod.
    NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: z.string().optional(),
    // Same-origin reverse proxy path (see next.config.ts rewrites) — never
    // the raw PostHog host, so events aren't blocked by tracker blockers.
    NEXT_PUBLIC_POSTHOG_HOST: z.string().default('/ingest'),
  },
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    LOG_LEVEL: process.env.LOG_LEVEL ?? 'info',
    SITE_URL: process.env.SITE_URL,
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    FROM_EMAIL: process.env.FROM_EMAIL,
    MAILPIT_URL: process.env.MAILPIT_URL,
    BILLING_DEFAULT_PROVIDER: process.env.BILLING_DEFAULT_PROVIDER ?? 'mock',
    MOCK_BILLING_SECRET: process.env.MOCK_BILLING_SECRET,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    MERCADOPAGO_ACCESS_TOKEN: process.env.MERCADOPAGO_ACCESS_TOKEN,
    MERCADOPAGO_WEBHOOK_SECRET: process.env.MERCADOPAGO_WEBHOOK_SECRET,
    VERCEL_ENV: process.env.VERCEL_ENV,
    POSTHOG_HOST: process.env.POSTHOG_HOST ?? 'https://us.i.posthog.com',
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? '/ingest',
  },
});
