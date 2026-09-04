import { describe, it, expect, vi } from 'vitest';

vi.mock('@/env', () => ({
  env: {
    MOCK_BILLING_SECRET: 'test-secret',
    BILLING_DEFAULT_PROVIDER: 'mock',
    STRIPE_SECRET_KEY: 'sk_test_x',
    STRIPE_WEBHOOK_SECRET: 'whsec_test_x',
    MERCADOPAGO_ACCESS_TOKEN: 'TEST-token',
    MERCADOPAGO_WEBHOOK_SECRET: 'mp_webhook_test',
    MERCADOPAGO_WEBHOOK_URL: 'https://app.example.com/api/webhooks/mercadopago',
    LOG_LEVEL: 'silent',
  },
}));

import { getPaymentProvider, availableProviders, hasProviderCredentials } from '../registry';

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
      customerEmail: 'owner@example.com',
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

  it('should register stripe only when its API and webhook secrets are set', () => {
    expect(availableProviders()).toContain('stripe');
  });

  it('should register mercadopago only when its API credentials and delivery URL are set', () => {
    expect(availableProviders()).toContain('mercadopago');
  });

  it('fails closed when a real provider has only one of its required credentials', () => {
    expect(
      hasProviderCredentials('stripe', {
        STRIPE_SECRET_KEY: 'sk_test_x',
      }),
    ).toBe(false);
    expect(
      hasProviderCredentials('mercadopago', {
        MERCADOPAGO_WEBHOOK_SECRET: 'mp_webhook_test',
      }),
    ).toBe(false);
    expect(
      hasProviderCredentials('mercadopago', {
        MERCADOPAGO_ACCESS_TOKEN: 'TEST-token',
        MERCADOPAGO_WEBHOOK_SECRET: 'mp_webhook_test',
      }),
    ).toBe(false);
  });
});
