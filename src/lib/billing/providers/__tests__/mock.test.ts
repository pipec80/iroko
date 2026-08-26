import { describe, it, expect, vi } from 'vitest';

vi.mock('@/env', () => ({
  env: { MOCK_BILLING_SECRET: 'test-secret-please-change', SITE_URL: 'http://localhost:3000' },
}));

import { mockProvider } from '../mock';
import { signMockPayload } from '../../signing';
import type { SubscriptionCreatedEvent } from '../../events';

describe('mockProvider', () => {
  it('createCheckout returns a signed hosted-page url with the params as a token', async () => {
    const { url } = await mockProvider.createCheckout({
      accountId: 'a1',
      customerEmail: 'owner@example.com',
      planSlug: 'pro',
      interval: 'month',
      successUrl: 'http://ok',
      cancelUrl: 'http://no',
    });
    const parsed = new URL(url);
    expect(parsed.pathname).toBe('/es/billing/mock-checkout');
    expect(parsed.searchParams.get('data')).toBeTruthy();
  });

  it('does not advertise a customer portal it cannot provide', () => {
    expect(mockProvider.capabilities.customerPortal).toBe(false);
    expect(mockProvider.createPortalSession).toBeUndefined();
  });

  it('cancelSubscription resolves without throwing (no-op)', async () => {
    await expect(
      mockProvider.cancelSubscription?.({
        externalSubscriptionId: 'sub_1',
        timing: 'period_end',
      }),
    ).resolves.toBeUndefined();
  });

  it('verifyWebhook returns the decoded event when the signature is "mock" and the body is valid', async () => {
    const event: SubscriptionCreatedEvent = {
      provider: 'mock',
      externalEventId: 'evt_1',
      type: 'subscription_created',
      accountId: 'a1',
      externalSubscriptionId: 'sub_1',
      externalPriceId: 'mock_pro_month',
      status: 'active',
      cancelAtPeriodEnd: false,
      raw: {},
    };
    const signed = await signMockPayload(event);
    const result = await mockProvider.verifyWebhook(signed, 'mock');
    expect(result).toEqual(event);
  });

  it('verifyWebhook returns null when the signature marker is not "mock"', async () => {
    const event: SubscriptionCreatedEvent = {
      provider: 'mock',
      externalEventId: 'evt_1',
      type: 'subscription_created',
      accountId: 'a1',
      externalSubscriptionId: 'sub_1',
      externalPriceId: 'mock_pro_month',
      status: 'active',
      cancelAtPeriodEnd: false,
      raw: {},
    };
    const signed = await signMockPayload(event);
    const result = await mockProvider.verifyWebhook(signed, 'not-mock');
    expect(result).toBeNull();
  });

  it('verifyWebhook returns null when the body token is invalid', async () => {
    const result = await mockProvider.verifyWebhook('garbage', 'mock');
    expect(result).toBeNull();
  });
});
