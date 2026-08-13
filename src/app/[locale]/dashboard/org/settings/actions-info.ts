'use server';

import { revalidatePath } from 'next/cache';

import { getActiveAccountId } from '@/lib/active-account';
import { logger } from '@/lib/logger';
import { withServerAction } from '@/lib/server-action';
import { createClient } from '@/lib/supabase/server';
import { updateOrgInfoSchema } from '@/lib/validation/org';

export type OrgInfoActionState = { error?: string; success?: string };
type ActionResult<T> = { data: T | null; error?: string };

export interface OrgInfo {
  name: string;
  slug: string;
  website: string;
  country: string;
}

/** Info actual de la cuenta activa, para precargar el form en org/settings. */
export const getOrgInfo = withServerAction(async function getOrgInfo(): Promise<
  ActionResult<OrgInfo>
> {
  const accountId = await getActiveAccountId();
  if (!accountId) return { data: null, error: 'no_active_account' };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_my_accounts');
  if (error) return { data: null, error: 'fetch_failed' };

  const account = data?.find((a) => a.account_id === accountId);
  if (!account) return { data: null, error: 'not_found' };

  return {
    data: {
      name: account.name,
      slug: account.slug,
      website: account.website ?? '',
      country: account.country ?? '',
    },
  };
});

const ERROR_MAP: Record<string, string> = {
  invalid_name: 'invalid_name',
  invalid_slug: 'slug_invalid_format',
  slug_taken: 'slug_taken',
};

export const updateOrgInfo = withServerAction(async function updateOrgInfo(
  _prev: OrgInfoActionState,
  formData: FormData,
): Promise<OrgInfoActionState> {
  const raw = {
    name: formData.get('name') as string,
    slug: formData.get('slug') as string,
    website: formData.get('website') as string,
    country: formData.get('country') as string,
  };
  const parsed = updateOrgInfoSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'validation_error' };
  }

  const accountId = await getActiveAccountId();
  if (!accountId) return { error: 'no_active_account' };

  const supabase = await createClient();
  const { error } = await supabase.rpc('update_account_info', {
    p_account_id: accountId,
    p_name: parsed.data.name,
    p_slug: parsed.data.slug,
    p_website: parsed.data.website,
    p_country: parsed.data.country,
  });

  if (error) {
    logger.warn({ action: 'org.update_info', accountId, code: error.code }, 'update_info failed');
    const knownError = Object.keys(ERROR_MAP).find((code) => error.message?.includes(code));
    return { error: knownError ? ERROR_MAP[knownError] : 'update_failed' };
  }

  revalidatePath('/[locale]/dashboard/org/settings', 'page');
  return { success: 'info_updated' };
});
