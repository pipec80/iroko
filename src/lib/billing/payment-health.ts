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

export type PaymentFailureReason = 'check_card' | 'funds' | 'bank' | 'attempts' | 'security';

/**
 * Groups of Mercado Pago `status_detail` rejection codes, as documented in its
 * "¿Por qué se rechaza un pago?" guide. Codes that give the buyer nothing to act
 * on (`cc_rejected_invalid_installments`, `cc_rejected_duplicated_payment`) are
 * deliberately left out so they fall back to the generic message.
 */
const FAILURE_REASON_BY_CODE: ReadonlyMap<string, PaymentFailureReason> = new Map([
  ['cc_rejected_bad_filled_card_number', 'check_card'],
  ['cc_rejected_bad_filled_date', 'check_card'],
  ['cc_rejected_bad_filled_other', 'check_card'],
  ['cc_rejected_bad_filled_security_code', 'check_card'],
  ['cc_rejected_insufficient_amount', 'funds'],
  ['cc_rejected_call_for_authorize', 'bank'],
  ['cc_rejected_card_disabled', 'bank'],
  ['cc_rejected_other_reason', 'bank'],
  ['cc_rejected_max_attempts', 'attempts'],
  ['cc_rejected_blacklist', 'security'],
  ['cc_rejected_high_risk', 'security'],
]);

/** Buyer-facing reason group for a rejection code; null when it is missing or not actionable. */
export function paymentFailureReason(code: string | null): PaymentFailureReason | null {
  if (code === null) return null;
  return FAILURE_REASON_BY_CODE.get(code) ?? null;
}

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
