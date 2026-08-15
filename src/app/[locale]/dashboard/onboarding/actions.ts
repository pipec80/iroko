'use server';

import { getLocale } from 'next-intl/server';
import { z } from 'zod';

import { redirect } from '@/i18n/routing';
import { getActiveAccountId } from '@/lib/active-account';
import { captureServer } from '@/lib/analytics/server';
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

  // Solo se prellena si ya existe un team (wizard reentrado). Con la cuenta
  // personal activa el campo va vacío: su nombre es el del usuario, no el de
  // una organización, y ofrecerlo como sugerencia confunde.
  const account = data.find((a) => a.account_id === accountId);
  return { name: account?.type === 'team' ? account.name : null };
});

export const confirmOrgName = withServerAction(async function confirmOrgName(
  name: string,
): Promise<{ error?: string; success?: boolean }> {
  const parsed = orgNameSchema.safeParse({ name });
  if (!parsed.success) return { error: 'invalid_name' };

  const accountId = await getActiveAccountId();
  if (accountId == null) return { error: 'no_active_account' };

  const supabase = await createClient();
  const { data: accounts } = await supabase.rpc('get_my_accounts');
  const activeAccount = accounts?.find((account) => account.account_id === accountId);

  // El onboarding crea una organización de verdad en vez de renombrar la cuenta
  // personal: Personal es 1:1 con su usuario y ya no admite colaboradores
  // (invite_members exige type='team'), así que renombrarla dejaba al usuario
  // en una cuenta donde el paso siguiente —invitar— iba a fallar.
  //
  // Si ya hay un team activo, se renombra: el wizard es reentrable (recargar o
  // volver atrás) y con teams_max=1 en el plan free un segundo create_team
  // fallaría con team_limit_reached.
  const isRename = activeAccount?.type === 'team';

  const { error } =
    isRename ?
      // authenticated no tiene GRANT UPDATE directo sobre accounts (grants
      // hardening) — pasa por RPC SECURITY DEFINER, igual que set_account_logo.
      await supabase.rpc('rename_account', {
        p_account_id: accountId,
        p_name: parsed.data.name,
      })
    : await supabase.rpc('create_team', { p_name: parsed.data.name });

  if (error) {
    logger.error(
      { action: 'onboarding.confirm_org_name', code: error.code, isRename },
      'confirmOrgName failed',
    );
    return { error: error.message ?? 'update_failed' };
  }

  // create_team deja el team nuevo como cuenta activa en profiles, pero el JWT
  // todavía trae la personal: sin refrescar, el paso de invitar del wizard
  // seguiría apuntando a la cuenta anterior y sería rechazado con not_a_team.
  if (!isRename) {
    const { error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) {
      logger.warn(
        { action: 'onboarding.confirm_org_name.refresh', code: refreshError.code },
        refreshError.message,
      );
    }
  }

  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;
  if (userId) {
    await captureServer({
      event: 'onboarding_step_completed',
      properties: { step: 'org_name' },
      distinctId: userId,
      accountId,
    });
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

  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;
  const accountId = claimsData?.claims.app_metadata?.account_id as string | undefined;
  if (userId) {
    await captureServer({
      event: 'onboarding_completed',
      properties: {},
      distinctId: userId,
      accountId,
    });
  }

  // Crítico: reemite el JWT con onboarding_completed=true; sin esto el edge gate
  // sigue viendo el claim viejo (false) y rebota al usuario al wizard.
  await supabase.auth.refreshSession();

  const locale = await getLocale();
  redirect({ href: '/dashboard', locale });
  return {};
});
