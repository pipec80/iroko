'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';

import { publishAnnouncement } from './actions';
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
import { Textarea } from '@/components/ui/textarea';
import { ANNOUNCEMENT_TYPES } from '@/lib/validation/admin';

const ERROR_KEYS: Record<string, string> = {
  not_platform_admin: 'error_not_platform_admin',
  mfa_required: 'error_mfa_required',
  validation_error: 'announcements_error_validation',
  title_required: 'announcements_error_validation',
  invalid_type: 'announcements_error_validation',
};

export function AnnouncementForm() {
  const t = useTranslations('Admin');
  const [type, setType] = useState<(typeof ANNOUNCEMENT_TYPES)[number]>('info');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [link, setLink] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!title.trim()) {
      setError(t('announcements_error_validation'));
      return;
    }

    startTransition(async () => {
      const result = await publishAnnouncement({ type, title, body, link });
      if (result.error) {
        setError(t((ERROR_KEYS[result.error] ?? 'error_not_platform_admin') as never));
        return;
      }
      setSuccess(true);
      setTitle('');
      setBody('');
      setLink('');
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="card flex max-w-xl flex-col gap-4 p-6">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="announcement-type">{t('announcements_type_label')}</Label>
        <Select
          value={type}
          onValueChange={(value) => setType(value as (typeof ANNOUNCEMENT_TYPES)[number])}>
          <SelectTrigger id="announcement-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ANNOUNCEMENT_TYPES.map((value) => (
              <SelectItem key={value} value={value}>
                {t(`announcements_type_${value}` as never)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="announcement-title">{t('announcements_title_label')}</Label>
        <Input
          id="announcement-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          required
          aria-invalid={!!error}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="announcement-body">{t('announcements_body_label')}</Label>
        <Textarea
          id="announcement-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={2000}
          rows={4}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="announcement-link">{t('announcements_link_label')}</Label>
        <Input
          id="announcement-link"
          type="url"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          maxLength={2000}
          placeholder="https://…"
        />
      </div>
      {error && (
        <p
          role="alert"
          className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm font-medium">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="text-sm" style={{ color: 'var(--color-success)' }}>
          {t('announcements_success')}
        </p>
      )}
      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? t('announcements_publishing') : t('announcements_publish_button')}
      </Button>
    </form>
  );
}
