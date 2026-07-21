import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getAdminAccounts } from './actions';
import { Link } from '@/i18n/routing';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Admin' });
  return { title: t('accounts_title'), description: t('accounts_subtitle') };
}

export default async function AdminAccountsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('Admin');
  const { data, error } = await getAdminAccounts({});

  if (error === 'not_platform_admin' || error === 'mfa_required') {
    notFound();
  }

  const entries = data?.entries ?? [];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="display" style={{ fontSize: 36 }}>
          {t('accounts_title')}
        </h1>
        <p style={{ marginTop: 6, fontSize: 15, color: 'var(--text-secondary)' }}>
          {t('accounts_subtitle')}
        </p>
      </header>

      <div className="card overflow-x-auto">
        <div className="min-w-[860px]">
          <div className="col-header members-row bg-surface-2 py-3">
            <span />
            <span>{t('col_account_name')}</span>
            <span>{t('col_owner_email')}</span>
            <span>{t('col_plan')}</span>
            <span>{t('col_subscription_status')}</span>
            <span className="text-right">{t('col_members')}</span>
          </div>

          {entries.length === 0 ?
            <div className="flex items-center justify-center px-6 py-16">
              <p className="text-muted-foreground text-sm">{t('no_accounts')}</p>
            </div>
          : entries.map((entry, idx) => (
              <Link
                key={entry.accountId}
                href={`/dashboard/admin/accounts/${entry.accountId}`}
                className="members-row py-[14px]"
                style={{ borderTop: idx === 0 ? 'none' : '1px solid var(--border)' }}>
                <span />
                <span className="text-foreground truncate text-sm font-medium">{entry.name}</span>
                <span className="text-muted-foreground truncate text-sm">
                  {entry.ownerEmail ?? '—'}
                </span>
                <span className="text-muted-foreground text-sm">
                  {entry.planSlug ?? t('no_plan')}
                </span>
                <span className="text-muted-foreground text-sm">
                  {entry.subscriptionStatus ?? '—'}
                </span>
                <span className="text-muted-foreground text-right text-sm">
                  {entry.memberCount}
                </span>
              </Link>
            ))
          }
        </div>
      </div>
    </div>
  );
}
