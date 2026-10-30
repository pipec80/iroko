'use client';

import { useQuery } from '@tanstack/react-query';
import { useIdentityQueryKey } from '@/components/providers/query-provider';

import { getOrgEntitlements } from '@/app/[locale]/dashboard/org/settings/actions-entitlements';

import type { Entitlements } from '@/lib/billing/entitlements';
/** Entitlements (plan/features/limits) de la cuenta activa, compartidos entre
 * los tabs de org/settings (3H-1.5). Misma queryKey en todos los usos: TanStack
 * Query dedupe la request sin necesitar un Provider (YAGNI). */
export function useOrgEntitlements() {
  const { scope, queryKey } = useIdentityQueryKey('entitlements');
  const result = useQuery({
    queryKey,
    enabled: !!scope,
    queryFn: async (): Promise<Entitlements> => {
      const result = await getOrgEntitlements();
      if (result.error || !result.data) throw new Error(result.error ?? 'fetch_failed');
      return result.data;
    },
  });
  return { ...result, data: scope ? result.data : undefined };
}
