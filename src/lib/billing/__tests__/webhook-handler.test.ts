import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  reduceBillingEvent: vi.fn(),
  resolvePlanByExternalPrice: vi.fn(),
  getPaymentProvider: vi.fn(),
  verifyWebhook: vi.fn(),
  maybeSingle: vi.fn(),
  captureServer: vi.fn(),
  notify: vi.fn(async () => {}),
  sentryScope: {
    setTag: vi.fn(),
    setContext: vi.fn(),
  },
  captureException: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({ maybeSingle: mocks.maybeSingle })),
        })),
      })),
    })),
  })),
}));

vi.mock('../registry', () => ({
  getPaymentProvider: mocks.getPaymentProvider,
}));

vi.mock('../reducer', () => ({ reduceBillingEvent: mocks.reduceBillingEvent }));
vi.mock('../catalog', () => ({
  resolvePlanByExternalPrice: mocks.resolvePlanByExternalPrice,
}));
vi.mock('@/lib/analytics/server', () => ({ captureServer: mocks.captureServer }));
vi.mock('@/lib/notifications', () => ({ notify: mocks.notify }));

vi.mock('@sentry/nextjs', () => ({
  withScope: vi.fn((callback: (scope: typeof mocks.sentryScope) => void) => {
    callback(mocks.sentryScope);
  }),
  captureException: mocks.captureException,
}));

vi.mock('@/env', () => ({
  env: {
    MOCK_BILLING_SECRET: 'test',
    BILLING_DEFAULT_PROVIDER: 'mock',
    SUPABASE_SECRET_KEY: 'k',
    NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'a',
    LOG_LEVEL: 'silent',
    NODE_ENV: 'test',
  },
}));

import { handleProviderWebhook } from '../webhook-handler';

const validEvent = {
  provider: 'mock' as const,
  externalEventId: 'evt_1',
  type: 'subscription_created' as const,
  accountId: 'a1',
  externalSubscriptionId: 'sub_1',
  externalPriceId: 'price_pro_month',
  status: 'active' as const,
  currentPeriodStart: '2026-07-08T00:00:00Z',
  currentPeriodEnd: '2026-08-08T00:00:00Z',
  cancelAtPeriodEnd: false,
  raw: {},
};

describe('handleProviderWebhook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getPaymentProvider.mockImplementation((providerName: string) => ({
      name: providerName,
      verifyWebhook: mocks.verifyWebhook,
    }));
    mocks.maybeSingle.mockResolvedValue({ data: { user_id: 'owner-1' } });
    mocks.resolvePlanByExternalPrice.mockResolvedValue({
      planId: 'plan-pro-month',
      planSlug: 'pro',
      interval: 'month',
    });
  });

  it('returns 400 when the signature is invalid', async () => {
    mocks.verifyWebhook.mockResolvedValue(null);

    const result = await handleProviderWebhook('mock', '{}', 'bad');

    expect(result.status).toBe(400);
    expect(mocks.reduceBillingEvent).not.toHaveBeenCalled();
  });

  it('returns 404 when the requested provider is not configured', async () => {
    mocks.getPaymentProvider.mockImplementation(() => {
      throw new Error('provider_not_configured');
    });

    await expect(handleProviderWebhook('paddle', '{}', 'sig')).resolves.toEqual({
      status: 404,
      body: { error: 'provider_not_configured' },
    });
    expect(mocks.verifyWebhook).not.toHaveBeenCalled();
  });

  it('never invents the free plan when a subscription price cannot be resolved', async () => {
    mocks.verifyWebhook.mockResolvedValue({
      ...validEvent,
      provider: 'stripe',
      externalPriceId: 'price_unknown',
    });
    mocks.reduceBillingEvent.mockRejectedValue(new Error('provider_price_mapping_not_found'));

    const result = await handleProviderWebhook('stripe', '{}', 'sig');

    expect(result.status).toBe(500);
    expect(mocks.reduceBillingEvent).toHaveBeenCalledWith(
      expect.objectContaining({ externalPriceId: 'price_unknown' }),
    );
    expect(mocks.captureServer).not.toHaveBeenCalled();
  });

  it('applies a valid event and captures activation only after the reducer commits', async () => {
    mocks.verifyWebhook.mockResolvedValue(validEvent);
    mocks.reduceBillingEvent.mockResolvedValue({ status: 'applied' });

    const result = await handleProviderWebhook('mock', JSON.stringify(validEvent), 'mock');

    expect(result).toEqual({ status: 200, body: { result: 'applied' } });
    expect(mocks.reduceBillingEvent).toHaveBeenCalledWith(validEvent);
    expect(mocks.captureServer).toHaveBeenCalledWith({
      event: 'subscription_activated',
      properties: { plan_slug: 'pro', interval: 'month', provider: 'mock' },
      distinctId: 'owner-1',
      accountId: 'a1',
      insertId: 'evt_1',
    });
    expect(mocks.notify).toHaveBeenCalledWith('owner-1', {
      type: 'success',
      title: 'Tu plan pro está activo',
      link: '/dashboard/billing',
      emailDelivery: true,
    });
  });

  it('still returns 200 when a post-commit notification fails', async () => {
    mocks.verifyWebhook.mockResolvedValue(validEvent);
    mocks.reduceBillingEvent.mockResolvedValue({ status: 'applied' });
    mocks.notify.mockRejectedValueOnce(new Error('insert failed'));

    const result = await handleProviderWebhook('mock', JSON.stringify(validEvent), 'mock');

    expect(result.status).toBe(200);
  });

  it('uses the provider supplied by the verified normalized event for analytics', async () => {
    const stripeEvent = { ...validEvent, provider: 'stripe' as const };
    mocks.verifyWebhook.mockResolvedValue(stripeEvent);
    mocks.reduceBillingEvent.mockResolvedValue({ status: 'applied' });

    await handleProviderWebhook('stripe', JSON.stringify(stripeEvent), 'sig');

    expect(mocks.captureServer).toHaveBeenCalledWith(
      expect.objectContaining({
        properties: expect.objectContaining({ provider: 'stripe' }),
      }),
    );
  });

  it('returns 200 for a duplicate without repeating side effects', async () => {
    mocks.verifyWebhook.mockResolvedValue(validEvent);
    mocks.reduceBillingEvent.mockResolvedValue({ status: 'duplicate' });

    const result = await handleProviderWebhook('mock', JSON.stringify(validEvent), 'mock');

    expect(result.status).toBe(200);
    expect(mocks.captureServer).not.toHaveBeenCalled();
    expect(mocks.notify).not.toHaveBeenCalled();
  });

  it('does not capture or notify for a non-activation event', async () => {
    mocks.verifyWebhook.mockResolvedValue({
      provider: 'mock',
      externalEventId: 'evt_invoice',
      type: 'invoice_paid',
      accountId: 'a1',
      externalSubscriptionId: 'sub_1',
      externalInvoiceId: 'in_1',
      amountPaid: 2500,
      currency: 'USD',
      paidAt: '2026-08-08T00:00:00Z',
      raw: {},
    });
    mocks.reduceBillingEvent.mockResolvedValue({ status: 'applied' });

    await handleProviderWebhook('mock', '{}', 'mock');

    expect(mocks.captureServer).not.toHaveBeenCalled();
    expect(mocks.notify).not.toHaveBeenCalled();
  });

  it('returns 500 when the reducer cannot persist the verified event', async () => {
    mocks.verifyWebhook.mockResolvedValue(validEvent);
    mocks.reduceBillingEvent.mockRejectedValue(new Error('billing_rpc_failed'));

    const result = await handleProviderWebhook('mock', JSON.stringify(validEvent), 'mock');

    expect(result.status).toBe(500);
    expect(mocks.captureServer).not.toHaveBeenCalled();
    expect(mocks.notify).not.toHaveBeenCalled();
    expect(mocks.sentryScope.setTag).toHaveBeenNthCalledWith(1, 'billing_provider', 'mock');
    expect(mocks.sentryScope.setTag).toHaveBeenNthCalledWith(
      2,
      'billing_event_type',
      'subscription_created',
    );
    expect(mocks.sentryScope.setTag).toHaveBeenNthCalledWith(
      3,
      'billing_operation',
      'webhook_reduce',
    );
    expect(mocks.sentryScope.setContext).toHaveBeenCalledWith('billing_webhook', {
      account_id: 'a1',
      external_event_id: 'evt_1',
    });
    expect(mocks.captureException).toHaveBeenCalledWith(expect.any(Error));
  });
});
