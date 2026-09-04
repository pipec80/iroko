'use server';

import { z } from 'zod';

import { getActiveAccountId } from '@/lib/active-account';
import { captureServer } from '@/lib/analytics/server';
import { getProviderPrice } from '@/lib/billing/catalog';
import { getPaymentProvider } from '@/lib/billing/registry';
import { cancelBillingSubscription, startBillingCheckout } from '@/lib/billing/service';
import { signMockPayload, verifyMockPayload } from '@/lib/billing/signing';
import type { NormalizedBillingEvent } from '@/lib/billing/events';
import { handleProviderWebhook } from '@/lib/billing/webhook-handler';
import { logger } from '@/lib/logger';
import { withServerAction } from '@/lib/server-action';
import { createClient } from '@/lib/supabase/server';
import { env } from '@/env';
import type { ProviderCapabilities } from '@/lib/billing/capabilities';

type ActionResult<T> = { data: T | null; error?: string };

export interface PlanRow {
  slug: string;
  name: string;
  description: string | null;
  interval: 'month' | 'year' | 'one_time';
  price: number;
  currency: string;
  trialDays: number;
  features: Record<string, boolean>;
  limits: Record<string, number>;
}

export interface BillingOverview {
  planSlug: string;
  planName: string;
  planInterval: 'month' | 'year' | 'one_time';
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  trialEnd: string | null;
  provider: string;
  externalSubscriptionId: string | null;
  capabilities: ProviderCapabilities;
}

const NO_PROVIDER_CAPABILITIES: ProviderCapabilities = {
  customerPortal: false,
  cancelImmediately: false,
  cancelAtPeriodEnd: false,
  updatePaymentMethod: false,
  changePlan: false,
  pauseSubscription: false,
};

function getProviderCapabilities(providerName: string): ProviderCapabilities {
  try {
    return getPaymentProvider(providerName).capabilities ?? NO_PROVIDER_CAPABILITIES;
  } catch {
    return NO_PROVIDER_CAPABILITIES;
  }
}

export interface Invoice {
  id: string;
  number: string | null;
  status: string;
  currency: string;
  total: number;
  amountPaid: number;
  hostedUrl: string | null;
  pdfUrl: string | null;
  createdAt: string;
}

export interface InvoicesPage {
  entries: Invoice[];
  nextCursor: { createdAt: string; id: string } | null;
}

const invoicesQuerySchema = z.object({
  limit: z.number().int().min(1).max(100).default(10),
  cursor: z.object({ createdAt: z.string(), id: z.uuid() }).optional(),
});

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

  if (getPaymentProvider().name === 'mercadopago' && parsed.data.interval !== 'month') {
    return { data: null, error: 'validation_error' };
  }

  const accountId = await getActiveAccountId();
  if (!accountId) return { data: null, error: 'no_account' };

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;
  const customerEmail = claimsData?.claims.email;
  if (typeof customerEmail !== 'string' || customerEmail.length === 0) {
    return { data: null, error: 'not_authenticated' };
  }

  let url: string;
  try {
    ({ url } = await startBillingCheckout({
      accountId,
      customerEmail,
      planSlug: parsed.data.planSlug,
      interval: parsed.data.interval,
      successUrl: `${env.SITE_URL}/es/dashboard/billing?status=success`,
      cancelUrl: `${env.SITE_URL}/es/dashboard/billing?status=cancelled`,
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'checkout_failed';
    if (message === 'not_authorized' || message === 'active_paid_subscription_exists') {
      return { data: null, error: message };
    }
    logger.error({ action: 'billing.checkout', accountId }, message);
    return { data: null, error: 'checkout_failed' };
  }

  if (userId) {
    await captureServer({
      event: 'checkout_started',
      properties: { plan_slug: parsed.data.planSlug, interval: parsed.data.interval },
      distinctId: userId,
      accountId,
    });
  }

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
  const event: NormalizedBillingEvent = {
    provider: 'mock',
    externalEventId: `mock_evt_${token.accountId}_${now.getTime()}`,
    type: 'subscription_created',
    accountId: token.accountId,
    externalPriceId: `mock:${token.planSlug}:${token.interval}`,
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

/** Cancela inmediatamente o al cierre del período, según la capacidad del proveedor. */
export const cancelSubscription = withServerAction(async function cancelSubscription(
  input: { timing?: 'immediate' | 'period_end' } = {},
): Promise<ActionResult<true>> {
  const timing = input.timing ?? 'period_end';
  const accountId = await getActiveAccountId();
  if (!accountId) return { data: null, error: 'no_account' };

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;

  const { data: overview, error } = await supabase.rpc('get_billing_overview', {
    p_account_id: accountId,
  });
  if (error) return { data: null, error: error.message ?? 'fetch_failed' };
  const current = overview?.[0];
  if (!current) return { data: null, error: 'no_subscription' };

  if (current.provider !== 'mock') {
    if (!current.external_subscription_id) return { data: null, error: 'no_subscription' };
    try {
      await cancelBillingSubscription({ accountId, timing });
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'cancel_failed';
      if (message === 'billing_subscription_not_found') {
        return { data: null, error: 'no_subscription' };
      }
      if (message.startsWith('billing_capability_not_supported:')) {
        return { data: null, error: 'cancel_not_supported' };
      }
      logger.error({ action: 'billing.cancel', accountId }, message);
      return { data: null, error: 'cancel_failed' };
    }
    if (userId) {
      await captureServer({
        event: 'subscription_cancel_requested',
        properties: {},
        distinctId: userId,
        accountId,
      });
    }
    return { data: true };
  }

  const now = new Date();
  const event: NormalizedBillingEvent =
    timing === 'immediate' ?
      {
        provider: 'mock',
        externalEventId: `mock_cancel_${accountId}_${now.getTime()}`,
        type: 'subscription_canceled',
        accountId,
        externalSubscriptionId: current.external_subscription_id ?? `mock_sub_${accountId}`,
        canceledAt: now.toISOString(),
        raw: { interval: current.plan_interval },
      }
    : {
        provider: 'mock',
        externalEventId: `mock_cancel_${accountId}_${now.getTime()}`,
        type: 'subscription_updated',
        accountId,
        status: current.status,
        externalSubscriptionId: current.external_subscription_id ?? `mock_sub_${accountId}`,
        cancelAtPeriodEnd: true,
        raw: { interval: current.plan_interval },
      };
  const signed = await signMockPayload(event);
  const res = await handleProviderWebhook('mock', signed, 'mock');
  if (res.status >= 400) return { data: null, error: 'cancel_failed' };
  if (userId) {
    await captureServer({
      event: 'subscription_cancel_requested',
      properties: {},
      distinctId: userId,
      accountId,
    });
  }
  return { data: true };
});

/** Planes activos + suscripción vigente (overview null si no es owner/admin). */
export const getBillingData = withServerAction(async function getBillingData(): Promise<
  ActionResult<{
    plans: PlanRow[];
    overview: BillingOverview | null;
    checkoutAvailable: boolean;
  }>
> {
  const accountId = await getActiveAccountId();
  if (!accountId) return { data: null, error: 'no_account' };
  const supabase = await createClient();
  const [{ data: plans }, { data: overview }] = await Promise.all([
    supabase.rpc('get_active_plans'),
    supabase.rpc('get_billing_overview', { p_account_id: accountId }),
  ]);
  const basePlans: PlanRow[] = (plans ?? []).map((p) => ({
    slug: p.slug,
    name: p.name,
    description: p.description,
    interval: p.interval,
    price: p.price,
    currency: p.currency,
    trialDays: p.trial_days ?? 0,
    features: (p.features ?? {}) as Record<string, boolean>,
    limits: (p.limits ?? {}) as Record<string, number>,
  }));
  let paymentProvider: ReturnType<typeof getPaymentProvider> | null = null;
  try {
    paymentProvider = getPaymentProvider();
  } catch {
    // A missing checkout configuration must not hide the account's catalog or
    // billing state. The client uses this flag to disable checkout explicitly.
  }
  const shouldUseMercadoPagoCatalog =
    paymentProvider?.name === 'mercadopago' || env.BILLING_DEFAULT_PROVIDER === 'mercadopago';
  const mappedPlans: PlanRow[] =
    shouldUseMercadoPagoCatalog ?
      (
        await Promise.all(
          basePlans
            .filter((plan) => plan.interval === 'month')
            .map(async (plan) => {
              try {
                const providerPrice = await getProviderPrice({
                  planSlug: plan.slug,
                  interval: 'month',
                  provider: 'mercadopago',
                  currency: 'CLP',
                });
                return {
                  ...plan,
                  price: providerPrice.amount,
                  currency: providerPrice.currency,
                };
              } catch {
                return null;
              }
            }),
        )
      ).filter((plan): plan is PlanRow => plan !== null)
    : basePlans;
  const o = overview?.[0];
  const mappedOverview: BillingOverview | null =
    o ?
      {
        planSlug: o.plan_slug,
        planName: o.plan_name,
        planInterval: o.plan_interval,
        status: o.status,
        currentPeriodEnd: o.current_period_end,
        cancelAtPeriodEnd: o.cancel_at_period_end,
        trialEnd: o.trial_end,
        provider: o.provider,
        externalSubscriptionId: o.external_subscription_id,
        capabilities: getProviderCapabilities(o.provider),
      }
    : null;
  return {
    data: {
      plans: mappedPlans,
      overview: mappedOverview,
      checkoutAvailable: paymentProvider !== null,
    },
  };
});

/** Historial de facturas paginado por keyset (null si no es owner/admin). */
export const listInvoices = withServerAction(async function listInvoices(input: {
  limit?: number;
  cursor?: { createdAt: string; id: string };
}): Promise<ActionResult<InvoicesPage>> {
  const parsed = invoicesQuerySchema.safeParse(input);
  if (!parsed.success) return { data: null, error: 'validation_error' };

  const accountId = await getActiveAccountId();
  if (!accountId) return { data: null, error: 'no_account' };

  const { limit, cursor } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('list_account_invoices', {
    p_account_id: accountId,
    p_limit: limit,
    p_cursor_created_at: cursor?.createdAt ?? undefined,
    p_cursor_id: cursor?.id ?? undefined,
  });
  if (error) return { data: null, error: error.message ?? 'fetch_failed' };

  const entries: Invoice[] = (data ?? []).map((row) => ({
    id: row.id,
    number: row.number,
    status: row.status,
    currency: row.currency,
    total: row.total,
    amountPaid: row.amount_paid,
    hostedUrl: row.hosted_url,
    pdfUrl: row.pdf_url,
    createdAt: row.created_at,
  }));
  const last = entries.at(-1);
  const nextCursor =
    entries.length === limit && last ? { createdAt: last.createdAt, id: last.id } : null;

  return { data: { entries, nextCursor } };
});
