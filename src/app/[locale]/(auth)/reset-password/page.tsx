'use client';

import React, { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { Lock } from 'lucide-react';

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
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-foreground mb-2 text-[36px] leading-none font-bold tracking-tight">
          {t('reset_password_title')}
        </h1>
        <p className="text-muted-foreground text-sm">{t('reset_password_desc')}</p>
      </div>

      <form action={formAction} className="space-y-5">
        <div className="space-y-1.5">
          <Label className="text-foreground block text-sm font-semibold" htmlFor="password">
            {t('new_password')}
          </Label>
          <div className="relative">
            <Lock
              className="text-muted-foreground absolute top-1/2 left-3 size-3.75 -translate-y-1/2"
              strokeWidth={1.5}
            />
            <Input
              className="h-11 pl-10"
              id="password"
              name="password"
              placeholder="••••••••"
              required
              type="password"
              minLength={8}
            />
          </div>
          {state.fieldErrors?.password && (
            <p className="text-destructive text-xs">{state.fieldErrors.password[0]}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="text-foreground block text-sm font-semibold" htmlFor="confirm_password">
            {t('confirm_password')}
          </Label>
          <div className="relative">
            <Lock
              className="text-muted-foreground absolute top-1/2 left-3 size-3.75 -translate-y-1/2"
              strokeWidth={1.5}
            />
            <Input
              className="h-11 pl-10"
              id="confirm_password"
              name="confirm_password"
              placeholder="••••••••"
              required
              type="password"
              minLength={8}
            />
          </div>
          {state.fieldErrors?.confirm_password && (
            <p className="text-destructive text-xs">
              {t(`errors.${state.fieldErrors.confirm_password[0] ?? ''}` as 'errors.generic', {
                default: state.fieldErrors.confirm_password[0] ?? '',
              })}
            </p>
          )}
        </div>

        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}

        <Button type="submit" disabled={pending} className="h-11 w-full">
          {t('update_password')}
        </Button>
      </form>
    </div>
  );
}
