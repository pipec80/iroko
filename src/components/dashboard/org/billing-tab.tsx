'use client';

import { useState } from 'react';
import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';

import {
  cancelSubscription,
  getBillingData,
  listInvoices,
  startCheckout,
  type Invoice,
  type PlanRow,
} from '@/app/[locale]/dashboard/billing/actions';
import { PlanViewedTracker } from '@/components/analytics/plan-viewed-tracker';
import { logClient } from '@/lib/logger-client';
import { canManageBilling, type MembershipRole } from '@/lib/permissions';
import { cn } from '@/lib/utils';

type Interval = 'month' | 'year';

const SUBSCRIPTION_STATUS_KEYS: Record<string, string> = {
  trialing: 'status_trialing',
  active: 'status_active',
  past_due: 'status_past_due',
  canceled: 'status_canceled',
  paused: 'status_paused',
  unpaid: 'status_unpaid',
  incomplete: 'status_incomplete',
};

const INVOICE_STATUS_KEYS: Record<string, string> = {
  draft: 'invoice_status_draft',
  open: 'invoice_status_open',
  paid: 'invoice_status_paid',
  void: 'invoice_status_void',
  uncollectible: 'invoice_status_uncollectible',
};

function toDisplayAmount(amount: number, currency: string): number {
  return currency === 'CLP' ? amount : amount / 100;
}

export function BillingTab({ currentUserRole }: { currentUserRole: MembershipRole | null }) {
  const t = useTranslations('Billing');
  const locale = useLocale();
  const preapprovalId = useSearchParams().get('preapproval_id');
  const [interval, setInterval] = useState<Interval>('month');
  const canManage = canManageBilling(currentUserRole);

  const { data, isPending, error } = useQuery({
    queryKey: ['billing', 'data'],
    queryFn: async () => {
      const result = await getBillingData();
      if (result.error || !result.data) throw new Error(result.error ?? 'fetch_failed');
      return result.data;
    },
    // Mercado Pago returns before its asynchronous subscription webhook is
    // delivered. Keep polling only for this callback and only while no active
    // overview exists; the provider webhook remains the state authority.
    refetchInterval: (query) => (preapprovalId && !query.state.data?.overview ? 3_000 : false),
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
    // Sin esto un not_authorized (el backend ya valida owner/admin) quedaba
    // solo en checkout.error, que nada en este componente renderizaba — el
    // fallo desaparecía en silencio.
    onError: (err: unknown) => {
      logClient.error(
        { action: 'billing.checkout' },
        err instanceof Error ? err.message : 'checkout failed',
      );
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
  const hasAnnualPlans = data.plans.some((plan) => plan.interval === 'year');
  const overview = data.overview;
  const checkoutAvailable = data.checkoutAvailable ?? true;
  const isAwaitingCheckoutConfirmation = Boolean(preapprovalId && !overview);
  const hasBlockingPaidSubscription = Boolean(
    overview &&
    overview.planSlug !== 'free' &&
    ['trialing', 'active', 'past_due'].includes(overview.status),
  );

  const formatPrice = (plan: PlanRow) =>
    new Intl.NumberFormat(locale, { style: 'currency', currency: plan.currency }).format(
      toDisplayAmount(plan.price, plan.currency),
    );

  const formatDate = (value: string) =>
    new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(value));

  return (
    <div className="space-y-8">
      <PlanViewedTracker source="billing_page" />
      {!canManage && (
        <p
          role="status"
          className="rounded-lg px-3 py-2 text-[13px]"
          style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>
          {t('readonly_notice')}
        </p>
      )}
      {checkout.isError && (
        <p
          role="alert"
          className="rounded-lg px-3 py-2 text-[13px] font-medium"
          style={{ background: 'var(--color-poppy-wash)', color: 'var(--color-poppy)' }}>
          {t('checkout_error')}
        </p>
      )}
      {isAwaitingCheckoutConfirmation && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-[13px]"
          style={{ background: 'var(--color-info-wash)', color: 'var(--color-info)' }}>
          <Loader2 aria-hidden className="size-4 animate-spin" />
          {t('checkout_confirming')}
        </p>
      )}
      {!checkoutAvailable && (
        <p
          role="status"
          className="rounded-lg px-3 py-2 text-[13px]"
          style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>
          {t('checkout_unavailable')}
        </p>
      )}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <span className="eyebrow">{t('current_plan')}</span>
          {hasAnnualPlans && (
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
          )}
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
              isProcessing={checkout.isPending && checkout.variables?.slug === plan.slug}
              canManage={canManage}
              isCheckoutBlocked={
                hasBlockingPaidSubscription || !checkoutAvailable || isAwaitingCheckoutConfirmation
              }
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
  isProcessing,
  canManage,
  isCheckoutBlocked,
}: {
  plan: PlanRow;
  isCurrent: boolean;
  price: string;
  onSubscribe: () => void;
  isSubscribing: boolean;
  isProcessing: boolean;
  canManage: boolean;
  isCheckoutBlocked: boolean;
}) {
  const t = useTranslations('Billing');
  const isFree = plan.slug === 'free';

  return (
    <div className="card relative p-6" data-testid={`plan-card-${plan.slug}`}>
      {isCurrent && (
        <div
          className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 rounded-full px-3 py-1 text-[10px] font-black tracking-widest whitespace-nowrap text-white uppercase"
          style={{ background: 'var(--color-cobalt)' }}>
          {t('plan_current_badge')}
        </div>
      )}
      <h3 className="display-italic mb-1 text-2xl">{plan.name}</h3>
      <p className="text-muted-foreground mb-4 text-sm">{plan.description}</p>
      <div className="mb-4 flex items-baseline gap-1">
        <span className="mono text-foreground text-2xl font-bold">{price}</span>
        {!isFree && (
          <span className="text-muted-foreground text-sm">/{t(`interval_${plan.interval}`)}</span>
        )}
      </div>
      {plan.trialDays > 0 && !isCurrent && (
        <p className="text-muted-foreground mb-4 text-[12px]">
          {t('plan_trial', { days: plan.trialDays })}
        </p>
      )}
      <button
        type="button"
        disabled={isCurrent || isFree || isSubscribing || !canManage || isCheckoutBlocked}
        onClick={onSubscribe}
        data-testid={`subscribe-${plan.slug}`}
        className={cn(
          'w-full items-center justify-center gap-2',
          isCurrent || isFree ? 'btn-outline' : 'btn-iron',
        )}>
        {isProcessing && <Loader2 aria-hidden className="size-4 animate-spin" />}
        {isProcessing ?
          t('checkout_redirecting')
        : isCurrent ?
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
    mutationFn: async (timing: 'immediate' | 'period_end') => {
      const result = await cancelSubscription({ timing });
      if (result.error) throw new Error(result.error);
    },
  });

  if (!overview) return null;

  const statusLabel = t((SUBSCRIPTION_STATUS_KEYS[overview.status] ?? overview.status) as never);

  return (
    <section
      className="card relative overflow-hidden p-7"
      style={{ background: 'var(--color-night)', color: 'var(--color-bone)', border: 0 }}
      data-testid="current-plan">
      <div className="iroko-grid pointer-events-none absolute inset-0 opacity-30" />
      <div className="relative">
        <span className="eyebrow-sm" style={{ color: 'var(--color-gold)' }}>
          {t('current_plan')}
        </span>
        <h3 className="display-italic mt-1 text-[32px]" style={{ color: 'var(--color-bone)' }}>
          {overview.planName}
        </h3>
        <p className="mt-2 text-sm" style={{ color: 'rgba(245,236,218,0.7)' }}>
          {t('status_label')}: {statusLabel}
        </p>
        {overview.currentPeriodEnd &&
          (overview.cancelAtPeriodEnd ?
            <p className="mt-1 text-[13px]" style={{ color: 'rgba(245,236,218,0.55)' }}>
              {t('cancels_on', { date: formatDate(overview.currentPeriodEnd) })}
            </p>
          : <p className="mt-1 text-[13px]" style={{ color: 'rgba(245,236,218,0.55)' }}>
              {t('renews_on', { date: formatDate(overview.currentPeriodEnd) })}
            </p>)}
        {!overview.cancelAtPeriodEnd && overview.capabilities.cancelAtPeriodEnd && (
          <button
            type="button"
            disabled={cancel.isPending}
            onClick={() => {
              if (window.confirm(t('cancel_confirm'))) cancel.mutate('period_end');
            }}
            data-testid="cancel-period-end"
            className="mt-5 rounded-lg border px-4 py-2 text-[13px] font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ borderColor: 'rgba(245,236,218,0.25)', color: 'var(--color-bone)' }}>
            {t('cancel_btn')}
          </button>
        )}
        {overview.capabilities.cancelImmediately && (
          <button
            type="button"
            disabled={cancel.isPending}
            onClick={() => {
              if (window.confirm(t('cancel_now_confirm'))) cancel.mutate('immediate');
            }}
            data-testid="cancel-immediately"
            className="mt-5 ml-3 rounded-lg border px-4 py-2 text-[13px] font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ borderColor: 'rgba(245,236,218,0.25)', color: 'var(--color-bone)' }}>
            {t('cancel_now_btn')}
          </button>
        )}
      </div>
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
      toDisplayAmount(invoice.amountPaid, invoice.currency),
    );

  return (
    <section>
      <span className="eyebrow mb-3 block">{t('history_title')}</span>

      {isPending ?
        <p className="text-muted-foreground text-[12px]">{t('billing_loading')}</p>
      : entries.length === 0 ?
        <p className="text-muted-foreground text-[12px]">{t('history_empty')}</p>
      : <div className="card overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-left">
            <thead>
              <tr className="col-header table-header-row bg-surface-2">
                <th scope="col" className="px-[22px] py-3">
                  {t('col_date')}
                </th>
                <th scope="col" className="py-3 text-right">
                  {t('col_amount')}
                </th>
                <th scope="col" className="py-3 text-right">
                  {t('col_status')}
                </th>
                <th scope="col" className="px-[22px] py-3 text-right">
                  {t('col_receipt')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y text-sm">
              {entries.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-surface-2 transition-colors">
                  <td className="mono text-muted-foreground px-[22px] py-[14px] text-[12px]">
                    {formatDate(invoice.createdAt)}
                  </td>
                  <td className="mono text-foreground py-[14px] text-right text-[13px] font-bold">
                    {formatAmount(invoice)}
                  </td>
                  <td className="py-[14px] text-right">
                    <span
                      className="chip chip-sm"
                      style={
                        invoice.status === 'paid' ?
                          { background: 'var(--color-success-wash)', color: 'var(--color-success)' }
                        : { background: 'var(--surface-2)', color: 'var(--text-secondary)' }
                      }>
                      {t((INVOICE_STATUS_KEYS[invoice.status] ?? invoice.status) as never)}
                    </span>
                  </td>
                  <td className="px-[22px] py-[14px] text-right">
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
        </div>
      }
      {hasNextPage && (
        <button
          type="button"
          disabled={isFetchingNextPage}
          onClick={() => void fetchNextPage()}
          className="border-border text-foreground mt-4 rounded-lg border px-3 py-1.5 text-[12px] font-semibold transition-opacity hover:opacity-80 disabled:opacity-50">
          {t('load_more')}
        </button>
      )}
    </section>
  );
}
