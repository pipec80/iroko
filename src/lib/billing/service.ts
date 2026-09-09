import { requireAccountRole } from '@/lib/active-account';
import { ADMIN_ROLES } from '@/lib/permissions';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

import { assertProviderCapability } from './capabilities';
import { getProviderPrice } from './catalog';
import { getPaymentProvider } from './registry';
import type { CancellationTiming, CheckoutStartResult, PlanInterval, ProviderName } from './types';

const BLOCKING_PAID_STATUSES = new Set(['trialing', 'active', 'past_due']);

interface StartBillingCheckoutInput {
  accountId: string;
  customerEmail: string;
  planSlug: string;
  interval: PlanInterval;
  provider?: ProviderName;
  successUrl: string;
  cancelUrl: string;
}

interface CancelBillingSubscriptionInput {
  accountId: string;
  timing: CancellationTiming;
}

interface CheckoutReservationRow {
  action: 'create' | 'resume' | 'processing' | 'needs_review';
  intent_id: string;
  url: string | null;
}

function isDeterministicMercadoPagoRejection(error: unknown): boolean {
  const message = error instanceof Error ? error.message : '';
  return /^mercadopago_post_failed_4\d\d(?:[:_]|$)/.test(message);
}

async function markCheckoutFailure(input: {
  intentId: string;
  failureCode: string;
  outcomeUnknown: boolean;
}): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.rpc('mark_billing_checkout_failed', {
    p_intent_id: input.intentId,
    p_failure_code: input.failureCode,
    p_outcome_unknown: input.outcomeUnknown,
  });
  if (error) throw new Error(`billing_checkout_failure_state_failed:${error.code ?? 'unknown'}`);
}

/**
 * Starts checkout after authorization and paid-state checks. Mercado Pago is
 * coordinated through a durable reservation before its non-idempotent POST.
 */
export async function startBillingCheckout(
  input: StartBillingCheckoutInput,
): Promise<CheckoutStartResult> {
  await requireAccountRole(input.accountId, ADMIN_ROLES);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_billing_overview', {
    p_account_id: input.accountId,
  });
  if (error) throw new Error(`billing_overview_failed:${error.code ?? 'unknown'}`);

  const current = data?.[0];
  if (current && current.plan_slug !== 'free' && BLOCKING_PAID_STATUSES.has(current.status)) {
    throw new Error('active_paid_subscription_exists');
  }

  const provider = getPaymentProvider(input.provider);
  if (provider.name !== 'mercadopago') {
    const checkout = await provider.createCheckout(input);
    return {
      kind: 'redirect',
      url: checkout.url,
      intentId:
        checkout.externalCheckoutId ?? checkout.externalSubscriptionId ?? crypto.randomUUID(),
    };
  }

  const providerPrice = await getProviderPrice({
    planSlug: input.planSlug,
    interval: input.interval,
    provider: 'mercadopago',
    currency: 'CLP',
  });
  const admin = createAdminClient();
  const { data: reservationData, error: reservationError } = await admin.rpc(
    'reserve_billing_checkout',
    {
      p_account_id: input.accountId,
      p_plan_id: providerPrice.planId,
      p_provider: 'mercadopago',
    },
  );
  if (reservationError) {
    throw new Error(`billing_checkout_reservation_failed:${reservationError.code ?? 'unknown'}`);
  }
  const reservation = reservationData?.[0] as CheckoutReservationRow | undefined;
  if (!reservation?.intent_id) throw new Error('billing_checkout_reservation_invalid');

  if (reservation.action === 'resume') {
    if (!reservation.url) throw new Error('billing_checkout_resume_url_missing');
    return { kind: 'redirect', url: reservation.url, intentId: reservation.intent_id };
  }
  if (reservation.action !== 'create') {
    return { kind: reservation.action, intentId: reservation.intent_id };
  }

  let checkout;
  try {
    checkout = await provider.createCheckout({
      ...input,
      externalReference: reservation.intent_id,
    });
  } catch (providerError) {
    const outcomeUnknown = !isDeterministicMercadoPagoRejection(providerError);
    await markCheckoutFailure({
      intentId: reservation.intent_id,
      failureCode: outcomeUnknown ? 'provider_outcome_unknown' : 'provider_rejected',
      outcomeUnknown,
    });
    if (outcomeUnknown) return { kind: 'needs_review', intentId: reservation.intent_id };
    throw providerError;
  }

  if (!checkout.externalSubscriptionId) {
    await markCheckoutFailure({
      intentId: reservation.intent_id,
      failureCode: 'provider_response_missing_subscription_id',
      outcomeUnknown: true,
    });
    return { kind: 'needs_review', intentId: reservation.intent_id };
  }

  const { error: attachError } = await admin.rpc('attach_billing_checkout_remote', {
    p_intent_id: reservation.intent_id,
    p_external_subscription_id: checkout.externalSubscriptionId,
    p_checkout_url: checkout.url,
  });
  if (attachError) {
    await markCheckoutFailure({
      intentId: reservation.intent_id,
      failureCode: 'remote_created_local_attach_failed',
      outcomeUnknown: true,
    });
    return { kind: 'needs_review', intentId: reservation.intent_id };
  }

  return { kind: 'redirect', url: checkout.url, intentId: reservation.intent_id };
}

/** Cancels an existing provider subscription only through advertised capabilities. */
export async function cancelBillingSubscription(
  input: CancelBillingSubscriptionInput,
): Promise<void> {
  await requireAccountRole(input.accountId, ADMIN_ROLES);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_billing_overview', {
    p_account_id: input.accountId,
  });
  if (error) throw new Error(`billing_overview_failed:${error.code ?? 'unknown'}`);

  const current = data?.[0];
  if (!current?.external_subscription_id) throw new Error('billing_subscription_not_found');

  const provider = getPaymentProvider(current.provider);
  assertProviderCapability(
    provider.capabilities,
    input.timing === 'immediate' ? 'cancelImmediately' : 'cancelAtPeriodEnd',
  );
  if (!provider.cancelSubscription) {
    throw new Error(
      `billing_capability_not_supported:${
        input.timing === 'immediate' ? 'cancelImmediately' : 'cancelAtPeriodEnd'
      }`,
    );
  }

  await provider.cancelSubscription({
    externalSubscriptionId: current.external_subscription_id,
    timing: input.timing,
  });
}
