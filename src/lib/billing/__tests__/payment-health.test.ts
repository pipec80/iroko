import { describe, expect, it } from 'vitest';

import { mapBillingPaymentHealth } from '../payment-health';

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
