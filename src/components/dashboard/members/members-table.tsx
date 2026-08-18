'use client';

import { useState, useActionState } from 'react';
import Image from 'next/image';
import { useTranslations, useLocale } from 'next-intl';
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
import {
  changeMemberRole,
  removeMember,
  revokeInvitation,
  transferOwnership,
} from '@/app/[locale]/dashboard/team/actions';
import { usePresence } from '@/hooks/use-presence';
import { canManageMembers, type MembershipRole } from '@/lib/permissions';
import { storageUrl } from '@/lib/storage';
import { INVITABLE_ROLES } from '@/lib/validation/team';

type LifecycleErrorKey =
  | 'error_last_owner_must_transfer'
  | 'error_cannot_change_own_role'
  | 'error_use_transfer_ownership'
  | 'error_invitation_not_pending'
  | 'error_not_authorized'
  | 'error_account_not_found'
  | 'error_not_a_team'
  | 'error_not_a_member'
  | 'error_already_owner'
  | 'error_target_not_a_member'
  | 'error_invitation_not_found'
  | 'error_invalid_input';

/** Mapea el `error` de una lifecycle action a su clave i18n — nunca cae en error_generic. */
function lifecycleErrorKey(error: string): LifecycleErrorKey {
  const key = `error_${error}`;
  const known: readonly LifecycleErrorKey[] = [
    'error_last_owner_must_transfer',
    'error_cannot_change_own_role',
    'error_use_transfer_ownership',
    'error_invitation_not_pending',
    'error_not_authorized',
    'error_account_not_found',
    'error_not_a_team',
    'error_not_a_member',
    'error_already_owner',
    'error_target_not_a_member',
    'error_invitation_not_found',
    'error_invalid_input',
  ];
  return (known as readonly string[]).includes(key) ?
      (key as LifecycleErrorKey)
    : 'error_not_authorized';
}

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

const EMPTY_ACTIONS_SLOT = <span className="btn-icon" style={{ width: 44, height: 44 }} />;

function ErrorMessage({ error }: { error?: string }) {
  const t = useTranslations('Team');
  if (!error) return null;
  return (
    <p
      role="alert"
      className="rounded-lg px-3 py-2 text-xs font-medium"
      style={{ background: 'var(--color-poppy-wash)', color: 'var(--color-poppy)' }}>
      {t(lifecycleErrorKey(error))}
    </p>
  );
}

type PendingRowActionsProps = {
  member: TeamMember;
  currentUserRole: MembershipRole | null;
};

/** Fila de invitación pendiente: la única acción disponible es revocarla. */
function PendingRowActions({ member, currentUserRole }: PendingRowActionsProps) {
  const t = useTranslations('Team');
  const [open, setOpen] = useState(false);

  const [state, action, isPending] = useActionState(
    async (_prev: { error?: string; success?: boolean }) => {
      const fd = new FormData();
      fd.set('invitationId', member.invitation_id ?? '');
      const result = await revokeInvitation(fd);
      if (result.success) setOpen(false);
      return result;
    },
    {},
  );

  if (!member.invitation_id || !canManageMembers(currentUserRole)) return EMPTY_ACTIONS_SLOT;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn-icon"
        aria-label={t('revoke_invitation_action')}
        style={{ width: 44, height: 44 }}>
        <MoreHorizontal
          style={{ width: 15, height: 15, color: 'var(--text-tertiary)', strokeWidth: 1.5 }}
        />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('revoke_invitation_title')}</DialogTitle>
            <DialogDescription>
              {t('revoke_invitation_description', { email: member.email })}
            </DialogDescription>
          </DialogHeader>
          <ErrorMessage error={state.error} />
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
                {isPending ? t('revoke_invitation_revoking') : t('revoke_invitation_confirm')}
              </button>
            </form>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

type ActiveRowActionsProps = {
  member: TeamMember;
  displayName: string;
  currentUserRole: MembershipRole | null;
  currentUserId: string | null;
};

type ManageMode = 'manage' | 'confirm_transfer' | 'confirm_remove';

/** Gestión de un miembro activo: cambiar rol, transferir propiedad, eliminar. */
function ActiveRowActions({
  member,
  displayName,
  currentUserRole,
  currentUserId,
}: ActiveRowActionsProps) {
  const t = useTranslations('Team');
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ManageMode>('manage');
  const [role, setRole] = useState(member.role);

  const [roleState, roleAction, rolePending] = useActionState(
    async (_prev: { error?: string; success?: boolean }, formData: FormData) =>
      changeMemberRole(formData),
    {},
  );
  const [transferState, transferAction, transferPending] = useActionState(
    async (_prev: { error?: string; success?: boolean }) => {
      const fd = new FormData();
      fd.set('newOwnerUserId', member.user_id ?? '');
      const result = await transferOwnership(fd);
      if (result.success) setOpen(false);
      return result;
    },
    {},
  );
  const [removeState, removeAction, removePending] = useActionState(
    async (_prev: { error?: string; success?: boolean }) => {
      const fd = new FormData();
      fd.set('userId', member.user_id ?? '');
      const result = await removeMember(fd);
      if (result.success) setOpen(false);
      return result;
    },
    {},
  );

  // El gate previo solo miraba el rol de la FILA (nunca actuar sobre un owner),
  // nunca el de quien mira ni si la fila ES quien mira: un viewer veía el botón
  // sobre cualquier admin/member, y un admin veía acciones sobre sí mismo o
  // sobre otro admin, aunque el RPC las iba a rechazar igual
  // (cannot_change_own_role / "Only the owner can manage admin roles").
  const isSelf = member.user_id === currentUserId;
  const adminBlockedByAdmin = currentUserRole === 'admin' && member.role === 'admin';
  if (
    !member.user_id ||
    isSelf ||
    member.role === 'owner' ||
    adminBlockedByAdmin ||
    !canManageMembers(currentUserRole)
  ) {
    return EMPTY_ACTIONS_SLOT;
  }

  const canTransfer = currentUserRole === 'owner';
  const assignableRoles =
    currentUserRole === 'owner' ? INVITABLE_ROLES : INVITABLE_ROLES.filter((r) => r !== 'admin');

  function closeDialog(isOpen: boolean) {
    setOpen(isOpen);
    if (!isOpen) {
      setMode('manage');
      setRole(member.role);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn-icon"
        aria-label={t('member_actions', { name: displayName })}
        style={{ width: 44, height: 44 }}>
        <MoreHorizontal
          style={{ width: 15, height: 15, color: 'var(--text-tertiary)', strokeWidth: 1.5 }}
        />
      </button>

      <Dialog open={open} onOpenChange={closeDialog}>
        {mode === 'manage' && (
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>{t('manage_member')}</DialogTitle>
              <DialogDescription>{displayName}</DialogDescription>
            </DialogHeader>

            <form action={roleAction} className="flex flex-col gap-2">
              <input type="hidden" name="userId" value={member.user_id} />
              <label
                htmlFor={`role-${member.user_id}`}
                className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
                {t('change_role_title', { name: displayName })}
              </label>
              <div className="flex gap-2">
                <select
                  id={`role-${member.user_id}`}
                  name="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="toolbar-control flex-1 px-3">
                  {assignableRoles.map((r) => (
                    <option key={r} value={r}>
                      {t(`role_${r}` as 'role_admin' | 'role_member' | 'role_viewer')}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={rolePending}
                  className="bg-primary rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                  style={{ border: 0 }}>
                  {rolePending ? t('change_role_saving') : t('change_role_confirm')}
                </button>
              </div>
              <ErrorMessage error={roleState.error} />
            </form>

            <div
              className="flex flex-col gap-2 border-t pt-4"
              style={{ borderColor: 'var(--border)' }}>
              {canTransfer && (
                <button
                  type="button"
                  onClick={() => setMode('confirm_transfer')}
                  className="border-border text-foreground rounded-lg border px-4 py-2 text-left text-sm font-medium transition-colors">
                  {t('transfer_ownership_action')}
                </button>
              )}
              <button
                type="button"
                onClick={() => setMode('confirm_remove')}
                className="rounded-lg border px-4 py-2 text-left text-sm font-medium transition-colors"
                style={{ borderColor: 'var(--color-poppy)', color: 'var(--color-poppy)' }}>
                {t('remove_member')}
              </button>
            </div>
          </DialogContent>
        )}

        {mode === 'confirm_transfer' && (
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>{t('transfer_ownership_title', { name: displayName })}</DialogTitle>
              <DialogDescription>
                {t('transfer_ownership_description', { name: displayName })}
              </DialogDescription>
            </DialogHeader>
            <ErrorMessage error={transferState.error} />
            <DialogFooter>
              <button
                type="button"
                onClick={() => setMode('manage')}
                className="border-border text-foreground rounded-lg border px-4 py-2 text-sm font-medium transition-colors">
                {t('cancel')}
              </button>
              <form action={transferAction}>
                <button
                  type="submit"
                  disabled={transferPending}
                  className="rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                  style={{ border: 0, background: 'var(--color-poppy)' }}>
                  {transferPending ?
                    t('transfer_ownership_transferring')
                  : t('transfer_ownership_confirm')}
                </button>
              </form>
            </DialogFooter>
          </DialogContent>
        )}

        {mode === 'confirm_remove' && (
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>{t('remove_title')}</DialogTitle>
              <DialogDescription>
                {t('remove_description', { name: displayName })}
              </DialogDescription>
            </DialogHeader>
            <ErrorMessage error={removeState.error} />
            <DialogFooter>
              <button
                type="button"
                onClick={() => setMode('manage')}
                className="border-border text-foreground rounded-lg border px-4 py-2 text-sm font-medium transition-colors">
                {t('cancel')}
              </button>
              <form action={removeAction}>
                <button
                  type="submit"
                  disabled={removePending}
                  className="bg-primary rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                  style={{ border: 0 }}>
                  {removePending ? t('removing') : t('confirm_remove')}
                </button>
              </form>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}

type RowActionsProps = {
  member: TeamMember;
  displayName: string;
  currentUserRole: MembershipRole | null;
  currentUserId: string | null;
};

function RowActions({ member, displayName, currentUserRole, currentUserId }: RowActionsProps) {
  if (member.status === 'pending') {
    return <PendingRowActions member={member} currentUserRole={currentUserRole} />;
  }
  return (
    <ActiveRowActions
      member={member}
      displayName={displayName}
      currentUserRole={currentUserRole}
      currentUserId={currentUserId}
    />
  );
}

const ROLE_LABELS: Record<string, 'role_owner' | 'role_admin' | 'role_member' | 'role_viewer'> = {
  owner: 'role_owner',
  admin: 'role_admin',
  member: 'role_member',
  viewer: 'role_viewer',
};

type Props = {
  members: TeamMember[];
  timezone?: string;
  accountId: string | null;
  currentUserId: string | null;
  currentUserRole: MembershipRole | null;
};

export function MembersTable({
  members,
  timezone = 'UTC',
  accountId,
  currentUserId,
  currentUserRole,
}: Props) {
  const t = useTranslations('Team');
  const locale = useLocale();
  const { onlineUserIds } = usePresence(accountId ?? '', currentUserId ?? '');
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
          <option value="viewer">{t('role_viewer')}</option>
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
          <div className="col-header table-header-row members-row bg-surface-2 py-3">
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
                  data-testid={`member-row-${member.email}`}
                  className="members-row py-[14px]"
                  style={{ borderTop: idx === 0 ? 'none' : '1px solid var(--border)' }}>
                  {/* Avatar */}
                  <div className="relative">
                    {avatarUrl ?
                      <div className="relative size-8 overflow-hidden rounded-md">
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
                    {member.user_id && onlineUserIds.has(member.user_id) && (
                      <span
                        aria-label={t('presence_online')}
                        className="absolute right-0 bottom-0 block size-2 rounded-full ring-2 ring-white"
                        style={{ background: '#6f9362' }}
                      />
                    )}
                  </div>

                  {/* Name + email */}
                  <div className="min-w-0">
                    <div className="text-foreground truncate text-sm font-semibold">
                      {displayName}
                    </div>
                    {displayName !== member.email && (
                      <div
                        className="truncate font-mono text-[11px]"
                        style={{ color: 'var(--text-tertiary)' }}>
                        {member.email}
                      </div>
                    )}
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
                      new Intl.DateTimeFormat(locale, {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        timeZone: timezone,
                      }).format(new Date(member.joined_at))
                    : '—'}
                  </span>

                  <RowActions
                    member={member}
                    displayName={displayName}
                    currentUserRole={currentUserRole}
                    currentUserId={currentUserId}
                  />
                </div>
              );
            })
          }
        </div>
      </div>
    </div>
  );
}
