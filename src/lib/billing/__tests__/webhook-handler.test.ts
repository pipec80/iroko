import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), verifyWebhook: vi.fn() }));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({ rpc: mocks.rpc })),
}));

vi.mock('../registry', () => ({
  getPaymentProvider: vi.fn(() => ({ name: 'mock', verifyWebhook: mocks.verifyWebhook })),
}));

vi.mock('@sentry/nextjs', () => ({ withScope: vi.fn(), captureException: vi.fn() }));

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
  externalEventId: 'evt_1',
  type: 'subscription_created',
  accountId: 'a1',
  planSlug: 'pro',
  status: 'active',
  externalSubscriptionId: 'sub_1',
  currentPeriodStart: '2026-07-08T00:00:00Z',
  currentPeriodEnd: '2026-08-08T00:00:00Z',
  raw: {},
};

describe('handleProviderWebhook', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return 400 when the signature is invalid', async () => {
    mocks.verifyWebhook.mockResolvedValue(null);
    const res = await handleProviderWebhook('mock', '{}', 'bad');
    expect(res.status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('should apply a valid event and return 200', async () => {
    mocks.verifyWebhook.mockResolvedValue(validEvent);
    mocks.rpc.mockResolvedValue({ data: 'applied', error: null });
    const res = await handleProviderWebhook('mock', JSON.stringify(validEvent), 'mock');
    expect(res.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith(
      'apply_subscription_event',
      expect.objectContaining({
        p_account_id: 'a1',
        p_plan_slug: 'pro',
        p_status: 'active',
        p_external_subscription_id: 'sub_1',
        p_external_event_id: 'evt_1',
      }),
    );
  });

  it('should return 200 on a duplicate event (idempotent)', async () => {
    mocks.verifyWebhook.mockResolvedValue(validEvent);
    mocks.rpc.mockResolvedValue({ data: 'duplicate', error: null });
    const res = await handleProviderWebhook('mock', JSON.stringify(validEvent), 'mock');
    expect(res.status).toBe(200);
  });

  it('should return 500 when the RPC errors', async () => {
    mocks.verifyWebhook.mockResolvedValue(validEvent);
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'boom' } });
    const res = await handleProviderWebhook('mock', JSON.stringify(validEvent), 'mock');
    expect(res.status).toBe(500);
  });
});
