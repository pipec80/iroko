'use client';

import React, { useActionState } from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link } from '@/i18n/routing';

import type { AuthActionState } from '../actions';
import { forgotPasswordAction } from '../actions';

const initialState: AuthActionState = {};

export default function ForgotPasswordPage() {
  const t = useTranslations('Auth');
  const [state, formAction, pending] = useActionState(forgotPasswordAction, initialState);

  const success = state.success === 'reset_link_sent' ? t('reset_link_sent') : null;
  const error =
    state.error ?
      t(`errors.${state.error}` as 'errors.generic', { default: t('errors.generic') })
    : null;

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="mb-10 text-center lg:text-left">
        <h1 className="font-headline text-on-surface mb-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
          {t('forgot_password_title')}
        </h1>
        <p className="text-on-surface-variant text-sm sm:text-base">{t('forgot_password_desc')}</p>
      </div>

      <form action={formAction} className="space-y-5">
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

        {error && (
          <p role="alert" className="text-error text-sm">
            {error}
          </p>
        )}
        {success && <p className="text-primary text-sm">{success}</p>}

        <Button
          type="submit"
          disabled={pending}
          className="bg-primary text-primary-foreground w-full rounded-lg py-6 font-bold shadow-md transition-opacity hover:opacity-90">
          {t('send_reset_link')}
        </Button>
      </form>

      <div className="mt-8 text-center">
        <Link
          href="/login"
          className="text-muted-foreground hover:text-primary text-sm font-medium transition-colors">
          {t('back_to_login')}
        </Link>
      </div>
    </div>
  );
}
