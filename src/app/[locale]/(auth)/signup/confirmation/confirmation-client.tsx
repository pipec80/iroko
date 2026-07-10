'use client';

import React, { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, MailCheck } from 'lucide-react';

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
        <div className="border-border bg-surface-elevated relative flex size-28 rotate-3 items-center justify-center rounded-3xl border shadow-2xl transition-transform duration-500 hover:rotate-0">
          <MailCheck className="text-primary" size={48} strokeWidth={1.5} aria-hidden="true" />
          <div className="border-background bg-primary text-primary-foreground absolute -top-2 -right-2 flex size-8 items-center justify-center rounded-full border-4 shadow-lg">
            <Check size={14} strokeWidth={2.5} aria-hidden="true" />
          </div>
        </div>
      </div>

      <div className="max-w-sm space-y-4">
        <h2 className="text-foreground text-4xl font-black tracking-tighter">
          {t('confirmation_title')}
        </h2>
        <p className="text-muted-foreground text-lg/relaxed opacity-80">
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
        <div className="border-border bg-surface-2 rounded-lg border p-6">
          <form action={formAction}>
            <input type="hidden" name="email" value={email} readOnly />
            <Button type="submit" disabled={pending} className="h-11 w-full">
              {t('resend_email')}
            </Button>
          </form>
          {success && <p className="text-primary mt-3 text-xs">{success}</p>}
          {error && (
            <p role="alert" className="text-destructive mt-3 text-xs">
              {error}
            </p>
          )}
        </div>

        <Button
          asChild
          variant="ghost"
          className="text-muted-foreground hover:text-primary text-sm font-medium transition-colors">
          <Link href="/login">{t('back_to_login')}</Link>
        </Button>
      </div>
    </div>
  );
}
