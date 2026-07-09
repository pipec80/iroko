import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({ rpc: mocks.rpc }),
}));

import { getEntitlements, hasFeature, getLimit, withinLimit } from '../entitlements';

function entitlementRow(over?: Partial<{ features: object; limits: object }>) {
  return [
    {
      plan_slug: 'pro',
      features: { webhooks_enabled: true },
      limits: { api_keys_max: 20 },
      ...over,
    },
  ];
}

describe('entitlements', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should map the RPC row into features and limits', async () => {
    mocks.rpc.mockResolvedValue({ data: entitlementRow(), error: null });
    const ent = await getEntitlements('a1');
    expect(ent).toEqual({
      planSlug: 'pro',
      features: { webhooks_enabled: true },
      limits: { api_keys_max: 20 },
    });
  });

  it('hasFeature returns true for an enabled feature', async () => {
    mocks.rpc.mockResolvedValue({ data: entitlementRow(), error: null });
    expect(await hasFeature('a1', 'webhooks_enabled')).toBe(true);
  });

  it('hasFeature returns false for a missing feature', async () => {
    mocks.rpc.mockResolvedValue({ data: entitlementRow(), error: null });
    expect(await hasFeature('a1', 'nope')).toBe(false);
  });

  it('getLimit returns the numeric limit', async () => {
    mocks.rpc.mockResolvedValue({ data: entitlementRow(), error: null });
    expect(await getLimit('a1', 'api_keys_max')).toBe(20);
  });

  it('withinLimit is false when current reaches the limit', async () => {
    mocks.rpc.mockResolvedValue({ data: entitlementRow(), error: null });
    expect(await withinLimit('a1', 'api_keys_max', 20)).toBe(false);
    expect(await withinLimit('a1', 'api_keys_max', 19)).toBe(true);
  });

  it('withinLimit treats a missing limit as unlimited', async () => {
    mocks.rpc.mockResolvedValue({ data: entitlementRow({ limits: {} }), error: null });
    expect(await withinLimit('a1', 'api_keys_max', 9999)).toBe(true);
  });
});
