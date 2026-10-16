// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const absentEnvironmentValue: undefined = undefined;

// These tests load the real environment/SDK, including under V8 coverage.
// Keep fixtures valid for the entire test so a slow import cannot race cleanup.
beforeEach(() => {
  vi.stubEnv('IMPERSONATION_COOKIE_SECRET', 'ab'.repeat(32));
  vi.stubEnv('MOCK_BILLING_SECRET', 'cd'.repeat(32));
  vi.stubEnv('RESEND_API_KEY', 'synthetic-local-resend');
  vi.stubEnv('FROM_EMAIL', 'local@example.test');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

it('rejects an invalid upload flag in the server environment contract', async () => {
  vi.resetModules();
  vi.stubEnv('SKIP_ENV_VALIDATION', absentEnvironmentValue);
  vi.stubEnv('SENTRY_UPLOAD_SOURCE_MAPS', 'yes');
  vi.stubEnv('SITE_URL', 'http://localhost:3000');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://127.0.0.1:54321');
  vi.stubEnv('SUPABASE_SECRET_KEY', 'synthetic-local-secret');
  vi.stubEnv('IMPERSONATION_COOKIE_SECRET', 'ab'.repeat(32));
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'synthetic-local-publishable');
  vi.stubEnv('RESEND_API_KEY', 'synthetic-local-resend');
  vi.stubEnv('FROM_EMAIL', 'local@example.test');
  vi.stubEnv('MOCK_BILLING_SECRET', 'cd'.repeat(32));
  vi.spyOn(console, 'error').mockImplementation(() => {});
  await expect(import('../../env')).rejects.toThrow('Invalid environment variables');
}, 120_000);

it('keeps the real Sentry tunnel without installing its Turbopack upload hook', async () => {
  vi.resetModules();
  vi.stubEnv('TURBOPACK', '1');
  vi.stubEnv('SENTRY_UPLOAD_SOURCE_MAPS', 'false');
  vi.stubEnv('SENTRY_AUTH_TOKEN', 'synthetic-local-token');
  vi.stubEnv('LOCAL_VALIDATION', absentEnvironmentValue);
  vi.stubEnv('NEXT_PUBLIC_LOCAL_VALIDATION', absentEnvironmentValue);
  const { default: config } = await import('../../../next.config');
  expect(config.env?.NEXT_PUBLIC_LOCAL_VALIDATION).toBe('false');
  expect(config.compiler?.runAfterProductionCompile).toBeUndefined();
  expect(JSON.stringify(await config.rewrites?.())).toContain('/sentry-tunnel');
}, 120_000);
