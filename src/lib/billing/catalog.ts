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

interface ProviderPriceRecord {
  id: string;
  plan_id: string;
  plan_slug: string;
  interval: PlanInterval;
  provider: ProviderName;
  external_price_id: string | null;
  amount: number;
  currency: string;
}

function toProviderPrice(record: ProviderPriceRecord): ProviderPrice {
  return {
    id: record.id,
    planId: record.plan_id,
    planSlug: record.plan_slug,
    interval: record.interval,
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
  const result = await admin.rpc('get_billing_provider_price', {
    p_plan_slug: input.planSlug,
    p_interval: input.interval,
    p_provider: input.provider,
    p_currency: input.currency,
  });
  const { data, error } = result as {
    data: ProviderPriceRecord[] | null;
    error: { message: string } | null;
  };

  const providerPrice = data?.[0];
  if (error || !providerPrice) throw new Error('plan_provider_price_not_configured');
  return toProviderPrice(providerPrice);
}

/** Resolves a provider webhook price identifier back to the Iroko plan. */
export async function resolvePlanByExternalPrice(input: {
  provider: ProviderName;
  externalPriceId: string;
}): Promise<{ planId: string; planSlug: string; interval: PlanInterval }> {
  const admin = createAdminClient();
  const result = await admin.rpc('resolve_billing_plan_by_external_price', {
    p_provider: input.provider,
    p_external_price_id: input.externalPriceId,
  });
  const { data, error } = result as {
    data: Array<Pick<ProviderPriceRecord, 'plan_id' | 'plan_slug' | 'interval'>> | null;
    error: { message: string } | null;
  };

  const plan = data?.[0];
  if (error || !plan) throw new Error('provider_price_mapping_not_found');
  return {
    planId: plan.plan_id,
    planSlug: plan.plan_slug,
    interval: plan.interval,
  };
}
