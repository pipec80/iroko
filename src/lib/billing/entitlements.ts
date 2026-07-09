import { createClient } from '@/lib/supabase/server';

export interface Entitlements {
  planSlug: string;
  features: Record<string, boolean>;
  limits: Record<string, number>;
}

/** Lee el plan efectivo de la cuenta (con fallback a Free en la DB). */
export async function getEntitlements(accountId: string): Promise<Entitlements> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_account_entitlements', {
    p_account_id: accountId,
  });
  const row = data?.[0];
  if (error || !row) {
    return { planSlug: 'free', features: {}, limits: {} };
  }
  return {
    planSlug: row.plan_slug,
    features: (row.features ?? {}) as Record<string, boolean>,
    limits: (row.limits ?? {}) as Record<string, number>,
  };
}

/** True si el plan de la cuenta habilita la feature booleana. */
export async function hasFeature(accountId: string, key: string): Promise<boolean> {
  const { features } = await getEntitlements(accountId);
  return features[key] === true;
}

/** Límite numérico de la cuenta para `key`, o null si es ilimitado/ausente. */
export async function getLimit(accountId: string, key: string): Promise<number | null> {
  const { limits } = await getEntitlements(accountId);
  return typeof limits[key] === 'number' ? limits[key] : null;
}

/** True si `current` está por debajo del límite (límite ausente = ilimitado). */
export async function withinLimit(
  accountId: string,
  key: string,
  current: number,
): Promise<boolean> {
  const limit = await getLimit(accountId, key);
  return limit === null || current < limit;
}
