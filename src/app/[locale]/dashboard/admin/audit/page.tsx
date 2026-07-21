import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getPlatformAuditLogs } from './actions';
import { AuditLogTable } from '@/components/dashboard/activity/audit-log-table';
import { createClient } from '@/lib/supabase/server';
import { getUserTimezone } from '@/lib/user-timezone';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Admin' });
  return { title: t('audit_title'), description: t('audit_subtitle') };
}

export default async function AdminAuditPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('Admin');
  const supabase = await createClient();
  const [{ data, error }, timezone] = await Promise.all([
    getPlatformAuditLogs({}),
    getUserTimezone(supabase),
  ]);

  if (error === 'not_platform_admin' || error === 'mfa_required') notFound();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="display" style={{ fontSize: 36 }}>
          {t('audit_title')}
        </h1>
        <p style={{ marginTop: 6, fontSize: 15, color: 'var(--text-secondary)' }}>
          {t('audit_subtitle')}
        </p>
      </header>

      <AuditLogTable
        variant="platform"
        initialEntries={(data?.entries ?? []).map((entry) => ({
          id: entry.id,
          actorId: entry.actorId,
          actorName: entry.actorName,
          avatarUrl: null,
          action: entry.action,
          resourceType: entry.resourceType,
          resourceId: entry.resourceId,
          createdAt: entry.createdAt,
          accountName: entry.accountId,
          impersonatorName: entry.impersonatorId,
        }))}
        initialCursor={data?.nextCursor ?? null}
        timezone={timezone}
      />
    </div>
  );
}
