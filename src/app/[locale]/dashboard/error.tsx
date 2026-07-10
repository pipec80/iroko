'use client';

import * as Sentry from '@sentry/nextjs';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

export default function DashboardError({
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
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-6 p-8">
      <div className="bg-error/10 flex size-16 items-center justify-center rounded-2xl">
        <span className="material-symbols-outlined text-error text-3xl">warning</span>
      </div>
      <div className="space-y-2 text-center">
        <h2 className="text-on-surface font-headline text-xl font-bold">{t('dashboard_title')}</h2>
        <p className="text-on-surface-variant max-w-sm text-sm">{t('dashboard_description')}</p>
      </div>
      <button
        onClick={reset}
        className="bg-primary text-on-primary rounded-xl px-6 py-2.5 text-sm font-bold shadow-md transition-all hover:shadow-lg active:scale-95">
        {t('retry')}
      </button>
    </div>
  );
}
