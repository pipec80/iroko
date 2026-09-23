import { describe, expect, it } from 'vitest';

import { mapBillingPaymentHealth, paymentFailureReason } from '../payment-health';

describe('paymentFailureReason', () => {
  it.each([
    ['cc_rejected_bad_filled_card_number', 'check_card'],
    ['cc_rejected_bad_filled_security_code', 'check_card'],
    ['cc_rejected_insufficient_amount', 'funds'],
    ['cc_rejected_call_for_authorize', 'bank'],
    ['cc_rejected_other_reason', 'bank'],
    ['cc_rejected_max_attempts', 'attempts'],
    ['cc_rejected_high_risk', 'security'],
    ['cc_rejected_blacklist', 'security'],
  ] as const)('groups %s as %s', (code, reason) => {
    expect(paymentFailureReason(code)).toBe(reason);
  });

  it.each([
    null,
    '',
    'cc_rejected_invalid_installments',
    'cc_rejected_duplicated_payment',
    'constructor',
  ])('returns null for the missing or non-actionable code %j', (code) => {
    expect(paymentFailureReason(code)).toBeNull();
  });
});

describe('mapBillingPaymentHealth', () => {
  it.each(['healthy', 'attention_required', 'unknown'] as const)(
    'maps the known %s database state and bounded details',
    (state) => {
      expect(
        mapBillingPaymentHealth({
          state,
          last_attempt_at: '2026-09-11T10:00:00Z',
          last_failure_code: 'cc_rejected_other_reason',
        }),
      ).toEqual({
        state,
        lastAttemptAt: '2026-09-11T10:00:00Z',
        lastFailureCode: 'cc_rejected_other_reason',
      });
    },
  );

  it.each([
    null,
    undefined,
    [],
    {},
    { state: 'past_due', last_attempt_at: null, last_failure_code: null },
    { state: 'healthy', last_attempt_at: 123, last_failure_code: null },
    { state: 'healthy', last_attempt_at: null, last_failure_code: false },
  ])('maps malformed input %# to unknown without details', (row) => {
    expect(mapBillingPaymentHealth(row)).toEqual({
      state: 'unknown',
      lastAttemptAt: null,
      lastFailureCode: null,
    });
  });
});
