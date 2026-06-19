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
    <div className="animate-in fade-in slide-in-from-bottom-4 flex flex-col gap-8 duration-700">
      <header className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-foreground text-3xl font-extrabold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground text-sm font-medium">{t('description')}</p>
        </div>
        <InviteDialog />
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Members List */}
        <div className="card overflow-hidden lg:col-span-2">
          <div className="border-border bg-muted/30 border-b px-6 py-4">
            <h3 className="text-muted-foreground font-mono text-[10px] font-bold tracking-[0.2em] uppercase">
              {t('workspace_members')}
            </h3>
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
                    className="hover:bg-surface-1 flex items-center justify-between px-6 py-4 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="relative h-10 w-10 shrink-0">
                        <Image
                          src={
                            storageUrl(m.avatar_url) ??
                            `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(avatarSeed)}`
                          }
                          alt={name}
                          fill
                          unoptimized
                          className="border-border rounded-full border-2 object-cover p-0.5"
                        />
                        {m.status === 'active' && (
                          <div
                            className="border-background absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full border-2"
                            style={{ background: 'var(--color-cobalt)' }}
                          />
                        )}
                      </div>
                      <div className="flex flex-col">
                        <p className="text-foreground text-sm font-semibold">{name}</p>
                        <p className="text-muted-foreground font-mono text-[10px] font-bold tracking-wider uppercase">
                          {t(`role_${m.role}`, { defaultValue: m.role })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-0.5 font-mono text-[9px] font-bold tracking-wider uppercase',
                          m.status === 'active' ?
                            'bg-primary/10 text-primary'
                          : 'bg-muted text-muted-foreground',
                        )}>
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

        {/* Info/Stats Sidebar */}
        <div className="space-y-6">
          <div className="card card-pad space-y-4">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl"
              style={{ background: 'var(--color-cobalt)', color: '#fff' }}>
              <span className="material-symbols-outlined text-2xl">verified_user</span>
            </div>
            <h2 className="text-foreground text-lg leading-tight font-bold tracking-tight">
              {t('security_rbac_title')}
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {t('security_rbac_description')}
            </p>
            <button className="border-border text-muted-foreground hover:bg-surface-1 w-full rounded-lg border py-3 font-mono text-[10px] font-bold tracking-widest uppercase transition-colors active:scale-95">
              {t('configure_permissions')}
            </button>
          </div>

          <div className="card card-pad space-y-4">
            <h4 className="text-muted-foreground font-mono text-[10px] font-bold tracking-widest uppercase">
              {t('usage_status')}
            </h4>
            <div className="flex items-end gap-2">
              <span className="text-foreground text-3xl font-extrabold tracking-tighter">
                {activeCount}/{totalSeats}
              </span>
              <span className="text-muted-foreground mb-1 text-sm font-medium">
                {t('seats_filled')}
              </span>
            </div>
            <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
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
