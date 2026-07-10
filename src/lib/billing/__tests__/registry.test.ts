import { describe, it, expect, vi } from 'vitest';

vi.mock('@/env', () => ({
  env: {
    MOCK_BILLING_SECRET: 'test-secret',
    BILLING_DEFAULT_PROVIDER: 'mock',
    STRIPE_SECRET_KEY: 'sk_test_x',
  },
}));

import { getPaymentProvider, availableProviders } from '../registry';

describe('payment provider registry', () => {
  it('should always expose the mock provider', () => {
    expect(availableProviders()).toContain('mock');
  });

  it('should return the mock provider by default', () => {
    expect(getPaymentProvider().name).toBe('mock');
  });

  it('should throw for an unknown provider name', () => {
    expect(() => getPaymentProvider('nonexistent')).toThrow('provider_not_configured');
  });

  it('mock createCheckout returns a signed mock-checkout url', async () => {
    const provider = getPaymentProvider('mock');
    const { url } = await provider.createCheckout({
      accountId: 'a1',
      planSlug: 'pro',
      interval: 'month',
      successUrl: 'https://app/ok',
      cancelUrl: 'https://app/no',
    });
    expect(url).toContain('/billing/mock-checkout');
    expect(url).toContain('data=');
  });

  it('mock verifyWebhook rejects a tampered body', async () => {
    const provider = getPaymentProvider('mock');
    expect(await provider.verifyWebhook('{"not":"signed"}', 'bad-sig')).toBeNull();
  });

  it('should register stripe when STRIPE_SECRET_KEY is set', () => {
    expect(availableProviders()).toContain('stripe');
  });
});
