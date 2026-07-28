'use client';

import { useActionState, useRef } from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { submitContactForm } from './actions';

const ERROR_KEYS: Record<string, string> = {
  name_required: 'error_name_required',
  name_too_long: 'error_name_too_long',
  email_required: 'error_email_required',
  invalid_email_format: 'error_invalid_email_format',
  message_required: 'error_message_required',
  message_too_long: 'error_message_too_long',
  validation_error: 'error_generic',
  send_failed: 'error_generic',
};

export function ContactForm() {
  const t = useTranslations('PublicContact');
  const formRef = useRef<HTMLFormElement>(null);

  const [state, action, isPending] = useActionState(
    async (_prev: { error?: string; success?: boolean }, formData: FormData) => {
      const result = await submitContactForm(_prev, formData);
      if (result.success) formRef.current?.reset();
      return result;
    },
    {},
  );

  return (
    <form ref={formRef} action={action} noValidate className="space-y-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-foreground block text-sm font-semibold" htmlFor="name">
            {t('form_name_label')}
          </Label>
          <Input
            className="h-11"
            id="name"
            name="name"
            placeholder="Jane Doe"
            type="text"
            required
            aria-invalid={!!state.error}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-foreground block text-sm font-semibold" htmlFor="email">
            {t('form_email_label')}
          </Label>
          <Input
            className="h-11"
            id="email"
            name="email"
            placeholder="jane@company.com"
            type="email"
            required
            aria-invalid={!!state.error}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-foreground block text-sm font-semibold" htmlFor="company_size">
          {t('form_size_label')}
        </Label>
        <div className="relative">
          <select
            className="border-border bg-background text-foreground focus:ring-primary h-11 w-full cursor-pointer appearance-none rounded-md border px-4 py-2 text-sm scheme-light shadow-sm transition-all focus:ring-1 focus:outline-none dark:scheme-dark"
            id="company_size"
            name="company_size"
            defaultValue="">
            <option disabled value="">
              {t('form_size_placeholder')}
            </option>
            <option value="solo">{t('form_size_solo')}</option>
            <option value="2-5">{t('form_size_2_5')}</option>
            <option value="6-20">{t('form_size_6_20')}</option>
            <option value="20+">{t('form_size_20_plus')}</option>
          </select>
          <div className="text-muted-foreground pointer-events-none absolute inset-y-0 right-0 flex items-center px-4">
            <svg
              viewBox="0 0 16 16"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true">
              <path d="M4 6l4 4 4-4" />
            </svg>
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-foreground block text-sm font-semibold" htmlFor="message">
          {t('form_message_label')}
        </Label>
        <textarea
          className="border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-primary w-full resize-none rounded-md border px-4 py-3 text-sm shadow-sm transition-all focus:ring-1 focus:outline-none"
          id="message"
          name="message"
          placeholder={t('form_message_placeholder')}
          rows={5}
          required
          aria-invalid={!!state.error}
        />
      </div>

      {state.error && (
        <p role="alert" className="text-destructive text-sm">
          {t((ERROR_KEYS[state.error] ?? 'error_generic') as never)}
        </p>
      )}
      {state.success && (
        <p role="status" className="text-sm" style={{ color: 'var(--color-success)' }}>
          {t('form_success')}
        </p>
      )}

      <Button
        type="submit"
        disabled={isPending}
        className="h-11 w-full sm:w-auto sm:px-10"
        style={{ background: 'var(--color-ink)', color: 'var(--color-bone)' }}>
        {isPending ? t('form_sending') : t('form_submit')}
      </Button>
    </form>
  );
}
