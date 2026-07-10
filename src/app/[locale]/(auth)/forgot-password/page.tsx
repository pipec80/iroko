'use client';

import React, { useActionState, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Mail } from 'lucide-react';

import { env } from '@/env';
import { CaptchaField } from '@/components/auth/captcha-field';
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
  const [prevState, setPrevState] = useState(state);
  const [captchaResetKey, setCaptchaResetKey] = useState(0);
  const [captchaReady, setCaptchaReady] = useState(!env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
  if (prevState !== state) {
    setPrevState(state);
    setCaptchaResetKey((k) => k + 1);
    setCaptchaReady(false);
  }

  const success = state.success === 'reset_link_sent' ? t('reset_link_sent') : null;
  const error =
    state.error ?
      t(`errors.${state.error}` as 'errors.generic', { default: t('errors.generic') })
    : null;

  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-foreground mb-2 text-[36px] leading-none font-bold tracking-tight">
          {t('forgot_password_title')}
        </h1>
        <p className="text-muted-foreground text-sm">{t('forgot_password_desc')}</p>
      </div>

      <form action={formAction} className="space-y-5">
        <div className="space-y-1.5">
          <Label className="text-foreground block text-sm font-semibold" htmlFor="email">
            {t('email')}
          </Label>
          <div className="relative">
            <Mail
              className="text-muted-foreground absolute top-1/2 left-3 size-3.75 -translate-y-1/2"
              strokeWidth={1.5}
            />
            <Input
              className="h-11 pl-10"
              id="email"
              name="email"
              placeholder="name@company.com"
              required
              type="email"
            />
          </div>
          {state.fieldErrors?.email && (
            <p className="text-destructive text-xs">{state.fieldErrors.email[0]}</p>
          )}
        </div>

        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
        {success && <p className="text-primary text-sm">{success}</p>}

        <CaptchaField resetKey={captchaResetKey} onReadyChange={setCaptchaReady} />
        <Button type="submit" disabled={pending || !captchaReady} className="h-11 w-full">
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
