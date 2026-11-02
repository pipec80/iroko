import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), provider: vi.fn(), price: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ rpc: mocks.rpc }) }));
vi.mock('@/lib/billing/registry', () => ({ getPaymentProvider: mocks.provider }));
vi.mock('@/lib/billing/catalog', () => ({ getProviderPrice: mocks.price }));
vi.mock('@/env', () => ({ env: { BILLING_DEFAULT_PROVIDER: 'mercadopago', LOG_LEVEL: 'silent' } }));

import { getPublicCatalog, readBillingCatalog } from '../public-catalog';

const basePlan = {
  slug: 'pro',
  name: 'Plus',
  description: 'Plan público',
  interval: 'month',
  price: 2900,
  currency: 'USD',
  trial_days: 14,
  features: { webhooks_enabled: true },
  limits: { seats_max: 17 },
};

describe('public billing catalog', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.provider.mockReturnValue({ name: 'mercadopago' });
    mocks.rpc.mockResolvedValue({
      data: [basePlan, { ...basePlan, interval: 'year' }],
      error: null,
    });
    mocks.price.mockResolvedValue({
      amount: 23456,
      currency: 'CLP',
      externalPriceId: 'private-id',
      metadata: { secret: true },
    });
  });

  it('projects current monthly CLP prices and public descriptions without private fields', async () => {
    const catalog = await getPublicCatalog();
    expect(catalog).toEqual({
      status: 'available',
      provider: 'mercadopago',
      checkoutAvailable: true,
      plans: [
        {
          slug: 'pro',
          name: 'Plus',
          description: 'Plan público',
          interval: 'month',
          amount: 23456,
          currency: 'CLP',
          trialDays: 0,
          features: { webhooks_enabled: true },
          limits: { seats_max: 17 },
        },
      ],
    });
    expect(mocks.price).toHaveBeenCalledWith({
      planSlug: 'pro',
      interval: 'month',
      provider: 'mercadopago',
      currency: 'CLP',
    });
    expect(JSON.stringify(catalog)).not.toMatch(/private-id|metadata|secret|userId|accountId/);
  });

  it('makes a partial catalog unavailable instead of advertising the surviving plans', async () => {
    mocks.rpc.mockResolvedValue({
      data: [basePlan, { ...basePlan, slug: 'scale', name: 'Pro' }],
      error: null,
    });
    mocks.price
      .mockResolvedValueOnce({ amount: 23456, currency: 'CLP' })
      .mockRejectedValueOnce(new Error('plan_provider_price_not_configured'));
    expect(await getPublicCatalog()).toEqual({
      status: 'unavailable',
      provider: 'mercadopago',
      plans: [],
      checkoutAvailable: false,
    });
  });

  it('preserves account catalog data but hides the public offer when checkout is not configured', async () => {
    mocks.provider.mockImplementation(() => {
      throw new Error('provider_not_configured');
    });
    expect(await getPublicCatalog()).toMatchObject({
      status: 'unavailable',
      plans: [],
      checkoutAvailable: false,
    });
    expect(await readBillingCatalog()).toMatchObject({
      plans: [expect.objectContaining({ name: 'Plus', amount: 23456 })],
      checkoutAvailable: false,
    });
  });

  it.each(['rpc', 'empty', 'price', 'invalid'])(
    'fails closed for %s catalog failures',
    async (failure) => {
      if (failure === 'rpc')
        mocks.rpc.mockResolvedValue({ data: null, error: { message: 'down' } });
      if (failure === 'empty') mocks.rpc.mockResolvedValue({ data: [], error: null });
      if (failure === 'price') mocks.price.mockRejectedValue(new Error('inactive_price'));
      if (failure === 'invalid') mocks.price.mockResolvedValue({ amount: -1, currency: 'USD' });
      expect(await getPublicCatalog()).toMatchObject({
        status: 'unavailable',
        plans: [],
        checkoutAvailable: false,
      });
    },
  );

  it('reads updated prices and limits on the next request', async () => {
    const first = await getPublicCatalog();
    mocks.price.mockResolvedValue({ amount: 34567, currency: 'CLP' });
    mocks.rpc.mockResolvedValue({
      data: [{ ...basePlan, limits: { seats_max: 23 } }],
      error: null,
    });
    const second = await getPublicCatalog();
    expect(first.plans[0]?.amount).toBe(23456);
    expect(second.plans[0]).toMatchObject({ amount: 34567, limits: { seats_max: 23 } });
  });
});
