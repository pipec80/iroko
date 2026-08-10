import { captureServer } from '@/lib/analytics/server';
import { logger } from '@/lib/logger';
import { createAdminClient } from '@/lib/supabase/admin';

import { getPaymentProvider } from './registry';
import type { PlanInterval } from './types';

/**
 * Resolves the account owner's user id for analytics attribution. Webhooks
 * carry no authenticated user — the owner is the closest stable identity to
 * attribute a subscription event to. Returns null (capture is skipped) if
 * the account has no owner membership row, which should not happen in practice.
 */
async function getAccountOwnerId(
  admin: ReturnType<typeof createAdminClient>,
  accountId: string,
): Promise<string | null> {
  const { data } = await admin
    .from('accounts_memberships')
    .select('user_id')
    .eq('account_id', accountId)
    .eq('role', 'owner')
    .maybeSingle();
  return data?.user_id ?? null;
}

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
  const interval = (event.raw as { interval?: PlanInterval })?.interval ?? 'month';
  const { data, error } = await admin.rpc('apply_subscription_event', {
    p_account_id: event.accountId,
    p_plan_slug: event.planSlug ?? 'free',
    p_interval: interval,
    p_status: event.status ?? 'active',
    p_external_subscription_id: event.externalSubscriptionId ?? `mock_${event.accountId}`,
    p_external_event_id: event.externalEventId,
    p_provider: providerName,
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

  // 'duplicate' = apply_subscription_event's own idempotency short-circuit
  // (external_event_id already processed) — never re-capture a replayed event.
  if (data !== 'duplicate' && event.type === 'subscription_created') {
    const ownerId = await getAccountOwnerId(admin, event.accountId);
    if (
      ownerId &&
      (providerName === 'mock' || providerName === 'stripe' || providerName === 'mercadopago')
    ) {
      await captureServer({
        event: 'subscription_activated',
        properties: { plan_slug: event.planSlug ?? 'free', interval, provider: providerName },
        distinctId: ownerId,
        accountId: event.accountId,
        insertId: event.externalEventId,
      });
    }
  }

  return { status: 200, body: { result: data } };
}
