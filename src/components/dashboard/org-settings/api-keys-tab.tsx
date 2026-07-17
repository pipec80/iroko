'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';

import {
  createApiKey,
  listApiKeys,
  revokeApiKey,
  type ApiKey,
} from '@/app/[locale]/dashboard/org/settings/actions-api-keys';
import { getOrgEntitlements } from '@/app/[locale]/dashboard/org/settings/actions-entitlements';
import { Link } from '@/i18n/routing';
import { LIMIT_KEYS } from '@/lib/billing/entitlement-keys';
import { RevealCard } from './reveal-card';

const QUERY_KEY = ['org-settings', 'api-keys'];

/** Tab de administración de API keys en org/settings (F2-2D). */
export function ApiKeysTab() {
  const t = useTranslations('OrgSettings');
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  const { data: entitlements } = useQuery({
    queryKey: ['org-settings', 'entitlements'],
    queryFn: async () => {
      const result = await getOrgEntitlements();
      if (result.error || !result.data) throw new Error(result.error ?? 'fetch_failed');
      return result.data;
    },
  });

  const { data, isPending, error } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const result = await listApiKeys();
      if (result.error || !result.data) throw new Error(result.error ?? 'fetch_failed');
      return result.data;
    },
    retry: false,
  });

  const apiKeysMax = entitlements?.limits[LIMIT_KEYS.apiKeysMax] ?? null;
  const activeCount = (data ?? []).filter((key) => keyStatus(key) === 'active').length;
  const atLimit = apiKeysMax !== null && activeCount >= apiKeysMax;

  const create = useMutation({
    mutationFn: async () => {
      const result = await createApiKey({
        name,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      });
      if (result.error || !result.data) throw new Error(result.error ?? 'create_failed');
      return result.data;
    },
    onSuccess: (created) => {
      setCreatedKey(created.key);
      setName('');
      setExpiresAt('');
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  const revoke = useMutation({
    mutationFn: async (id: string) => {
      const result = await revokeApiKey({ id });
      if (result.error) throw new Error(result.error);
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  if (error?.message === 'not_authorized') {
    return <PermissionNotice message={t('api_keys_not_authorized')} />;
  }

  return (
    <div className="space-y-6">
      {createdKey && (
        <RevealCard
          title={t('api_keys_created_title')}
          description={t('api_keys_created_desc')}
          value={createdKey}
          copyLabel={t('api_keys_copy_btn')}
          copiedLabel={t('api_keys_copied')}
          doneLabel={t('api_keys_done_btn')}
          onDone={() => setCreatedKey(null)}
        />
      )}

      <div className="card space-y-5 p-6">
        <div className="space-y-1">
          <h2 className="text-foreground text-[14px] font-semibold">{t('api_keys_title')}</h2>
          <p className="text-muted-foreground text-[12px]">{t('api_keys_lead')}</p>
        </div>

        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            create.mutate();
          }}>
          <label className="flex flex-col gap-1.5">
            <span className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
              {t('api_keys_name_label')}
            </span>
            <input
              type="text"
              value={name}
              maxLength={100}
              onChange={(event) => setName(event.target.value)}
              placeholder={t('api_keys_name_placeholder')}
              className="border-border bg-background text-foreground placeholder:text-muted-foreground rounded-lg border px-3 py-2 text-[13px] outline-none focus:ring-1"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
              {t('api_keys_expires_label')}
            </span>
            <input
              type="date"
              value={expiresAt}
              onChange={(event) => setExpiresAt(event.target.value)}
              className="border-border bg-background text-foreground rounded-lg border px-3 py-2 text-[13px] outline-none focus:ring-1"
            />
          </label>
          <button
            type="submit"
            disabled={!name.trim() || create.isPending || atLimit}
            className="rounded-lg px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: 'var(--color-cobalt)' }}>
            {t('api_keys_create_btn')}
          </button>
          {apiKeysMax !== null && (
            <span className="text-muted-foreground text-[12px]">
              {t('api_keys_usage', { used: activeCount, max: apiKeysMax })}
            </span>
          )}
        </form>

        {atLimit && (
          <p className="text-muted-foreground text-[12px]">
            {t('api_keys_limit_hint')}{' '}
            <Link href="/dashboard/billing" className="text-primary font-semibold">
              {t('plan_gate_cta')}
            </Link>
          </p>
        )}

        {isPending ?
          <p className="text-muted-foreground text-[12px]">{t('api_keys_loading')}</p>
        : error ?
          <p className="text-[12px]" style={{ color: 'var(--color-poppy)' }}>
            {t('api_keys_error')}
          </p>
        : (data ?? []).length === 0 ?
          <p className="text-muted-foreground text-[12px]">{t('api_keys_empty')}</p>
        : <ApiKeysTable
            keys={data ?? []}
            onRevoke={(id) => {
              if (window.confirm(t('api_keys_revoke_confirm'))) revoke.mutate(id);
            }}
          />
        }
      </div>
    </div>
  );
}

function PermissionNotice({ message }: { message: string }) {
  return (
    <div className="card flex items-center justify-center p-10">
      <p className="text-muted-foreground text-[13px]">{message}</p>
    </div>
  );
}

type KeyStatus = 'active' | 'revoked' | 'expired';

function keyStatus(apiKey: ApiKey): KeyStatus {
  if (apiKey.revokedAt) return 'revoked';
  if (apiKey.expiresAt && new Date(apiKey.expiresAt).getTime() <= Date.now()) return 'expired';
  return 'active';
}

function ApiKeysTable({ keys, onRevoke }: { keys: ApiKey[]; onRevoke: (id: string) => void }) {
  const t = useTranslations('OrgSettings');
  const locale = useLocale();
  const formatDate = (value: string | null) =>
    value ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(value)) : null;

  const statusLabel: Record<KeyStatus, string> = {
    active: t('api_keys_status_active'),
    revoked: t('api_keys_status_revoked'),
    expired: t('api_keys_status_expired'),
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-[13px]">
        <thead>
          <tr className="text-muted-foreground border-border border-b text-[11px] font-semibold tracking-wide uppercase">
            <th className="py-2 pr-4">{t('api_keys_col_name')}</th>
            <th className="py-2 pr-4">{t('api_keys_col_key')}</th>
            <th className="py-2 pr-4">{t('api_keys_col_last_used')}</th>
            <th className="py-2 pr-4">{t('api_keys_col_expires')}</th>
            <th className="py-2 pr-4">{t('api_keys_col_status')}</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {keys.map((apiKey) => {
            const status = keyStatus(apiKey);
            return (
              <tr key={apiKey.id} className="border-border border-b last:border-0">
                <td className="text-foreground py-2.5 pr-4 font-medium">{apiKey.name}</td>
                <td className="text-muted-foreground py-2.5 pr-4 font-mono text-[12px]">
                  {apiKey.keyPrefix}…
                </td>
                <td className="text-muted-foreground py-2.5 pr-4">
                  {formatDate(apiKey.lastUsedAt) ?? t('api_keys_never')}
                </td>
                <td className="text-muted-foreground py-2.5 pr-4">
                  {formatDate(apiKey.expiresAt) ?? '—'}
                </td>
                <td className="py-2.5 pr-4">
                  <span
                    className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                    style={
                      status === 'active' ?
                        { background: 'var(--color-cobalt)', color: 'white' }
                      : { background: 'var(--surface-3, #eee)', color: 'var(--text-secondary)' }
                    }>
                    {statusLabel[status]}
                  </span>
                </td>
                <td className="py-2.5 text-right">
                  {status === 'active' && (
                    <button
                      type="button"
                      onClick={() => onRevoke(apiKey.id)}
                      className="rounded-lg border px-3 py-1.5 text-[12px] font-semibold transition-opacity hover:opacity-80"
                      style={{ borderColor: 'var(--color-poppy)', color: 'var(--color-poppy)' }}>
                      {t('api_keys_revoke_btn')}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
