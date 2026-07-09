import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  getActiveAccountId: vi.fn(),
  createCheckout: vi.fn(),
  handle: vi.fn(),
  verify: vi.fn(),
  sign: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock('@/lib/active-account', () => ({ getActiveAccountId: mocks.getActiveAccountId }));
vi.mock('@/lib/billing/registry', () => ({
  getPaymentProvider: vi.fn(() => ({ name: 'mock', createCheckout: mocks.createCheckout })),
}));
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

import { startCheckout, confirmMockCheckout, getBillingData, listInvoices } from '../actions';

describe('billing actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getActiveAccountId.mockResolvedValue('a1');
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
});
