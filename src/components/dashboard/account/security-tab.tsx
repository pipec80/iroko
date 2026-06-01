'use client';

import React, { useActionState, useState } from 'react';
import { CheckCircle, Mail } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  deleteAccountAction,
  requestPasswordResetFromSettingsAction,
  updatePasswordFromSettingsAction,
  type SettingsActionState,
} from '@/app/[locale]/dashboard/account/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MfaSetup } from './mfa-setup';

const initialState: SettingsActionState = {};

function translateError(
  t: ReturnType<typeof useTranslations<'Settings'>>,
  code: string | undefined,
) {
  if (!code) return null;
  return t(`errors.${code}` as 'errors.generic', { default: t('errors.generic') });
}

export function SecurityTab() {
  const t = useTranslations('Settings');
  const [pwState, pwAction, pwPending] = useActionState(
    updatePasswordFromSettingsAction,
    initialState,
  );
  const [resetState, resetAction, resetPending] = useActionState(
    requestPasswordResetFromSettingsAction,
    initialState,
  );
  const [delState, delAction, delPending] = useActionState(deleteAccountAction, initialState);

  const [isPwDirty, setIsPwDirty] = useState(false);
  const [isDelDirty, setIsDelDirty] = useState(false);

  const pwError = translateError(t, pwState.error);
  const resetError = translateError(t, resetState.error);
  const delError = translateError(t, delState.error);

  return (
    <div className="flex flex-col gap-8">
      {/* Change password */}
      <Card className="border-outline-variant/10 rounded-3xl">
        <CardHeader>
          <CardTitle>{t('security.change_password_heading')}</CardTitle>
          <CardDescription>{t('security.password_policy_hint')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={pwAction}
            noValidate
            className="grid gap-4 md:grid-cols-3"
            onChange={() => setIsPwDirty(true)}>
            <div className="space-y-1.5">
              <Label htmlFor="current_password">{t('security.current_password')}</Label>
              <Input
                id="current_password"
                name="current_password"
                type="password"
                required
                aria-invalid={!!pwState.fieldErrors?.current_password}
              />
              {pwState.fieldErrors?.current_password && (
                <p className="bg-error/10 text-error mt-1.5 rounded-lg px-3 py-2 text-xs font-medium">
                  {pwState.fieldErrors.current_password[0]}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">{t('security.new_password')}</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={10}
                aria-invalid={!!pwState.fieldErrors?.password}
              />
              {pwState.fieldErrors?.password && (
                <p className="bg-error/10 text-error mt-1.5 rounded-lg px-3 py-2 text-xs font-medium">
                  {t(`errors.${pwState.fieldErrors.password[0]}` as 'errors.generic', {
                    default: pwState.fieldErrors.password[0],
                  })}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm_password">{t('security.confirm_password')}</Label>
              <Input
                id="confirm_password"
                name="confirm_password"
                type="password"
                required
                minLength={10}
                aria-invalid={!!pwState.fieldErrors?.confirm_password}
              />
              {pwState.fieldErrors?.confirm_password && (
                <p className="bg-error/10 text-error mt-1.5 rounded-lg px-3 py-2 text-xs font-medium">
                  {t(`errors.${pwState.fieldErrors.confirm_password[0]}` as 'errors.generic', {
                    default: pwState.fieldErrors.confirm_password[0],
                  })}
                </p>
              )}
            </div>

            <div className="md:col-span-3">
              {pwError && (
                <p role="alert" className="text-error mb-3 text-sm">
                  {pwError}
                </p>
              )}
              {pwState.success === 'password_updated' && !isPwDirty && (
                <div className="bg-primary/10 text-primary mb-4 flex items-center gap-2 rounded-xl p-3 text-sm font-medium">
                  <CheckCircle size={18} strokeWidth={1.75} />
                  {t('security.success.password_updated')}
                </div>
              )}
              <Button type="submit" disabled={pwPending || !isPwDirty}>
                {t('security.update_password')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* MFA Management */}
      <MfaSetup />

      {/* Reset password */}
      <Card className="border-outline-variant/10 rounded-3xl">
        <CardHeader>
          <CardTitle>{t('security.reset_password_heading')}</CardTitle>
          <CardDescription>{t('security.reset_password_description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={resetAction} noValidate>
            <Button type="submit" variant="outline" disabled={resetPending}>
              <Mail size={16} strokeWidth={1.75} className="mr-2" />
              {t('security.send_reset_link')}
            </Button>
          </form>
          {resetError && (
            <p role="alert" className="text-error mt-3 text-sm">
              {resetError}
            </p>
          )}
          {resetState.success === 'reset_link_sent' && (
            <div className="bg-primary/10 text-primary mt-4 flex items-center gap-2 rounded-xl p-3 text-sm font-medium">
              <CheckCircle size={18} strokeWidth={1.75} />
              {t('security.success.reset_link_sent')}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-error/20 rounded-3xl">
        <CardHeader>
          <CardTitle className="text-error">{t('security.danger_zone')}</CardTitle>
          <CardDescription>{t('security.delete_account_description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={delAction}
            noValidate
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
            onChange={() => setIsDelDirty(true)}>
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="confirmation">{t('security.delete_account_confirm_label')}</Label>
              <Input
                id="confirmation"
                name="confirmation"
                placeholder={t('security.delete_account_confirm_placeholder')}
                required
                aria-invalid={!!delState.fieldErrors?.confirmation}
              />
              {delState.fieldErrors?.confirmation && (
                <p className="bg-error/10 text-error mt-1.5 rounded-lg px-3 py-2 text-xs font-medium">
                  {t('errors.invalid_confirmation_phrase')}
                </p>
              )}
            </div>
            <Button
              type="submit"
              variant="destructive"
              disabled={delPending || !isDelDirty}
              className="bg-error text-on-error hover:opacity-90">
              {t('security.delete_account_button')}
            </Button>
          </form>
          {delError && (
            <p role="alert" className="text-error mt-3 text-sm">
              {delError}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
