'use server';

import { getLocale } from 'next-intl/server';

import { appConfig } from '@/config/app.config';
import { env } from '@/env';
import { redirect } from '@/i18n/routing';
import { safeRedirectPath } from '@/lib/auth/safe-redirect';
import { logger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';
import {
  emailSchema,
  forgotPasswordSchema,
  loginSchema,
  magicLinkSchema,
  mfaRecoverySchema,
  mfaSchema,
  signupSchema,
  updatePasswordSchema,
} from '@/lib/validation/auth';

/**
 * F3-C4: decide the post-auth destination from the session just created,
 * instead of relying on the edge middleware to catch the resulting navigation.
 * redirect() called inside a Server Action does not reliably re-run the
 * middleware for the destination it navigates to, so the middleware's
 * onboarding gate never sees this transition — this is the one place that
 * actually has the freshly-minted claim.
 */
function resolvePostAuthDestination(
  hrefWithoutLocale: string,
  onboardingCompleted: unknown,
): string {
  const needsOnboarding =
    appConfig.features.onboarding &&
    onboardingCompleted === false &&
    !hrefWithoutLocale.startsWith('/dashboard/onboarding');
  return needsOnboarding ? '/dashboard/onboarding' : hrefWithoutLocale;
}

export type AuthActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: string;
  mfaFactorId?: string;
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

  const captchaToken = formData.get('captchaToken') as string | undefined;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    ...parsed.data,
    options: captchaToken ? { captchaToken } : undefined,
  });

  if (error) {
    logger.warn({ action: 'auth.signIn', code: error.code }, 'Sign-in failed');
    return { error: error.code ?? 'invalid_credentials' };
  }

  // Check if MFA is required
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const verifiedFactor = factors?.all.find((f) => f.status === 'verified');

  if (verifiedFactor) {
    logger.info({ userId: data.user.id, action: 'auth.signIn.mfa_required' }, 'MFA Required');
    return { success: 'mfa_required', mfaFactorId: verifiedFactor.id };
  }

  // Log successful auth for compromise detection (SECURITY_AUDIT F-08)
  if (data.user) {
    logger.info({ userId: data.user.id, action: 'auth.signIn.success' }, 'Sign-in OK');
  }

  const locale = await getLocale();
  const next = safeRedirectPath(formData.get('next') as string | null, locale);
  const hrefWithoutLocale = next.replace(new RegExp(`^/${locale}`), '') || '/dashboard';
  // data.user.app_metadata reflects auth.users directly — the onboarding_completed
  // claim only exists inside the JWT minted by custom_access_token_hook, so it must
  // be read from the freshly-issued token via getClaims(), same as the middleware.
  const { data: claimsData } = await supabase.auth.getClaims();
  const href = resolvePostAuthDestination(
    hrefWithoutLocale,
    claimsData?.claims.app_metadata?.onboarding_completed,
  );
  redirect({ href, locale });
  return {};
}

export async function verifyMfaAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = mfaSchema.safeParse({
    code: formData.get('code'),
    factorId: formData.get('factorId'),
  });

  if (!parsed.success) {
    return { fieldErrors: flattenFieldErrors(parsed.error.flatten().fieldErrors) };
  }

  const supabase = await createClient();

  // Challenge and verify the code
  const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
    factorId: parsed.data.factorId,
  });

  if (challengeError) {
    return { error: 'mfa_challenge_failed' };
  }

  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId: parsed.data.factorId,
    challengeId: challengeData.id,
    code: parsed.data.code,
  });

  if (verifyError) {
    return { error: 'invalid_mfa_code' };
  }

  logger.info({ action: 'auth.mfa.success' }, 'MFA Challenge Verified');

  const locale = await getLocale();
  // Same as signInAction: onboarding_completed only lives in the JWT the hook
  // mints, not in the user object returned by the verify call.
  const { data: claimsData } = await supabase.auth.getClaims();
  const href = resolvePostAuthDestination(
    '/dashboard',
    claimsData?.claims.app_metadata?.onboarding_completed,
  );
  redirect({ href, locale });
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
  const captchaToken = formData.get('captchaToken') as string | undefined;
  const supabase = await createClient();
  const locale = await getLocale();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Keys must match what private.handle_new_profile() reads from raw_user_meta_data.
      data: { given_name: first_name, family_name: last_name },
      emailRedirectTo: `${env.SITE_URL}/${locale}/auth/confirm?next=/${locale}/dashboard`,
      ...(captchaToken ? { captchaToken } : {}),
    },
  });

  if (error) {
    // Anti-enumeration: treat existing-email the same as success to prevent user discovery.
    if (error.code === 'user_already_exists' || error.code === 'email_exists') {
      logger.info(
        { action: 'auth.signUp' },
        'signup_attempt_existing_email — returning generic confirmation',
      );
      redirect({
        href: `/signup/confirmation?email=${encodeURIComponent(email)}`,
        locale,
      });
    }
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

  const captchaToken = formData.get('captchaToken') as string | undefined;
  const supabase = await createClient();
  const locale = await getLocale();

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${env.SITE_URL}/${locale}/auth/confirm?next=/${locale}/dashboard`,
      ...(captchaToken ? { captchaToken } : {}),
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

  const captchaToken = formData.get('captchaToken') as string | undefined;
  const supabase = await createClient();
  const locale = await getLocale();

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${env.SITE_URL}/${locale}/auth/confirm?next=/${locale}/reset-password`,
    ...(captchaToken ? { captchaToken } : {}),
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
  const parsed = emailSchema.safeParse(formData.get('email'));
  if (!parsed.success) return { error: 'invalid_email' };
  const email = parsed.data;

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

export async function verifyRecoveryAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = mfaRecoverySchema.safeParse({ code: formData.get('code') });

  if (!parsed.success) {
    return {
      fieldErrors: flattenFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  const supabase = await createClient();
  const { data: consumed, error } = await supabase.rpc('consume_recovery_code', {
    p_code: parsed.data.code,
  });

  if (error) {
    logger.warn({ action: 'auth.recovery', code: error.code }, 'Recovery code RPC error');
    return { error: 'recovery_invalid' };
  }

  if (!consumed) {
    return { error: 'recovery_invalid' };
  }

  logger.info({ action: 'auth.recovery.success' }, 'Recovery code consumed');

  const locale = await getLocale();
  redirect({ href: '/dashboard/account?tab=security&reenroll=1', locale });
  return {};
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

  // Supabase returns an absolute URL to their OAuth authorize endpoint.
  // Type cast needed because next-intl redirect() is typed for relative paths only.
  if (data.url) redirect({ href: data.url as '/', locale });
}
