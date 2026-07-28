'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Search } from 'lucide-react';

import { Link } from '@/i18n/routing';
import type { AdminAccountsCursor } from '@/lib/validation/admin';
import { getAdminAccounts, type AdminAccountEntry } from './actions';

const SEARCH_DEBOUNCE_MS = 300;
const ACCOUNT_TONES = ['var(--color-poppy)', 'var(--color-cobalt)', 'var(--color-ink)'];

// Subscription states that read as "healthy" vs "needs attention" for the status chip.
// Anything else (canceled, paused, or no subscription at all) renders as a neutral chip.
const HEALTHY_STATUSES = new Set(['active', 'trialing']);
const AT_RISK_STATUSES = new Set(['past_due', 'unpaid', 'incomplete']);

function accountTone(index: number): string {
  return ACCOUNT_TONES[index % ACCOUNT_TONES.length] ?? 'var(--color-poppy)';
}

function accountInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

function statusChipStyle(status: string | null): React.CSSProperties {
  if (status && HEALTHY_STATUSES.has(status)) {
    return { background: 'var(--color-success-wash)', color: 'var(--color-success)' };
  }
  if (status && AT_RISK_STATUSES.has(status)) {
    return { background: 'var(--color-warning-wash)', color: 'var(--color-warning)' };
  }
  return { background: 'var(--surface-2)', color: 'var(--text-secondary)' };
}

type Props = {
  initialEntries: AdminAccountEntry[];
  initialCursor: AdminAccountsCursor | null;
};

export function AccountsTable({ initialEntries, initialCursor }: Props) {
  const t = useTranslations('Admin');
  const [entries, setEntries] = useState(initialEntries);
  const [cursor, setCursor] = useState(initialCursor);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Server-side search: debounced so we don't re-fetch on every keystroke.
  // Skips the initial mount (search starts empty and initialEntries already covers it).
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const result = await getAdminAccounts({ search: search.trim() || null });
        setEntries(result.data?.entries ?? []);
        setCursor(result.data?.nextCursor ?? null);
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  function loadMore() {
    if (!cursor) return;
    startTransition(async () => {
      const result = await getAdminAccounts({ search: search.trim() || null, cursor });
      setEntries((prev) => [...prev, ...(result.data?.entries ?? [])]);
      setCursor(result.data?.nextCursor ?? null);
    });
  }

  // Plan/status filters run client-side over the currently loaded page — the RPC
  // doesn't accept those as server filters yet. Fine for an admin account list;
  // revisit if this ever needs to filter across thousands of accounts.
  const plans = [...new Set(entries.map((e) => e.planSlug).filter((p): p is string => !!p))];
  const statuses = [
    ...new Set(
      entries
        .map((e) => e.subscriptionStatus)
        .filter((s): s is NonNullable<AdminAccountEntry['subscriptionStatus']> => s !== null),
    ),
  ];
  const filtered = entries.filter((entry) => {
    const matchPlan = !planFilter || entry.planSlug === planFilter;
    const matchStatus = !statusFilter || entry.subscriptionStatus === statusFilter;
    return matchPlan && matchStatus;
  });

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground text-sm">
        {t('accounts_count', { count: filtered.length })}
      </p>

      {/* Toolbar */}
      <div className="flex flex-col gap-2.5 md:flex-row md:items-center">
        <div className="relative max-w-[360px] flex-1">
          <label htmlFor="accounts-search" className="sr-only">
            {t('accounts_search_placeholder')}
          </label>
          <Search
            className="absolute top-1/2 left-3 -translate-y-1/2"
            style={{ width: 14, height: 14, color: 'var(--text-tertiary)', strokeWidth: 1.5 }}
          />
          <input
            id="accounts-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('accounts_search_placeholder')}
            className="toolbar-control w-full text-[13px]"
            style={{
              padding: '0 12px 0 34px',
              color: 'var(--text-primary)',
              fontFamily: 'inherit',
            }}
          />
        </div>
        <select
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value)}
          className="toolbar-control cursor-pointer px-3">
          <option value="">{t('filter_all_plans')}</option>
          {plans.map((plan) => (
            <option key={plan} value={plan}>
              {plan}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="toolbar-control cursor-pointer px-3">
          <option value="">{t('filter_all_statuses')}</option>
          {statuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse">
          <thead>
            <tr className="col-header bg-surface-2">
              <th scope="col" className="w-8 py-3 pl-[22px]" />
              <th scope="col" className="py-3 text-left">
                {t('col_account_name')}
              </th>
              <th scope="col" className="py-3 text-left">
                {t('col_owner_email')}
              </th>
              <th scope="col" className="py-3 text-left">
                {t('col_plan')}
              </th>
              <th scope="col" className="py-3 text-left">
                {t('col_subscription_status')}
              </th>
              <th scope="col" className="py-3 pr-[22px] text-right">
                {t('col_members')}
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ?
              <tr>
                <td colSpan={6} className="px-6 py-16 text-center">
                  <span className="text-muted-foreground text-sm">{t('no_accounts')}</span>
                </td>
              </tr>
            : filtered.map((entry, idx) => (
                <tr
                  key={entry.accountId}
                  className="hover:bg-surface-2 transition-colors"
                  style={{ borderTop: idx === 0 ? 'none' : '1px solid var(--border)' }}>
                  <td className="py-[14px] pl-[22px]">
                    <span className="avatar-32" style={{ background: accountTone(idx) }}>
                      {accountInitials(entry.name)}
                    </span>
                  </td>
                  <td className="py-[14px]">
                    <Link
                      href={`/dashboard/admin/accounts/${entry.accountId}`}
                      className="text-foreground truncate text-sm font-medium hover:underline">
                      {entry.name}
                    </Link>
                  </td>
                  <td className="text-muted-foreground truncate py-[14px] text-sm">
                    {entry.ownerEmail ?? '—'}
                  </td>
                  <td className="py-[14px]">
                    <span
                      className="chip chip-sm"
                      style={{
                        background: 'var(--surface-2)',
                        color: 'var(--text-secondary)',
                        border: '1px solid var(--border)',
                      }}>
                      {entry.planSlug ?? t('no_plan')}
                    </span>
                  </td>
                  <td className="py-[14px]">
                    {entry.subscriptionStatus ?
                      <span
                        className="chip chip-sm"
                        style={statusChipStyle(entry.subscriptionStatus)}>
                        {entry.subscriptionStatus}
                      </span>
                    : <span className="text-muted-foreground text-sm">—</span>}
                  </td>
                  <td className="text-muted-foreground py-[14px] pr-[22px] text-right text-sm">
                    {entry.memberCount}
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
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
