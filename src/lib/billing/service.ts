import { requireAccountRole } from '@/lib/active-account';
import { ADMIN_ROLES } from '@/lib/permissions';
import { createClient } from '@/lib/supabase/server';

import { assertProviderCapability } from './capabilities';
import { getPaymentProvider } from './registry';
import type { CancellationTiming, CheckoutResult, PlanInterval, ProviderName } from './types';

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

/**
 * Starts a checkout only after live membership and existing paid state have
 * been checked. This is the sole provider checkout orchestration boundary.
 */
export async function startBillingCheckout(
  input: StartBillingCheckoutInput,
): Promise<CheckoutResult> {
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
  return provider.createCheckout({
    accountId: input.accountId,
    customerEmail: input.customerEmail,
    planSlug: input.planSlug,
    interval: input.interval,
    successUrl: input.successUrl,
    cancelUrl: input.cancelUrl,
  });
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
