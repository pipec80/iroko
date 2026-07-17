'use client';

import { useState } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';

import {
  createWebhookEndpoint,
  deleteWebhookEndpoint,
  listWebhookDeliveries,
  listWebhookEndpoints,
  updateWebhookEndpoint,
  type WebhookDelivery,
  type WebhookEndpoint,
} from '@/app/[locale]/dashboard/org/settings/actions-webhooks';
import { getOrgEntitlements } from '@/app/[locale]/dashboard/org/settings/actions-entitlements';
import { FEATURE_KEYS } from '@/lib/billing/entitlement-keys';
import { cn } from '@/lib/utils';
import {
  WEBHOOK_EVENT_TYPES,
  webhookEndpointSchema,
  type WebhookEventType,
} from '@/lib/validation/webhooks';
import { PlanGateEmptyState } from './plan-gate-empty-state';
import { RevealCard } from './reveal-card';

const ENDPOINTS_KEY = ['org-settings', 'webhooks'];

/** Tab de administración de webhooks salientes en org/settings (F2-2D). */
export function WebhooksTab() {
  const t = useTranslations('OrgSettings');
  const queryClient = useQueryClient();
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [events, setEvents] = useState<WebhookEventType[]>([]);
  const [formError, setFormError] = useState(false);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);

  const { data: entitlements } = useQuery({
    queryKey: ['org-settings', 'entitlements'],
    queryFn: async () => {
      const result = await getOrgEntitlements();
      if (result.error || !result.data) throw new Error(result.error ?? 'fetch_failed');
      return result.data;
    },
  });

  const { data, isPending, error } = useQuery({
    queryKey: ENDPOINTS_KEY,
    queryFn: async () => {
      const result = await listWebhookEndpoints();
      if (result.error || !result.data) throw new Error(result.error ?? 'fetch_failed');
      return result.data;
    },
    retry: false,
  });

  const create = useMutation({
    mutationFn: async () => {
      const result = await createWebhookEndpoint({
        url,
        description: description || undefined,
        events,
      });
      if (result.error || !result.data) throw new Error(result.error ?? 'create_failed');
      return result.data;
    },
    onSuccess: (created) => {
      setCreatedSecret(created.secret);
      setUrl('');
      setDescription('');
      setEvents([]);
      void queryClient.invalidateQueries({ queryKey: ENDPOINTS_KEY });
    },
  });

  const toggleEvent = (event: WebhookEventType) =>
    setEvents((current) =>
      current.includes(event) ? current.filter((e) => e !== event) : [...current, event],
    );

  const submit = () => {
    const parsed = webhookEndpointSchema.safeParse({
      url,
      description: description || undefined,
      events,
    });
    if (!parsed.success) {
      setFormError(true);
      return;
    }
    setFormError(false);
    create.mutate();
  };

  if (error?.message === 'not_authorized') {
    return (
      <div className="card flex items-center justify-center p-10">
        <p className="text-muted-foreground text-[13px]">{t('webhooks_not_authorized')}</p>
      </div>
    );
  }

  if (entitlements && entitlements.features[FEATURE_KEYS.webhooksEnabled] !== true) {
    return (
      <PlanGateEmptyState
        featureKey="plan_gate_webhooks_feature"
        note="plan_gate_webhooks_paused"
      />
    );
  }

  return (
    <div className="space-y-6">
      {createdSecret && (
        <RevealCard
          title={t('webhooks_secret_title')}
          description={t('webhooks_secret_desc')}
          value={createdSecret}
          copyLabel={t('api_keys_copy_btn')}
          copiedLabel={t('api_keys_copied')}
          doneLabel={t('api_keys_done_btn')}
          onDone={() => setCreatedSecret(null)}
        />
      )}

      <div className="card space-y-5 p-6">
        <div className="space-y-1">
          <h2 className="text-foreground text-[14px] font-semibold">{t('webhooks_title')}</h2>
          <p className="text-muted-foreground text-[12px]">{t('webhooks_lead')}</p>
        </div>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
                {t('webhooks_url_label')}
              </span>
              <input
                type="text"
                value={url}
                maxLength={2000}
                onChange={(event) => setUrl(event.target.value)}
                placeholder={t('webhooks_url_placeholder')}
                className="border-border bg-background text-foreground placeholder:text-muted-foreground rounded-lg border px-3 py-2 text-[13px] outline-none focus:ring-1"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
                {t('webhooks_description_label')}
              </span>
              <input
                type="text"
                value={description}
                maxLength={200}
                onChange={(event) => setDescription(event.target.value)}
                className="border-border bg-background text-foreground rounded-lg border px-3 py-2 text-[13px] outline-none focus:ring-1"
              />
            </label>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
              {t('webhooks_events_label')}
            </legend>
            <div className="flex flex-wrap gap-3">
              {WEBHOOK_EVENT_TYPES.map((event) => (
                <label key={event} className="flex cursor-pointer items-center gap-2 text-[13px]">
                  <input
                    type="checkbox"
                    checked={events.includes(event)}
                    onChange={() => toggleEvent(event)}
                  />
                  <span className="text-foreground">{t(EVENT_LABEL_KEYS[event])}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {formError && (
            <p className="text-[12px]" style={{ color: 'var(--color-poppy)' }}>
              {t('webhooks_validation_error')}
            </p>
          )}

          <button
            type="submit"
            disabled={create.isPending}
            className="rounded-lg px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: 'var(--color-cobalt)' }}>
            {t('webhooks_create_btn')}
          </button>
        </form>

        {isPending ?
          <p className="text-muted-foreground text-[12px]">{t('webhooks_loading')}</p>
        : error ?
          <p className="text-[12px]" style={{ color: 'var(--color-poppy)' }}>
            {t('webhooks_error')}
          </p>
        : (data ?? []).length === 0 ?
          <p className="text-muted-foreground text-[12px]">{t('webhooks_empty')}</p>
        : <div className="space-y-3">
            {(data ?? []).map((endpoint) => (
              <EndpointRow key={endpoint.id} endpoint={endpoint} />
            ))}
          </div>
        }
      </div>
    </div>
  );
}

const EVENT_LABEL_KEYS: Record<WebhookEventType, string> = {
  'member.invited': 'webhooks_event_member_invited',
  'member.joined': 'webhooks_event_member_joined',
  'member.removed': 'webhooks_event_member_removed',
  'account.updated': 'webhooks_event_account_updated',
  'subscription.created': 'webhooks_event_subscription_created',
  'subscription.updated': 'webhooks_event_subscription_updated',
  'subscription.canceled': 'webhooks_event_subscription_canceled',
};

function EndpointRow({ endpoint }: { endpoint: WebhookEndpoint }) {
  const t = useTranslations('OrgSettings');
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);

  const update = useMutation({
    mutationFn: async (enabled: boolean) => {
      const result = await updateWebhookEndpoint({
        id: endpoint.id,
        url: endpoint.url,
        description: endpoint.description ?? undefined,
        events: endpoint.events,
        enabled,
      });
      if (result.error) throw new Error(result.error);
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ENDPOINTS_KEY }),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const result = await deleteWebhookEndpoint({ id: endpoint.id });
      if (result.error) throw new Error(result.error);
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ENDPOINTS_KEY }),
  });

  return (
    <div className="border-border rounded-xl border">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="min-w-0 space-y-1">
          <p className="text-foreground truncate font-mono text-[12px]">{endpoint.url}</p>
          <div className="flex flex-wrap items-center gap-1.5">
            {endpoint.events.map((event) => (
              <span
                key={event}
                className="bg-background border-border text-muted-foreground rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase">
                {event}
              </span>
            ))}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            role="switch"
            aria-checked={endpoint.enabled}
            aria-label={endpoint.enabled ? t('webhooks_enabled') : t('webhooks_disabled')}
            disabled={update.isPending}
            onClick={() => update.mutate(!endpoint.enabled)}
            className={cn(
              'relative h-5 w-9 shrink-0 rounded-full transition-colors',
              !endpoint.enabled && 'bg-surface-3',
            )}
            style={{ background: endpoint.enabled ? 'var(--color-cobalt)' : undefined }}>
            <span
              className={cn(
                'absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow transition-transform',
                endpoint.enabled && 'translate-x-4',
              )}
            />
          </button>
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="border-border text-foreground rounded-lg border px-3 py-1.5 text-[12px] font-semibold transition-opacity hover:opacity-80">
            {t('webhooks_deliveries_btn')}
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm(t('webhooks_delete_confirm'))) remove.mutate();
            }}
            className="rounded-lg border px-3 py-1.5 text-[12px] font-semibold transition-opacity hover:opacity-80"
            style={{ borderColor: 'var(--color-poppy)', color: 'var(--color-poppy)' }}>
            {t('webhooks_delete_btn')}
          </button>
        </div>
      </div>
      {expanded && <DeliveriesTable endpointId={endpoint.id} />}
    </div>
  );
}

function DeliveriesTable({ endpointId }: { endpointId: string }) {
  const t = useTranslations('OrgSettings');
  const locale = useLocale();

  const { data, isPending, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ['org-settings', 'webhooks', 'deliveries', endpointId],
      queryFn: async ({ pageParam }) => {
        const result = await listWebhookDeliveries({
          endpointId,
          cursor: pageParam ?? undefined,
        });
        if (result.error || !result.data) throw new Error(result.error ?? 'fetch_failed');
        return result.data;
      },
      initialPageParam: null as { createdAt: string; id: string } | null,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      retry: false,
    });

  const entries: WebhookDelivery[] = data?.pages.flatMap((page) => page.entries) ?? [];

  const statusLabel: Record<WebhookDelivery['status'], string> = {
    pending: t('webhooks_status_pending'),
    success: t('webhooks_status_success'),
    failed: t('webhooks_status_failed'),
    exhausted: t('webhooks_status_exhausted'),
  };

  const formatDate = (value: string) =>
    new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(
      new Date(value),
    );

  return (
    <div className="border-border border-t p-4">
      <h4 className="text-muted-foreground mb-2 text-[11px] font-semibold tracking-wide uppercase">
        {t('webhooks_deliveries_title')}
      </h4>
      {isPending ?
        <p className="text-muted-foreground text-[12px]">{t('webhooks_loading')}</p>
      : error ?
        <p className="text-[12px]" style={{ color: 'var(--color-poppy)' }}>
          {t('webhooks_error')}
        </p>
      : entries.length === 0 ?
        <p className="text-muted-foreground text-[12px]">{t('webhooks_deliveries_empty')}</p>
      : <>
          <table className="w-full text-left text-[12px]">
            <thead>
              <tr className="text-muted-foreground border-border border-b text-[10px] font-semibold tracking-wide uppercase">
                <th className="py-1.5 pr-3">{t('webhooks_deliveries_col_event')}</th>
                <th className="py-1.5 pr-3">{t('webhooks_deliveries_col_status')}</th>
                <th className="py-1.5 pr-3">{t('webhooks_deliveries_col_attempts')}</th>
                <th className="py-1.5 pr-3">{t('webhooks_deliveries_col_code')}</th>
                <th className="py-1.5">{t('webhooks_deliveries_col_date')}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((delivery) => (
                <tr key={delivery.id} className="border-border border-b last:border-0">
                  <td className="text-foreground py-2 pr-3 font-mono">{delivery.eventType}</td>
                  <td className="py-2 pr-3">
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                      style={
                        delivery.status === 'success' ?
                          { background: 'var(--color-cobalt)', color: 'white' }
                        : delivery.status === 'pending' ?
                          { background: 'var(--surface-3, #eee)', color: 'var(--text-secondary)' }
                        : { background: 'var(--color-poppy)', color: 'white' }
                      }>
                      {statusLabel[delivery.status]}
                    </span>
                  </td>
                  <td className="text-muted-foreground py-2 pr-3">{delivery.attempts}</td>
                  <td className="text-muted-foreground py-2 pr-3">
                    {delivery.lastStatusCode ?? '—'}
                  </td>
                  <td className="text-muted-foreground py-2">{formatDate(delivery.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {hasNextPage && (
            <button
              type="button"
              disabled={isFetchingNextPage}
              onClick={() => void fetchNextPage()}
              className="border-border text-foreground mt-3 rounded-lg border px-3 py-1.5 text-[12px] font-semibold transition-opacity hover:opacity-80 disabled:opacity-50">
              {t('webhooks_load_more')}
            </button>
          )}
        </>
      }
    </div>
  );
}
