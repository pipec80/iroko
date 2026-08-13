'use client';

import { useActionState, useRef } from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
        <Select name="company_size">
          <SelectTrigger id="company_size" className="h-11 w-full">
            <SelectValue placeholder={t('form_size_placeholder')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="solo">{t('form_size_solo')}</SelectItem>
            <SelectItem value="2-5">{t('form_size_2_5')}</SelectItem>
            <SelectItem value="6-20">{t('form_size_6_20')}</SelectItem>
            <SelectItem value="20+">{t('form_size_20_plus')}</SelectItem>
          </SelectContent>
        </Select>
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
        <p
          role="alert"
          className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm font-medium">
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
