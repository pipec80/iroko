import { describe, it, expect, vi } from 'vitest';

vi.mock('@/env', () => ({
  env: { STRIPE_SECRET_KEY: 'sk_test_x', STRIPE_WEBHOOK_SECRET: 'whsec_test' },
}));

const { constructEvent, sessionsCreate, subscriptionsUpdate, subscriptionsCancel } = vi.hoisted(
  () => ({
    constructEvent: vi.fn(),
    sessionsCreate: vi.fn(),
    subscriptionsUpdate: vi.fn(),
    subscriptionsCancel: vi.fn(),
  }),
);
vi.mock('stripe', () => ({
  default: class {
    webhooks = { constructEvent };
    checkout = { sessions: { create: sessionsCreate } };
    subscriptions = { update: subscriptionsUpdate, cancel: subscriptionsCancel };
  },
}));

const { getProviderPrice } = vi.hoisted(() => ({ getProviderPrice: vi.fn() }));
vi.mock('../../catalog', () => ({ getProviderPrice }));

import { stripeProvider } from '../stripe';

describe('stripeProvider.verifyWebhook', () => {
  it('should return null when the signature is invalid', async () => {
    constructEvent.mockImplementation(() => {
      throw new Error('bad signature');
    });
    const result = await stripeProvider.verifyWebhook('{}', 'bad-sig');
    expect(result).toBeNull();
  });

  it('should normalize customer.subscription.created into subscription_created', async () => {
    constructEvent.mockReturnValue({
      id: 'evt_1',
      type: 'customer.subscription.created',
      data: {
        object: {
          id: 'sub_1',
          status: 'active',
          metadata: { accountId: 'acc_1' },
          items: {
            data: [
              {
                price: { id: 'price_pro_month' },
                current_period_start: 1720000000,
                current_period_end: 1722592000,
              },
            ],
          },
          cancel_at_period_end: false,
        },
      },
    });
    const result = await stripeProvider.verifyWebhook('{}', 'sig');
    expect(result).toEqual(
      expect.objectContaining({
        externalEventId: 'evt_1',
        type: 'subscription_created',
        accountId: 'acc_1',
        status: 'active',
        externalSubscriptionId: 'sub_1',
        externalPriceId: 'price_pro_month',
        cancelAtPeriodEnd: false,
      }),
    );
  });

  it('should map incomplete_expired to canceled (no direct equivalent)', async () => {
    constructEvent.mockReturnValue({
      id: 'evt_2',
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_2',
          status: 'incomplete_expired',
          metadata: { accountId: 'acc_2' },
          items: {
            data: [{ current_period_start: 1720000000, current_period_end: 1722592000 }],
          },
          cancel_at_period_end: false,
        },
      },
    });
    const result = await stripeProvider.verifyWebhook('{}', 'sig');
    expect(result).toEqual(
      expect.objectContaining({ type: 'subscription_updated', status: 'canceled' }),
    );
  });

  it('should normalize customer.subscription.deleted into subscription_canceled', async () => {
    constructEvent.mockReturnValue({
      id: 'evt_3',
      type: 'customer.subscription.deleted',
      data: {
        object: {
          id: 'sub_3',
          status: 'canceled',
          metadata: { accountId: 'acc_3' },
          items: {
            data: [{ current_period_start: 1720000000, current_period_end: 1722592000 }],
          },
          cancel_at_period_end: false,
        },
      },
    });
    const result = await stripeProvider.verifyWebhook('{}', 'sig');
    expect(result?.type).toBe('subscription_canceled');
  });

  it('should return null when metadata.accountId is missing', async () => {
    constructEvent.mockReturnValue({
      id: 'evt_4',
      type: 'customer.subscription.created',
      data: { object: { id: 'sub_4', status: 'active', metadata: {} } },
    });
    const result = await stripeProvider.verifyWebhook('{}', 'sig');
    expect(result).toBeNull();
  });

  it('should normalize invoice.paid into invoice_paid with amount details', async () => {
    constructEvent.mockReturnValue({
      id: 'evt_5',
      type: 'invoice.paid',
      data: {
        object: {
          id: 'in_5',
          parent: {
            subscription_details: { subscription: 'sub_5', metadata: { accountId: 'acc_5' } },
          },
          amount_paid: 1999,
          currency: 'usd',
          status_transitions: { paid_at: 1722592000 },
          period_start: 1720000000,
          period_end: 1722592000,
        },
      },
    });
    const result = await stripeProvider.verifyWebhook('{}', 'sig');
    expect(result).toEqual(
      expect.objectContaining({
        type: 'invoice_paid',
        accountId: 'acc_5',
        externalSubscriptionId: 'sub_5',
        externalInvoiceId: 'in_5',
        amountPaid: 1999,
        currency: 'usd',
      }),
    );
  });

  it('should return null for unhandled event types', async () => {
    constructEvent.mockReturnValue({ id: 'evt_6', type: 'charge.refunded', data: { object: {} } });
    const result = await stripeProvider.verifyWebhook('{}', 'sig');
    expect(result).toBeNull();
  });
});

describe('stripeProvider.createCheckout', () => {
  it('resolves the price id from the provider catalog and creates a subscription session', async () => {
    getProviderPrice.mockResolvedValue({ externalPriceId: 'price_test_123' });
    sessionsCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/session_1' });

    const { url } = await stripeProvider.createCheckout({
      accountId: 'acc_1',
      customerEmail: 'owner@example.com',
      planSlug: 'pro',
      interval: 'month',
      successUrl: 'https://app/ok',
      cancelUrl: 'https://app/no',
    });

    expect(getProviderPrice).toHaveBeenCalledWith({
      planSlug: 'pro',
      interval: 'month',
      provider: 'stripe',
      currency: 'USD',
    });
    expect(sessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'subscription',
        line_items: [{ price: 'price_test_123', quantity: 1 }],
        success_url: 'https://app/ok',
        cancel_url: 'https://app/no',
        customer_email: 'owner@example.com',
        subscription_data: { metadata: { accountId: 'acc_1' } },
        metadata: { accountId: 'acc_1' },
      }),
    );
    expect(url).toBe('https://checkout.stripe.com/session_1');
  });

  it('throws when the catalog mapping has no Stripe external price id', async () => {
    getProviderPrice.mockResolvedValue({ externalPriceId: null });
    await expect(
      stripeProvider.createCheckout({
        accountId: 'acc_1',
        customerEmail: 'owner@example.com',
        planSlug: 'pro',
        interval: 'month',
        successUrl: 'https://app/ok',
        cancelUrl: 'https://app/no',
      }),
    ).rejects.toThrow('provider_price_external_id_not_configured');
  });
});

describe('stripeProvider.capabilities', () => {
  it('does not advertise a portal until it has a provider customer id', () => {
    expect(stripeProvider.capabilities.customerPortal).toBe(false);
    expect(stripeProvider.createPortalSession).toBeUndefined();
  });
});

describe('stripeProvider.cancelSubscription', () => {
  it('should mark cancel_at_period_end when atPeriodEnd is true', async () => {
    await stripeProvider.cancelSubscription?.({
      externalSubscriptionId: 'sub_1',
      timing: 'period_end',
    });
    expect(subscriptionsUpdate).toHaveBeenCalledWith('sub_1', { cancel_at_period_end: true });
    expect(subscriptionsCancel).not.toHaveBeenCalled();
  });

  it('should cancel immediately when atPeriodEnd is false', async () => {
    await stripeProvider.cancelSubscription?.({
      externalSubscriptionId: 'sub_1',
      timing: 'immediate',
    });
    expect(subscriptionsCancel).toHaveBeenCalledWith('sub_1');
    expect(subscriptionsUpdate).not.toHaveBeenCalled();
  });
});
