import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sentry = vi.hoisted(() => ({
  init: vi.fn(),
  withSentryConfig: vi.fn((config: unknown) => config),
  replayIntegration: vi.fn(),
  captureRouterTransitionStart: vi.fn(),
}));
vi.mock('@sentry/nextjs', () => sentry);
vi.mock('@next/bundle-analyzer', () => ({ default: () => (config: unknown) => config }));
vi.mock('next-intl/plugin', () => ({ default: () => (config: unknown) => config }));

// Passing an absent value removes the variable and lets unstubAllEnvs restore it.
const absentEnvironmentValue: undefined = undefined;

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  for (const marker of [
    'VERCEL',
    'VERCEL_ENV',
    'NEXT_PUBLIC_VERCEL_ENV',
    'NETLIFY',
    'CF_PAGES',
    'LOCAL_VALIDATION',
    'NEXT_PUBLIC_LOCAL_VALIDATION',
    'SENTRY_UPLOAD_SOURCE_MAPS',
    'GITHUB_REPOSITORY',
    'GITHUB_REF',
    'GITHUB_EVENT_NAME',
    'VERCEL_PROJECT_ID',
    'CI',
  ])
    vi.stubEnv(marker, absentEnvironmentValue);
  vi.stubEnv('SITE_URL', 'http://localhost:3000');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://127.0.0.1:54321');
  vi.stubEnv('SENTRY_AUTH_TOKEN', 'test-upload-token');
  vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://test@example.com/1');
});
afterEach(() => vi.unstubAllEnvs());

describe('local Sentry isolation', () => {
  it('rejects an invalid upload flag before configuring Sentry', async () => {
    vi.stubEnv('SENTRY_UPLOAD_SOURCE_MAPS', 'yes');
    await expect(import('../../../next.config')).rejects.toThrow('SENTRY_UPLOAD_SOURCE_MAPS');
    expect(sentry.withSentryConfig).not.toHaveBeenCalled();
  });
  it('disables every upload/release build effect with an inherited token', async () => {
    await import('../../../next.config');
    expect(sentry.withSentryConfig).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        authToken: undefined,
        sourcemaps: { disable: true },
        release: { create: false, finalize: false },
        telemetry: false,
        useRunAfterProductionCompileHook: false,
        webpack: expect.objectContaining({
          automaticVercelMonitors: false,
          unstable_sentryWebpackPluginOptions: { disable: true },
        }),
      }),
    );
  });
  it('enables upload effects only with explicit trusted CI authorization', async () => {
    vi.stubEnv('SENTRY_UPLOAD_SOURCE_MAPS', 'true');
    vi.stubEnv('CI', 'true');
    vi.stubEnv('GITHUB_REPOSITORY', 'pipec80/iroko');
    vi.stubEnv('GITHUB_REF', 'refs/heads/main');
    vi.stubEnv('GITHUB_EVENT_NAME', 'push');
    await import('../../../next.config');
    expect(sentry.withSentryConfig).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        authToken: 'test-upload-token',
        sourcemaps: { disable: false },
        release: { create: true, finalize: true },
        telemetry: true,
        useRunAfterProductionCompileHook: true,
      }),
    );
  });
  it('omits the upload wrapper despite an inherited token', async () => {
    vi.stubEnv('LOCAL_VALIDATION', 'true');
    const { default: config } = await import('../../../next.config');
    expect(sentry.withSentryConfig).not.toHaveBeenCalled();
    expect(config.env?.NEXT_PUBLIC_LOCAL_VALIDATION).toBe('true');
  });
  it('keeps the production wrapper by default', async () => {
    const { default: config } = await import('../../../next.config');
    expect(sentry.withSentryConfig).toHaveBeenCalledOnce();
    expect(config.env?.NEXT_PUBLIC_LOCAL_VALIDATION).toBe('false');
  });
  it.each(['server', 'edge'])('does not initialize the %s SDK locally', async (runtime) => {
    vi.stubEnv('LOCAL_VALIDATION', 'true');
    if (runtime === 'server') await import('../../../sentry.server.config');
    else await import('../../../sentry.edge.config');
    expect(sentry.init).not.toHaveBeenCalled();
  });
  it('does not initialize browser SDK or Replay locally', async () => {
    vi.stubEnv('NEXT_PUBLIC_LOCAL_VALIDATION', 'true');
    await import('../../instrumentation-client');
    expect(sentry.init).not.toHaveBeenCalled();
    expect(sentry.replayIntegration).not.toHaveBeenCalled();
  });
  it.each(['server', 'edge', 'client'])(
    'initializes the %s SDK normally by default',
    async (runtime) => {
      if (runtime === 'server') await import('../../../sentry.server.config');
      else if (runtime === 'edge') await import('../../../sentry.edge.config');
      else await import('../../instrumentation-client');
      expect(sentry.init).toHaveBeenCalledOnce();
      expect(sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({ dsn: 'https://test@example.com/1' }),
      );
    },
  );
});
