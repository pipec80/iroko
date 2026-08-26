import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  resolvePlanByExternalPrice: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({ rpc: mocks.rpc })),
}));

vi.mock('../catalog', () => ({
  resolvePlanByExternalPrice: mocks.resolvePlanByExternalPrice,
}));

import type {
  InvoicePaidEvent,
  InvoicePaymentFailedEvent,
  PaymentRecoveredEvent,
  SubscriptionCanceledEvent,
  SubscriptionCreatedEvent,
  SubscriptionUpdatedEvent,
} from '../events';
import { reduceBillingEvent } from '../reducer';

const invoicePaidEvent: InvoicePaidEvent = {
  provider: 'stripe',
  externalEventId: 'evt_invoice_paid',
  type: 'invoice_paid',
  accountId: 'a1',
  externalSubscriptionId: 'sub_123',
  externalInvoiceId: 'in_123',
  externalPaymentId: 'pi_123',
  amountPaid: 2500,
  currency: 'USD',
  paidAt: '2026-08-18T20:00:00.000Z',
  raw: {},
};

const subscriptionCreatedEvent: SubscriptionCreatedEvent = {
  provider: 'stripe',
  externalEventId: 'evt_subscription_created',
  type: 'subscription_created',
  accountId: 'a1',
  externalSubscriptionId: 'sub_123',
  externalPriceId: 'price_pro_month',
  status: 'active',
  cancelAtPeriodEnd: false,
  raw: {},
};

const subscriptionUpdatedEvent: SubscriptionUpdatedEvent = {
  provider: 'stripe',
  externalEventId: 'evt_subscription_updated',
  type: 'subscription_updated',
  accountId: 'a1',
  externalSubscriptionId: 'sub_123',
  status: 'past_due',
  cancelAtPeriodEnd: false,
  raw: {},
};

const subscriptionCanceledEvent: SubscriptionCanceledEvent = {
  provider: 'stripe',
  externalEventId: 'evt_subscription_canceled',
  type: 'subscription_canceled',
  accountId: 'a1',
  externalSubscriptionId: 'sub_123',
  canceledAt: '2026-08-20T00:00:00.000Z',
  accessUntil: '2026-09-01T00:00:00.000Z',
  raw: {},
};

const invoicePaymentFailedEvent: InvoicePaymentFailedEvent = {
  provider: 'stripe',
  externalEventId: 'evt_invoice_failed',
  type: 'invoice_payment_failed',
  accountId: 'a1',
  externalSubscriptionId: 'sub_123',
  externalInvoiceId: 'in_123',
  externalPaymentId: 'pi_123',
  amountDue: 2500,
  currency: 'USD',
  attemptedAt: '2026-08-20T00:00:00.000Z',
  raw: {},
};

const paymentRecoveredEvent: PaymentRecoveredEvent = {
  provider: 'stripe',
  externalEventId: 'evt_payment_recovered',
  type: 'payment_recovered',
  accountId: 'a1',
  externalSubscriptionId: 'sub_123',
  externalInvoiceId: 'in_123',
  externalPaymentId: 'pi_123',
  amountPaid: 2500,
  currency: 'USD',
  recoveredAt: '2026-08-21T00:00:00.000Z',
  raw: {},
};

describe('reduceBillingEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not substitute free when a subscription price mapping is missing', async () => {
    mocks.resolvePlanByExternalPrice.mockRejectedValue(
      new Error('provider_price_mapping_not_found'),
    );

    await expect(reduceBillingEvent(subscriptionCreatedEvent)).rejects.toThrow(
      'provider_price_mapping_not_found',
    );
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('requires reverse price mapping before creating a subscription', async () => {
    mocks.resolvePlanByExternalPrice.mockResolvedValue({
      planId: 'plan-pro-month',
      planSlug: 'pro',
      interval: 'month',
    });
    mocks.rpc.mockResolvedValue({ data: 'applied', error: null });

    await expect(reduceBillingEvent(subscriptionCreatedEvent)).resolves.toEqual({
      status: 'applied',
    });

    expect(mocks.rpc).toHaveBeenCalledWith(
      'apply_subscription_created',
      expect.objectContaining({
        p_provider: 'stripe',
        p_external_event_id: 'evt_subscription_created',
        p_plan_id: 'plan-pro-month',
        p_external_subscription_id: 'sub_123',
      }),
    );
  });

  it('routes invoice_paid only to invoice and payment persistence', async () => {
    mocks.rpc.mockResolvedValue({ data: 'applied', error: null });

    await reduceBillingEvent(invoicePaidEvent);

    expect(mocks.rpc).toHaveBeenCalledWith(
      'apply_invoice_paid',
      expect.objectContaining({
        p_provider: 'stripe',
        p_external_event_id: 'evt_invoice_paid',
        p_external_invoice_id: 'in_123',
        p_external_subscription_id: 'sub_123',
      }),
    );
    expect(mocks.rpc).not.toHaveBeenCalledWith(
      expect.stringMatching(/^apply_subscription_/),
      expect.anything(),
    );
  });

  it('keeps the existing plan when a subscription update has no external price id', async () => {
    mocks.rpc.mockResolvedValue({ data: 'applied', error: null });

    await reduceBillingEvent(subscriptionUpdatedEvent);

    expect(mocks.resolvePlanByExternalPrice).not.toHaveBeenCalled();
    expect(mocks.rpc).toHaveBeenCalledWith(
      'apply_subscription_updated',
      expect.objectContaining({
        p_plan_id: null,
        p_status: 'past_due',
        p_external_subscription_id: 'sub_123',
      }),
    );
  });

  it('changes plan only when an update supplies a resolvable external price id', async () => {
    mocks.resolvePlanByExternalPrice.mockResolvedValue({
      planId: 'plan-scale-month',
      planSlug: 'scale',
      interval: 'month',
    });
    mocks.rpc.mockResolvedValue({ data: 'applied', error: null });

    await reduceBillingEvent({ ...subscriptionUpdatedEvent, externalPriceId: 'price_scale_month' });

    expect(mocks.rpc).toHaveBeenCalledWith(
      'apply_subscription_updated',
      expect.objectContaining({ p_plan_id: 'plan-scale-month' }),
    );
  });

  it('routes a cancellation without a plan mutation', async () => {
    mocks.rpc.mockResolvedValue({ data: 'applied', error: null });

    await reduceBillingEvent(subscriptionCanceledEvent);

    expect(mocks.rpc).toHaveBeenCalledWith(
      'apply_subscription_canceled',
      expect.objectContaining({ p_external_subscription_id: 'sub_123' }),
    );
  });

  it('writes payment failures without changing subscription state', async () => {
    mocks.rpc.mockResolvedValue({ data: 'applied', error: null });

    await reduceBillingEvent(invoicePaymentFailedEvent);

    expect(mocks.rpc).toHaveBeenCalledWith(
      'apply_invoice_payment_failed',
      expect.objectContaining({ p_external_invoice_id: 'in_123', p_status: 'failed' }),
    );
    expect(mocks.rpc).not.toHaveBeenCalledWith(
      expect.stringMatching(/^apply_subscription_/),
      expect.anything(),
    );
  });

  it('writes payment recovery without changing subscription state', async () => {
    mocks.rpc.mockResolvedValue({ data: 'applied', error: null });

    await reduceBillingEvent(paymentRecoveredEvent);

    expect(mocks.rpc).toHaveBeenCalledWith(
      'apply_payment_recovered',
      expect.objectContaining({ p_external_invoice_id: 'in_123', p_status: 'recovered' }),
    );
    expect(mocks.rpc).not.toHaveBeenCalledWith(
      expect.stringMatching(/^apply_subscription_/),
      expect.anything(),
    );
  });
});
