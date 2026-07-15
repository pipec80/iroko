'use server';

import { getActiveAccountId } from '@/lib/active-account';
import { getEntitlements } from '@/lib/billing/entitlements';
import { withServerAction } from '@/lib/server-action';

import type { Entitlements } from '@/lib/billing/entitlements';

type ActionResult<T> = { data: T | null; error?: string };

/**
 * Entitlements (plan/features/limits) de la cuenta activa, para gatear la UI
 * de org/settings. La fuente de verdad sigue siendo el RPC — esto es solo
 * render: los límites reales se aplican en Postgres.
 */
export const getOrgEntitlements = withServerAction(async function getOrgEntitlements(): Promise<
  ActionResult<Entitlements>
> {
  const accountId = await getActiveAccountId();
  if (!accountId) return { data: null, error: 'no_active_account' };
  return { data: await getEntitlements(accountId) };
});
