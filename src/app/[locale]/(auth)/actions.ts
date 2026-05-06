'use server';

import { getLocale } from 'next-intl/server';

import { env } from '@/env';
import { redirect } from '@/i18n/routing';
import { safeRedirectPath } from '@/lib/auth/safe-redirect';
import { logger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';
import {
  forgotPasswordSchema,
  loginSchema,
  magicLinkSchema,
  signupSchema,
  updatePasswordSchema,
} from '@/lib/validation/auth';

export type AuthActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: string;
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

export async function signInAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return { fieldErrors: flattenFieldErrors(parsed.error.flatten().fieldErrors) };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    logger.warn({ action: 'auth.signIn', code: error.code }, 'Sign-in failed');
    return { error: error.code ?? 'invalid_credentials' };
  }

  const locale = await getLocale();
  const next = safeRedirectPath(formData.get('next') as string | null, locale);
  // safeRedirectPath returns an absolute path like `/es/dashboard` — strip locale for i18n redirect.
  const hrefWithoutLocale = next.replace(new RegExp(`^/${locale}`), '') || '/dashboard';
  redirect({ href: hrefWithoutLocale, locale });
  return {};
}

export async function signUpAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = signupSchema.safeParse({
    first_name: formData.get('first_name'),
    last_name: formData.get('last_name'),
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return { fieldErrors: flattenFieldErrors(parsed.error.flatten().fieldErrors) };
  }

  const { first_name, last_name, email, password } = parsed.data;
  const supabase = await createClient();
  const locale = await getLocale();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Keys must match what private.handle_new_profile() reads from raw_user_meta_data.
      data: { given_name: first_name, family_name: last_name },
      emailRedirectTo: `${env.SITE_URL}/${locale}/auth/confirm?next=/${locale}/dashboard`,
    },
  });

  if (error) {
    logger.warn({ action: 'auth.signUp', code: error.code }, 'Sign-up failed');
    return { error: error.code ?? 'signup_failed' };
  }

  redirect({
    href: `/signup/confirmation?email=${encodeURIComponent(email)}`,
    locale,
  });
  return {};
}

export async function magicLinkAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = magicLinkSchema.safeParse({ email: formData.get('email') });

  if (!parsed.success) {
    return { fieldErrors: flattenFieldErrors(parsed.error.flatten().fieldErrors) };
  }

  const supabase = await createClient();
  const locale = await getLocale();

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${env.SITE_URL}/${locale}/auth/confirm?next=/${locale}/dashboard`,
    },
  });

  if (error) {
    logger.warn({ action: 'auth.magicLink', code: error.code }, 'Magic link failed');
    return { error: error.code ?? 'magic_link_failed' };
  }

  return { success: 'magic_link_sent' };
}

export async function forgotPasswordAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get('email') });

  if (!parsed.success) {
    return { fieldErrors: flattenFieldErrors(parsed.error.flatten().fieldErrors) };
  }

  const supabase = await createClient();
  const locale = await getLocale();

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${env.SITE_URL}/${locale}/auth/confirm?next=/${locale}/reset-password`,
  });

  if (error) {
    logger.warn({ action: 'auth.forgotPassword', code: error.code }, 'Password reset failed');
    return { error: error.code ?? 'reset_failed' };
  }

  return { success: 'reset_link_sent' };
}

export async function updatePasswordAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = updatePasswordSchema.safeParse({
    password: formData.get('password'),
    confirm_password: formData.get('confirm_password'),
  });

  if (!parsed.success) {
    return { fieldErrors: flattenFieldErrors(parsed.error.flatten().fieldErrors) };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) {
    logger.warn({ action: 'auth.updatePassword', code: error.code }, 'Update password failed');
    return { error: error.code ?? 'update_password_failed' };
  }

  const locale = await getLocale();
  redirect({ href: '/dashboard', locale });
  return {};
}

export async function resendConfirmationAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = formData.get('email');
  if (typeof email !== 'string') return { error: 'invalid_email' };

  const supabase = await createClient();
  const locale = await getLocale();

  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: {
      emailRedirectTo: `${env.SITE_URL}/${locale}/auth/confirm?next=/${locale}/dashboard`,
    },
  });

  if (error) {
    logger.warn({ action: 'auth.resend', code: error.code }, 'Resend failed');
    return { error: error.code ?? 'resend_failed' };
  }

  return { success: 'confirmation_resent' };
}

export async function oauthAction(provider: 'google' | 'azure'): Promise<void> {
  const supabase = await createClient();
  const locale = await getLocale();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${env.SITE_URL}/${locale}/auth/callback?next=/${locale}/dashboard`,
    },
  });

  if (error) {
    logger.warn({ action: 'auth.oauth', provider, code: error.code }, 'OAuth start failed');
    redirect({ href: '/login?error=oauth_failed', locale });
  }

  if (data.url) redirect({ href: data.url as `/${string}`, locale });
}
