'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';

import { sendPlatformAlert } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const ERROR_KEYS: Record<string, string> = {
  not_platform_admin: 'error_not_platform_admin',
  mfa_required: 'error_mfa_required',
  subject_required: 'error_subject_required',
  body_required: 'error_body_required',
};

export function AlertForm() {
  const t = useTranslations('Admin');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessCount(null);

    if (!subject.trim()) {
      setError(t('error_subject_required'));
      return;
    }
    if (!body.trim()) {
      setError(t('error_body_required'));
      return;
    }

    startTransition(async () => {
      const result = await sendPlatformAlert({ subject, body });
      if (result.error) {
        setError(t((ERROR_KEYS[result.error] ?? 'error_not_platform_admin') as never));
        return;
      }
      setSuccessCount(result.data?.sentCount ?? 0);
      setSubject('');
      setBody('');
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="card flex max-w-xl flex-col gap-4 p-6">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="alert-subject">{t('alerts_subject_label')}</Label>
        <Input
          id="alert-subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          maxLength={200}
          required
          aria-invalid={!!error}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="alert-body">{t('alerts_body_label')}</Label>
        <Textarea
          id="alert-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={5000}
          rows={5}
          required
          aria-invalid={!!error}
        />
      </div>
      {error && (
        <p
          role="alert"
          className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm font-medium">
          {error}
        </p>
      )}
      {successCount !== null && (
        <p role="status" className="text-sm" style={{ color: 'var(--color-success)' }}>
          {t('alerts_success', { count: successCount })}
        </p>
      )}
      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? t('alerts_sending') : t('alerts_send_button')}
      </Button>
    </form>
  );
}
