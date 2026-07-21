'use client';

import { useState, useTransition } from 'react';
import { useTranslations, useLocale } from 'next-intl';

import type {
  AuditAction,
  AuditLogCursor,
  AuditLogEntry,
} from '@/app/[locale]/dashboard/activity/actions';
import { getAccountAuditLogs } from '@/app/[locale]/dashboard/activity/actions';
import { AUDIT_ACTIONS, AUDIT_RESOURCE_TYPES } from '@/lib/validation/audit-log';

const ACTION_LABELS: Record<AuditAction, string> = {
  create: 'action_create',
  update: 'action_update',
  delete: 'action_delete',
  login: 'action_login',
  logout: 'action_logout',
  invite: 'action_invite',
  role_change: 'action_role_change',
  subscription_change: 'action_subscription_change',
  payment: 'action_payment',
  export: 'action_export',
};

const RESOURCE_LABELS: Record<string, string> = {
  profiles: 'resource_profiles',
  accounts: 'resource_accounts',
  accounts_memberships: 'resource_accounts_memberships',
  invitations: 'resource_invitations',
  projects: 'resource_projects',
  documents: 'resource_documents',
};

function actionTone(action: AuditAction): string {
  if (action === 'delete') return 'var(--color-poppy)';
  if (action === 'create' || action === 'invite') return 'var(--color-cobalt)';
  return 'var(--text-secondary)';
}

type Props = {
  variant?: 'account' | 'platform';
  initialEntries: (AuditLogEntry & {
    accountName?: string | null;
    impersonatorName?: string | null;
  })[];
  initialCursor: AuditLogCursor | null;
  timezone?: string;
};

export function AuditLogTable({
  variant = 'account',
  initialEntries,
  initialCursor,
  timezone = 'UTC',
}: Props) {
  const t = useTranslations('ActivityLog');
  const tAdmin = useTranslations('Admin');
  const locale = useLocale();
  const [entries, setEntries] = useState(initialEntries);
  const [cursor, setCursor] = useState(initialCursor);
  const [actionFilter, setActionFilter] = useState<AuditAction | ''>('');
  const [resourceFilter, setResourceFilter] = useState<string>('');
  const [isPending, startTransition] = useTransition();

  function applyFilters(nextAction: AuditAction | '', nextResource: string) {
    startTransition(async () => {
      const result = await getAccountAuditLogs({
        action: nextAction || null,
        resourceType: (nextResource || null) as never,
      });
      setEntries(result.data?.entries ?? []);
      setCursor(result.data?.nextCursor ?? null);
    });
  }

  function loadMore() {
    if (!cursor) return;
    startTransition(async () => {
      const result = await getAccountAuditLogs({
        cursor,
        action: actionFilter || null,
        resourceType: (resourceFilter || null) as never,
      });
      setEntries((prev) => [...prev, ...(result.data?.entries ?? [])]);
      setCursor(result.data?.nextCursor ?? null);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-2.5 md:flex-row md:items-center">
        <select
          value={actionFilter}
          onChange={(e) => {
            const value = e.target.value as AuditAction | '';
            setActionFilter(value);
            applyFilters(value, resourceFilter);
          }}
          className="toolbar-control cursor-pointer px-3">
          <option value="">{t('filter_all_actions')}</option>
          {AUDIT_ACTIONS.map((action) => (
            <option key={action} value={action}>
              {t(ACTION_LABELS[action] as never)}
            </option>
          ))}
        </select>
        <select
          value={resourceFilter}
          onChange={(e) => {
            const value = e.target.value;
            setResourceFilter(value);
            applyFilters(actionFilter, value);
          }}
          className="toolbar-control cursor-pointer px-3">
          <option value="">{t('filter_all_resources')}</option>
          {AUDIT_RESOURCE_TYPES.map((resource) => (
            <option key={resource} value={resource}>
              {t(RESOURCE_LABELS[resource] as never)}
            </option>
          ))}
        </select>
      </div>

      {/* Table card */}
      <div className="card overflow-x-auto">
        <div className="min-w-[720px]">
          <div
            className={
              variant === 'platform' ?
                'col-header platform-activity-row bg-surface-2 py-3'
              : 'col-header activity-row bg-surface-2 py-3'
            }>
            <span>{t('col_actor')}</span>
            <span>{t('col_action')}</span>
            <span>{t('col_resource')}</span>
            {variant === 'platform' && <span>{tAdmin('col_account')}</span>}
            {variant === 'platform' && <span>{tAdmin('col_impersonator')}</span>}
            <span className="text-right">{t('col_date')}</span>
          </div>

          {entries.length === 0 ?
            <div className="flex items-center justify-center px-6 py-16">
              <p className="text-muted-foreground text-sm">{t('no_logs')}</p>
            </div>
          : entries.map((entry, idx) => (
              <div
                key={entry.id}
                className={
                  variant === 'platform' ?
                    'platform-activity-row py-[14px]'
                  : 'activity-row py-[14px]'
                }
                style={{ borderTop: idx === 0 ? 'none' : '1px solid var(--border)' }}>
                <span className="text-foreground truncate text-sm font-medium">
                  {entry.actorName ?? t('unknown_actor')}
                </span>
                <span>
                  <span
                    className="chip chip-sm"
                    style={{ color: actionTone(entry.action), border: '1px solid var(--border)' }}>
                    {t(ACTION_LABELS[entry.action] as never)}
                  </span>
                </span>
                <span className="text-muted-foreground text-sm">
                  {t((RESOURCE_LABELS[entry.resourceType] ?? 'resource_profiles') as never)}
                </span>
                {variant === 'platform' && (
                  <span className="text-muted-foreground truncate text-sm">
                    {entry.accountName ?? '—'}
                  </span>
                )}
                {variant === 'platform' && (
                  <span className="text-muted-foreground truncate text-sm">
                    {entry.impersonatorName ?? '—'}
                  </span>
                )}
                <span
                  className="text-muted-foreground text-right font-mono text-xs"
                  style={{ letterSpacing: '0.02em' }}>
                  {new Intl.DateTimeFormat(locale, {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: timezone,
                  }).format(new Date(entry.createdAt))}
                </span>
              </div>
            ))
          }
        </div>
      </div>

      {cursor && (
        <button
          type="button"
          onClick={loadMore}
          disabled={isPending}
          className="border-border text-foreground self-center rounded-lg border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50">
          {isPending ? t('loading_more') : t('load_more')}
        </button>
      )}
    </div>
  );
}
