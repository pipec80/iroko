'use client';
import React, { useActionState, useTransition } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

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

  const error =
    state.error ?
      t(`errors.${state.error}` as 'errors.generic', { default: t('errors.generic') })
    : null;

  return (
    <div className="mx-auto w-full max-w-md">
      {/* Welcome Text */}
      <div className="mb-8 text-center lg:text-left">
        <h1 className="font-headline text-on-surface mb-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
          {t('signup_title')}
        </h1>
        <p className="text-on-surface-variant text-sm sm:text-base">{t('signup_desc')}</p>
      </div>

      {/* Tabs / Switcher */}
      <div className="bg-muted mb-8 flex rounded-full p-1">
        <Link
          href="/login"
          className="text-muted-foreground hover:text-primary flex-1 rounded-full px-4 py-2.5 text-center text-sm font-medium transition-colors">
          {t('sign_in')}
        </Link>
        <button className="bg-primary text-primary-foreground flex-1 rounded-full px-4 py-2.5 text-sm font-semibold shadow-sm transition-all">
          {t('create_account')}
        </button>
      </div>

      {/* Form */}
      <form action={formAction} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label
              className="text-on-surface block font-sans text-sm font-semibold"
              htmlFor="first_name">
              {t('first_name')}
            </Label>
            <Input
              className="bg-background border-border/40 text-on-surface focus:border-primary focus:ring-primary/10 rounded-lg px-4 py-6 text-sm transition-all focus:ring-4"
              id="first_name"
              name="first_name"
              placeholder="John"
              required
            />
            {state.fieldErrors?.first_name && (
              <p className="text-error text-xs">{state.fieldErrors.first_name[0]}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label
              className="text-on-surface block font-sans text-sm font-semibold"
              htmlFor="last_name">
              {t('last_name')}
            </Label>
            <Input
              className="bg-background border-border/40 text-on-surface focus:border-primary focus:ring-primary/10 rounded-lg px-4 py-6 text-sm transition-all focus:ring-4"
              id="last_name"
              name="last_name"
              placeholder="Doe"
              required
            />
            {state.fieldErrors?.last_name && (
              <p className="text-error text-xs">{state.fieldErrors.last_name[0]}</p>
            )}
          </div>
        </div>

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
            />
          </div>
          {state.fieldErrors?.email && (
            <p className="text-error text-xs">{state.fieldErrors.email[0]}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label
            className="text-on-surface block font-sans text-sm font-semibold"
            htmlFor="password">
            {t('password')}
          </Label>
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
              minLength={8}
            />
          </div>
          {state.fieldErrors?.password && (
            <p className="text-error text-xs">{state.fieldErrors.password[0]}</p>
          )}
        </div>

        {error && (
          <p role="alert" className="text-error text-sm">
            {error}
          </p>
        )}

        <div className="pt-2">
          <Button
            className="bg-primary text-primary-foreground w-full rounded-lg py-6 font-bold shadow-md transition-opacity hover:opacity-90"
            type="submit"
            disabled={pending}>
            {t('create_account')}
          </Button>
        </div>
      </form>

      {/* Divider */}
      <div className="my-8 flex items-center">
        <div className="border-border/40 flex-grow border-t"></div>
        <span className="text-muted-foreground px-4 text-xs font-medium tracking-wider uppercase">
          {t('or_continue_with')}
        </span>
        <div className="border-border/40 flex-grow border-t"></div>
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
