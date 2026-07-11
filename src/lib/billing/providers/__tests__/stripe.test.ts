import { describe, it, expect, vi } from 'vitest';

vi.mock('@/env', () => ({
  env: { STRIPE_SECRET_KEY: 'sk_test_x', STRIPE_WEBHOOK_SECRET: 'whsec_test' },
}));

const {
  constructEvent,
  sessionsCreate,
  billingPortalCreate,
  subscriptionsUpdate,
  subscriptionsCancel,
} = vi.hoisted(() => ({
  constructEvent: vi.fn(),
  sessionsCreate: vi.fn(),
  billingPortalCreate: vi.fn(),
  subscriptionsUpdate: vi.fn(),
  subscriptionsCancel: vi.fn(),
}));
vi.mock('stripe', () => ({
  default: class {
    webhooks = { constructEvent };
    checkout = { sessions: { create: sessionsCreate } };
    billingPortal = { sessions: { create: billingPortalCreate } };
    subscriptions = { update: subscriptionsUpdate, cancel: subscriptionsCancel };
  },
}));

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ rpc })),
}));

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
            data: [{ current_period_start: 1720000000, current_period_end: 1722592000 }],
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
    expect(result?.status).toBe('canceled');
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
          parent: {
            subscription_details: { subscription: 'sub_5', metadata: { accountId: 'acc_5' } },
          },
          amount_paid: 1999,
          currency: 'usd',
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
        invoice: expect.objectContaining({ amountPaid: 1999, currency: 'usd' }),
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
  it('should resolve the price id from get_plan_provider_id and create a subscription session', async () => {
    rpc.mockResolvedValue({ data: 'price_test_123', error: null });
    sessionsCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/session_1' });

    const { url } = await stripeProvider.createCheckout({
      accountId: 'acc_1',
      planSlug: 'pro',
      interval: 'month',
      successUrl: 'https://app/ok',
      cancelUrl: 'https://app/no',
    });

    expect(rpc).toHaveBeenCalledWith('get_plan_provider_id', {
      p_slug: 'pro',
      p_interval: 'month',
      p_provider: 'stripe',
    });
    expect(sessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'subscription',
        line_items: [{ price: 'price_test_123', quantity: 1 }],
        success_url: 'https://app/ok',
        cancel_url: 'https://app/no',
        subscription_data: { metadata: { accountId: 'acc_1' } },
        metadata: { accountId: 'acc_1' },
      }),
    );
    expect(url).toBe('https://checkout.stripe.com/session_1');
  });

  it('should throw when the plan has no stripe price configured', async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    await expect(
      stripeProvider.createCheckout({
        accountId: 'acc_1',
        planSlug: 'pro',
        interval: 'month',
        successUrl: 'https://app/ok',
        cancelUrl: 'https://app/no',
      }),
    ).rejects.toThrow('plan_provider_id_not_configured');
  });
});

describe('stripeProvider.createPortalSession', () => {
  it('should create a billing portal session and return its url', async () => {
    billingPortalCreate.mockResolvedValue({ url: 'https://billing.stripe.com/portal_1' });
    const { url } = await stripeProvider.createPortalSession({
      accountId: 'acc_1',
      returnUrl: 'https://app/billing',
    });
    expect(billingPortalCreate).toHaveBeenCalledWith(
      expect.objectContaining({ return_url: 'https://app/billing' }),
    );
    expect(url).toBe('https://billing.stripe.com/portal_1');
  });
});

describe('stripeProvider.cancelSubscription', () => {
  it('should mark cancel_at_period_end when atPeriodEnd is true', async () => {
    await stripeProvider.cancelSubscription('sub_1', true);
    expect(subscriptionsUpdate).toHaveBeenCalledWith('sub_1', { cancel_at_period_end: true });
    expect(subscriptionsCancel).not.toHaveBeenCalled();
  });

  it('should cancel immediately when atPeriodEnd is false', async () => {
    await stripeProvider.cancelSubscription('sub_1', false);
    expect(subscriptionsCancel).toHaveBeenCalledWith('sub_1');
    expect(subscriptionsUpdate).not.toHaveBeenCalled();
  });
});
