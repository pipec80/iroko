import React from 'react';
import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { cn } from '@/lib/utils';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Navigation' });

  return {
    title: t('team'),
  };
}

export default async function TeamPage() {
  const members = [
    {
      name: 'Adrian Jenkins',
      role: 'System Admin',
      status: 'Active',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Adrian',
    },
    {
      name: 'Beatriz Gonzalez',
      role: 'Data Analyst',
      status: 'Active',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Beatriz',
    },
    {
      name: 'Carlos Rodriguez',
      role: 'Viewer',
      status: 'Pending',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Carlos',
    },
    {
      name: 'Elena Torres',
      role: 'Operations',
      status: 'Active',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Elena',
    },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 flex flex-col gap-8 p-8 duration-700">
      <header className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="font-headline text-on-surface text-3xl font-extrabold tracking-tight">
            Team Management
          </h1>
          <p className="text-on-surface-variant text-sm font-medium opacity-60">
            Control access levels and manage workspace collaborators.
          </p>
        </div>
        <button className="bg-primary text-primary-foreground shadow-primary/20 rounded-xl px-6 py-3 text-xs font-bold shadow-lg transition-transform hover:scale-105 active:scale-95">
          INVITE MEMBER
        </button>
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Members List Container */}
        <div className="bg-surface-container-low ambient-shadow border-outline-variant/5 overflow-hidden rounded-3xl border lg:col-span-2">
          <div className="border-outline-variant/5 bg-surface-container-highest/10 border-b px-8 py-6">
            <h3 className="text-on-surface-variant font-mono text-[10px] font-black tracking-[0.2em] uppercase opacity-60">
              Workspace Members
            </h3>
          </div>
          <div className="divide-outline-variant/5 divide-y">
            {members.map((m, i) => (
              <div
                key={i}
                className="hover:bg-surface-container-high/20 flex items-center justify-between px-8 py-5 transition-colors">
                <div className="flex items-center gap-5">
                  <div className="relative h-12 w-12">
                    <Image
                      src={m.avatar}
                      alt={m.name}
                      fill
                      unoptimized
                      className="bg-surface-container-highest border-outline-variant/10 rounded-full border-2 object-cover p-1 shadow-inner"
                    />
                    {m.status === 'Active' && (
                      <div className="bg-primary border-surface-container-low absolute right-0 bottom-0 h-3 w-3 rounded-full border-2" />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <p className="text-on-surface text-sm font-bold">{m.name}</p>
                    <p className="text-on-surface-variant font-mono text-[9px] font-bold tracking-wider uppercase opacity-50">
                      {m.role}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <span
                    className={cn(
                      'rounded-full px-3 py-1 text-[9px] font-black tracking-wider uppercase',
                      m.status === 'Active' ?
                        'bg-primary/10 text-primary'
                      : 'bg-tertiary-container/30 text-tertiary',
                    )}>
                    {m.status}
                  </span>
                  <button className="text-on-surface-variant hover:text-primary flex h-8 w-8 items-center justify-center rounded-lg transition-colors">
                    <span className="material-symbols-outlined text-[18px]">settings</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-surface-container-highest/10 px-8 py-4">
            <button className="text-primary hover:text-primary/80 text-[10px] font-black tracking-widest uppercase transition-colors">
              View All 12 Members
            </button>
          </div>
        </div>

        {/* Info/Stats Card */}
        <div className="space-y-6">
          <div className="bg-primary/5 border-primary/10 rounded-3xl border p-8">
            <div className="bg-primary shadow-primary/20 mb-8 flex h-14 w-14 items-center justify-center rounded-2xl shadow-xl">
              <span className="material-symbols-outlined text-primary-foreground text-3xl">
                verified_user
              </span>
            </div>
            <h2 className="text-on-surface mb-3 text-xl leading-tight font-bold tracking-tight">
              Security & RBAC
            </h2>
            <p className="text-on-surface-variant mb-8 text-sm leading-relaxed">
              Role-Based Access Control is active. You can define custom granular permissions for
              each department and individual user role.
            </p>
            <button className="bg-surface-container-low text-primary border-primary/10 hover:bg-primary/5 w-full rounded-xl border py-4 text-[10px] font-black tracking-widest uppercase transition-all active:scale-95">
              CONFIGURE PERMISSIONS
            </button>
          </div>

          <div className="bg-surface-container-low ambient-shadow border-outline-variant/5 rounded-3xl border p-8">
            <h4 className="text-on-surface-variant font-mono text-[10px] font-black tracking-widest uppercase opacity-60">
              Usage Status
            </h4>
            <div className="mt-4 flex items-end gap-2">
              <span className="text-on-surface text-3xl font-extrabold tracking-tighter">4/10</span>
              <span className="text-on-surface-variant mb-1 text-sm font-medium opacity-60">
                Seats filled
              </span>
            </div>
            <div className="bg-muted mt-6 h-2 w-full overflow-hidden rounded-full">
              <div className="bg-primary h-full w-[40%] rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
