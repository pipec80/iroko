import { createAdminClient } from '@/lib/supabase/admin';

import type { PlanInterval, ProviderName } from './types';

export interface ProviderPrice {
  id: string;
  planId: string;
  planSlug: string;
  interval: PlanInterval;
  provider: ProviderName;
  externalPriceId: string | null;
  amount: number;
  currency: string;
}

interface PlanReference {
  slug: string;
  interval: PlanInterval;
}

interface ProviderPriceRecord {
  id: string;
  plan_id: string;
  provider: ProviderName;
  external_price_id: string | null;
  amount: number;
  currency: string;
  plan: PlanReference | null;
}

function toProviderPrice(record: ProviderPriceRecord): ProviderPrice {
  if (!record.plan) throw new Error('provider_price_plan_not_found');

  return {
    id: record.id,
    planId: record.plan_id,
    planSlug: record.plan.slug,
    interval: record.plan.interval,
    provider: record.provider,
    externalPriceId: record.external_price_id,
    amount: record.amount,
    currency: record.currency,
  };
}

/** Resolves the active provider price used to initiate a checkout. */
export async function getProviderPrice(input: {
  planSlug: string;
  interval: PlanInterval;
  provider: ProviderName;
  currency: string;
}): Promise<ProviderPrice> {
  const admin = createAdminClient();
  const result = await admin
    .schema('billing')
    .from('provider_prices')
    .select(
      'id, plan_id, provider, external_price_id, amount, currency, plan:plans!inner(slug, interval)',
    )
    .eq('provider', input.provider)
    .eq('currency', input.currency)
    .eq('is_active', true)
    .eq('plan.slug', input.planSlug)
    .eq('plan.interval', input.interval)
    .maybeSingle();
  const { data, error } = result as {
    data: ProviderPriceRecord | null;
    error: { message: string } | null;
  };

  if (error || !data) throw new Error('plan_provider_price_not_configured');
  return toProviderPrice(data);
}

/** Resolves a provider webhook price identifier back to the Iroko plan. */
export async function resolvePlanByExternalPrice(input: {
  provider: ProviderName;
  externalPriceId: string;
}): Promise<{ planId: string; planSlug: string; interval: PlanInterval }> {
  const admin = createAdminClient();
  const result = await admin
    .schema('billing')
    .from('provider_prices')
    .select('plan_id, plan:plans!inner(slug, interval)')
    .eq('provider', input.provider)
    .eq('external_price_id', input.externalPriceId)
    .maybeSingle();
  const { data, error } = result as {
    data: Pick<ProviderPriceRecord, 'plan_id' | 'plan'> | null;
    error: { message: string } | null;
  };

  if (error || !data?.plan) throw new Error('provider_price_mapping_not_found');
  return {
    planId: data.plan_id,
    planSlug: data.plan.slug,
    interval: data.plan.interval,
  };
}
