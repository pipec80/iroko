import { captureServer } from '@/lib/analytics/server';
import { logger } from '@/lib/logger';
import { notify } from '@/lib/notifications';
import { createAdminClient } from '@/lib/supabase/admin';
import { captureException, withScope } from '@sentry/nextjs';

import { resolvePlanByExternalPrice } from './catalog';
import type { SubscriptionCreatedEvent } from './events';
import { reduceBillingEvent } from './reducer';
import { getPaymentProvider } from './registry';
import type { WebhookVerificationContext } from './types';

/**
 * Resolves the account owner's user id for analytics attribution. Webhooks
 * carry no authenticated user, so no capture is emitted when the owner is
 * unavailable.
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

/** Runs non-critical activation side effects after the database transition committed. */
async function reportSubscriptionActivated(event: SubscriptionCreatedEvent): Promise<void> {
  if (!isAnalyticsProvider(event.provider)) return;

  let plan: { planSlug: string; interval: 'month' | 'year' };
  try {
    plan = await resolvePlanByExternalPrice({
      provider: event.provider,
      externalPriceId: event.externalPriceId,
    });
  } catch (error) {
    logger.error(
      { action: 'billing.webhook.capture', accountId: event.accountId },
      error instanceof Error ? error.message : 'Provider price mapping unavailable after commit',
    );
    return;
  }

  const admin = createAdminClient();
  const ownerId = await getAccountOwnerId(admin, event.accountId);
  if (!ownerId) return;

  try {
    await captureServer({
      event: 'subscription_activated',
      properties: {
        plan_slug: plan.planSlug,
        interval: plan.interval,
        provider: event.provider,
      },
      distinctId: ownerId,
      accountId: event.accountId,
      insertId: event.externalEventId,
    });
  } catch (error) {
    logger.error(
      { action: 'billing.webhook.capture', accountId: event.accountId },
      error instanceof Error ? error.message : 'Unknown error',
    );
  }

  await notify(ownerId, {
    type: 'success',
    title: `Tu plan ${plan.planSlug} está activo`,
    link: '/dashboard/billing',
    emailDelivery: true,
  }).catch((error: unknown) => {
    logger.error(
      { action: 'billing.webhook.notify', accountId: event.accountId },
      error instanceof Error ? error.message : 'Unknown error',
    );
  });
}

function isAnalyticsProvider(
  provider: SubscriptionCreatedEvent['provider'],
): provider is 'mock' | 'stripe' | 'mercadopago' {
  return provider === 'mock' || provider === 'stripe' || provider === 'mercadopago';
}

function captureBillingException(
  error: unknown,
  event: {
    provider: string;
    type: string;
    accountId: string;
    externalEventId: string;
  },
): void {
  withScope((scope) => {
    scope.setTag('billing_provider', event.provider);
    scope.setTag('billing_event_type', event.type);
    scope.setTag('billing_operation', 'webhook_reduce');
    scope.setContext('billing_webhook', {
      account_id: event.accountId,
      external_event_id: event.externalEventId,
    });
    captureException(error);
  });
}

/** Produces safe delivery metadata; raw bodies and signatures must never reach logs. */
function webhookLogContext(
  provider: string,
  context: WebhookVerificationContext | undefined,
): { component: 'billing'; provider: string; webhookId?: string } {
  return {
    component: 'billing',
    provider,
    ...(context?.webhookId ? { webhookId: context.webhookId } : {}),
  };
}

/**
 * Verifies and reduces a provider webhook. Providers produce the typed event;
 * the reducer owns the only persistence boundary and its idempotency key.
 */
export async function handleProviderWebhook(
  providerName: string,
  rawBody: string,
  signature: string,
  context?: WebhookVerificationContext,
): Promise<{ status: number; body: object }> {
  let provider: ReturnType<typeof getPaymentProvider>;
  try {
    provider = getPaymentProvider(providerName);
  } catch {
    return { status: 404, body: { error: 'provider_not_configured' } };
  }
  const logContext = webhookLogContext(provider.name, context);
  logger.info({ ...logContext, action: 'billing.webhook.received' }, 'Billing webhook received');
  let event: Awaited<ReturnType<typeof provider.verifyWebhook>>;
  try {
    event = await provider.verifyWebhook(rawBody, signature, context);
  } catch (error) {
    withScope((scope) => {
      scope.setTag('billing_provider', provider.name);
      scope.setTag('billing_operation', 'webhook_verify');
      captureException(error);
    });
    logger.error(
      { ...logContext, action: 'billing.webhook.verify_failed' },
      error instanceof Error ? error.message : 'Provider webhook verification failed',
    );
    return { status: 500, body: { error: 'provider_verification_failed' } };
  }
  if (!event || event.provider !== provider.name) {
    logger.warn({ ...logContext, action: 'billing.webhook.rejected' }, 'Billing webhook rejected');
    return { status: 400, body: { error: 'invalid_signature' } };
  }

  if (event.type === 'webhook_acknowledged') {
    if (event.reason === 'payment_status_divergence') {
      logger.warn(
        {
          ...logContext,
          action: 'billing.webhook.divergence',
          reason: event.reason,
        },
        'Billing webhook requires reconciliation',
      );
    } else {
      logger.info(
        {
          ...logContext,
          action: 'billing.webhook.acknowledged',
          reason: event.reason,
        },
        'Billing webhook acknowledged without a local mutation',
      );
    }
    return { status: 200, body: { result: 'ignored' } };
  }

  let result: Awaited<ReturnType<typeof reduceBillingEvent>>;
  try {
    result = await reduceBillingEvent(event);
  } catch (error) {
    captureBillingException(error, event);
    logger.error(
      { ...logContext, action: 'billing.webhook.reduce_failed', eventType: event.type },
      error instanceof Error ? error.message : 'Billing reducer failed',
    );
    return { status: 500, body: { error: 'internal_error' } };
  }

  if (result.status === 'applied' && event.type === 'subscription_created') {
    await reportSubscriptionActivated(event);
  }

  logger.info(
    {
      ...logContext,
      action: 'billing.webhook.reduced',
      eventType: event.type,
      result: result.status,
    },
    'Billing webhook reduced',
  );

  return { status: 200, body: { result: result.status } };
}
