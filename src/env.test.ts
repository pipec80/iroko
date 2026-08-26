import type { ZodType } from 'zod';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type EnvDefinition = {
  server: {
    BILLING_DEFAULT_PROVIDER: ZodType<string>;
  };
};

const createEnv = vi.hoisted(() => vi.fn((_definition: EnvDefinition) => ({})));

vi.mock('@t3-oss/env-nextjs', () => ({ createEnv }));

function getBillingDefaultProviderSchema(): ZodType<string> {
  const definition = createEnv.mock.calls.at(-1)?.[0];
  if (!definition) throw new Error('env_definition_not_loaded');
  return definition.server.BILLING_DEFAULT_PROVIDER;
}

describe('billing environment validation', () => {
  beforeEach(() => {
    vi.resetModules();
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
        provider: 'mock',
        allowMockBilling: undefined,
      }),
    ).toBe(true);
  });
});
