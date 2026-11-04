import { afterEach, describe, expect, it, vi } from 'vitest';

import { assertMockBillingAllowed, isMockBillingAllowed } from '../mock-policy';

describe('mock billing access', () => {
  afterEach(() => vi.unstubAllEnvs());
  it.each(['development', 'production'])(
    'denies ordinary %s servers with loopback URLs and opt-in',
    (nodeEnv) => {
      vi.stubEnv('MOCK_BILLING_FIXTURE', undefined);
      expect(isMockBillingAllowed({ nodeEnv, allowMockBilling: 'true' })).toBe(false);
    },
  );
  it('denies a hosted checkout even with an explicit mock opt-in', () => {
    vi.stubEnv('VERCEL_ENV', 'production');
    expect(isMockBillingAllowed({ nodeEnv: 'production', allowMockBilling: 'true' })).toBe(false);
  });
  it.each(['SITE_URL', 'NEXT_PUBLIC_SUPABASE_URL'])('denies a nonlocal %s', (name) => {
    vi.stubEnv(name, 'https://example.test');
    expect(isMockBillingAllowed({ nodeEnv: 'production', allowMockBilling: 'true' })).toBe(false);
  });
  it('denies production without explicit opt-in', () => {
    expect(isMockBillingAllowed({ nodeEnv: 'production' })).toBe(false);
    expect(() =>
      assertMockBillingAllowed({ nodeEnv: 'production', allowMockBilling: 'false' }),
    ).toThrow('mock_billing_disabled');
  });
  it('permits explicit production opt-in and local development/test', () => {
    expect(isMockBillingAllowed({ nodeEnv: 'production', allowMockBilling: 'true' })).toBe(true);
    expect(isMockBillingAllowed({ nodeEnv: 'test' })).toBe(true);
    expect(isMockBillingAllowed({ nodeEnv: 'development' })).toBe(true);
  });
});
