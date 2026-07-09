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

/** Planes activos + suscripción vigente (overview null si no es owner/admin). */
export const getBillingData = withServerAction(async function getBillingData(): Promise<
  ActionResult<{ plans: PlanRow[]; overview: BillingOverview | null }>
> {
  const accountId = await getActiveAccountId();
  if (!accountId) return { data: null, error: 'no_account' };
  const supabase = await createClient();
  const [{ data: plans }, { data: overview }] = await Promise.all([
    supabase.rpc('get_active_plans'),
    supabase.rpc('get_billing_overview', { p_account_id: accountId }),
  ]);
  const mappedPlans: PlanRow[] = (plans ?? []).map((p) => ({
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
      }
    : null;
  return { data: { plans: mappedPlans, overview: mappedOverview } };
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
