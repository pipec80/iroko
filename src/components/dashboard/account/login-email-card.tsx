'use client';

import React, { useActionState, useEffect, useRef, useState } from 'react';
import { CheckCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  updateEmailAction,
  type SettingsActionState,
} from '@/app/[locale]/dashboard/account/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const initialState: SettingsActionState = {};

function FieldError({ message }: { message: string }) {
  return (
    <p className="bg-error/10 text-error mt-1.5 rounded-lg px-3 py-2 text-xs font-medium">
      {message}
    </p>
  );
}

export function LoginEmailCard({ email, role }: { email: string; role: string }) {
  const t = useTranslations('Settings');
  const [emailState, emailAction, emailPending] = useActionState(updateEmailAction, initialState);
  const [emailValue, setEmailValue] = useState('');
  const [isEmailDirty, setIsEmailDirty] = useState(false);
  const emailRevision = useRef(0);
  const submittedEmailRevision = useRef<number | null>(null);
  const lastEmailResult = useRef(emailState);

  const emailError =
    emailState.error ?
      t(`errors.${emailState.error}` as 'errors.generic', { default: t('errors.generic') })
    : null;

  useEffect(() => {
    if (lastEmailResult.current === emailState) return;
    lastEmailResult.current = emailState;
    if (
      emailState.success === 'email_change_requested' &&
      submittedEmailRevision.current === emailRevision.current
    ) {
      setEmailValue('');
      setIsEmailDirty(false);
    }
  }, [emailState]);

  return (
    <Card className="border-border rounded-3xl">
      <CardHeader>
        <CardTitle>{t('profile.email_heading')}</CardTitle>
        <CardDescription>{t('profile.email_hint')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 text-sm">
          <span className="text-muted-foreground">{t('profile.email_heading')}: </span>
          <strong>{email}</strong>
          {role && <span className="text-muted-foreground ml-3 text-xs">({role})</span>}
        </div>
        <form
          action={emailAction}
          noValidate
          onSubmit={() => {
            submittedEmailRevision.current = emailRevision.current;
          }}
          className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="new_email">{t('profile.new_email')}</Label>
            <Input
              id="new_email"
              name="email"
              type="email"
              placeholder="name@company.com"
              required
              value={emailValue}
              onChange={(event) => {
                emailRevision.current++;
                setEmailValue(event.target.value);
                setIsEmailDirty(true);
              }}
              aria-invalid={!!emailState.fieldErrors?.email}
            />
            {emailState.fieldErrors?.email && (
              <FieldError
                message={t(`errors.${emailState.fieldErrors.email[0] ?? ''}` as 'errors.generic', {
                  default: emailState.fieldErrors.email[0] ?? '',
                })}
              />
            )}
          </div>
          <Button type="submit" disabled={emailPending || !isEmailDirty}>
            {t('profile.change_email')}
          </Button>
        </form>
        {emailError && (
          <p role="alert" className="text-error mt-3 text-sm">
            {emailError}
          </p>
        )}
        {emailState.success === 'email_change_requested' && !isEmailDirty && (
          <div
            role="status"
            className="bg-primary/10 text-primary mt-4 flex items-center gap-2 rounded-xl p-3 text-sm font-medium">
            <CheckCircle size={18} strokeWidth={1.75} />
            {t('profile.success.email_change_requested')}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
