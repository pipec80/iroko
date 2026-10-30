import { describe, expect, it } from 'vitest';
import { serializeRecoveryResult } from '../recovery-result';
import type { RecoveryResultInput } from '../recovery-result';
const event = {
  kind: 'event',
  event: {
    provider: 'mercadopago',
    type: 'invoice_paid',
    accountId: '00000000-0000-4000-8000-000000000001',
    externalEventId: 'event',
    externalSubscriptionId: 'subscription',
    externalInvoiceId: 'invoice',
    externalPaymentId: 'payment',
    amountPaid: 19990,
    currency: 'CLP',
    paidAt: '2026-09-09T12:00:00Z',
    raw: {},
  },
} as const;
describe('serializeRecoveryResult', () => {
  it('preserves normalized payload', () => expect(serializeRecoveryResult(event)).toEqual(event));
  it.each([
    { kind: 'rpc', rpc: 'apply_invoice_paid' },
    { ...event, event: { ...event.event, accountId: 'not-uuid' } },
    { ...event, event: { ...event.event, amountPaid: -1 } },
    { ...event, event: { ...event.event, paidAt: 'invalid' } },
    { ...event, event: { ...event.event, type: 'arbitrary' } },
  ])('rejects invalid input %#', (value) =>
    expect(() => serializeRecoveryResult(value as unknown as RecoveryResultInput)).toThrow(),
  );
});
