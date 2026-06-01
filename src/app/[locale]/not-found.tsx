import { getLocale, getTranslations, setRequestLocale } from 'next-intl/server';

import { Link } from '@/i18n/routing';

export default async function NotFoundPage() {
  const locale = await getLocale();
  setRequestLocale(locale);
  const t = await getTranslations('Errors');

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <div className="text-center">
        <span className="text-on-surface-variant font-mono text-[120px] leading-none font-bold tracking-tighter opacity-10">
          404
        </span>
      </div>
      <div className="space-y-3 text-center">
        <h1 className="text-on-surface font-headline text-2xl font-bold tracking-tight">
          {t('not_found_title')}
        </h1>
        <p className="text-on-surface-variant max-w-md text-sm">{t('not_found_description')}</p>
      </div>
      <Link
        href="/dashboard"
        className="bg-primary text-on-primary rounded-xl px-8 py-3 text-sm font-bold shadow-md transition-all hover:shadow-lg active:scale-95">
        {t('go_home')}
      </Link>
    </div>
  );
}
