import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { AccountsTable } from './accounts-table';
import { getAdminAccounts } from './actions';

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
  const nextCursor = data?.nextCursor ?? null;

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

      <AccountsTable initialEntries={entries} initialCursor={nextCursor} />
    </div>
  );
}
