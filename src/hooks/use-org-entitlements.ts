'use client';

import { useQuery } from '@tanstack/react-query';

import { getOrgEntitlements } from '@/app/[locale]/dashboard/org/settings/actions-entitlements';

import type { Entitlements } from '@/lib/billing/entitlements';

export const ORG_ENTITLEMENTS_KEY = ['org-settings', 'entitlements'];

/** Entitlements (plan/features/limits) de la cuenta activa, compartidos entre
 * los tabs de org/settings (3H-1.5). Misma queryKey en todos los usos: TanStack
 * Query dedupe la request sin necesitar un Provider (YAGNI). */
export function useOrgEntitlements() {
  return useQuery({
    queryKey: ORG_ENTITLEMENTS_KEY,
    queryFn: async (): Promise<Entitlements> => {
      const result = await getOrgEntitlements();
      if (result.error || !result.data) throw new Error(result.error ?? 'fetch_failed');
      return result.data;
    },
  });
}
