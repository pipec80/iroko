export type PaymentHealthState = 'healthy' | 'attention_required' | 'unknown';

export interface BillingPaymentHealth {
  state: PaymentHealthState;
  lastAttemptAt: string | null;
  lastFailureCode: string | null;
}

const UNKNOWN_PAYMENT_HEALTH: BillingPaymentHealth = {
  state: 'unknown',
  lastAttemptAt: null,
  lastFailureCode: null,
};

const PAYMENT_HEALTH_STATES: ReadonlySet<PaymentHealthState> = new Set([
  'healthy',
  'attention_required',
  'unknown',
]);

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

/** Maps the bounded payment-health RPC row without trusting database text values. */
export function mapBillingPaymentHealth(row: unknown): BillingPaymentHealth {
  if (typeof row !== 'object' || row === null || Array.isArray(row)) {
    return UNKNOWN_PAYMENT_HEALTH;
  }

  const candidate = row as Record<string, unknown>;
  if (
    typeof candidate.state !== 'string' ||
    !PAYMENT_HEALTH_STATES.has(candidate.state as PaymentHealthState) ||
    !isNullableString(candidate.last_attempt_at) ||
    !isNullableString(candidate.last_failure_code)
  ) {
    return UNKNOWN_PAYMENT_HEALTH;
  }

  return {
    state: candidate.state as PaymentHealthState,
    lastAttemptAt: candidate.last_attempt_at,
    lastFailureCode: candidate.last_failure_code,
  };
}
