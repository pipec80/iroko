'use client';

import { useRef, useState, useTransition } from 'react';
import { useTranslations, useLocale } from 'next-intl';

import type {
  AuditAction,
  AuditLogCursor,
  AuditLogEntry,
} from '@/app/[locale]/dashboard/activity/actions';
import { getAccountAuditLogs } from '@/app/[locale]/dashboard/activity/actions';
import { getPlatformAuditLogs } from '@/app/[locale]/dashboard/admin/audit/actions';
import { AUDIT_ACTIONS, AUDIT_RESOURCE_TYPES } from '@/lib/validation/audit-log';
import type { AuditLogQueryInput } from '@/lib/validation/audit-log';

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
  impersonate_start: 'action_impersonate_start',
  impersonate_end: 'action_impersonate_end',
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

type ResourceFilter = (typeof AUDIT_RESOURCE_TYPES)[number] | '';
type AuditRequest = { query: AuditLogQueryInput; append: boolean };

async function fetchAuditPage(variant: Props['variant'], query: AuditLogQueryInput) {
  if (variant !== 'platform') return getAccountAuditLogs(query);
  const result = await getPlatformAuditLogs(query);
  if (!result.data) return { data: null, error: result.error };
  return {
    ...result,
    data: {
      ...result.data,
      entries: result.data.entries.map((entry) => ({
        ...entry,
        avatarUrl: null,
        accountName: entry.accountId,
        impersonatorName: entry.impersonatorId,
      })),
    },
  };
}

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
  const [resourceFilter, setResourceFilter] = useState<ResourceFilter>('');
  const [failedRequest, setFailedRequest] = useState<AuditRequest | null>(null);
  const requestInFlight = useRef(false);
  const [isPending, startTransition] = useTransition();

  function requestPage(request: AuditRequest) {
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    setFailedRequest(null);
    startTransition(async () => {
      try {
        const result = await fetchAuditPage(variant, request.query);
        if (result.error || !result.data) {
          setFailedRequest(request);
          return;
        }
        const page = result.data;
        setEntries((previous) => (request.append ? [...previous, ...page.entries] : page.entries));
        setCursor(page.nextCursor);
        setActionFilter(request.query.action ?? '');
        setResourceFilter(request.query.resourceType ?? '');
      } catch {
        setFailedRequest(request);
      } finally {
        requestInFlight.current = false;
      }
    });
  }

  function applyFilters(nextAction: AuditAction | '', nextResource: ResourceFilter) {
    requestPage({
      query: { action: nextAction || null, resourceType: nextResource || null },
      append: false,
    });
  }

  function loadMore() {
    if (!cursor) return;
    requestPage({
      query: { cursor, action: actionFilter || null, resourceType: resourceFilter || null },
      append: true,
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-2.5 md:flex-row md:items-center">
        <select
          value={actionFilter}
          disabled={isPending}
          onChange={(e) => {
            const value = e.target.value as AuditAction | '';
            applyFilters(value, resourceFilter);
          }}
          aria-label={t('filter_action_label')}
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
          disabled={isPending}
          onChange={(e) => {
            const value = e.target.value as ResourceFilter;
            applyFilters(actionFilter, value);
          }}
          aria-label={t('filter_resource_label')}
          className="toolbar-control cursor-pointer px-3">
          <option value="">{t('filter_all_resources')}</option>
          {AUDIT_RESOURCE_TYPES.map((resource) => (
            <option key={resource} value={resource}>
              {t(RESOURCE_LABELS[resource] as never)}
            </option>
          ))}
        </select>
      </div>

      {failedRequest && (
        <div role="alert" className="text-destructive flex items-center gap-3 text-sm">
          <span>{t('load_failed')}</span>
          <button
            type="button"
            disabled={isPending}
            onClick={() => requestPage(failedRequest)}
            className="underline">
            {t('retry')}
          </button>
        </div>
      )}

      {/* Table card */}
      <div className="card overflow-x-auto">
        <div className="min-w-[720px]">
          <div
            className={
              variant === 'platform' ?
                'col-header table-header-row platform-activity-row bg-surface-2 py-3'
              : 'col-header table-header-row activity-row bg-surface-2 py-3'
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
