'use client';

import { useState } from 'react';
import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';

import {
  cancelSubscription,
  getBillingData,
  listInvoices,
  startCheckout,
  type Invoice,
  type PlanRow,
} from '@/app/[locale]/dashboard/billing/actions';
import { cn } from '@/lib/utils';

type Interval = 'month' | 'year';

export function BillingTab() {
  const t = useTranslations('Billing');
  const locale = useLocale();
  const [interval, setInterval] = useState<Interval>('month');

  const { data, isPending, error } = useQuery({
    queryKey: ['billing', 'data'],
    queryFn: async () => {
      const result = await getBillingData();
      if (result.error || !result.data) throw new Error(result.error ?? 'fetch_failed');
      return result.data;
    },
    retry: false,
  });

  const checkout = useMutation({
    mutationFn: async (plan: { slug: string; interval: Interval }) => {
      const result = await startCheckout({ planSlug: plan.slug, interval: plan.interval });
      if (result.error || !result.data) throw new Error(result.error ?? 'checkout_failed');
      return result.data;
    },
    onSuccess: (result) => {
      window.location.href = result.url;
    },
  });

  if (isPending) {
    return <p className="text-muted-foreground text-[13px]">{t('billing_loading')}</p>;
  }
  if (error) {
    return (
      <p className="text-[13px]" style={{ color: 'var(--color-poppy)' }}>
        {t('billing_error')}
      </p>
    );
  }

  const plans = data.plans.filter((p) => p.interval === interval || p.slug === 'free');
  const overview = data.overview;

  const formatPrice = (plan: PlanRow) =>
    new Intl.NumberFormat(locale, { style: 'currency', currency: plan.currency }).format(
      plan.price / 100,
    );

  const formatDate = (value: string) =>
    new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(value));

  return (
    <div className="space-y-8">
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-foreground text-xl font-bold">{t('current_plan')}</h2>
          <div className="border-border flex rounded-lg border p-0.5">
            <button
              type="button"
              onClick={() => setInterval('month')}
              className={cn(
                'rounded-md px-3 py-1 text-[12px] font-semibold transition-colors',
                interval === 'month' ? 'text-white' : 'text-muted-foreground',
              )}
              style={interval === 'month' ? { background: 'var(--color-cobalt)' } : undefined}>
              {t('toggle_monthly')}
            </button>
            <button
              type="button"
              onClick={() => setInterval('year')}
              className={cn(
                'rounded-md px-3 py-1 text-[12px] font-semibold transition-colors',
                interval === 'year' ? 'text-white' : 'text-muted-foreground',
              )}
              style={interval === 'year' ? { background: 'var(--color-cobalt)' } : undefined}>
              {t('toggle_yearly')}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {plans.map((plan) => (
            <PlanCard
              key={`${plan.slug}-${plan.interval}`}
              plan={plan}
              isCurrent={overview?.planSlug === plan.slug}
              price={formatPrice(plan)}
              onSubscribe={() => checkout.mutate({ slug: plan.slug, interval })}
              isSubscribing={checkout.isPending}
            />
          ))}
        </div>
      </section>

      {overview && <SubscriptionStatusPanel overview={overview} formatDate={formatDate} />}

      {overview && <InvoiceHistory />}
    </div>
  );
}

function PlanCard({
  plan,
  isCurrent,
  price,
  onSubscribe,
  isSubscribing,
}: {
  plan: PlanRow;
  isCurrent: boolean;
  price: string;
  onSubscribe: () => void;
  isSubscribing: boolean;
}) {
  const t = useTranslations('Billing');
  const isFree = plan.slug === 'free';

  return (
    <div
      className="border-border bg-background relative rounded-xl border p-6 shadow-sm"
      data-testid={`plan-card-${plan.slug}`}>
      {isCurrent && (
        <div
          className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 rounded-full px-3 py-1 text-[10px] font-black tracking-widest whitespace-nowrap text-white uppercase"
          style={{ background: 'var(--color-cobalt)' }}>
          {t('plan_current_badge')}
        </div>
      )}
      <h3 className="text-foreground mb-1 text-lg font-bold">{plan.name}</h3>
      <p className="text-muted-foreground mb-4 text-sm">{plan.description}</p>
      <div className="mb-4 flex items-baseline gap-1">
        <span className="text-foreground font-mono text-2xl font-bold">{price}</span>
        {!isFree && <span className="text-muted-foreground text-sm">/{plan.interval}</span>}
      </div>
      {plan.trialDays > 0 && !isCurrent && (
        <p className="text-muted-foreground mb-4 text-[12px]">
          {t('plan_trial', { days: plan.trialDays })}
        </p>
      )}
      <button
        type="button"
        disabled={isCurrent || isFree || isSubscribing}
        onClick={onSubscribe}
        data-testid={`subscribe-${plan.slug}`}
        className="w-full rounded-md py-2.5 text-sm font-bold tracking-widest text-white uppercase shadow-md transition-all hover:shadow-lg active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        style={{ background: 'var(--color-cobalt)' }}>
        {isCurrent ?
          t('plan_current_badge')
        : isFree ?
          t('plan_free_btn')
        : t('plan_subscribe_btn')}
      </button>
    </div>
  );
}

function SubscriptionStatusPanel({
  overview,
  formatDate,
}: {
  overview: NonNullable<Awaited<ReturnType<typeof getBillingData>>['data']>['overview'];
  formatDate: (value: string) => string;
}) {
  const t = useTranslations('Billing');

  const cancel = useMutation({
    mutationFn: async () => {
      const result = await cancelSubscription();
      if (result.error) throw new Error(result.error);
    },
  });

  if (!overview) return null;

  return (
    <section
      className="border-border rounded-xl border p-6 shadow-sm"
      style={{ background: 'var(--surface-1)' }}
      data-testid="current-plan">
      <p className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
        {t('status_label')}
      </p>
      <p className="text-foreground mt-1 text-sm font-semibold">{overview.status}</p>
      {overview.currentPeriodEnd &&
        (overview.cancelAtPeriodEnd ?
          <p className="text-muted-foreground mt-2 text-[12px]">
            {t('cancels_on', { date: formatDate(overview.currentPeriodEnd) })}
          </p>
        : <p className="text-muted-foreground mt-2 text-[12px]">
            {t('renews_on', { date: formatDate(overview.currentPeriodEnd) })}
          </p>)}
      {!overview.cancelAtPeriodEnd && (
        <button
          type="button"
          disabled={cancel.isPending}
          onClick={() => {
            if (window.confirm(t('cancel_confirm'))) cancel.mutate();
          }}
          className="mt-4 rounded-lg border px-4 py-2 text-[13px] font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
          style={{ borderColor: 'var(--color-poppy)', color: 'var(--color-poppy)' }}>
          {t('cancel_btn')}
        </button>
      )}
    </section>
  );
}

function InvoiceHistory() {
  const t = useTranslations('Billing');
  const locale = useLocale();

  const { data, isPending, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ['billing', 'invoices'],
      queryFn: async ({ pageParam }) => {
        const result = await listInvoices({ cursor: pageParam ?? undefined });
        if (result.error || !result.data) throw new Error(result.error ?? 'fetch_failed');
        return result.data;
      },
      initialPageParam: null as { createdAt: string; id: string } | null,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      retry: false,
    });

  if (error?.message === 'not_authorized') return null;

  const entries: Invoice[] = data?.pages.flatMap((page) => page.entries) ?? [];

  const formatDate = (value: string) =>
    new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(value));
  const formatAmount = (invoice: Invoice) =>
    new Intl.NumberFormat(locale, { style: 'currency', currency: invoice.currency }).format(
      invoice.amountPaid / 100,
    );

  return (
    <section
      className="border-border rounded-xl border p-6 shadow-sm"
      style={{ background: 'var(--surface-1)' }}>
      <h2 className="text-foreground mb-4 text-xl font-bold">{t('history_title')}</h2>

      {isPending ?
        <p className="text-muted-foreground text-[12px]">{t('billing_loading')}</p>
      : entries.length === 0 ?
        <p className="text-muted-foreground text-[12px]">{t('history_empty')}</p>
      : <>
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-border bg-muted/40 border-b">
                <th className="text-muted-foreground px-2 py-3 text-[10px] font-black tracking-widest uppercase">
                  {t('col_date')}
                </th>
                <th className="text-muted-foreground px-2 py-3 text-right text-[10px] font-black tracking-widest uppercase">
                  {t('col_amount')}
                </th>
                <th className="text-muted-foreground px-2 py-3 text-right text-[10px] font-black tracking-widest uppercase">
                  {t('col_status')}
                </th>
                <th className="text-muted-foreground px-2 py-3 text-right text-[10px] font-black tracking-widest uppercase">
                  {t('col_receipt')}
                </th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {entries.map((invoice, idx) => (
                <tr
                  key={invoice.id}
                  className={cn(
                    'border-border/50 hover:bg-muted/30 border-b transition-colors',
                    idx % 2 !== 0 && 'bg-muted/20',
                  )}>
                  <td className="text-muted-foreground px-2 py-3 font-mono text-[11px]">
                    {formatDate(invoice.createdAt)}
                  </td>
                  <td className="text-foreground px-2 py-3 text-right font-mono text-xs font-bold">
                    {formatAmount(invoice)}
                  </td>
                  <td className="text-muted-foreground px-2 py-3 text-right text-[11px]">
                    {invoice.status}
                  </td>
                  <td className="px-2 py-3 text-right">
                    {invoice.hostedUrl && (
                      <a
                        href={invoice.hostedUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] font-black tracking-widest uppercase hover:underline"
                        style={{ color: 'var(--color-cobalt)' }}>
                        PDF
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {hasNextPage && (
            <button
              type="button"
              disabled={isFetchingNextPage}
              onClick={() => void fetchNextPage()}
              className="border-border text-foreground mt-4 rounded-lg border px-3 py-1.5 text-[12px] font-semibold transition-opacity hover:opacity-80 disabled:opacity-50">
              {t('load_more')}
            </button>
          )}
        </>
      }
    </section>
  );
}
