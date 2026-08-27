import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireAccountRole: vi.fn(),
  rpc: vi.fn(),
  createCheckout: vi.fn(),
  cancelSubscription: vi.fn(),
  getPaymentProvider: vi.fn(),
}));

vi.mock('@/lib/active-account', () => ({ requireAccountRole: mocks.requireAccountRole }));
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({ rpc: mocks.rpc }),
}));
vi.mock('../registry', () => ({ getPaymentProvider: mocks.getPaymentProvider }));

import { cancelBillingSubscription, startBillingCheckout } from '../service';

const input = {
  accountId: 'account-1',
  customerEmail: 'owner@example.com',
  planSlug: 'pro',
  interval: 'month' as const,
  successUrl: 'https://app.example.com/success',
  cancelUrl: 'https://app.example.com/cancel',
};

describe('BillingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAccountRole.mockImplementation(async () => {});
    mocks.rpc.mockResolvedValue({ data: [], error: null });
    mocks.getPaymentProvider.mockReturnValue({
      name: 'mock',
      capabilities: {
        customerPortal: false,
        cancelImmediately: true,
        cancelAtPeriodEnd: true,
        updatePaymentMethod: false,
        changePlan: false,
        pauseSubscription: false,
      },
      createCheckout: mocks.createCheckout,
      cancelSubscription: mocks.cancelSubscription,
    });
  });

  it('rejects checkout when the caller is not an account admin', async () => {
    mocks.requireAccountRole.mockRejectedValue(new Error('not_authorized'));

    await expect(startBillingCheckout(input)).rejects.toThrow('not_authorized');
    expect(mocks.createCheckout).not.toHaveBeenCalled();
  });

  it.each(['trialing', 'active', 'past_due'] as const)(
    'rejects checkout when a paid subscription is %s',
    async (status) => {
      mocks.rpc.mockResolvedValue({ data: [{ plan_slug: 'pro', status }], error: null });

      await expect(startBillingCheckout(input)).rejects.toThrow('active_paid_subscription_exists');
      expect(mocks.createCheckout).not.toHaveBeenCalled();
    },
  );

  it('allows checkout from free when no paid subscription blocks it', async () => {
    mocks.rpc.mockResolvedValue({ data: [{ plan_slug: 'free', status: 'active' }], error: null });
    mocks.createCheckout.mockResolvedValue({ url: 'https://checkout.example.com' });

    await expect(startBillingCheckout(input)).resolves.toEqual({
      url: 'https://checkout.example.com',
    });
    expect(mocks.createCheckout).toHaveBeenCalledWith(input);
  });

  it('surfaces an overview lookup failure before invoking checkout', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: 'overview_unavailable' } });

    await expect(startBillingCheckout(input)).rejects.toThrow(
      'billing_overview_failed:overview_unavailable',
    );
    expect(mocks.createCheckout).not.toHaveBeenCalled();
  });

  it('rejects cancellation when there is no provider subscription to cancel', async () => {
    mocks.rpc.mockResolvedValue({ data: [], error: null });

    await expect(
      cancelBillingSubscription({ accountId: 'account-1', timing: 'immediate' }),
    ).rejects.toThrow('billing_subscription_not_found');
  });

  it('checks the provider capability before cancellation', async () => {
    mocks.rpc.mockResolvedValue({
      data: [{ provider: 'mercadopago', external_subscription_id: 'preapproval-1' }],
      error: null,
    });
    mocks.getPaymentProvider.mockReturnValue({
      capabilities: {
        customerPortal: false,
        cancelImmediately: true,
        cancelAtPeriodEnd: false,
        updatePaymentMethod: false,
        changePlan: false,
        pauseSubscription: false,
      },
    });

    await expect(
      cancelBillingSubscription({ accountId: 'account-1', timing: 'period_end' }),
    ).rejects.toThrow('billing_capability_not_supported:cancelAtPeriodEnd');
  });

  it('rejects an advertised cancellation capability without an adapter operation', async () => {
    mocks.rpc.mockResolvedValue({
      data: [{ provider: 'mock', external_subscription_id: 'sub-1' }],
      error: null,
    });
    mocks.getPaymentProvider.mockReturnValue({
      capabilities: {
        customerPortal: false,
        cancelImmediately: true,
        cancelAtPeriodEnd: true,
        updatePaymentMethod: false,
        changePlan: false,
        pauseSubscription: false,
      },
    });

    await expect(
      cancelBillingSubscription({ accountId: 'account-1', timing: 'immediate' }),
    ).rejects.toThrow('billing_capability_not_supported:cancelImmediately');
  });

  it('delegates an immediate cancellation to the configured provider', async () => {
    mocks.rpc.mockResolvedValue({
      data: [{ provider: 'mock', external_subscription_id: 'sub-1' }],
      error: null,
    });
    mocks.cancelSubscription.mockImplementation(async () => {});

    await expect(
      cancelBillingSubscription({ accountId: 'account-1', timing: 'immediate' }),
    ).resolves.toBeUndefined();
    expect(mocks.cancelSubscription).toHaveBeenCalledWith({
      externalSubscriptionId: 'sub-1',
      timing: 'immediate',
    });
  });
});
