import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const query = {
    eq: vi.fn(),
    maybeSingle: vi.fn(),
  };
  query.eq.mockReturnValue(query);

  return {
    from: vi.fn(() => ({ select: vi.fn(() => query) })),
    query,
    schema: vi.fn(() => ({ from: vi.fn(() => ({ select: vi.fn(() => query) })) })),
  };
});

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({ schema: mocks.schema })),
}));

import { getProviderPrice, resolvePlanByExternalPrice } from '../catalog';

describe('billing provider price catalog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.query.eq.mockReturnValue(mocks.query);
  });

  it('resolves an outbound provider price', async () => {
    mocks.query.maybeSingle.mockResolvedValue({
      data: {
        id: 'provider-price-1',
        plan_id: 'plan-1',
        provider: 'stripe',
        external_price_id: 'price_pro_month',
        amount: 2500,
        currency: 'USD',
        plan: { slug: 'pro', interval: 'month' },
      },
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
  });

  it('reverse maps an external price to one Iroko plan', async () => {
    mocks.query.maybeSingle.mockResolvedValue({
      data: {
        plan_id: 'plan-1',
        plan: { slug: 'pro', interval: 'year' },
      },
      error: null,
    });

    await expect(
      resolvePlanByExternalPrice({ provider: 'stripe', externalPriceId: 'price_pro_year' }),
    ).resolves.toEqual({ planId: 'plan-1', planSlug: 'pro', interval: 'year' });
  });

  it('throws when an outbound provider price is not configured', async () => {
    mocks.query.maybeSingle.mockResolvedValue({ data: null, error: null });

    await expect(
      getProviderPrice({
        planSlug: 'pro',
        interval: 'month',
        provider: 'stripe',
        currency: 'USD',
      }),
    ).rejects.toThrow('plan_provider_price_not_configured');
  });

  it('rejects an outbound provider price whose joined plan is missing', async () => {
    mocks.query.maybeSingle.mockResolvedValue({
      data: {
        id: 'provider-price-1',
        plan_id: 'plan-1',
        provider: 'stripe',
        external_price_id: 'price_pro_month',
        amount: 2500,
        currency: 'USD',
        plan: null,
      },
      error: null,
    });

    await expect(
      getProviderPrice({
        planSlug: 'pro',
        interval: 'month',
        provider: 'stripe',
        currency: 'USD',
      }),
    ).rejects.toThrow('provider_price_plan_not_found');
  });

  it('throws when an inbound provider price has no mapping', async () => {
    mocks.query.maybeSingle.mockResolvedValue({ data: null, error: null });

    await expect(
      resolvePlanByExternalPrice({ provider: 'stripe', externalPriceId: 'price_unknown' }),
    ).rejects.toThrow('provider_price_mapping_not_found');
  });
});
