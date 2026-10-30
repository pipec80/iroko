import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getAdminAccount } from '../actions';
import { ImpersonateButton } from './impersonate-button';

export default async function AdminAccountDetailPage({
  params,
}: {
  params: Promise<{ locale: string; accountId: string }>;
}) {
  const { locale, accountId } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('Admin');
  const { data: account, error } = await getAdminAccount(accountId);
  if (error === 'not_platform_admin' || error === 'mfa_required') notFound();
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
