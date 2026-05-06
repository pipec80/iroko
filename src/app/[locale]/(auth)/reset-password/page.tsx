'use client';

import React, { useActionState } from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import type { AuthActionState } from '../actions';
import { updatePasswordAction } from '../actions';

const initialState: AuthActionState = {};

export default function ResetPasswordPage() {
  const t = useTranslations('Auth');
  const [state, formAction, pending] = useActionState(updatePasswordAction, initialState);

  const error =
    state.error ?
      t(`errors.${state.error}` as 'errors.generic', { default: t('errors.generic') })
    : null;

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="mb-10 text-center lg:text-left">
        <h1 className="font-headline text-on-surface mb-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
          {t('reset_password_title')}
        </h1>
        <p className="text-on-surface-variant text-sm sm:text-base">{t('reset_password_desc')}</p>
      </div>

      <form action={formAction} className="space-y-5">
        <div className="space-y-1.5">
          <Label
            className="text-on-surface block font-sans text-sm font-semibold"
            htmlFor="password">
            {t('new_password')}
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

        <div className="space-y-1.5">
          <Label
            className="text-on-surface block font-sans text-sm font-semibold"
            htmlFor="confirm_password">
            {t('confirm_password')}
          </Label>
          <div className="relative">
            <span className="text-muted-foreground absolute inset-y-0 left-0 flex items-center pl-3.5">
              <span className="material-symbols-outlined text-[20px]">lock</span>
            </span>
            <Input
              className="bg-background border-border/40 text-on-surface focus:border-primary focus:ring-primary/10 rounded-lg py-6 pr-4 pl-10 text-sm transition-all focus:ring-4"
              id="confirm_password"
              name="confirm_password"
              placeholder="••••••••"
              required
              type="password"
              minLength={8}
            />
          </div>
          {state.fieldErrors?.confirm_password && (
            <p className="text-error text-xs">
              {t(`errors.${state.fieldErrors.confirm_password[0]}` as 'errors.generic', {
                default: state.fieldErrors.confirm_password[0],
              })}
            </p>
          )}
        </div>

        {error && (
          <p role="alert" className="text-error text-sm">
            {error}
          </p>
        )}

        <Button
          type="submit"
          disabled={pending}
          className="bg-primary text-primary-foreground w-full rounded-lg py-6 font-bold shadow-md transition-opacity hover:opacity-90">
          {t('update_password')}
        </Button>
      </form>
    </div>
  );
}
