import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getAdminAccounts } from '../actions';
import { ImpersonateButton } from './impersonate-button';

export default async function AdminAccountDetailPage({
  params,
}: {
  params: Promise<{ locale: string; accountId: string }>;
}) {
  const { locale, accountId } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('Admin');
  // No single-account RPC in C1 — reuse the list RPC with a tight search on
  // this account's own slug/name isn't reliable, so we fetch a page and find
  // it. Acceptable at C1 scale (call-center lookup, not a hot path); a
  // dedicated `admin_get_account` RPC can be added later if this page needs
  // more than the list already returns.
  const { data, error } = await getAdminAccounts({ limit: 100 });
  if (error === 'not_platform_admin' || error === 'mfa_required') notFound();

  const account = data?.entries.find((entry) => entry.accountId === accountId);
  if (!account) notFound();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="display" style={{ fontSize: 36 }}>
          {account.name}
        </h1>
        <p style={{ marginTop: 6, fontSize: 15, color: 'var(--text-secondary)' }}>
          {t('account_detail_title')}
        </p>
      </header>

      <div className="card flex flex-col gap-3 p-6 text-sm">
        <div>
          <span className="text-muted-foreground">{t('col_owner_email')}: </span>
          {account.ownerEmail ?? '—'}
        </div>
        <div>
          <span className="text-muted-foreground">{t('col_plan')}: </span>
          {account.planSlug ?? t('no_plan')}
        </div>
        <div>
          <span className="text-muted-foreground">{t('col_subscription_status')}: </span>
          {account.subscriptionStatus ?? '—'}
        </div>
        <div>
          <span className="text-muted-foreground">{t('col_members')}: </span>
          {account.memberCount}
        </div>
        {account.ownerId && (
          <div className="pt-2">
            <ImpersonateButton
              targetUserId={account.ownerId}
              targetName={account.ownerEmail ?? account.name}
            />
          </div>
        )}
      </div>
    </div>
  );
}
