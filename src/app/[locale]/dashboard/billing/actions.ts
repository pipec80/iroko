'use server';

import { z } from 'zod';

import { getActiveAccountId } from '@/lib/active-account';
import { getPaymentProvider } from '@/lib/billing/registry';
import { signMockPayload, verifyMockPayload } from '@/lib/billing/signing';
import type { NormalizedEvent } from '@/lib/billing/types';
import { handleProviderWebhook } from '@/lib/billing/webhook-handler';
import { logger } from '@/lib/logger';
import { withServerAction } from '@/lib/server-action';
import { createClient } from '@/lib/supabase/server';
import { env } from '@/env';

type ActionResult<T> = { data: T | null; error?: string };

const checkoutSchema = z.object({
  planSlug: z.enum(['pro', 'scale']),
  interval: z.enum(['month', 'year']),
});

interface MockCheckoutToken {
  accountId: string;
  planSlug: string;
  interval: 'month' | 'year';
  successUrl: string;
  cancelUrl: string;
}

/** Inicia el checkout del plan elegido; devuelve la URL a la que redirigir. */
export const startCheckout = withServerAction(async function startCheckout(input: {
  planSlug: string;
  interval: string;
}): Promise<ActionResult<{ url: string }>> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: 'validation_error' };

  const accountId = await getActiveAccountId();
  if (!accountId) return { data: null, error: 'no_account' };

  const provider = getPaymentProvider();
  const { url } = await provider.createCheckout({
    accountId,
    planSlug: parsed.data.planSlug,
    interval: parsed.data.interval,
    successUrl: `${env.SITE_URL}/es/dashboard/billing?status=success`,
    cancelUrl: `${env.SITE_URL}/es/dashboard/billing?status=cancelled`,
  });
  return { data: { url } };
});

/** Confirma el pago simulado: firma el evento y lo entrega al webhook real. */
export const confirmMockCheckout = withServerAction(async function confirmMockCheckout(input: {
  data: string;
}): Promise<ActionResult<{ redirectUrl: string }>> {
  const token = await verifyMockPayload<MockCheckoutToken>(input.data);
  if (!token) return { data: null, error: 'invalid_token' };

  const now = new Date();
  const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const event: NormalizedEvent = {
    externalEventId: `mock_evt_${token.accountId}_${now.getTime()}`,
    type: 'subscription_created',
    accountId: token.accountId,
    planSlug: token.planSlug,
    status: 'active',
    externalSubscriptionId: `mock_sub_${token.accountId}`,
    currentPeriodStart: now.toISOString(),
    currentPeriodEnd: periodEnd.toISOString(),
    cancelAtPeriodEnd: false,
    raw: { interval: token.interval },
  };

  const signed = await signMockPayload(event);
  const res = await handleProviderWebhook('mock', signed, 'mock');
  if (res.status >= 400) {
    logger.warn({ action: 'billing.mock_confirm', status: res.status }, 'mock webhook failed');
    return { data: null, error: 'checkout_failed' };
  }
  return { data: { redirectUrl: token.successUrl } };
});

/** Cancela la suscripción al final del período (materializada vía webhook). */
export const cancelSubscription = withServerAction(async function cancelSubscription(): Promise<
  ActionResult<true>
> {
  const accountId = await getActiveAccountId();
  if (!accountId) return { data: null, error: 'no_account' };

  const supabase = await createClient();
  const { data: overview, error } = await supabase.rpc('get_billing_overview', {
    p_account_id: accountId,
  });
  if (error) return { data: null, error: error.message ?? 'fetch_failed' };
  const current = overview?.[0];
  if (!current) return { data: null, error: 'no_subscription' };

  const now = new Date();
  const event: NormalizedEvent = {
    externalEventId: `mock_cancel_${accountId}_${now.getTime()}`,
    type: 'subscription_updated',
    accountId,
    planSlug: current.plan_slug,
    status: current.status,
    externalSubscriptionId: `mock_sub_${accountId}`,
    cancelAtPeriodEnd: true,
    raw: { interval: current.plan_interval },
  };
  const signed = await signMockPayload(event);
  const res = await handleProviderWebhook('mock', signed, 'mock');
  if (res.status >= 400) return { data: null, error: 'cancel_failed' };
  return { data: true };
});
