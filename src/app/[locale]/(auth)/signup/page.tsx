'use client';
import React, { useActionState, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link } from '@/i18n/routing';

import type { AuthActionState } from '../actions';
import { oauthAction, signUpAction } from '../actions';

const initialState: AuthActionState = {};

export default function SignupPage() {
  const t = useTranslations('Auth');
  const [state, formAction, pending] = useActionState(signUpAction, initialState);
  const [oauthPending, startOAuth] = useTransition();
  const [showPassword, setShowPassword] = useState(false);
  const [prevState, setPrevState] = useState(state);
  const [dirtyFields, setDirtyFields] = useState<Set<string>>(new Set());

  // When the server returns a new state, reset dirty tracking (derived-state pattern)
  if (prevState !== state) {
    setPrevState(state);
    setDirtyFields(new Set());
  }

  const markDirty = (field: string) => setDirtyFields((prev) => new Set(prev).add(field));

  const fieldError = (field: keyof NonNullable<typeof state.fieldErrors>) => {
    if (dirtyFields.has(field)) return null;
    const errors = state.fieldErrors?.[field];
    if (!errors?.length) return null;
    return t(`errors.${errors[0]}` as 'errors.generic', { default: errors[0] });
  };

  const error =
    state.error ?
      t(`errors.${state.error}` as 'errors.generic', { default: t('errors.generic') })
    : null;

  return (
    <div className="w-full">
      <div className="mb-8">
        <span className="eyebrow text-muted-foreground">{t('create_account')}</span>
        <h1 className="text-foreground mt-2 text-[36px] leading-none font-bold tracking-tight">
          {t('signup_title')}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">{t('signup_desc')}</p>
      </div>

      <form action={formAction} className="space-y-4" noValidate>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-foreground block text-sm font-semibold" htmlFor="first_name">
              {t('first_name')}
            </Label>
            <Input
              className="h-11"
              id="first_name"
              name="first_name"
              placeholder="John"
              required
              onChange={() => markDirty('first_name')}
            />
            {fieldError('first_name') && (
              <p className="bg-destructive/10 text-destructive mt-1.5 rounded-md px-3 py-2 text-xs font-medium">
                {fieldError('first_name')}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-foreground block text-sm font-semibold" htmlFor="last_name">
              {t('last_name')}
            </Label>
            <Input
              className="h-11"
              id="last_name"
              name="last_name"
              placeholder="Doe"
              required
              onChange={() => markDirty('last_name')}
            />
            {fieldError('last_name') && (
              <p className="bg-destructive/10 text-destructive mt-1.5 rounded-md px-3 py-2 text-xs font-medium">
                {fieldError('last_name')}
              </p>
            )}
          </div>
        </div>

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
              onChange={() => markDirty('email')}
            />
          </div>
          {fieldError('email') && (
            <p className="bg-destructive/10 text-destructive mt-1.5 rounded-md px-3 py-2 text-xs font-medium">
              {fieldError('email')}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="text-foreground block text-sm font-semibold" htmlFor="password">
            {t('password')}
          </Label>
          <div className="relative">
            <Lock
              className="text-muted-foreground absolute top-1/2 left-3 size-[15px] -translate-y-1/2"
              strokeWidth={1.5}
            />
            <Input
              className="h-11 pr-10 pl-10"
              id="password"
              name="password"
              placeholder="••••••••"
              required
              type={showPassword ? 'text' : 'password'}
              minLength={8}
              onChange={() => markDirty('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? t('hide_password') : t('show_password')}
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2 transition-colors">
              {showPassword ?
                <EyeOff className="size-[15px]" strokeWidth={1.5} />
              : <Eye className="size-[15px]" strokeWidth={1.5} />}
            </button>
          </div>
          {fieldError('password') && (
            <p className="bg-destructive/10 text-destructive mt-1.5 rounded-md px-3 py-2 text-xs font-medium">
              {fieldError('password')}
            </p>
          )}
        </div>

        {error && (
          <p
            role="alert"
            className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm font-medium">
            {error}
          </p>
        )}

        <Button type="submit" disabled={pending} className="h-11 w-full">
          {t('create_account')}
        </Button>
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
            href="/login"
            className="text-foreground hover:text-primary font-semibold transition-colors">
            {t('sign_in')}
          </Link>
        </p>
      </div>
    </div>
  );
}
