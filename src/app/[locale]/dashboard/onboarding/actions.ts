'use server';

import { getLocale } from 'next-intl/server';
import { z } from 'zod';

import { redirect } from '@/i18n/routing';
import { getActiveAccountId } from '@/lib/active-account';
import { logger } from '@/lib/logger';
import { withServerAction } from '@/lib/server-action';
import { createClient } from '@/lib/supabase/server';

const orgNameSchema = z.object({ name: z.string().trim().min(2).max(100) });

/** Nombre de la cuenta activa, para prellenar el paso 1 del wizard. */
export const getOnboardingOrg = withServerAction(async function getOnboardingOrg(): Promise<{
  name: string | null;
}> {
  const accountId = await getActiveAccountId();
  if (accountId == null) return { name: null };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_my_accounts');
  if (error || data == null) return { name: null };

  const account = data.find((a) => a.account_id === accountId);
  return { name: account?.name ?? null };
});

export const confirmOrgName = withServerAction(async function confirmOrgName(
  name: string,
): Promise<{ error?: string; success?: boolean }> {
  const parsed = orgNameSchema.safeParse({ name });
  if (!parsed.success) return { error: 'invalid_name' };

  const accountId = await getActiveAccountId();
  if (accountId == null) return { error: 'no_active_account' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('accounts')
    .update({ name: parsed.data.name })
    .eq('id', accountId);

  if (error) {
    logger.error(
      { action: 'onboarding.confirm_org_name', code: error.code },
      'confirmOrgName failed',
    );
    return { error: error.message ?? 'update_failed' };
  }

  return { success: true };
});

export const completeOnboarding = withServerAction(async function completeOnboarding(): Promise<{
  error?: string;
}> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('complete_onboarding');
  if (error) {
    logger.error({ action: 'onboarding.complete', code: error.code }, 'complete_onboarding failed');
    return { error: error.message ?? 'complete_failed' };
  }

  // Crítico: reemite el JWT con onboarding_completed=true; sin esto el edge gate
  // sigue viendo el claim viejo (false) y rebota al usuario al wizard.
  await supabase.auth.refreshSession();

  const locale = await getLocale();
  redirect({ href: '/dashboard', locale });
  return {};
});
