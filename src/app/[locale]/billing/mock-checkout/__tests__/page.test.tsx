import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  verify: vi.fn(),
  env: { NODE_ENV: 'test', ALLOW_MOCK_BILLING: undefined as string | undefined },
}));
vi.mock('@/env', () => ({ env: mocks.env }));
vi.mock('@/lib/billing/signing', () => ({ verifyMockPayload: mocks.verify }));
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('not_found');
  },
}));
vi.mock('next-intl/server', () => ({
  setRequestLocale: vi.fn(),
  getTranslations: async () => (key: string) => key,
}));
vi.mock('@/components/dashboard/org/mock-checkout-form', () => ({ MockCheckoutForm: () => null }));

import MockCheckoutPage from '../page';

const props = {
  params: Promise.resolve({ locale: 'es' }),
  searchParams: Promise.resolve({ data: 'token' }),
};

describe('mock checkout page boundaries', () => {
  afterEach(() => {
    vi.clearAllMocks();
    mocks.env.NODE_ENV = 'test';
    mocks.env.ALLOW_MOCK_BILLING = undefined;
  });
  it('denies production before decoding a signed token without opt-in', async () => {
    mocks.env.NODE_ENV = 'production';
    await expect(MockCheckoutPage(props)).rejects.toThrow('not_found');
    expect(mocks.verify).not.toHaveBeenCalled();
  });
  it('rejects event-purpose payloads', async () => {
    mocks.verify.mockResolvedValue({
      provider: 'mock',
      type: 'subscription_canceled',
      accountId: 'a1',
      externalEventId: 'evt_1',
      externalSubscriptionId: 'sub_1',
      raw: {},
    });
    await expect(MockCheckoutPage(props)).rejects.toThrow('not_found');
  });
  it('accepts validated checkout with explicit production opt-in', async () => {
    mocks.env.NODE_ENV = 'production';
    mocks.env.ALLOW_MOCK_BILLING = 'true';
    mocks.verify.mockResolvedValue({
      accountId: 'a1',
      planSlug: 'pro',
      interval: 'month',
      successUrl: 'https://app.example/ok',
      cancelUrl: 'https://app.example/no',
    });
    await expect(MockCheckoutPage(props)).resolves.toEqual(
      expect.objectContaining({ type: 'div' }),
    );
  });
});
