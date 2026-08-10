import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  verifyWebhook: vi.fn(),
  maybeSingle: vi.fn(),
  captureServer: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    rpc: mocks.rpc,
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
  getPaymentProvider: vi.fn(() => ({ name: 'mock', verifyWebhook: mocks.verifyWebhook })),
}));

vi.mock('@/lib/analytics/server', () => ({ captureServer: mocks.captureServer }));

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
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.maybeSingle.mockResolvedValue({ data: { user_id: 'owner-1' } });
  });

  it('should return 400 when the signature is invalid', async () => {
    mocks.verifyWebhook.mockResolvedValue(null);
    const res = await handleProviderWebhook('mock', '{}', 'bad');
    expect(res.status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('should apply a valid event, return 200, and capture subscription_activated for the account owner', async () => {
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
    expect(mocks.captureServer).toHaveBeenCalledWith({
      event: 'subscription_activated',
      properties: { plan_slug: 'pro', interval: 'month', provider: 'mock' },
      distinctId: 'owner-1',
      accountId: 'a1',
      insertId: 'evt_1',
    });
  });

  it('should forward the real provider name to apply_subscription_event and to the capture', async () => {
    mocks.verifyWebhook.mockResolvedValue(validEvent);
    mocks.rpc.mockResolvedValue({ data: 'applied', error: null });
    await handleProviderWebhook('stripe', JSON.stringify(validEvent), 'sig');
    expect(mocks.rpc).toHaveBeenCalledWith(
      'apply_subscription_event',
      expect.objectContaining({ p_provider: 'stripe' }),
    );
    expect(mocks.captureServer).toHaveBeenCalledWith(
      expect.objectContaining({ properties: expect.objectContaining({ provider: 'stripe' }) }),
    );
  });

  it('should return 200 on a duplicate event (idempotent) without re-capturing', async () => {
    mocks.verifyWebhook.mockResolvedValue(validEvent);
    mocks.rpc.mockResolvedValue({ data: 'duplicate', error: null });
    const res = await handleProviderWebhook('mock', JSON.stringify(validEvent), 'mock');
    expect(res.status).toBe(200);
    expect(mocks.captureServer).not.toHaveBeenCalled();
  });

  it('should not capture for a subscription_updated event (not an activation)', async () => {
    mocks.verifyWebhook.mockResolvedValue({ ...validEvent, type: 'subscription_updated' });
    mocks.rpc.mockResolvedValue({ data: 'applied', error: null });
    await handleProviderWebhook('mock', JSON.stringify(validEvent), 'mock');
    expect(mocks.captureServer).not.toHaveBeenCalled();
  });

  it('should return 500 when the RPC errors', async () => {
    mocks.verifyWebhook.mockResolvedValue(validEvent);
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'boom' } });
    const res = await handleProviderWebhook('mock', JSON.stringify(validEvent), 'mock');
    expect(res.status).toBe(500);
    expect(mocks.captureServer).not.toHaveBeenCalled();
  });
});
