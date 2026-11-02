import 'server-only';

import { env } from '@/env';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

import { getProviderPrice } from './catalog';
import { getPaymentProvider } from './registry';

export interface PublicPlan {
  slug: string;
  name: string;
  /** Already public in get_active_plans; render as text, never HTML. */
  description: string | null;
  interval: 'month' | 'year' | 'one_time';
  amount: number;
  currency: string;
  trialDays: number;
  features: Record<string, boolean>;
  limits: Record<string, number>;
}

export type PublicCatalogResult =
  | { status: 'available'; provider: string; plans: PublicPlan[]; checkoutAvailable: boolean }
  | { status: 'unavailable'; provider: string; plans: []; checkoutAvailable: false };

interface BillingCatalog {
  provider: string;
  plans: PublicPlan[];
  checkoutAvailable: boolean;
  error: boolean;
}

function publicRecord<T extends boolean | number>(
  value: unknown,
  kind: 'boolean' | 'number',
): Record<string, T> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      ([, entry]) => typeof entry === kind && (kind !== 'number' || Number.isFinite(entry)),
    ),
  ) as Record<string, T>;
}

/** Reads without persistent caching; account state remains independent of checkout availability. */
export async function readBillingCatalog(): Promise<BillingCatalog> {
  let provider: string = env.BILLING_DEFAULT_PROVIDER;
  let providerConfigured = false;
  try {
    provider = getPaymentProvider().name;
    providerConfigured = true;
  } catch {
    logger.warn(
      { action: 'billing.catalog.provider_unavailable' },
      'Checkout provider unavailable',
    );
  }
  const unavailable = { provider, plans: [], checkoutAvailable: false, error: true };
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('get_active_plans');
    if (error) return unavailable;
    const basePlans: PublicPlan[] = (data ?? []).map((plan) => ({
      slug: plan.slug,
      name: plan.name,
      description: plan.description,
      interval: plan.interval,
      amount: plan.price,
      currency: plan.currency,
      trialDays: plan.trial_days ?? 0,
      features: publicRecord<boolean>(plan.features, 'boolean'),
      limits: publicRecord<number>(plan.limits, 'number'),
    }));
    if (provider !== 'mercadopago') {
      return {
        provider,
        plans: basePlans,
        checkoutAvailable: providerConfigured && basePlans.length > 0,
        error: false,
      };
    }
    const monthlyPlans = basePlans.filter((plan) => plan.interval === 'month');
    const resolved = await Promise.all(
      monthlyPlans.map(async (plan): Promise<PublicPlan | null> => {
        try {
          const price = await getProviderPrice({
            planSlug: plan.slug,
            interval: 'month',
            provider: 'mercadopago',
            currency: 'CLP',
          });
          if (price.currency !== 'CLP' || !Number.isSafeInteger(price.amount) || price.amount < 0)
            return null;
          return { ...plan, amount: price.amount, currency: price.currency, trialDays: 0 };
        } catch {
          return null;
        }
      }),
    );
    const complete = monthlyPlans.length > 0 && resolved.every((plan) => plan !== null);
    if (!complete)
      logger.warn({ action: 'billing.catalog.incomplete' }, 'Mercado Pago catalog incomplete');
    return {
      provider,
      plans: resolved.filter((plan): plan is PublicPlan => plan !== null),
      checkoutAvailable: providerConfigured && complete,
      error: false,
    };
  } catch {
    logger.warn({ action: 'billing.catalog.read_failed' }, 'Billing catalog read failed');
    return unavailable;
  }
}

/** Projects an explicit allowlist; never sends provider identifiers or account data to public pages. */
export async function getPublicCatalog(): Promise<PublicCatalogResult> {
  const catalog = await readBillingCatalog();
  if (catalog.error || !catalog.checkoutAvailable) {
    return {
      status: 'unavailable',
      provider: catalog.provider,
      plans: [],
      checkoutAvailable: false,
    };
  }
  return {
    status: 'available',
    provider: catalog.provider,
    plans: catalog.plans,
    checkoutAvailable: true,
  };
}
