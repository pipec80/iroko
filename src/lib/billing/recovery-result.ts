import { z } from 'zod';
import type { Json } from '@/types/database';
import type { ProviderRecoveryResult } from './types';

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

const base = {
  provider: z.enum(['mock', 'stripe', 'paddle', 'lemonsqueezy', 'mercadopago']),
  externalEventId: id,
  accountId: z.string().uuid(),
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
const money = z.number().int().nonnegative().max(2147483647);
const currency = z.string().regex(/^[A-Z]{3}$/);

/** Structural purpose separation: checkout fields never form a normalized event. */
const recoveryEventSchema = z.discriminatedUnion('type', [
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

const resultSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('event'), event: recoveryEventSchema }),
  z.strictObject({ kind: z.literal('pending') }),
  z.strictObject({ kind: z.literal('unrelated') }),
  z.strictObject({ kind: z.literal('error'), errorCode: z.string().regex(/^[a-z_]{1,100}$/) }),
  z.strictObject({
    kind: z.literal('anomaly'),
    observation: z.strictObject({
      anomalyType: z.enum([
        'refund',
        'partial_refund',
        'chargeback',
        'mediation',
        'status_divergence',
        'unresolved_payment',
      ]),
      externalResourceId: id,
      observedStatus: id.optional(),
      originalAmount: money.optional(),
      affectedAmount: money.optional(),
      currency: currency.optional(),
    }),
  }),
]);
export type RecoveryResultInput = ProviderRecoveryResult | { kind: 'error'; errorCode: string };
/** Validates the bounded recovery wire contract before the atomic SQL operation. */
export function serializeRecoveryResult(result: RecoveryResultInput): Json {
  return JSON.parse(JSON.stringify(resultSchema.parse(result))) as Json;
}
