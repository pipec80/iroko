import { describe, it, expect } from 'vitest';

import { applyEvent } from '../subscription-state';
import type {
  InvoicePaidEvent,
  InvoicePaymentFailedEvent,
  SubscriptionCanceledEvent,
  SubscriptionCreatedEvent,
  SubscriptionUpdatedEvent,
} from '../events';

const created: SubscriptionCreatedEvent = {
  provider: 'stripe',
  externalEventId: 'e1',
  type: 'subscription_created',
  accountId: 'a1',
  externalSubscriptionId: 'sub_1',
  externalPriceId: 'price_pro_month',
  status: 'active',
  cancelAtPeriodEnd: false,
  raw: {},
};

const updated: SubscriptionUpdatedEvent = {
  provider: 'stripe',
  externalEventId: 'e2',
  type: 'subscription_updated',
  accountId: 'a1',
  externalSubscriptionId: 'sub_1',
  status: 'active',
  cancelAtPeriodEnd: true,
  raw: {},
};

const canceled: SubscriptionCanceledEvent = {
  provider: 'stripe',
  externalEventId: 'e3',
  type: 'subscription_canceled',
  accountId: 'a1',
  externalSubscriptionId: 'sub_1',
  raw: {},
};

const invoicePaid: InvoicePaidEvent = {
  provider: 'stripe',
  externalEventId: 'e4',
  type: 'invoice_paid',
  accountId: 'a1',
  externalSubscriptionId: 'sub_1',
  externalInvoiceId: 'in_1',
  amountPaid: 2500,
  currency: 'USD',
  paidAt: '2026-08-26T12:00:00.000Z',
  raw: {},
};

const invoicePaymentFailed: InvoicePaymentFailedEvent = {
  provider: 'stripe',
  externalEventId: 'e5',
  type: 'invoice_payment_failed',
  accountId: 'a1',
  externalSubscriptionId: 'sub_1',
  externalInvoiceId: 'in_1',
  attemptedAt: '2026-08-26T12:00:00.000Z',
  raw: {},
};

describe('applyEvent', () => {
  it('should activate on subscription_created', () => {
    const next = applyEvent(null, created);
    expect(next).toEqual({ status: 'active', cancelAtPeriodEnd: false });
  });

  it('should carry cancelAtPeriodEnd from an update event', () => {
    const next = applyEvent({ status: 'active', cancelAtPeriodEnd: false }, updated);
    expect(next).toEqual({ status: 'active', cancelAtPeriodEnd: true });
  });

  it('should force canceled status on subscription_canceled', () => {
    const next = applyEvent({ status: 'active', cancelAtPeriodEnd: true }, canceled);
    expect(next).toEqual({ status: 'canceled', cancelAtPeriodEnd: false });
  });

  it('does not change subscription status when an invoice is paid', () => {
    const next = applyEvent({ status: 'past_due', cancelAtPeriodEnd: false }, invoicePaid);
    expect(next.status).toBe('past_due');
  });

  it('rejects a payment event when the subscription snapshot is unavailable', () => {
    expect(() => applyEvent(null, invoicePaymentFailed)).toThrow(
      'subscription_snapshot_not_found:invoice_payment_failed',
    );
  });
});
