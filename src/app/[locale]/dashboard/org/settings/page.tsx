import { Suspense } from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { BillingTab } from '@/components/dashboard/org/billing-tab';

export default async function OrgSettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  // Need to get the proper translations or use Settings for now
  const t = await getTranslations('Settings');

  return (
    <div className="animate-in fade-in flex flex-col gap-8 duration-700">
      <div className="flex flex-col gap-2">
        <h1 className="font-headline text-on-surface text-3xl font-bold tracking-tight md:text-4xl">
          {t('tabs.billing')}
        </h1>
        <p className="text-on-surface-variant text-base">
          Manage your workspace billing and subscription.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="flex flex-col gap-8">
            <div className="bg-muted h-12 w-96 animate-pulse rounded-xl" />
            <div className="bg-muted h-[400px] w-full animate-pulse rounded-3xl" />
          </div>
        }>
        <div className="grid grid-cols-1 items-start gap-8">
          <BillingTab />
        </div>
      </Suspense>
    </div>
  );
}
