import { getTranslations, setRequestLocale } from 'next-intl/server';
import { BillingTab } from '@/components/dashboard/org/billing-tab';

import type { Metadata } from 'next';
import { appConfig } from '@/config/app.config';

export async function generateMetadata(): Promise<Metadata> {
  return { title: `Billing — ${appConfig.brand}` };
}

export default async function BillingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('Billing');

  return (
    <div className="animate-in fade-in space-y-6 duration-700">
      <header className="space-y-1">
        <h1 className="text-foreground text-3xl font-extrabold tracking-tight">
          {t('page_title')}
        </h1>
        <p className="text-muted-foreground text-sm">{t('page_description')}</p>
      </header>

      <BillingTab />
    </div>
  );
}
