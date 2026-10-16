import { z } from 'zod';

const id = z.string().min(1).max(200);
const timestamp = z.iso.datetime({ offset: true });
const status = z.enum([
  'trialing',
  'active',
  'past_due',
  'canceled',
  'paused',
  'unpaid',
  'incomplete',
]);
const url = z
  .string()
  .max(2000)
  .url()
  .refine((value) => {
    try {
      const parsed = new URL(value);
      return (
        !parsed.username &&
        !parsed.password &&
        (parsed.protocol === 'https:' ||
          (parsed.protocol === 'http:' &&
            ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname)))
      );
    } catch {
      return false;
    }
  }, 'invalid_url');

export const mockCheckoutSchema = z.strictObject({
  accountId: id,
  planSlug: z.enum(['pro', 'scale']),
  interval: z.enum(['month', 'year']),
  successUrl: url,
  cancelUrl: url,
});

const base = {
  provider: z.literal('mock'),
  externalEventId: id,
  accountId: id,
  externalSubscriptionId: id,
  raw: z.unknown(),
};
const subscription = {
  status,
  currentPeriodStart: timestamp.optional(),
  currentPeriodEnd: timestamp.optional(),
  cancelAtPeriodEnd: z.boolean(),
  externalCustomerId: id.optional(),
};
const invoice = { externalInvoiceId: id, externalPaymentId: id.optional() };
const money = z.number().finite().nonnegative();
const currency = z.string().regex(/^[A-Z]{3}$/);

/** Structural purpose separation: checkout fields never form a normalized event. */
export const mockEventSchema = z.discriminatedUnion('type', [
  z.strictObject({
    ...base,
    ...subscription,
    type: z.literal('subscription_created'),
    externalPriceId: id,
  }),
  z.strictObject({
    ...base,
    ...subscription,
    type: z.literal('subscription_updated'),
    externalPriceId: id.optional(),
  }),
  z.strictObject({
    ...base,
    type: z.literal('subscription_canceled'),
    canceledAt: timestamp.optional(),
    accessUntil: timestamp.optional(),
  }),
  z.strictObject({
    ...base,
    ...invoice,
    type: z.literal('invoice_paid'),
    amountPaid: money,
    currency,
    periodStart: timestamp.optional(),
    periodEnd: timestamp.optional(),
    paidAt: timestamp,
    hostedUrl: url.optional(),
    pdfUrl: url.optional(),
  }),
  z.strictObject({
    ...base,
    ...invoice,
    type: z.literal('invoice_payment_failed'),
    amountDue: money.optional(),
    currency: currency.optional(),
    failureCode: id.optional(),
    failureMessage: z.string().max(2000).optional(),
    attemptedAt: timestamp,
  }),
  z.strictObject({
    ...base,
    ...invoice,
    type: z.literal('payment_recovered'),
    amountPaid: money.optional(),
    currency: currency.optional(),
    recoveredAt: timestamp,
  }),
]);
