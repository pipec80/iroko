'use client';

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
    // Error is already logged server-side by Next.js — only console.error on client
    console.error('[GlobalError]', error.digest, error.message);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 p-8">
      <div className="bg-error/10 flex h-20 w-20 items-center justify-center rounded-full">
        <span className="material-symbols-outlined text-error text-4xl">error</span>
      </div>
      <div className="space-y-2 text-center">
        <h1 className="text-on-surface font-headline text-2xl font-bold tracking-tight">
          {t('title')}
        </h1>
        <p className="text-on-surface-variant max-w-md text-sm">{t('description')}</p>
      </div>
      <button
        onClick={reset}
        className="bg-primary text-on-primary rounded-xl px-8 py-3 text-sm font-bold shadow-md transition-all hover:shadow-lg active:scale-95">
        {t('retry')}
      </button>
    </div>
  );
}
