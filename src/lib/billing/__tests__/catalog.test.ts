import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  return {
    rpc: vi.fn(),
  };
});

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({ rpc: mocks.rpc })),
}));

import { getProviderPrice, resolvePlanByExternalPrice } from '../catalog';

describe('billing provider price catalog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves an outbound provider price through the server-only catalog RPC', async () => {
    mocks.rpc.mockResolvedValue({
      data: [
        {
          id: 'provider-price-1',
          plan_id: 'plan-1',
          plan_slug: 'pro',
          interval: 'month',
          provider: 'stripe',
          external_price_id: 'price_pro_month',
          amount: 2500,
          currency: 'USD',
        },
      ],
      error: null,
    });

    await expect(
      getProviderPrice({
        planSlug: 'pro',
        interval: 'month',
        provider: 'stripe',
        currency: 'USD',
      }),
    ).resolves.toEqual({
      id: 'provider-price-1',
      planId: 'plan-1',
      planSlug: 'pro',
      interval: 'month',
      provider: 'stripe',
      externalPriceId: 'price_pro_month',
      amount: 2500,
      currency: 'USD',
    });
    expect(mocks.rpc).toHaveBeenCalledWith('get_billing_provider_price', {
      p_currency: 'USD',
      p_interval: 'month',
      p_plan_slug: 'pro',
      p_provider: 'stripe',
    });
  });

  it('reverse maps an external price through the server-only catalog RPC', async () => {
    mocks.rpc.mockResolvedValue({
      data: [{ plan_id: 'plan-1', plan_slug: 'pro', interval: 'year' }],
      error: null,
    });

    await expect(
      resolvePlanByExternalPrice({ provider: 'stripe', externalPriceId: 'price_pro_year' }),
    ).resolves.toEqual({ planId: 'plan-1', planSlug: 'pro', interval: 'year' });
    expect(mocks.rpc).toHaveBeenCalledWith('resolve_billing_plan_by_external_price', {
      p_external_price_id: 'price_pro_year',
      p_provider: 'stripe',
    });
  });

  it('throws when an outbound provider price is not configured', async () => {
    mocks.rpc.mockResolvedValue({ data: [], error: null });

    await expect(
      getProviderPrice({
        planSlug: 'pro',
        interval: 'month',
        provider: 'stripe',
        currency: 'USD',
      }),
    ).rejects.toThrow('plan_provider_price_not_configured');
  });

  it('throws when an inbound provider price has no mapping', async () => {
    mocks.rpc.mockResolvedValue({ data: [], error: null });

    await expect(
      resolvePlanByExternalPrice({ provider: 'stripe', externalPriceId: 'price_unknown' }),
    ).rejects.toThrow('provider_price_mapping_not_found');
  });
});
