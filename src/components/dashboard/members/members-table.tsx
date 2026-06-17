'use client';

import { useState, useActionState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { MoreHorizontal, Search } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { TeamMember } from '@/app/[locale]/dashboard/team/actions';
import { removeMember } from '@/app/[locale]/dashboard/team/actions';
import { storageUrl } from '@/lib/storage';

function memberTone(role: string, index: number): string {
  if (role === 'owner') return 'var(--color-poppy)';
  if (role === 'admin') return 'var(--color-gold)';
  return index % 2 === 0 ? 'var(--color-indigo)' : 'var(--color-ink)';
}

function getInitials(member: TeamMember): string {
  const parts = [member.given_name?.trim(), member.family_name?.trim()].filter(Boolean);
  const name = parts.length > 0 ? parts.join(' ') : (member.display_name ?? member.email);
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

function getMemberName(member: TeamMember): string {
  const given = member.given_name?.trim();
  const family = member.family_name?.trim();
  if (given && family && given !== family) return `${given} ${family}`;
  const name = given ?? family;
  if (name) return name;
  return member.display_name ?? member.email;
}

type RowActionsProps = { member: TeamMember; displayName: string };

function RowActions({ member, displayName }: RowActionsProps) {
  const t = useTranslations('Team');
  const [open, setOpen] = useState(false);

  const [state, action, isPending] = useActionState(
    async (_prev: { error?: string; success?: boolean }) => {
      const fd = new FormData();
      fd.set('userId', member.user_id ?? '');
      const result = await removeMember(fd);
      if (result.success) setOpen(false);
      return result;
    },
    {},
  );

  if (!member.user_id || member.role === 'owner') {
    return <span className="btn-icon" style={{ width: 28, height: 28 }} />;
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-icon" style={{ width: 28, height: 28 }}>
        <MoreHorizontal
          style={{ width: 15, height: 15, color: 'var(--text-tertiary)', strokeWidth: 1.5 }}
        />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('remove_title')}</DialogTitle>
            <DialogDescription>{t('remove_description', { name: displayName })}</DialogDescription>
          </DialogHeader>
          {state.error && (
            <p
              className="rounded-lg px-3 py-2 text-xs font-medium"
              style={{ background: 'var(--color-poppy-wash)', color: 'var(--color-poppy)' }}>
              {state.error}
            </p>
          )}
          <DialogFooter>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="border-border text-foreground rounded-lg border px-4 py-2 text-sm font-medium transition-colors">
              {t('cancel')}
            </button>
            <form action={action}>
              <button
                type="submit"
                disabled={isPending}
                className="bg-primary rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                style={{ border: 0 }}>
                {isPending ? t('removing') : t('confirm_remove')}
              </button>
            </form>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

const ROLE_LABELS: Record<string, 'role_owner' | 'role_admin' | 'role_member' | 'role_viewer'> = {
  owner: 'role_owner',
  admin: 'role_admin',
  member: 'role_member',
  viewer: 'role_viewer',
};

type Props = { members: TeamMember[] };

export function MembersTable({ members }: Props) {
  const t = useTranslations('Team');
  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const filtered = members.filter((m) => {
    const name = getMemberName(m).toLowerCase();
    const matchQ =
      !q || name.includes(q.toLowerCase()) || m.email.toLowerCase().includes(q.toLowerCase());
    const matchRole = !roleFilter || m.role === roleFilter;
    const matchStatus = !statusFilter || m.status === statusFilter;
    return matchQ && matchRole && matchStatus;
  });

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-2.5 md:flex-row md:items-center">
        <div className="relative max-w-[360px] flex-1">
          <Search
            className="absolute top-1/2 left-3 -translate-y-1/2"
            style={{ width: 14, height: 14, color: 'var(--text-tertiary)', strokeWidth: 1.5 }}
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('search_members')}
            className="toolbar-control w-full text-[13px]"
            style={{
              padding: '0 12px 0 34px',
              color: 'var(--text-primary)',
              fontFamily: 'inherit',
            }}
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="toolbar-control cursor-pointer px-3">
          <option value="">{t('filter_all_roles')}</option>
          <option value="owner">{t('role_owner')}</option>
          <option value="admin">{t('role_admin')}</option>
          <option value="member">{t('role_member')}</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="toolbar-control cursor-pointer px-3">
          <option value="">{t('filter_all_statuses')}</option>
          <option value="active">{t('status_active')}</option>
          <option value="pending">{t('status_invited')}</option>
        </select>
      </div>

      {/* Table card */}
      <div className="card overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Header row */}
          <div className="col-header members-row bg-surface-2 py-3">
            <span />
            <span>{t('col_member')}</span>
            <span>{t('role_label')}</span>
            <span>{t('col_status')}</span>
            <span className="text-right">{t('col_joined')}</span>
            <span />
          </div>

          {filtered.length === 0 ?
            <div className="flex items-center justify-center px-6 py-16">
              <p className="text-muted-foreground text-sm">{t('no_members')}</p>
            </div>
          : filtered.map((member, idx) => {
              const displayName = getMemberName(member);
              const initials = getInitials(member);
              const tone = memberTone(member.role, idx);
              const isActive = member.status === 'active';
              const roleKey = ROLE_LABELS[member.role] ?? 'role_member';
              const avatarUrl = storageUrl(member.avatar_url);

              return (
                <div
                  key={member.user_id ?? `pending-${idx}`}
                  className="members-row py-[14px]"
                  style={{ borderTop: idx === 0 ? 'none' : '1px solid var(--border)' }}>
                  {/* Avatar */}
                  {avatarUrl ?
                    <div className="relative size-8 overflow-hidden rounded-[6px]">
                      <Image
                        src={avatarUrl}
                        alt={displayName}
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    </div>
                  : <div className="avatar-32" style={{ background: tone }}>
                      {initials}
                    </div>
                  }

                  {/* Name + email */}
                  <div className="min-w-0">
                    <div className="text-foreground truncate text-sm font-semibold">
                      {displayName}
                    </div>
                    <div
                      className="truncate font-mono text-[11px]"
                      style={{ color: 'var(--text-tertiary)' }}>
                      {member.email}
                    </div>
                  </div>

                  {/* Role chip */}
                  <div>
                    <span
                      className="chip chip-md"
                      style={{
                        background:
                          member.role === 'owner' ? 'var(--color-poppy)'
                          : member.role === 'admin' ? 'var(--color-poppy-wash)'
                          : 'var(--surface-2)',
                        color:
                          member.role === 'owner' ? '#fff'
                          : member.role === 'admin' ? 'var(--color-poppy)'
                          : 'var(--text-secondary)',
                        border:
                          member.role !== 'owner' && member.role !== 'admin' ?
                            '1px solid var(--border)'
                          : 'none',
                      }}>
                      {t(roleKey)}
                    </span>
                  </div>

                  {/* Status chip */}
                  <div>
                    <span
                      className="chip chip-sm"
                      style={{
                        background: isActive ? 'rgba(111,147,98,0.16)' : 'rgba(217,164,65,0.18)',
                        color: isActive ? '#4f6f44' : '#a87a1f',
                      }}>
                      <span
                        className="inline-block size-[5px] shrink-0 rounded-full"
                        style={{ background: isActive ? '#6f9362' : '#d9a441' }}
                      />
                      {isActive ? t('status_active') : t('status_invited')}
                    </span>
                  </div>

                  {/* Joined at */}
                  <span
                    className="text-muted-foreground text-right font-mono text-xs"
                    style={{ letterSpacing: '0.02em' }}>
                    {member.joined_at ?
                      new Date(member.joined_at).toLocaleDateString(undefined, {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '—'}
                  </span>

                  <RowActions member={member} displayName={displayName} />
                </div>
              );
            })
          }
        </div>
      </div>
    </div>
  );
}
