'use server';

import { revalidatePath } from 'next/cache';

import { getActiveAccountId } from '@/lib/active-account';
import { withServerAction } from '@/lib/server-action';
import { createClient } from '@/lib/supabase/server';
import { validateOrgLogoFile } from '@/lib/validation/profile';

export type OrgLogoActionState = { error?: string; success?: string };
type ActionResult<T> = { data: T | null; error?: string };

/** Logo actual de la cuenta activa, para precargar el preview en org/settings. */
export const getOrgLogo = withServerAction(async function getOrgLogo(): Promise<
  ActionResult<{ logoUrl: string | null }>
> {
  const accountId = await getActiveAccountId();
  if (!accountId) return { data: null, error: 'no_active_account' };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_my_accounts');
  if (error) return { data: null, error: 'fetch_failed' };

  const account = data?.find(
    (a: { account_id: string; logo_url: string | null }) => a.account_id === accountId,
  );
  return { data: { logoUrl: account?.logo_url ?? null } };
});

export const updateOrgLogo = withServerAction(async function updateOrgLogo(
  _prev: OrgLogoActionState,
  formData: FormData,
): Promise<OrgLogoActionState> {
  const file = formData.get('logo');
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'no_file' };
  }

  const clientCheck = validateOrgLogoFile(file);
  if (!clientCheck.ok) return { error: clientCheck.error };

  const accountId = await getActiveAccountId();
  if (!accountId) return { error: 'no_active_account' };

  const supabase = await createClient();
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png';
  const storagePath = `${accountId}/logo.${ext}`;
  const dbPath = `org-assets/${storagePath}`;

  const { error: uploadError } = await supabase.storage
    .from('org-assets')
    .upload(storagePath, file, { cacheControl: '3600', upsert: true, contentType: file.type });
  if (uploadError) return { error: 'upload_failed' };

  const { error: rpcError } = await supabase.rpc('set_account_logo', {
    p_account_id: accountId,
    p_path: dbPath,
  });
  if (rpcError) return { error: rpcError.code ?? 'update_logo_failed' };

  revalidatePath('/[locale]/dashboard/org/settings', 'page');
  return { success: 'logo_updated' };
});

export const removeOrgLogo = withServerAction(
  async function removeOrgLogo(): Promise<OrgLogoActionState> {
    const accountId = await getActiveAccountId();
    if (!accountId) return { error: 'no_active_account' };

    const supabase = await createClient();
    const { error: rpcError } = await supabase.rpc('set_account_logo', {
      p_account_id: accountId,
    });
    if (rpcError) return { error: rpcError.code ?? 'update_logo_failed' };

    revalidatePath('/[locale]/dashboard/org/settings', 'page');
    return { success: 'logo_removed' };
  },
);
