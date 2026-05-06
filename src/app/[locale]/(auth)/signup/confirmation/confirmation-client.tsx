'use client';

import React, { useActionState } from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/routing';

import type { AuthActionState } from '../../actions';
import { resendConfirmationAction } from '../../actions';

const initialState: AuthActionState = {};

export function ConfirmationClient({ email }: { email: string }) {
  const t = useTranslations('Auth');
  const [state, formAction, pending] = useActionState(resendConfirmationAction, initialState);

  const success = state.success === 'confirmation_resent' ? t('confirmation_resent') : null;
  const error =
    state.error ?
      t(`errors.${state.error}` as 'errors.generic', { default: t('errors.generic') })
    : null;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-8 flex flex-col items-center space-y-10 py-8 text-center duration-1000 ease-out">
      <div className="relative">
        <div className="bg-primary/20 absolute inset-0 scale-150 animate-pulse rounded-full blur-3xl" />
        <div className="bg-surface-container-highest border-outline-variant/10 relative flex h-28 w-28 rotate-3 items-center justify-center rounded-3xl border shadow-2xl transition-transform duration-500 hover:rotate-0">
          <span className="material-symbols-outlined text-primary icon-fill text-6xl">
            mark_email_read
          </span>
          <div className="bg-primary text-primary-foreground border-background absolute -top-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full border-4 shadow-lg">
            <span className="material-symbols-outlined text-[16px] font-bold">check</span>
          </div>
        </div>
      </div>

      <div className="max-w-sm space-y-4">
        <h2 className="text-on-surface text-4xl font-black tracking-tighter">
          {t('confirmation_title')}
        </h2>
        <p className="text-on-surface-variant text-lg leading-relaxed opacity-80">
          {t.rich('confirmation_desc', {
            email: (chunks) => (
              <span className="text-primary decoration-primary/30 font-mono font-bold underline decoration-2 underline-offset-4">
                {chunks}
              </span>
            ),
            emailValue: email,
          })}
        </p>
      </div>

      <div className="flex w-full flex-col gap-4 pt-4">
        <div className="bg-surface-container-low/50 ghost-border glass rounded-2xl p-6">
          <form action={formAction}>
            <input type="hidden" name="email" value={email} readOnly />
            <Button
              type="submit"
              disabled={pending}
              className="bg-primary text-primary-foreground shadow-primary/20 w-full rounded-xl py-6 font-bold shadow-xl transition-all hover:opacity-90">
              {t('resend_email')}
            </Button>
          </form>
          {success && <p className="text-primary mt-3 text-xs">{success}</p>}
          {error && (
            <p role="alert" className="text-error mt-3 text-xs">
              {error}
            </p>
          )}
        </div>

        <Button
          asChild
          variant="ghost"
          className="text-on-surface-variant/60 hover:text-primary text-sm font-medium transition-colors">
          <Link href="/login">{t('back_to_login')}</Link>
        </Button>
      </div>
    </div>
  );
}
