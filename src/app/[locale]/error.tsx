'use client';

import * as Sentry from '@sentry/nextjs';
import { AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('Errors');

  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div role="alert" className="flex min-h-[60vh] flex-col items-center justify-center gap-6 p-8">
      <div className="bg-destructive/10 flex h-20 w-20 items-center justify-center rounded-full">
        <AlertCircle
          aria-hidden="true"
          className="text-destructive"
          style={{ width: 40, height: 40, strokeWidth: 1.5 }}
        />
      </div>
      <div className="space-y-2 text-center">
        <h1 className="text-foreground text-2xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground max-w-md text-sm">{t('description')}</p>
      </div>
      <button
        onClick={reset}
        className="bg-primary text-primary-foreground rounded-xl px-8 py-3 text-sm font-bold shadow-md transition-all hover:shadow-lg active:scale-95">
        {t('retry')}
      </button>
    </div>
  );
}
