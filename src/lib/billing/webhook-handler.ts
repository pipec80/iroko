import { logger } from '@/lib/logger';
import { createAdminClient } from '@/lib/supabase/admin';

import { getPaymentProvider } from './registry';
import type { PlanInterval } from './types';

/**
 * Verifica y aplica un webhook de un proveedor de pago. La decisión de estado
 * ya está resuelta en el NormalizedEvent (status); la persistencia atómica +
 * idempotencia + emisión a webhooks salientes vive en apply_subscription_event.
 */
export async function handleProviderWebhook(
  providerName: string,
  rawBody: string,
  signature: string,
): Promise<{ status: number; body: object }> {
  const provider = getPaymentProvider(providerName);
  const event = await provider.verifyWebhook(rawBody, signature);
  if (!event) {
    return { status: 400, body: { error: 'invalid_signature' } };
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc('apply_subscription_event', {
    p_account_id: event.accountId,
    p_plan_slug: event.planSlug ?? 'free',
    p_interval: (event.raw as { interval?: PlanInterval })?.interval ?? 'month',
    p_status: event.status ?? 'active',
    p_external_subscription_id: event.externalSubscriptionId ?? `mock_${event.accountId}`,
    p_external_event_id: event.externalEventId,
    p_event_type: event.type,
    p_current_period_start: event.currentPeriodStart ?? undefined,
    p_current_period_end: event.currentPeriodEnd ?? undefined,
    p_cancel_at_period_end: event.cancelAtPeriodEnd ?? false,
    p_trial_end: undefined,
    p_invoice: event.invoice ?? undefined,
  });

  if (error) {
    logger.error(
      { action: 'billing.webhook', provider: providerName, code: error.code },
      'apply_subscription_event failed',
    );
    return { status: 500, body: { error: 'internal_error' } };
  }

  return { status: 200, body: { result: data } };
}
