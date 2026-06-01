import Image from 'next/image';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import type { Metadata } from 'next';

import { cn } from '@/lib/utils';
import { storageUrl } from '@/lib/storage';
import { getTeamMembers } from './actions';
import { InviteDialog } from '@/components/dashboard/team/invite-dialog';
import { RemoveMemberDialog } from '@/components/dashboard/team/remove-member-dialog';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Team' });
  return { title: t('title'), description: t('description') };
}

export default async function TeamPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('Team');
  const { data: members } = await getTeamMembers();

  const activeCount = members.filter((m) => m.status === 'active').length;
  const totalSeats = 10; // TODO: derive from billing plan limits

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 flex flex-col gap-8 p-8 duration-700">
      <header className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="font-headline text-on-surface text-3xl font-extrabold tracking-tight">
            {t('title')}
          </h1>
          <p className="text-on-surface-variant text-sm font-medium opacity-60">
            {t('description')}
          </p>
        </div>
        <InviteDialog />
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Members List */}
        <div className="bg-surface-container-low ambient-shadow border-outline-variant/5 overflow-hidden rounded-3xl border lg:col-span-2">
          <div className="border-outline-variant/5 bg-surface-container-highest/10 border-b px-8 py-6">
            <h3 className="text-on-surface-variant font-mono text-[10px] font-black tracking-[0.2em] uppercase opacity-60">
              {t('workspace_members')}
            </h3>
          </div>

          {members.length === 0 ?
            <div className="flex items-center justify-center px-8 py-16">
              <p className="text-on-surface-variant text-sm opacity-60">{t('no_members')}</p>
            </div>
          : <div className="divide-outline-variant/5 divide-y">
              {members.map((m, i) => {
                const given = m.given_name?.trim();
                const family = m.family_name?.trim();
                const fullName =
                  given === family && given ? given : [given, family].filter(Boolean).join(' ');
                const name = m.display_name || fullName || m.email;
                const avatarSeed = m.display_name || m.email;

                return (
                  <div
                    key={m.user_id ?? `pending-${i}`}
                    className="hover:bg-surface-container-high/20 flex items-center justify-between px-8 py-5 transition-colors">
                    <div className="flex items-center gap-5">
                      <div className="relative h-12 w-12">
                        <Image
                          src={
                            storageUrl(m.avatar_url) ??
                            `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(avatarSeed)}`
                          }
                          alt={name}
                          fill
                          unoptimized
                          className="bg-surface-container-highest border-outline-variant/10 rounded-full border-2 object-cover p-1 shadow-inner"
                        />
                        {m.status === 'active' && (
                          <div className="bg-primary border-surface-container-low absolute right-0 bottom-0 h-3 w-3 rounded-full border-2" />
                        )}
                      </div>
                      <div className="flex flex-col">
                        <p className="text-on-surface text-sm font-bold">{name}</p>
                        <p className="text-on-surface-variant font-mono text-[9px] font-bold tracking-wider uppercase opacity-50">
                          {t(`role_${m.role}`, { defaultValue: m.role })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <span
                        className={cn(
                          'rounded-full px-3 py-1 text-[9px] font-black tracking-wider uppercase',
                          m.status === 'active' ?
                            'bg-primary/10 text-primary'
                          : 'bg-tertiary-container/30 text-tertiary',
                        )}>
                        {t(m.status === 'active' ? 'status_active' : 'status_pending')}
                      </span>

                      {/* Only show remove for active non-owner members */}
                      {m.status === 'active' && m.role !== 'owner' && m.user_id && (
                        <RemoveMemberDialog userId={m.user_id} displayName={name} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          }
        </div>

        {/* Info/Stats Sidebar */}
        <div className="space-y-6">
          <div className="bg-primary/5 border-primary/10 rounded-3xl border p-8">
            <div className="bg-primary shadow-primary/20 mb-8 flex h-14 w-14 items-center justify-center rounded-2xl shadow-xl">
              <span className="material-symbols-outlined text-primary-foreground text-3xl">
                verified_user
              </span>
            </div>
            <h2 className="text-on-surface mb-3 text-xl leading-tight font-bold tracking-tight">
              {t('security_rbac_title')}
            </h2>
            <p className="text-on-surface-variant mb-8 text-sm leading-relaxed">
              {t('security_rbac_description')}
            </p>
            <button className="bg-surface-container-low text-primary border-primary/10 hover:bg-primary/5 w-full rounded-xl border py-4 text-[10px] font-black tracking-widest uppercase transition-all active:scale-95">
              {t('configure_permissions')}
            </button>
          </div>

          <div className="bg-surface-container-low ambient-shadow border-outline-variant/5 rounded-3xl border p-8">
            <h4 className="text-on-surface-variant font-mono text-[10px] font-black tracking-widest uppercase opacity-60">
              {t('usage_status')}
            </h4>
            <div className="mt-4 flex items-end gap-2">
              <span className="text-on-surface text-3xl font-extrabold tracking-tighter">
                {activeCount}/{totalSeats}
              </span>
              <span className="text-on-surface-variant mb-1 text-sm font-medium opacity-60">
                {t('seats_filled')}
              </span>
            </div>
            <div className="bg-muted mt-6 h-2 w-full overflow-hidden rounded-full">
              <div
                className="bg-primary h-full rounded-full transition-all"
                style={{ width: `${Math.min((activeCount / totalSeats) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
