import { describe, expect, it } from 'vitest';

import { mockCheckoutSchema, mockEventSchema } from '../mock-schemas';

const checkout = {
  accountId: 'a1',
  planSlug: 'pro',
  interval: 'month',
  successUrl: 'https://app.example/ok',
  cancelUrl: 'http://localhost:3000/no',
};
const base = {
  provider: 'mock',
  externalEventId: 'evt_1',
  accountId: 'a1',
  externalSubscriptionId: 'sub_1',
  raw: { interval: 'month' },
};
const now = '2026-10-15T10:00:00.000Z';

describe('mock purpose schemas', () => {
  it('accepts checkout only in the checkout schema', () => {
    expect(mockCheckoutSchema.safeParse(checkout).success).toBe(true);
    expect(mockEventSchema.safeParse(checkout).success).toBe(false);
  });
  it.each([
    {
      type: 'subscription_created',
      externalPriceId: 'mock:pro:month',
      status: 'active',
      cancelAtPeriodEnd: false,
    },
    { type: 'subscription_updated', status: 'past_due', cancelAtPeriodEnd: true },
    { type: 'subscription_canceled', canceledAt: now },
    {
      type: 'invoice_paid',
      externalInvoiceId: 'in_1',
      amountPaid: 100,
      currency: 'CLP',
      paidAt: now,
    },
    { type: 'invoice_payment_failed', externalInvoiceId: 'in_1', attemptedAt: now },
    { type: 'payment_recovered', externalInvoiceId: 'in_1', recoveredAt: now },
  ])('accepts only the mock event variant $type', (variant) => {
    const event = { ...base, ...variant };
    expect(mockEventSchema.safeParse(event).success).toBe(true);
    expect(mockCheckoutSchema.safeParse(event).success).toBe(false);
    expect(mockEventSchema.safeParse({ ...event, provider: 'stripe' }).success).toBe(false);
    expect(mockEventSchema.safeParse({ ...event, unexpected: true }).success).toBe(false);
  });
  it.each([
    { ...checkout, successUrl: 'not-a-url' },
    { ...checkout, successUrl: 'javascript:alert(1)' },
    { ...checkout, cancelUrl: 'https://user:pass@app.example' },
    { ...checkout, planSlug: 'unknown' },
    { ...checkout, interval: 'one_time' },
    { ...checkout, extra: true },
  ])('rejects malformed checkout %j', (value) => {
    expect(mockCheckoutSchema.safeParse(value).success).toBe(false);
  });
  it('rejects missing fields, invalid dates and negative amounts', () => {
    expect(mockEventSchema.safeParse({ ...base, type: 'subscription_created' }).success).toBe(
      false,
    );
    expect(
      mockEventSchema.safeParse({
        ...base,
        type: 'invoice_paid',
        externalInvoiceId: 'in_1',
        amountPaid: -1,
        currency: 'CLP',
        paidAt: now,
      }).success,
    ).toBe(false);
    expect(
      mockEventSchema.safeParse({ ...base, type: 'subscription_canceled', canceledAt: 'yesterday' })
        .success,
    ).toBe(false);
  });
});
