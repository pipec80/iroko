'use server';

import { getLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { logger } from '@/lib/logger';
import { withServerAction } from '@/lib/server-action';
import { createClient } from '@/lib/supabase/server';

const switchAccountSchema = z.object({ accountId: z.string().uuid('invalid_account_id') });

export const switchAccount = withServerAction(async function switchAccount(
  formData: FormData,
): Promise<{ error?: string }> {
  const raw = { accountId: formData.get('accountId') as string };
  const parsed = switchAccountSchema.safeParse(raw);
  if (!parsed.success) return { error: 'invalid_account_id' };

  const supabase = await createClient();
  const { error } = await supabase.rpc('switch_account', {
    p_account_id: parsed.data.accountId,
  });

  if (error) {
    logger.warn({ action: 'account.switch', code: error.code }, 'switch_account failed');
    const knownError = error.message?.includes('not_a_member') ? 'not_a_member' : 'switch_failed';
    return { error: knownError };
  }

  await supabase.auth.refreshSession();
  const locale = await getLocale();
  redirect(`/${locale}/dashboard`);
});

const createTeamSchema = z.object({
  name: z.string().trim().min(1, 'name_required').max(100, 'name_too_long'),
});

export const createTeam = withServerAction(async function createTeam(
  formData: FormData,
): Promise<{ error?: string }> {
  const raw = { name: formData.get('name') as string };
  const parsed = createTeamSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'validation_error' };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc('create_team', { p_name: parsed.data.name });

  if (error) {
    logger.warn({ action: 'account.create_team', code: error.code }, 'create_team failed');
    const knownError =
      error.message?.includes('team_limit_reached') ? 'team_limit_reached' : 'create_failed';
    return { error: knownError };
  }

  await supabase.auth.refreshSession();
  const locale = await getLocale();
  redirect(`/${locale}/dashboard`);
});
