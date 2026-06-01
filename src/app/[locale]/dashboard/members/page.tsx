import Image from 'next/image';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Users, ShieldCheck } from 'lucide-react';

import type { Metadata } from 'next';

import { cn } from '@/lib/utils';
import { storageUrl } from '@/lib/storage';
import { getTeamMembers } from '../team/actions';
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

export default async function MembersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('Team');
  const { data: members } = await getTeamMembers();

  const activeCount = members.filter((m) => m.status === 'active').length;
  const totalSeats = 10; // TODO: derive from billing plan

  return (
    <div className="animate-in fade-in space-y-6 duration-700">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-foreground text-3xl font-extrabold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground text-sm">{t('description')}</p>
        </div>
        <InviteDialog />
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Members list */}
        <div
          className="border-border overflow-hidden rounded-2xl border lg:col-span-2"
          style={{ background: 'var(--surface-1)' }}>
          <div className="border-border border-b px-6 py-4">
            <span className="text-muted-foreground font-mono text-[10px] font-bold tracking-[0.18em] uppercase">
              {t('workspace_members')}
            </span>
          </div>

          {members.length === 0 ?
            <div className="flex items-center justify-center px-6 py-16">
              <p className="text-muted-foreground text-sm">{t('no_members')}</p>
            </div>
          : <div className="divide-border divide-y">
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
                    className="hover:bg-surface-3 flex items-center justify-between px-6 py-4 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="relative h-9 w-9">
                        <Image
                          src={
                            storageUrl(m.avatar_url) ??
                            `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(avatarSeed)}`
                          }
                          alt={name}
                          fill
                          unoptimized
                          className="border-border rounded-full border object-cover"
                        />
                        {m.status === 'active' && (
                          <span
                            className="border-surface-1 absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full border-2"
                            style={{ background: '#10b981' }}
                          />
                        )}
                      </div>
                      <div>
                        <p className="text-foreground text-[13px] font-semibold">{name}</p>
                        <p className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
                          {t(`role_${m.role}`, { defaultValue: m.role })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-0.5 font-mono text-[9px] font-bold tracking-wider uppercase',
                          m.status === 'active' ?
                            'text-emerald-700 dark:text-emerald-400'
                          : 'text-muted-foreground',
                        )}
                        style={{
                          background:
                            m.status === 'active' ?
                              'rgba(16,185,129,0.1)'
                            : 'rgba(100,116,139,0.1)',
                        }}>
                        {t(m.status === 'active' ? 'status_active' : 'status_pending')}
                      </span>
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

        {/* Sidebar */}
        <div className="flex flex-col gap-4">
          {/* RBAC card */}
          <div
            className="border-border flex flex-col gap-4 rounded-2xl border p-6"
            style={{ background: 'var(--surface-1)' }}>
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ background: 'var(--color-cobalt)18' }}>
              <ShieldCheck size={18} style={{ color: 'var(--color-cobalt)' }} strokeWidth={1.75} />
            </div>
            <div className="space-y-1">
              <h3 className="text-foreground text-[14px] font-semibold">
                {t('security_rbac_title')}
              </h3>
              <p className="text-muted-foreground text-[12px] leading-relaxed">
                {t('security_rbac_description')}
              </p>
            </div>
            <button
              type="button"
              className="border-border text-foreground hover:bg-surface-3 w-full rounded-lg border py-2 text-[12px] font-medium transition-colors">
              {t('configure_permissions')}
            </button>
          </div>

          {/* Usage card */}
          <div
            className="border-border flex flex-col gap-3 rounded-2xl border p-6"
            style={{ background: 'var(--surface-1)' }}>
            <div className="flex items-center gap-2">
              <Users size={14} className="text-muted-foreground" strokeWidth={1.75} />
              <span className="text-muted-foreground font-mono text-[10px] font-bold tracking-widest uppercase">
                {t('usage_status')}
              </span>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-foreground font-mono text-3xl font-bold tracking-tight">
                {activeCount}/{totalSeats}
              </span>
              <span className="text-muted-foreground mb-0.5 text-[12px]">{t('seats_filled')}</span>
            </div>
            <div className="bg-surface-3 h-1.5 w-full overflow-hidden rounded-full">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min((activeCount / totalSeats) * 100, 100)}%`,
                  background: 'var(--color-cobalt)',
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
