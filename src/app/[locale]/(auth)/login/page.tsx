'use client';
import React, { useActionState, useState, useTransition } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

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
      <div className="mx-auto w-full max-w-md">
        <div className="mb-10 text-center lg:text-left">
          <h1 className="font-headline text-on-surface mb-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
            {showRecovery ? t('recovery_login_title') : t('mfa_login_title')}
          </h1>
          <p className="text-on-surface-variant text-sm sm:text-base">
            {showRecovery ? t('recovery_login_desc') : t('mfa_login_desc')}
          </p>
        </div>

        {!showRecovery ?
          <form action={mfaForm} className="space-y-6">
            <input type="hidden" name="factorId" value={mfaFactorId} />
            <div className="space-y-2">
              <Label
                className="text-on-surface block text-center font-sans text-sm font-semibold"
                htmlFor="code">
                {t('mfa_login_label')}
              </Label>
              <Input
                id="code"
                name="code"
                placeholder="000000"
                required
                className="bg-surface-container-low border-outline-variant/10 focus:ring-primary/20 h-16 rounded-xl text-center font-mono text-3xl tracking-[0.3em]"
                autoFocus
                maxLength={6}
              />
            </div>

            {mfaError && (
              <p role="alert" className="text-error text-center text-sm">
                {mfaError}
              </p>
            )}

            <Button
              className="bg-primary text-primary-foreground w-full rounded-lg py-6 font-bold shadow-md transition-opacity hover:opacity-90"
              type="submit"
              disabled={mfaPending}>
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
                className="text-on-surface block text-center font-sans text-sm font-semibold"
                htmlFor="recovery-code">
                {t('recovery_login_label')}
              </Label>
              <Input
                id="recovery-code"
                name="code"
                placeholder="XXXX-XXXX"
                required
                className="bg-surface-container-low border-outline-variant/10 focus:ring-primary/20 h-16 rounded-xl text-center font-mono text-2xl tracking-widest uppercase"
                autoFocus
                maxLength={9}
              />
            </div>

            {recoveryError && (
              <p role="alert" className="text-error text-center text-sm">
                {recoveryError}
              </p>
            )}

            <Button
              className="bg-primary text-primary-foreground w-full rounded-lg py-6 font-bold shadow-md transition-opacity hover:opacity-90"
              type="submit"
              disabled={recoveryPending}>
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
    <div className="mx-auto w-full max-w-md">
      {/* Welcome Text */}
      <div className="mb-10 text-center lg:text-left">
        <h1 className="font-headline text-on-surface mb-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
          {t('login_title')}
        </h1>
        <p className="text-on-surface-variant text-sm sm:text-base">{t('login_desc')}</p>
      </div>

      {/* Tabs / Switcher */}
      <div className="bg-muted mb-8 flex rounded-full p-1">
        <button className="bg-primary text-primary-foreground flex-1 rounded-full px-4 py-2.5 text-sm font-semibold shadow-sm transition-all">
          {t('sign_in')}
        </button>
        <Link
          href="/signup"
          className="text-muted-foreground hover:text-primary flex-1 rounded-full px-4 py-2.5 text-center text-sm font-medium transition-colors">
          {t('create_account')}
        </Link>
      </div>

      {/* Primary form (password) */}
      <form action={signInForm} className="space-y-5" noValidate>
        {/* Email Input */}
        <div className="space-y-1.5">
          <Label className="text-on-surface block font-sans text-sm font-semibold" htmlFor="email">
            {t('email')}
          </Label>
          <div className="relative">
            <span className="text-muted-foreground absolute inset-y-0 left-0 flex items-center pl-3.5">
              <span className="material-symbols-outlined text-[20px]">mail</span>
            </span>
            <Input
              className="bg-background border-border/40 text-on-surface focus:border-primary focus:ring-primary/10 rounded-lg py-6 pr-4 pl-10 text-sm transition-all focus:ring-4"
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
            <p className="bg-error/10 text-error mt-1.5 rounded-lg px-3 py-2 text-xs font-medium">
              {t(`errors.${signInState.fieldErrors.email[0]}` as 'errors.generic', {
                default: signInState.fieldErrors.email[0],
              })}
            </p>
          )}
        </div>

        {/* Password Input */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label
              className="text-on-surface block font-sans text-sm font-semibold"
              htmlFor="password">
              {t('password')}
            </Label>
            <Link
              className="text-primary hover:text-primary/80 text-xs font-semibold transition-colors"
              href="/forgot-password">
              {t('forgot_password')}
            </Link>
          </div>
          <div className="relative">
            <span className="text-muted-foreground absolute inset-y-0 left-0 flex items-center pl-3.5">
              <span className="material-symbols-outlined text-[20px]">lock</span>
            </span>
            <Input
              className="bg-background border-border/40 text-on-surface focus:border-primary focus:ring-primary/10 rounded-lg py-6 pr-4 pl-10 text-sm transition-all focus:ring-4"
              id="password"
              name="password"
              placeholder="••••••••"
              required
              type="password"
            />
          </div>
          {signInState.fieldErrors?.password && (
            <p className="bg-error/10 text-error mt-1.5 rounded-lg px-3 py-2 text-xs font-medium">
              {t(`errors.${signInState.fieldErrors.password[0]}` as 'errors.generic', {
                default: signInState.fieldErrors.password[0],
              })}
            </p>
          )}
        </div>

        {signInError && (
          <p
            role="alert"
            className="bg-error/10 text-error mt-1.5 rounded-lg px-3 py-2 text-sm font-medium">
            {signInError}
          </p>
        )}

        <div className="pt-2">
          <Button
            className="bg-primary text-primary-foreground w-full rounded-lg py-6 font-bold shadow-md transition-opacity hover:opacity-90"
            type="submit"
            disabled={signInPending}>
            {t('sign_in')}
          </Button>
        </div>
      </form>

      {/* Magic link — separate form that shares the email field above */}
      <form action={magicForm} className="mt-3 space-y-2" noValidate>
        <input type="hidden" name="email" value={email} readOnly />
        <Button
          variant="outline"
          className="border-border text-primary hover:bg-muted flex w-full items-center justify-center gap-2 rounded-lg py-6 font-semibold transition-colors"
          type="submit"
          disabled={magicPending || !email}>
          <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
          {t('magic_link')}
        </Button>
        {magicError && (
          <p
            role="alert"
            className="bg-error/10 text-error mt-1.5 rounded-lg px-3 py-2 text-xs font-medium">
            {magicError}
          </p>
        )}
        {magicSuccess && <p className="text-primary text-xs">{magicSuccess}</p>}
      </form>

      {/* Divider */}
      <div className="my-8 flex items-center">
        <div className="border-border/40 grow border-t"></div>
        <span className="text-muted-foreground px-4 text-xs font-medium tracking-wider uppercase">
          {t('or_continue_with')}
        </span>
        <div className="border-border/40 grow border-t"></div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Button
          variant="outline"
          disabled={oauthPending}
          onClick={() =>
            startOAuth(() => {
              void oauthAction('google');
            })
          }
          className="bg-background border-border/40 text-foreground hover:bg-muted flex items-center justify-center gap-2 rounded-lg py-6 text-sm font-medium transition-colors">
          <Image
            alt="Google"
            width={16}
            height={16}
            unoptimized
            src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png"
          />
          Google
        </Button>
        <Button
          variant="outline"
          disabled
          className="bg-background border-border/40 text-foreground hover:bg-muted flex items-center justify-center gap-2 rounded-lg py-6 text-sm font-medium transition-colors">
          <Image
            alt="Microsoft"
            width={16}
            height={16}
            unoptimized
            src="https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg"
          />
          Microsoft
        </Button>
      </div>

      <div className="mt-8 text-center">
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
      </div>
    </div>
  );
}
