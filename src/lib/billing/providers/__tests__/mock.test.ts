import { describe, it, expect, vi } from 'vitest';

vi.mock('@/env', () => ({
  env: { MOCK_BILLING_SECRET: 'test-secret-please-change', SITE_URL: 'http://localhost:3000' },
}));

import { mockProvider } from '../mock';
import { signMockPayload } from '../../signing';
import type { NormalizedEvent } from '../../types';

describe('mockProvider', () => {
  it('createCheckout returns a signed hosted-page url with the params as a token', async () => {
    const { url } = await mockProvider.createCheckout({
      accountId: 'a1',
      planSlug: 'pro',
      interval: 'month',
      successUrl: 'http://ok',
      cancelUrl: 'http://no',
    });
    const parsed = new URL(url);
    expect(parsed.pathname).toBe('/es/billing/mock-checkout');
    expect(parsed.searchParams.get('data')).toBeTruthy();
  });

  it('createPortalSession returns the returnUrl unchanged', async () => {
    const { url } = await mockProvider.createPortalSession({
      accountId: 'a1',
      returnUrl: 'http://back-to-app',
    });
    expect(url).toBe('http://back-to-app');
  });

  it('cancelSubscription resolves without throwing (no-op)', async () => {
    await expect(mockProvider.cancelSubscription('sub_1', true)).resolves.toBeUndefined();
  });

  it('verifyWebhook returns the decoded event when the signature is "mock" and the body is valid', async () => {
    const event: NormalizedEvent = {
      externalEventId: 'evt_1',
      type: 'subscription_created',
      accountId: 'a1',
      raw: {},
    };
    const signed = await signMockPayload(event);
    const result = await mockProvider.verifyWebhook(signed, 'mock');
    expect(result).toEqual(event);
  });

  it('verifyWebhook returns null when the signature marker is not "mock"', async () => {
    const event: NormalizedEvent = {
      externalEventId: 'evt_1',
      type: 'subscription_created',
      accountId: 'a1',
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
