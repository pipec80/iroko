'use client';
import React, { useActionState, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { Lock, Mail, WandSparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link } from '@/i18n/routing';

import type { AuthActionState } from '../actions';
import {
  magicLinkAction,
  oauthAction,
  signInAction,
  verifyMfaAction,
  verifyRecoveryAction,
} from '../actions';

const initialState: AuthActionState = {};

export default function LoginPage() {
  const t = useTranslations('Auth');
  const [email, setEmail] = useState('');
  const [signInState, signInForm, signInPending] = useActionState(signInAction, initialState);
  const [mfaState, mfaForm, mfaPending] = useActionState(verifyMfaAction, initialState);
  const [recoveryState, recoveryForm, recoveryPending] = useActionState(
    verifyRecoveryAction,
    initialState,
  );
  const [magicState, magicForm, magicPending] = useActionState(magicLinkAction, initialState);
  const [oauthPending, startOAuth] = useTransition();
  const [showRecovery, setShowRecovery] = useState(false);

  const isMfaRequired = signInState.success === 'mfa_required';
  const mfaFactorId = signInState.mfaFactorId;

  const signInError =
    signInState.error ?
      t(`errors.${signInState.error}` as 'errors.generic', { default: t('errors.generic') })
    : null;
  const mfaError =
    mfaState.error ?
      t(`errors.${mfaState.error}` as 'errors.generic', { default: t('errors.generic') })
    : null;
  const recoveryError =
    recoveryState.error ?
      t(`errors.${recoveryState.error}` as 'errors.generic', { default: t('errors.generic') })
    : null;
  const magicError =
    magicState.error ?
      t(`errors.${magicState.error}` as 'errors.generic', { default: t('errors.generic') })
    : null;
  const magicSuccess = magicState.success === 'magic_link_sent' ? t('magic_link_sent') : null;

  if (isMfaRequired) {
    return (
      <div className="w-full">
        <div className="mb-8">
          <h1 className="text-foreground mb-2 text-[36px] leading-none font-bold tracking-tight">
            {showRecovery ? t('recovery_login_title') : t('mfa_login_title')}
          </h1>
          <p className="text-muted-foreground text-sm">
            {showRecovery ? t('recovery_login_desc') : t('mfa_login_desc')}
          </p>
        </div>

        {!showRecovery ?
          <form action={mfaForm} className="space-y-6">
            <input type="hidden" name="factorId" value={mfaFactorId} />
            <div className="space-y-2">
              <Label className="text-foreground block text-sm font-semibold" htmlFor="code">
                {t('mfa_login_label')}
              </Label>
              <Input
                id="code"
                name="code"
                placeholder="000000"
                required
                className="bg-surface-2 border-border h-16 rounded-md text-center font-mono text-3xl tracking-[0.3em]"
                autoFocus
                maxLength={6}
              />
            </div>

            {mfaError && (
              <p
                role="alert"
                className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-center text-sm">
                {mfaError}
              </p>
            )}

            <Button type="submit" disabled={mfaPending} className="h-11 w-full">
              {t('mfa_login_verify')}
            </Button>

            <button
              type="button"
              onClick={() => setShowRecovery(true)}
              className="text-muted-foreground hover:text-primary w-full text-center text-sm font-medium transition-colors">
              {t('recovery_use_instead')}
            </button>

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="text-muted-foreground hover:text-primary w-full text-center text-sm font-medium transition-colors">
              {t('mfa_login_back')}
            </button>
          </form>
        : <form action={recoveryForm} className="space-y-6">
            <div className="space-y-2">
              <Label
                className="text-foreground block text-sm font-semibold"
                htmlFor="recovery-code">
                {t('recovery_login_label')}
              </Label>
              <Input
                id="recovery-code"
                name="code"
                placeholder="XXXX-XXXX"
                required
                className="bg-surface-2 border-border h-16 rounded-md text-center font-mono text-2xl tracking-widest uppercase"
                autoFocus
                maxLength={9}
              />
            </div>

            {recoveryError && (
              <p
                role="alert"
                className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-center text-sm">
                {recoveryError}
              </p>
            )}

            <Button type="submit" disabled={recoveryPending} className="h-11 w-full">
              {t('recovery_login_verify')}
            </Button>

            <button
              type="button"
              onClick={() => setShowRecovery(false)}
              className="text-muted-foreground hover:text-primary w-full text-center text-sm font-medium transition-colors">
              {t('recovery_use_totp_instead')}
            </button>
          </form>
        }
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-8">
        <span className="eyebrow text-muted-foreground">{t('sign_in')}</span>
        <h1 className="text-foreground mt-2 text-[36px] leading-none font-bold tracking-tight">
          {t('login_title')}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">{t('login_desc')}</p>
      </div>

      <form action={signInForm} className="space-y-5" noValidate>
        <div className="space-y-1.5">
          <Label className="text-foreground block text-sm font-semibold" htmlFor="email">
            {t('email')}
          </Label>
          <div className="relative">
            <Mail
              className="text-muted-foreground absolute top-1/2 left-3 size-[15px] -translate-y-1/2"
              strokeWidth={1.5}
            />
            <Input
              className="h-11 pl-10"
              id="email"
              name="email"
              placeholder="name@company.com"
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {signInState.fieldErrors?.email && (
            <p className="bg-destructive/10 text-destructive mt-1.5 rounded-md px-3 py-2 text-xs font-medium">
              {t(`errors.${signInState.fieldErrors.email[0]}` as 'errors.generic', {
                default: signInState.fieldErrors.email[0],
              })}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-foreground block text-sm font-semibold" htmlFor="password">
              {t('password')}
            </Label>
            <Link
              className="text-primary hover:text-primary/80 text-xs font-semibold transition-colors"
              href="/forgot-password">
              {t('forgot_password')}
            </Link>
          </div>
          <div className="relative">
            <Lock
              className="text-muted-foreground absolute top-1/2 left-3 size-[15px] -translate-y-1/2"
              strokeWidth={1.5}
            />
            <Input
              className="h-11 pl-10"
              id="password"
              name="password"
              placeholder="••••••••"
              required
              type="password"
            />
          </div>
          {signInState.fieldErrors?.password && (
            <p className="bg-destructive/10 text-destructive mt-1.5 rounded-md px-3 py-2 text-xs font-medium">
              {t(`errors.${signInState.fieldErrors.password[0]}` as 'errors.generic', {
                default: signInState.fieldErrors.password[0],
              })}
            </p>
          )}
        </div>

        {signInError && (
          <p
            role="alert"
            className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm font-medium">
            {signInError}
          </p>
        )}

        <Button type="submit" disabled={signInPending} className="h-11 w-full">
          {t('sign_in')}
        </Button>
      </form>

      <form action={magicForm} className="mt-3" noValidate>
        <input type="hidden" name="email" value={email} readOnly />
        <Button
          variant="outline"
          className="h-11 w-full gap-2"
          type="submit"
          disabled={magicPending || !email}>
          <WandSparkles size={14} strokeWidth={1.5} />
          {t('magic_link')}
        </Button>
        {magicError && (
          <p
            role="alert"
            className="bg-destructive/10 text-destructive mt-1.5 rounded-md px-3 py-2 text-xs font-medium">
            {magicError}
          </p>
        )}
        {magicSuccess && <p className="text-primary mt-1 text-xs">{magicSuccess}</p>}
      </form>

      <div className="my-7 flex items-center gap-4">
        <div className="border-border grow border-t" />
        <span className="eyebrow text-muted-foreground">{t('or_continue_with')}</span>
        <div className="border-border grow border-t" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          disabled={oauthPending}
          onClick={() =>
            startOAuth(() => {
              void oauthAction('google');
            })
          }
          className="h-11 gap-2">
          <Image src="/logo-google.svg" alt="" width={15} height={15} aria-hidden="true" />
          Google
        </Button>
        <Button variant="outline" disabled className="h-11 gap-2">
          <svg viewBox="0 0 24 24" width={15} height={15} fill="currentColor" aria-hidden="true">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
          </svg>
          GitHub
        </Button>
      </div>

      <div className="mt-7 text-center">
        <p className="text-muted-foreground text-xs">
          {t.rich('terms_privacy', {
            terms: (chunks) => (
              <Link href="/" className="text-primary font-medium hover:underline">
                {chunks}
              </Link>
            ),
            privacy: (chunks) => (
              <Link href="/" className="text-primary font-medium hover:underline">
                {chunks}
              </Link>
            ),
          })}
        </p>
        <p className="text-muted-foreground mt-4 text-sm">
          <Link
            href="/signup"
            className="text-foreground hover:text-primary font-semibold transition-colors">
            {t('create_account')}
          </Link>
        </p>
      </div>
    </div>
  );
}
