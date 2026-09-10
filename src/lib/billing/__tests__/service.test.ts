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
      kind: 'redirect',
      url: 'https://checkout.example.com',
      intentId: expect.any(String),
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

  it('reserves before creating and atomically attaches the Mercado Pago preapproval', async () => {
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
    mocks.adminRpc.mockImplementation((fn: string) => {
      if (fn === 'reserve_billing_checkout') {
        return Promise.resolve({
          data: [{ action: 'create', intent_id: 'intent-123', url: null }],
          error: null,
        });
      }
      return Promise.resolve({ data: 'applied', error: null });
    });

    await expect(startBillingCheckout({ ...input, provider: 'mercadopago' })).resolves.toEqual({
      kind: 'redirect',
      url: 'https://www.mercadopago.com/checkout',
      intentId: 'intent-123',
    });

    expect(mocks.getProviderPrice).toHaveBeenCalledWith({
      planSlug: 'pro',
      interval: 'month',
      provider: 'mercadopago',
      currency: 'CLP',
    });
    expect(mocks.adminRpc).toHaveBeenCalledWith('reserve_billing_checkout', {
      p_account_id: 'account-1',
      p_plan_id: 'plan-123',
      p_provider: 'mercadopago',
    });
    expect(mocks.createCheckout).toHaveBeenCalledWith({
      ...input,
      provider: 'mercadopago',
      externalReference: 'intent-123',
    });
    expect(mocks.adminRpc).toHaveBeenCalledWith('attach_billing_checkout_remote', {
      p_intent_id: 'intent-123',
      p_external_subscription_id: 'preapproval-123',
      p_checkout_url: 'https://www.mercadopago.com/checkout',
    });
    expect(mocks.adminRpc.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.createCheckout.mock.invocationCallOrder[0] ?? Number.MAX_SAFE_INTEGER,
    );
  });

  it('resumes a pending Mercado Pago intent without a second remote POST', async () => {
    mocks.getPaymentProvider.mockReturnValue({
      name: 'mercadopago',
      capabilities: {},
      createCheckout: mocks.createCheckout,
    });
    mocks.getProviderPrice.mockResolvedValue({ planId: 'plan-123' });
    mocks.adminRpc.mockResolvedValue({
      data: [
        {
          action: 'resume',
          intent_id: 'intent-123',
          url: 'https://www.mercadopago.com/resume',
        },
      ],
      error: null,
    });

    await expect(startBillingCheckout({ ...input, provider: 'mercadopago' })).resolves.toEqual({
      kind: 'redirect',
      url: 'https://www.mercadopago.com/resume',
      intentId: 'intent-123',
    });
    expect(mocks.createCheckout).not.toHaveBeenCalled();
  });

  it.each(['processing', 'needs_review'] as const)(
    'returns %s without invoking Mercado Pago',
    async (action) => {
      mocks.getPaymentProvider.mockReturnValue({
        name: 'mercadopago',
        capabilities: {},
        createCheckout: mocks.createCheckout,
      });
      mocks.getProviderPrice.mockResolvedValue({ planId: 'plan-123' });
      mocks.adminRpc.mockResolvedValue({
        data: [{ action, intent_id: 'intent-123', url: null }],
        error: null,
      });

      await expect(startBillingCheckout({ ...input, provider: 'mercadopago' })).resolves.toEqual({
        kind: action,
        intentId: 'intent-123',
      });
      expect(mocks.createCheckout).not.toHaveBeenCalled();
    },
  );

  it('allows only the reservation winner to call Mercado Pago concurrently', async () => {
    mocks.getPaymentProvider.mockReturnValue({
      name: 'mercadopago',
      capabilities: {},
      createCheckout: mocks.createCheckout,
    });
    mocks.getProviderPrice.mockResolvedValue({ planId: 'plan-123' });
    let reservations = 0;
    mocks.adminRpc.mockImplementation((fn: string) => {
      if (fn === 'reserve_billing_checkout') {
        reservations += 1;
        return Promise.resolve({
          data: [
            {
              action: reservations === 1 ? 'create' : 'processing',
              intent_id: 'intent-shared',
              url: null,
            },
          ],
          error: null,
        });
      }
      return Promise.resolve({ data: 'attached', error: null });
    });
    mocks.createCheckout.mockResolvedValue({
      url: 'https://www.mercadopago.com/checkout',
      externalSubscriptionId: 'preapproval-shared',
    });

    const results = await Promise.all([
      startBillingCheckout({ ...input, provider: 'mercadopago' }),
      startBillingCheckout({ ...input, provider: 'mercadopago' }),
    ]);

    expect(mocks.createCheckout).toHaveBeenCalledTimes(1);
    expect(results).toContainEqual({
      kind: 'processing',
      intentId: 'intent-shared',
    });
    expect(results).toContainEqual({
      kind: 'redirect',
      intentId: 'intent-shared',
      url: 'https://www.mercadopago.com/checkout',
    });
  });

  it('marks a deterministic provider rejection failed', async () => {
    mocks.getPaymentProvider.mockReturnValue({
      name: 'mercadopago',
      capabilities: {},
      createCheckout: mocks.createCheckout,
    });
    mocks.getProviderPrice.mockResolvedValue({ planId: 'plan-123' });
    mocks.adminRpc
      .mockResolvedValueOnce({
        data: [{ action: 'create', intent_id: 'intent-123', url: null }],
        error: null,
      })
      .mockResolvedValueOnce({ data: 'failed', error: null });
    mocks.createCheckout.mockRejectedValue(new Error('mercadopago_post_failed_400:bad request'));

    await expect(startBillingCheckout({ ...input, provider: 'mercadopago' })).rejects.toThrow(
      'mercadopago_post_failed_400',
    );
    expect(mocks.adminRpc).toHaveBeenLastCalledWith('mark_billing_checkout_failed', {
      p_intent_id: 'intent-123',
      p_failure_code: 'provider_rejected',
      p_outcome_unknown: false,
    });
  });

  it.each([
    new DOMException('timed out', 'TimeoutError'),
    new TypeError('fetch failed'),
    new Error('mercadopago_post_failed_503:unavailable'),
    new SyntaxError('truncated successful response'),
  ])('keeps an unknown remote outcome for review without retrying', async (remoteError) => {
    mocks.getPaymentProvider.mockReturnValue({
      name: 'mercadopago',
      capabilities: {},
      createCheckout: mocks.createCheckout,
      cancelSubscription: mocks.cancelSubscription,
    });
    mocks.getProviderPrice.mockResolvedValue({ planId: 'plan-123' });
    mocks.adminRpc
      .mockResolvedValueOnce({
        data: [{ action: 'create', intent_id: 'intent-123', url: null }],
        error: null,
      })
      .mockResolvedValueOnce({ data: 'needs_review', error: null });
    mocks.createCheckout.mockRejectedValue(remoteError);

    await expect(startBillingCheckout({ ...input, provider: 'mercadopago' })).resolves.toEqual({
      kind: 'needs_review',
      intentId: 'intent-123',
    });
    expect(mocks.adminRpc).toHaveBeenLastCalledWith('mark_billing_checkout_failed', {
      p_intent_id: 'intent-123',
      p_failure_code: 'provider_outcome_unknown',
      p_outcome_unknown: true,
    });
    expect(mocks.cancelSubscription).not.toHaveBeenCalled();
  });

  it('retains checkout behavior when a provider returns no subscription identifier', async () => {
    mocks.createCheckout.mockResolvedValue({ url: 'https://checkout.example.com' });

    await expect(startBillingCheckout(input)).resolves.toEqual({
      kind: 'redirect',
      url: 'https://checkout.example.com',
      intentId: expect.any(String),
    });

    expect(mocks.getProviderPrice).not.toHaveBeenCalled();
    expect(mocks.adminRpc).not.toHaveBeenCalled();
  });

  it('keeps a known remote preapproval recoverable when local attach fails', async () => {
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
    mocks.adminRpc
      .mockResolvedValueOnce({
        data: [{ action: 'create', intent_id: 'intent-123', url: null }],
        error: null,
      })
      .mockResolvedValueOnce({ data: null, error: { code: 'attach_write_failed' } })
      .mockResolvedValueOnce({ data: 'needs_review', error: null });

    await expect(startBillingCheckout({ ...input, provider: 'mercadopago' })).resolves.toEqual({
      kind: 'needs_review',
      intentId: 'intent-123',
    });

    expect(mocks.adminRpc).toHaveBeenLastCalledWith('mark_billing_checkout_failed', {
      p_intent_id: 'intent-123',
      p_failure_code: 'remote_created_local_attach_failed',
      p_outcome_unknown: true,
    });
    expect(mocks.cancelSubscription).not.toHaveBeenCalled();
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
