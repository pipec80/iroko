import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireAccountRole: vi.fn(),
  rpc: vi.fn(),
  adminRpc: vi.fn(),
  createCheckout: vi.fn(),
  cancelSubscription: vi.fn(),
  getPaymentProvider: vi.fn(),
  getProviderPrice: vi.fn(),
  loggerError: vi.fn(),
}));

vi.mock('@/lib/active-account', () => ({ requireAccountRole: mocks.requireAccountRole }));
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({ rpc: mocks.rpc }),
}));
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({ rpc: mocks.adminRpc })),
}));
vi.mock('@/lib/logger', () => ({ logger: { error: mocks.loggerError } }));
vi.mock('../catalog', () => ({ getProviderPrice: mocks.getProviderPrice }));
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
    mocks.adminRpc.mockResolvedValue({ data: 'applied', error: null });
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

  it('persists the Mercado Pago preapproval with the selected catalog plan before returning checkout', async () => {
    mocks.getPaymentProvider.mockReturnValue({
      name: 'mercadopago',
      capabilities: {
        customerPortal: false,
        cancelImmediately: true,
        cancelAtPeriodEnd: false,
        updatePaymentMethod: false,
        changePlan: false,
        pauseSubscription: true,
      },
      createCheckout: mocks.createCheckout,
      cancelSubscription: mocks.cancelSubscription,
    });
    mocks.createCheckout.mockResolvedValue({
      url: 'https://www.mercadopago.com/checkout',
      externalSubscriptionId: 'preapproval-123',
    });
    mocks.getProviderPrice.mockResolvedValue({
      id: 'provider-price-1',
      planId: 'plan-123',
      planSlug: 'pro',
      interval: 'month',
      provider: 'mercadopago',
      externalPriceId: null,
      amount: 29_900,
      currency: 'CLP',
    });

    await expect(startBillingCheckout({ ...input, provider: 'mercadopago' })).resolves.toEqual({
      url: 'https://www.mercadopago.com/checkout',
      externalSubscriptionId: 'preapproval-123',
    });

    expect(mocks.getProviderPrice).toHaveBeenCalledWith({
      planSlug: 'pro',
      interval: 'month',
      provider: 'mercadopago',
      currency: 'CLP',
    });
    expect(mocks.adminRpc).toHaveBeenCalledWith('create_billing_provisional_subscription', {
      p_account_id: 'account-1',
      p_plan_id: 'plan-123',
      p_external_preapproval_id: 'preapproval-123',
    });
    expect(mocks.adminRpc.mock.invocationCallOrder[0]).toBeGreaterThan(
      mocks.createCheckout.mock.invocationCallOrder[0] ?? 0,
    );
  });

  it('retains checkout behavior when a provider returns no subscription identifier', async () => {
    mocks.createCheckout.mockResolvedValue({ url: 'https://checkout.example.com' });

    await expect(startBillingCheckout(input)).resolves.toEqual({
      url: 'https://checkout.example.com',
    });

    expect(mocks.getProviderPrice).not.toHaveBeenCalled();
    expect(mocks.adminRpc).not.toHaveBeenCalled();
  });

  it('immediately cancels a Mercado Pago preapproval when provisional persistence fails', async () => {
    mocks.getPaymentProvider.mockReturnValue({
      name: 'mercadopago',
      capabilities: {
        customerPortal: false,
        cancelImmediately: true,
        cancelAtPeriodEnd: false,
        updatePaymentMethod: false,
        changePlan: false,
        pauseSubscription: true,
      },
      createCheckout: mocks.createCheckout,
      cancelSubscription: mocks.cancelSubscription,
    });
    mocks.createCheckout.mockResolvedValue({
      url: 'https://www.mercadopago.com/checkout',
      externalSubscriptionId: 'preapproval-123',
    });
    mocks.getProviderPrice.mockResolvedValue({
      id: 'provider-price-1',
      planId: 'plan-123',
      planSlug: 'pro',
      interval: 'month',
      provider: 'mercadopago',
      externalPriceId: null,
      amount: 29_900,
      currency: 'CLP',
    });
    mocks.adminRpc.mockResolvedValue({
      data: null,
      error: { code: 'provisional_write_failed' },
    });

    await expect(startBillingCheckout({ ...input, provider: 'mercadopago' })).rejects.toThrow(
      'billing_provisional_subscription_failed:provisional_write_failed',
    );

    expect(mocks.cancelSubscription).toHaveBeenCalledWith({
      externalSubscriptionId: 'preapproval-123',
      timing: 'immediate',
    });
  });

  it('preserves the persistence failure when Mercado Pago compensation also fails', async () => {
    mocks.getPaymentProvider.mockReturnValue({
      name: 'mercadopago',
      capabilities: {
        customerPortal: false,
        cancelImmediately: true,
        cancelAtPeriodEnd: false,
        updatePaymentMethod: false,
        changePlan: false,
        pauseSubscription: true,
      },
      createCheckout: mocks.createCheckout,
      cancelSubscription: mocks.cancelSubscription,
    });
    mocks.createCheckout.mockResolvedValue({
      url: 'https://www.mercadopago.com/checkout',
      externalSubscriptionId: 'preapproval-123',
    });
    mocks.getProviderPrice.mockResolvedValue({
      id: 'provider-price-1',
      planId: 'plan-123',
      planSlug: 'pro',
      interval: 'month',
      provider: 'mercadopago',
      externalPriceId: null,
      amount: 29_900,
      currency: 'CLP',
    });
    mocks.adminRpc.mockResolvedValue({
      data: null,
      error: { code: 'provisional_write_failed' },
    });
    mocks.cancelSubscription.mockRejectedValue(new Error('mercadopago_cancel_failed'));

    await expect(startBillingCheckout({ ...input, provider: 'mercadopago' })).rejects.toThrow(
      'billing_provisional_subscription_failed:provisional_write_failed',
    );

    expect(mocks.loggerError).toHaveBeenCalledTimes(2);
    expect(mocks.loggerError).toHaveBeenLastCalledWith(
      {
        action: 'billing.provisional_subscription_compensation_failed',
        component: 'BillingService',
      },
      'Mercado Pago provisional subscription compensation failed',
    );
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
