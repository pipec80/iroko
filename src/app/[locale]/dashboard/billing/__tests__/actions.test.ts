import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  getActiveAccountId: vi.fn(),
  createCheckout: vi.fn(),
  cancelSubscription: vi.fn(),
  getPaymentProvider: vi.fn(),
  handle: vi.fn(),
  verify: vi.fn(),
  sign: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock('@/lib/active-account', () => ({ getActiveAccountId: mocks.getActiveAccountId }));
vi.mock('@/lib/billing/registry', () => ({ getPaymentProvider: mocks.getPaymentProvider }));
vi.mock('@/lib/billing/webhook-handler', () => ({ handleProviderWebhook: mocks.handle }));
vi.mock('@/lib/billing/signing', () => ({
  signMockPayload: mocks.sign,
  verifyMockPayload: mocks.verify,
}));
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({ rpc: mocks.rpc }),
}));
vi.mock('@sentry/nextjs', () => ({ withScope: vi.fn(), captureException: vi.fn() }));
vi.mock('@/env', () => ({
  env: {
    SITE_URL: 'http://localhost:3000',
    LOG_LEVEL: 'silent',
    NODE_ENV: 'test',
    MOCK_BILLING_SECRET: 't',
    BILLING_DEFAULT_PROVIDER: 'mock',
    SUPABASE_SECRET_KEY: 'k',
    NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'a',
  },
}));

import {
  startCheckout,
  confirmMockCheckout,
  cancelSubscription,
  getBillingData,
  listInvoices,
} from '../actions';

describe('billing actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getActiveAccountId.mockResolvedValue('a1');
    mocks.getPaymentProvider.mockReturnValue({
      name: 'mock',
      createCheckout: mocks.createCheckout,
      cancelSubscription: mocks.cancelSubscription,
    });
  });

  it('startCheckout returns the provider checkout url', async () => {
    mocks.createCheckout.mockResolvedValue({
      url: 'http://localhost:3000/es/billing/mock-checkout?data=x',
    });
    const res = await startCheckout({ planSlug: 'pro', interval: 'month' });
    expect(res.data?.url).toContain('/billing/mock-checkout');
    expect(mocks.createCheckout).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: 'a1',
        planSlug: 'pro',
        interval: 'month',
      }),
    );
  });

  it('startCheckout rejects an invalid interval', async () => {
    const res = await startCheckout({ planSlug: 'pro', interval: 'weekly' as 'month' });
    expect(res.error).toBe('validation_error');
    expect(mocks.createCheckout).not.toHaveBeenCalled();
  });

  it('confirmMockCheckout verifies the token and posts a signed event to the handler', async () => {
    mocks.verify.mockResolvedValue({
      accountId: 'a1',
      planSlug: 'pro',
      interval: 'month',
      successUrl: 'http://ok',
      cancelUrl: 'http://no',
    });
    mocks.sign.mockResolvedValue('signed-event');
    mocks.handle.mockResolvedValue({ status: 200, body: { result: 'applied' } });
    const res = await confirmMockCheckout({ data: 'token' });
    expect(res.data?.redirectUrl).toBe('http://ok');
    expect(mocks.handle).toHaveBeenCalledWith('mock', 'signed-event', 'mock');
  });

  it('confirmMockCheckout returns invalid_token on a tampered token', async () => {
    mocks.verify.mockResolvedValue(null);
    const res = await confirmMockCheckout({ data: 'bad' });
    expect(res.error).toBe('invalid_token');
    expect(mocks.handle).not.toHaveBeenCalled();
  });

  it('confirmMockCheckout returns checkout_failed when the webhook handler errors', async () => {
    mocks.verify.mockResolvedValue({
      accountId: 'a1',
      planSlug: 'pro',
      interval: 'month',
      successUrl: 'http://ok',
      cancelUrl: 'http://no',
    });
    mocks.sign.mockResolvedValue('signed-event');
    mocks.handle.mockResolvedValue({ status: 500, body: { error: 'boom' } });
    const res = await confirmMockCheckout({ data: 'token' });
    expect(res.data).toBeNull();
    expect(res.error).toBe('checkout_failed');
  });

  it('cancelSubscription returns no_account when there is no active account', async () => {
    mocks.getActiveAccountId.mockResolvedValue(null);
    const res = await cancelSubscription();
    expect(res.error).toBe('no_account');
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('cancelSubscription returns fetch_failed when the overview RPC errors', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'db_down' } });
    const res = await cancelSubscription();
    expect(res.error).toBe('db_down');
    expect(mocks.handle).not.toHaveBeenCalled();
  });

  it('cancelSubscription returns no_subscription when the account has no active plan', async () => {
    mocks.rpc.mockResolvedValue({ data: [], error: null });
    const res = await cancelSubscription();
    expect(res.error).toBe('no_subscription');
    expect(mocks.handle).not.toHaveBeenCalled();
  });

  it('cancelSubscription signs a subscription_updated event and posts it to the handler', async () => {
    mocks.rpc.mockResolvedValue({
      data: [
        {
          plan_slug: 'pro',
          status: 'active',
          plan_interval: 'month',
          provider: 'mock',
          external_subscription_id: 'mock_sub_a1',
        },
      ],
      error: null,
    });
    mocks.sign.mockResolvedValue('signed-cancel-event');
    mocks.handle.mockResolvedValue({ status: 200, body: { result: 'applied' } });
    const res = await cancelSubscription();
    expect(res.data).toBe(true);
    expect(mocks.sign).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'subscription_updated',
        accountId: 'a1',
        cancelAtPeriodEnd: true,
      }),
    );
    expect(mocks.handle).toHaveBeenCalledWith('mock', 'signed-cancel-event', 'mock');
  });

  it('cancelSubscription returns cancel_failed when the webhook handler errors', async () => {
    mocks.rpc.mockResolvedValue({
      data: [
        {
          plan_slug: 'pro',
          status: 'active',
          plan_interval: 'month',
          provider: 'mock',
          external_subscription_id: 'mock_sub_a1',
        },
      ],
      error: null,
    });
    mocks.sign.mockResolvedValue('signed-cancel-event');
    mocks.handle.mockResolvedValue({ status: 500, body: { error: 'boom' } });
    const res = await cancelSubscription();
    expect(res.data).toBeNull();
    expect(res.error).toBe('cancel_failed');
  });

  it('cancelSubscription calls the real provider adapter when the account uses a non-mock provider', async () => {
    mocks.rpc.mockResolvedValue({
      data: [
        {
          plan_slug: 'pro',
          status: 'active',
          plan_interval: 'month',
          provider: 'stripe',
          external_subscription_id: 'sub_stripe_123',
        },
      ],
      error: null,
    });
    mocks.getPaymentProvider.mockReturnValue({
      name: 'stripe',
      cancelSubscription: mocks.cancelSubscription,
    });

    const res = await cancelSubscription();

    expect(mocks.getPaymentProvider).toHaveBeenCalledWith('stripe');
    expect(mocks.cancelSubscription).toHaveBeenCalledWith('sub_stripe_123', true);
    expect(mocks.handle).not.toHaveBeenCalled();
    expect(res.data).toBe(true);
  });

  it('cancelSubscription returns no_subscription when a real provider has no external_subscription_id', async () => {
    mocks.rpc.mockResolvedValue({
      data: [
        {
          plan_slug: 'pro',
          status: 'active',
          plan_interval: 'month',
          provider: 'stripe',
          external_subscription_id: null,
        },
      ],
      error: null,
    });

    const res = await cancelSubscription();

    expect(res.error).toBe('no_subscription');
    expect(mocks.cancelSubscription).not.toHaveBeenCalled();
  });

  it('getBillingData maps plans and overview from the RPCs', async () => {
    mocks.rpc.mockImplementation((fn: string) => {
      if (fn === 'get_active_plans') {
        return Promise.resolve({
          data: [
            {
              slug: 'pro',
              name: 'Pro',
              description: 'Para equipos',
              interval: 'month',
              price: 2900,
              currency: 'USD',
              trial_days: 14,
              features: { webhooks_enabled: true },
              limits: { api_keys_max: 20 },
            },
          ],
          error: null,
        });
      }
      return Promise.resolve({
        data: [
          {
            plan_slug: 'pro',
            plan_name: 'Pro',
            plan_interval: 'month',
            status: 'active',
            current_period_end: '2026-08-08T00:00:00Z',
            cancel_at_period_end: false,
            trial_end: null,
          },
        ],
        error: null,
      });
    });
    const res = await getBillingData();
    expect(res.data?.plans).toEqual([
      {
        slug: 'pro',
        name: 'Pro',
        description: 'Para equipos',
        interval: 'month',
        price: 2900,
        currency: 'USD',
        trialDays: 14,
        features: { webhooks_enabled: true },
        limits: { api_keys_max: 20 },
      },
    ]);
    expect(res.data?.overview).toEqual({
      planSlug: 'pro',
      planName: 'Pro',
      planInterval: 'month',
      status: 'active',
      currentPeriodEnd: '2026-08-08T00:00:00Z',
      cancelAtPeriodEnd: false,
      trialEnd: null,
    });
  });

  it('getBillingData returns null overview when the member is not admin', async () => {
    mocks.rpc.mockImplementation((fn: string) => {
      if (fn === 'get_active_plans') return Promise.resolve({ data: [], error: null });
      return Promise.resolve({ data: null, error: { message: 'not_authorized' } });
    });
    const res = await getBillingData();
    expect(res.data?.overview).toBeNull();
  });

  it('getBillingData returns no_account when there is no active account', async () => {
    mocks.getActiveAccountId.mockResolvedValue(null);
    const res = await getBillingData();
    expect(res.error).toBe('no_account');
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('listInvoices maps the RPC rows and computes the next cursor', async () => {
    mocks.rpc.mockResolvedValue({
      data: [
        {
          id: 'inv-1',
          number: 'INV-1',
          status: 'paid',
          currency: 'USD',
          total: 2900,
          amount_paid: 2900,
          hosted_url: 'https://x/inv-1',
          pdf_url: 'https://x/inv-1.pdf',
          created_at: '2026-07-01T00:00:00Z',
        },
      ],
      error: null,
    });
    const res = await listInvoices({ limit: 1 });
    expect(res.data?.entries).toHaveLength(1);
    expect(res.data?.entries[0]).toEqual(
      expect.objectContaining({ id: 'inv-1', amountPaid: 2900, createdAt: '2026-07-01T00:00:00Z' }),
    );
    expect(res.data?.nextCursor).toEqual({ createdAt: '2026-07-01T00:00:00Z', id: 'inv-1' });
  });

  it('listInvoices returns null nextCursor when fewer rows than the limit come back', async () => {
    mocks.rpc.mockResolvedValue({
      data: [
        {
          id: 'inv-1',
          number: 'INV-1',
          status: 'paid',
          currency: 'USD',
          total: 2900,
          amount_paid: 2900,
          hosted_url: null,
          pdf_url: null,
          created_at: '2026-07-01T00:00:00Z',
        },
      ],
      error: null,
    });
    const res = await listInvoices({ limit: 10 });
    expect(res.data?.nextCursor).toBeNull();
  });

  it('listInvoices returns validation_error on an out-of-range limit', async () => {
    const res = await listInvoices({ limit: 0 });
    expect(res.error).toBe('validation_error');
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('listInvoices returns no_account when there is no active account', async () => {
    mocks.getActiveAccountId.mockResolvedValue(null);
    const res = await listInvoices({ limit: 10 });
    expect(res.error).toBe('no_account');
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('listInvoices surfaces the RPC error message on failure', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'db_down' } });
    const res = await listInvoices({ limit: 10 });
    expect(res.data).toBeNull();
    expect(res.error).toBe('db_down');
  });
});
