import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { appConfig } from '@/config/app.config';
import { BillingTab } from '@/components/dashboard/org/billing-tab';
import { getActiveAccountId } from '@/lib/active-account';
import { canReadBilling } from '@/lib/permissions';
import { createClient } from '@/lib/supabase/server';

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
  if (!appConfig.features.billing) notFound();
  const { locale } = await params;
  setRequestLocale(locale);

  const accountId = await getActiveAccountId();
  if (!accountId) notFound();
  const supabase = await createClient();
  const { data: role, error } = await supabase.rpc('get_my_account_role', {
    p_account_id: accountId,
  });
  if (error || !canReadBilling(role)) notFound();
  const t = await getTranslations('Billing');

  return (
    <div className="animate-in fade-in space-y-6 duration-700">
      <header>
        <span className="eyebrow-sm">{t('page_title')}</span>
        <h1 className="display-italic mt-1.5 text-[40px]">{t('page_heading')}</h1>
        <p className="text-muted-foreground mt-1 text-[15px]">{t('page_description')}</p>
      </header>

      <BillingTab currentUserRole={role} accountId={accountId} />
    </div>
  );
}
