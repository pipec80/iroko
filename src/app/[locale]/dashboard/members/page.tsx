import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getTeamMembers } from '../team/actions';
import { InviteDialog } from '@/components/dashboard/team/invite-dialog';
import { MembersTable } from '@/components/dashboard/members/members-table';
import { getActiveAccountId } from '@/lib/active-account';
import { createClient } from '@/lib/supabase/server';
import { getUserTimezone } from '@/lib/user-timezone';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Team' });
  return { title: t('members_page_title'), description: t('description') };
}

export default async function MembersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('Team');
  const supabase = await createClient();
  const [{ data: members }, timezone, accountId, userData] = await Promise.all([
    getTeamMembers(),
    getUserTimezone(supabase),
    getActiveAccountId(),
    supabase.auth.getUser(),
  ]);

  const activeCount = members.filter((m) => m.status === 'active').length;
  const pendingCount = members.filter((m) => m.status === 'pending').length;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <header className="flex flex-col items-start gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow-sm">{t('title')}</p>
          <h1 className="display" style={{ fontSize: 44, marginTop: 6 }}>
            {t('members_page_title')}
          </h1>
          <p style={{ marginTop: 6, fontSize: 15, color: 'var(--text-secondary)' }}>
            {t('members_subtitle', { active: activeCount, pending: pendingCount })}
          </p>
        </div>
        <InviteDialog />
      </header>

      {/* Table with toolbar */}
      <MembersTable
        members={members}
        timezone={timezone}
        accountId={accountId}
        currentUserId={userData.data.user?.id ?? null}
      />
    </div>
  );
}
