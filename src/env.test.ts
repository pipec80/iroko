import type { ZodType } from 'zod';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type EnvDefinition = {
  server: {
    BILLING_DEFAULT_PROVIDER: ZodType<string>;
    MOCK_BILLING_SECRET: ZodType;
    RESEND_API_KEY: ZodType;
  };
};

const createEnv = vi.hoisted(() => vi.fn((_definition: EnvDefinition) => ({})));
const config = vi.hoisted(() => ({ features: { billing: true } }));
vi.mock('@/config/app.config', () => ({ appConfig: config }));

vi.mock('@t3-oss/env-nextjs', () => ({ createEnv }));

function getBillingDefaultProviderSchema(): ZodType<string> {
  const definition = createEnv.mock.calls.at(-1)?.[0];
  if (!definition) throw new Error('env_definition_not_loaded');
  return definition.server.BILLING_DEFAULT_PROVIDER;
}

describe('billing environment validation', () => {
  beforeEach(() => {
    vi.resetModules();
    config.features.billing = true;
    vi.clearAllMocks();
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('BILLING_DEFAULT_PROVIDER', 'mock');
    delete process.env.ALLOW_MOCK_BILLING;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('refuses mock billing in production without an explicit opt-in', async () => {
    await import('./env');

    expect(getBillingDefaultProviderSchema().safeParse('mock').success).toBe(false);
  });

  it('allows absent payment secrets and Resend key with Mailpit when billing is disabled', async () => {
    const absent: unknown = undefined;
    config.features.billing = false;
    vi.stubEnv('MAILPIT_URL', 'http://localhost:54324');
    await import('./env');
    const schema = createEnv.mock.calls.at(-1)![0].server;
    expect(schema.BILLING_DEFAULT_PROVIDER.safeParse('mock').success).toBe(true);
    expect(schema.MOCK_BILLING_SECRET.safeParse(absent).success).toBe(true);
    expect(schema.RESEND_API_KEY.safeParse(absent).success).toBe(true);
    expect(schema.MOCK_BILLING_SECRET.safeParse('invalid').success).toBe(false);
  });

  it('requires Resend key when Mailpit is not configured', async () => {
    const absent: unknown = undefined;
    vi.stubEnv('MAILPIT_URL', '');
    await import('./env');
    expect(createEnv.mock.calls.at(-1)![0].server.RESEND_API_KEY.safeParse(absent).success).toBe(
      false,
    );
  });

  it('accepts mock billing in production when explicitly allowed', async () => {
    vi.stubEnv('ALLOW_MOCK_BILLING', 'true');
    await import('./env');

    expect(getBillingDefaultProviderSchema().safeParse('mock').success).toBe(true);
  });

  it('does not constrain configured real providers or non-production environments', async () => {
    await import('./env');
    expect(getBillingDefaultProviderSchema().safeParse('stripe').success).toBe(true);

    vi.stubEnv('NODE_ENV', 'test');
    const { isMockBillingAllowed } = await import('./env');
    expect(
      isMockBillingAllowed({
        nodeEnv: 'test',
        allowMockBilling: undefined,
      }),
    ).toBe(true);
  });
});
