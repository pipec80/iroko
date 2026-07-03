import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getAccountAuditLogs } from './actions';
import { AuditLogTable } from '@/components/dashboard/activity/audit-log-table';
import { createClient } from '@/lib/supabase/server';
import { getUserTimezone } from '@/lib/user-timezone';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'ActivityLog' });
  return { title: t('page_title'), description: t('subtitle') };
}

export default async function ActivityPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('ActivityLog');
  const supabase = await createClient();
  const [{ data, error }, timezone] = await Promise.all([
    getAccountAuditLogs({}),
    getUserTimezone(supabase),
  ]);

  if (error === 'not_authorized' || error === 'no_account') {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <p className="eyebrow-sm">{t('title')}</p>
        <h1 className="display" style={{ fontSize: 44, marginTop: 6 }}>
          {t('page_title')}
        </h1>
        <p style={{ marginTop: 6, fontSize: 15, color: 'var(--text-secondary)' }}>
          {t('subtitle')}
        </p>
      </header>

      <AuditLogTable
        initialEntries={data?.entries ?? []}
        initialCursor={data?.nextCursor ?? null}
        timezone={timezone}
      />
    </div>
  );
}
