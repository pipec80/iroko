import { describe, it, expect, vi, afterEach } from 'vitest';
import { env } from '@/env';

vi.mock('@/env', () => ({
  env: { MOCK_BILLING_SECRET: 'cd'.repeat(32), SITE_URL: 'http://localhost:3000' },
}));

import { mockProvider } from '../mock';
import { signMockPayload } from '../../signing';
import type { SubscriptionCreatedEvent } from '../../events';

describe('mockProvider', () => {
  afterEach(() => {
    Object.assign(env, { NODE_ENV: 'test', ALLOW_MOCK_BILLING: undefined });
  });
  it('blocks direct checkout, cancellation and webhook verification without production opt-in', async () => {
    const token = await signMockPayload({
      provider: 'mock',
      externalEventId: 'evt_1',
      type: 'subscription_canceled',
      accountId: 'a1',
      externalSubscriptionId: 'sub_1',
      raw: {},
    });
    Object.assign(env, { NODE_ENV: 'production', BILLING_DEFAULT_PROVIDER: 'stripe' });
    await expect(
      mockProvider.createCheckout({
        accountId: 'a1',
        customerEmail: 'a@example.com',
        planSlug: 'pro',
        interval: 'month',
        successUrl: 'https://app.example/ok',
        cancelUrl: 'https://app.example/no',
      }),
    ).rejects.toThrow('mock_billing_disabled');
    await expect(
      mockProvider.cancelSubscription?.({ externalSubscriptionId: 'sub_1', timing: 'immediate' }),
    ).rejects.toThrow('mock_billing_disabled');
    expect(await mockProvider.verifyWebhook(token, 'mock')).toBeNull();
    Object.assign(env, { ALLOW_MOCK_BILLING: 'true' });
    expect(await mockProvider.verifyWebhook(token, 'mock')).toEqual(
      expect.objectContaining({ type: 'subscription_canceled' }),
    );
  });
  it('rejects signed checkout payloads and another provider as normalized events', async () => {
    for (const payload of [
      {
        accountId: 'a1',
        planSlug: 'pro',
        interval: 'month',
        successUrl: 'http://localhost:3000/ok',
        cancelUrl: 'http://localhost:3000/no',
      },
      {
        provider: 'stripe',
        externalEventId: 'evt_1',
        type: 'subscription_canceled',
        accountId: 'a1',
        externalSubscriptionId: 'sub_1',
        raw: {},
      },
    ]) {
      expect(await mockProvider.verifyWebhook(await signMockPayload(payload), 'mock')).toBeNull();
    }
  });
  it('createCheckout returns a signed hosted-page url with the params as a token', async () => {
    const { url } = await mockProvider.createCheckout({
      accountId: 'a1',
      customerEmail: 'owner@example.com',
      planSlug: 'pro',
      interval: 'month',
      successUrl: 'http://localhost:3000/ok',
      cancelUrl: 'http://localhost:3000/no',
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
