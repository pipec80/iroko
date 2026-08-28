import { requireAccountRole } from '@/lib/active-account';
import { logger } from '@/lib/logger';
import { ADMIN_ROLES } from '@/lib/permissions';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

import { assertProviderCapability } from './capabilities';
import { getProviderPrice } from './catalog';
import { getPaymentProvider } from './registry';
import type {
  CancellationTiming,
  CheckoutResult,
  PaymentProvider,
  PlanInterval,
  ProviderName,
} from './types';

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

/** Persists only the server-side pending-preapproval state created by Mercado Pago checkout. */
async function persistMercadoPagoProvisionalSubscription(input: {
  accountId: string;
  planId: string;
  externalPreapprovalId: string;
}): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.rpc('create_billing_provisional_subscription', {
    p_account_id: input.accountId,
    p_plan_id: input.planId,
    p_external_preapproval_id: input.externalPreapprovalId,
  });
  if (error) {
    throw new Error(`billing_provisional_subscription_failed:${error.code ?? 'unknown'}`);
  }
}

async function compensateMercadoPagoProvisionalSubscription(
  provider: PaymentProvider,
  externalSubscriptionId: string,
): Promise<void> {
  if (!provider.cancelSubscription) {
    throw new Error('billing_capability_not_supported:cancelImmediately');
  }
  await provider.cancelSubscription({ externalSubscriptionId, timing: 'immediate' });
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
  const checkout = await provider.createCheckout({
    accountId: input.accountId,
    customerEmail: input.customerEmail,
    planSlug: input.planSlug,
    interval: input.interval,
    successUrl: input.successUrl,
    cancelUrl: input.cancelUrl,
  });

  if (provider.name !== 'mercadopago' || !checkout.externalSubscriptionId) return checkout;

  try {
    const providerPrice = await getProviderPrice({
      planSlug: input.planSlug,
      interval: input.interval,
      provider: 'mercadopago',
      currency: 'CLP',
    });
    await persistMercadoPagoProvisionalSubscription({
      accountId: input.accountId,
      planId: providerPrice.planId,
      externalPreapprovalId: checkout.externalSubscriptionId,
    });
  } catch (persistenceError) {
    logger.error(
      {
        action: 'billing.provisional_subscription_persistence_failed',
        component: 'BillingService',
      },
      'Mercado Pago provisional subscription persistence failed',
    );
    try {
      await compensateMercadoPagoProvisionalSubscription(provider, checkout.externalSubscriptionId);
    } catch {
      logger.error(
        {
          action: 'billing.provisional_subscription_compensation_failed',
          component: 'BillingService',
        },
        'Mercado Pago provisional subscription compensation failed',
      );
    }
    throw persistenceError;
  }

  return checkout;
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
