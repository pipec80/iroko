import { getTranslations, setRequestLocale } from 'next-intl/server';
import { BillingTab } from '@/components/dashboard/org/billing-tab';

import type { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Billing' });
  return { title: t('page_heading'), description: t('page_description') };
}

export default async function BillingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('Billing');

  return (
    <div className="animate-in fade-in space-y-6 duration-700">
      <header>
        <span className="eyebrow-sm">{t('page_title')}</span>
        <h1 className="display-italic mt-1.5 text-[40px]">{t('page_heading')}</h1>
        <p className="text-muted-foreground mt-1 text-[15px]">{t('page_description')}</p>
      </header>

      <BillingTab />
    </div>
  );
}
