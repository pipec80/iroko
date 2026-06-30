'use server';

import { getLocale } from 'next-intl/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { routing } from '@/i18n/routing-config';

import { env } from '@/env';
import { redirect } from '@/i18n/routing';
import { logger } from '@/lib/logger';
import { withServerAction } from '@/lib/server-action';
import { createClient } from '@/lib/supabase/server';
import {
  deleteAccountSchema,
  updateEmailSchema,
  updatePasswordFromSettingsSchema,
  updateProfileSchema,
  validateAvatarFile,
} from '@/lib/validation/profile';

export type SettingsActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: string;
  codes?: string[];
};

function flattenFieldErrors(
  errors: Record<string, string[] | undefined>,
): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(errors)) {
    if (value && value.length > 0) result[key] = value;
  }
  return result;
}

async function requireUserId() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) return { supabase, userId: null as null };
  return { supabase, userId };
}

export const updateProfileAction = withServerAction(async function updateProfileAction(
  _prev: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const parsed = updateProfileSchema.safeParse({
    given_name: formData.get('given_name'),
    family_name: formData.get('family_name'),
    locale: formData.get('locale'),
    timezone: formData.get('timezone'),
    phone_number: formData.get('phone_number') || null,
    // Pass empty string explicitly so the RPC can clear the field (NULLIF logic).
    birth_date: (formData.get('birth_date') as string) ?? '',
    bio: (formData.get('bio') as string) ?? '',
    website_url: (formData.get('website_url') as string) ?? '',
    company: (formData.get('company') as string) ?? '',
  });

  if (!parsed.success) {
    return { fieldErrors: flattenFieldErrors(parsed.error.flatten().fieldErrors) };
  }

  const { supabase, userId } = await requireUserId();
  if (!userId) return { error: 'not_authenticated' };

  const { error } = await supabase.rpc('update_my_profile', {
    p_given_name: parsed.data.given_name,
    p_family_name: parsed.data.family_name,
    p_locale: parsed.data.locale,
    p_timezone: parsed.data.timezone,
    p_phone_number: parsed.data.phone_number || undefined,
    // NULL = keep existing; empty string = clear (handled by NULLIF in RPC).
    p_birth_date: parsed.data.birth_date ?? '',
    p_bio: parsed.data.bio ?? '',
    p_website_url: parsed.data.website_url ?? '',
    p_company: parsed.data.company ?? '',
  });

  if (error) {
    logger.warn({ userId, action: 'settings.updateProfile', code: error.code }, 'Update failed');
    return { error: error.code ?? 'update_failed' };
  }

  revalidatePath('/[locale]/dashboard/account', 'page');

  const currentLocale = await getLocale();
  if (parsed.data.locale !== currentLocale) {
    redirect({ href: '/dashboard/account', locale: parsed.data.locale });
  }

  return { success: 'profile_updated' };
});

export const updateLocalePreferenceAction = withServerAction(
  async function updateLocalePreferenceAction(localeInput: string): Promise<SettingsActionState> {
    const parsed = z.enum(routing.locales).safeParse(localeInput);
    if (!parsed.success) return { error: 'invalid_locale' };

    const { supabase, userId } = await requireUserId();
    // Guests can still switch locale via URL/cookie; nothing to persist.
    if (!userId) return {};

    const { error } = await supabase.rpc('update_my_profile', { p_locale: parsed.data });
    if (error) {
      logger.warn(
        { userId, action: 'settings.updateLocale', code: error.code },
        'Locale update failed',
      );
      return { error: error.code ?? 'update_failed' };
    }

    return { success: 'profile_updated' };
  },
);

export const updateEmailAction = withServerAction(async function updateEmailAction(
  _prev: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const parsed = updateEmailSchema.safeParse({ email: formData.get('email') });
  if (!parsed.success) {
    return { fieldErrors: flattenFieldErrors(parsed.error.flatten().fieldErrors) };
  }

  const { supabase, userId } = await requireUserId();
  if (!userId) return { error: 'not_authenticated' };

  const { error } = await supabase.auth.updateUser({ email: parsed.data.email });
  if (error) {
    logger.warn(
      { userId, action: 'settings.updateEmail', code: error.code },
      'Email change failed',
    );
    return { error: error.code ?? 'update_email_failed' };
  }

  return { success: 'email_change_requested' };
});

export const updatePasswordFromSettingsAction = withServerAction(
  async function updatePasswordFromSettingsAction(
    _prev: SettingsActionState,
    formData: FormData,
  ): Promise<SettingsActionState> {
    const parsed = updatePasswordFromSettingsSchema.safeParse({
      current_password: formData.get('current_password'),
      password: formData.get('password'),
      confirm_password: formData.get('confirm_password'),
    });

    if (!parsed.success) {
      return { fieldErrors: flattenFieldErrors(parsed.error.flatten().fieldErrors) };
    }

    const { supabase, userId } = await requireUserId();
    if (!userId) return { error: 'not_authenticated' };

    // Pass currentPassword so Supabase can enforce secure_password_change.
    const { error } = await supabase.auth.updateUser({
      password: parsed.data.password,
      // @ts-expect-error supabase-js types miss this option in 2.x; supported server-side.
      currentPassword: parsed.data.current_password,
    });
    if (error) {
      logger.warn(
        { userId, action: 'settings.updatePassword', code: error.code },
        'Password change failed',
      );
      return { error: error.code ?? 'update_password_failed' };
    }

    return { success: 'password_updated' };
  },
);

export const uploadAvatarAction = withServerAction(async function uploadAvatarAction(
  _prev: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const file = formData.get('avatar');
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'no_file' };
  }

  const clientCheck = validateAvatarFile(file);
  if (!clientCheck.ok) return { error: clientCheck.error };

  const { supabase, userId } = await requireUserId();
  if (!userId) return { error: 'not_authenticated' };

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png';
  const storagePath = `${userId}/avatar.${ext}`;
  const dbPath = `avatars/${storagePath}`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(storagePath, file, { cacheControl: '3600', upsert: true, contentType: file.type });

  if (uploadError) {
    logger.warn(
      { userId, action: 'settings.uploadAvatar', code: uploadError.message },
      'Upload failed',
    );
    return { error: 'upload_failed' };
  }

  const { error: rpcError } = await supabase.rpc('update_my_profile', {
    p_avatar_url: dbPath,
  });
  if (rpcError) {
    logger.warn(
      { userId, action: 'settings.updateAvatarUrl', code: rpcError.code },
      'Set avatar URL failed',
    );
    return { error: rpcError.code ?? 'update_avatar_failed' };
  }

  revalidatePath('/[locale]/dashboard/account', 'page');
  return { success: 'avatar_updated' };
});

export const requestPasswordResetFromSettingsAction = withServerAction(
  async function requestPasswordResetFromSettingsAction(
    _prev: SettingsActionState,
    _formData: FormData,
  ): Promise<SettingsActionState> {
    const { supabase, userId } = await requireUserId();
    if (!userId) return { error: 'not_authenticated' };

    const { data: userData } = await supabase.auth.getUser();
    const email = userData.user?.email;
    if (!email) return { error: 'no_email_on_account' };

    const locale = await getLocale();
    const redirectTo = `${env.SITE_URL}/${locale}/auth/confirm?next=/${locale}/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) {
      logger.warn(
        { userId, action: 'settings.requestReset', code: error.code },
        'Reset link request failed',
      );
      return { error: error.code ?? 'reset_failed' };
    }

    return { success: 'reset_link_sent' };
  },
);

export const deleteAccountAction = withServerAction(async function deleteAccountAction(
  _prev: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const parsed = deleteAccountSchema.safeParse({
    confirmation: formData.get('confirmation'),
  });
  if (!parsed.success) {
    return { fieldErrors: flattenFieldErrors(parsed.error.flatten().fieldErrors) };
  }

  const { supabase, userId } = await requireUserId();
  if (!userId) return { error: 'not_authenticated' };

  const { error: rpcError } = await supabase.rpc('request_account_deletion');
  if (rpcError) {
    logger.error(
      { userId, action: 'settings.deleteAccount', code: rpcError.code },
      'Soft-delete failed',
    );
    return { error: rpcError.code ?? 'delete_failed' };
  }

  await supabase.auth.signOut();

  const locale = await getLocale();
  redirect({ href: '/login?deleted=1', locale });
  return {};
});

export const generateRecoveryCodesAction = withServerAction(
  async function generateRecoveryCodesAction(
    _prev: SettingsActionState,
    _formData: FormData,
  ): Promise<SettingsActionState> {
    const { supabase, userId } = await requireUserId();
    if (!userId) return { error: 'not_authenticated' };

    const { data, error } = await supabase.rpc('generate_recovery_codes');
    if (error) {
      logger.warn(
        { userId, action: 'settings.generateRecoveryCodes', code: error.code },
        'Recovery codes generation failed',
      );
      return { error: error.code ?? 'recovery_generate_failed' };
    }

    logger.info({ userId, action: 'recovery_codes_generated' }, 'Recovery codes generated');
    revalidatePath('/[locale]/dashboard/account', 'page');
    return { success: 'recovery_codes_generated', codes: data ?? [] };
  },
);

export const revokeSessionAction = withServerAction(async function revokeSessionAction(
  sessionId: string,
): Promise<SettingsActionState> {
  if (!z.string().uuid().safeParse(sessionId).success) {
    return { error: 'invalid_session_id' };
  }

  const { supabase, userId } = await requireUserId();
  if (!userId) return { error: 'not_authenticated' };

  const { error } = await supabase.rpc('revoke_my_session', { p_session_id: sessionId });
  if (error) {
    logger.warn({ userId, action: 'settings.revokeSession', code: error.code }, 'Revoke failed');
    return { error: error.code ?? 'revoke_failed' };
  }

  revalidatePath('/[locale]/dashboard/account', 'page');
  return { success: 'session_revoked' };
});

export const revokeAllOtherSessionsAction = withServerAction(
  async function revokeAllOtherSessionsAction(): Promise<SettingsActionState> {
    const { supabase, userId } = await requireUserId();
    if (!userId) return { error: 'not_authenticated' };

    const { error } = await supabase.auth.signOut({ scope: 'others' });
    if (error) {
      logger.warn(
        { userId, action: 'settings.signOutOthers', code: error.code },
        'SignOut others failed',
      );
      return { error: error.code ?? 'sign_out_others_failed' };
    }

    revalidatePath('/[locale]/dashboard/account', 'page');
    return { success: 'other_sessions_revoked' };
  },
);

export type SessionRow = {
  id: string;
  created_at: string | null;
  updated_at: string | null;
  not_after: string | null;
  user_agent: string | null;
  ip: string | null;
  aal: string | null;
};

export const listMySessions = withServerAction(async function listMySessions(): Promise<
  SessionRow[]
> {
  const { supabase, userId } = await requireUserId();
  if (!userId) return [];

  const { data, error } = await supabase.rpc('list_my_sessions');
  if (error) {
    logger.warn(
      { userId, action: 'settings.listSessions', code: error.code },
      'List sessions failed',
    );
    return [];
  }
  return (data ?? []) as SessionRow[];
});
