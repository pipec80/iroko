'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import {
  Check,
  CheckCircle,
  Lock,
  CreditCard,
  Plus,
  Download,
  ArrowRight,
  HelpCircle,
} from 'lucide-react';

export function BillingTab() {
  const t = useTranslations('Billing');

  return (
    <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
      {/* Left Column: Plans & Payment */}
      <div className="flex flex-col gap-8 lg:col-span-8">
        {/* Section: Plan Comparison */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-foreground text-xl font-bold">{t('current_plan')}</h2>
            <span
              className="rounded-full px-3 py-1 text-[10px] font-bold tracking-wider text-white uppercase"
              style={{ background: 'var(--color-cobalt)' }}>
              {t('billing_annual')}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Basic Plan */}
            <div className="border-border bg-background group hover:border-border/60 relative cursor-pointer rounded-xl border p-6 shadow-sm transition-colors hover:shadow-md">
              <h3 className="text-foreground mb-1 text-lg font-bold">{t('plan_basic_name')}</h3>
              <p className="text-muted-foreground mb-4 text-sm">{t('plan_basic_desc')}</p>
              <div className="mb-6 flex items-baseline gap-1">
                <span className="text-foreground font-mono text-2xl font-bold">$49</span>
                <span className="text-muted-foreground text-sm">{t('plan_basic_period')}</span>
              </div>
              <ul className="text-muted-foreground mb-6 space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Check size={14} strokeWidth={2} className="shrink-0" />
                  {t('plan_basic_item_1')}
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} strokeWidth={2} className="shrink-0" />
                  {t('plan_basic_item_2')}
                </li>
              </ul>
              <button
                type="button"
                className="border-border text-foreground group-hover:border-border/80 w-full rounded-md border py-2 text-sm font-bold tracking-wider uppercase transition-colors">
                {t('plan_basic_btn')}
              </button>
            </div>

            {/* Multi-store Plan (Active) */}
            <div
              className="relative rounded-xl border p-6 shadow-md"
              style={{
                background: 'color-mix(in srgb, var(--color-cobalt) 8%, transparent)',
                borderColor: 'color-mix(in srgb, var(--color-cobalt) 30%, transparent)',
              }}>
              <div
                className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 rounded-full px-3 py-1 text-[10px] font-black tracking-widest whitespace-nowrap text-white uppercase"
                style={{ background: 'var(--color-cobalt)' }}>
                {t('plan_multi_badge')}
              </div>
              <h3 className="text-foreground mb-1 text-lg font-bold">{t('plan_multi_name')}</h3>
              <p className="text-muted-foreground mb-4 text-sm">{t('plan_multi_desc')}</p>
              <div className="mb-6 flex items-baseline gap-1">
                <span className="text-foreground font-mono text-2xl font-bold">$199</span>
                <span className="text-muted-foreground text-sm">{t('plan_multi_period')}</span>
              </div>
              <ul className="text-muted-foreground mb-6 space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle
                    size={14}
                    strokeWidth={2}
                    className="shrink-0"
                    style={{ color: 'var(--color-cobalt)' }}
                  />
                  {t('plan_multi_item_1')}
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle
                    size={14}
                    strokeWidth={2}
                    className="shrink-0"
                    style={{ color: 'var(--color-cobalt)' }}
                  />
                  {t('plan_multi_item_2')}
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle
                    size={14}
                    strokeWidth={2}
                    className="shrink-0"
                    style={{ color: 'var(--color-cobalt)' }}
                  />
                  {t('plan_multi_item_3')}
                </li>
              </ul>
              <button
                type="button"
                className="w-full rounded-md py-2.5 text-sm font-bold tracking-widest text-white uppercase shadow-md transition-all hover:shadow-lg active:scale-[0.98]"
                style={{ background: 'var(--color-cobalt)' }}>
                {t('plan_multi_btn')}
              </button>
            </div>

            {/* Enterprise Plan */}
            <div className="border-border bg-background group hover:border-border/60 relative cursor-pointer rounded-xl border p-6 shadow-sm transition-colors hover:shadow-md">
              <h3 className="text-foreground mb-1 text-lg font-bold">
                {t('plan_enterprise_name')}
              </h3>
              <p className="text-muted-foreground mb-4 text-sm">{t('plan_enterprise_desc')}</p>
              <div className="mb-6 flex items-baseline gap-1">
                <span className="text-foreground font-mono text-2xl font-bold">Custom</span>
              </div>
              <ul className="text-muted-foreground mb-6 space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Check size={14} strokeWidth={2} className="shrink-0" />
                  {t('plan_enterprise_item_1')}
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} strokeWidth={2} className="shrink-0" />
                  {t('plan_enterprise_item_2')}
                </li>
              </ul>
              <button
                type="button"
                className="border-border text-foreground group-hover:border-border/80 w-full rounded-md border py-2 text-sm font-bold tracking-wider uppercase transition-colors">
                {t('plan_enterprise_btn')}
              </button>
            </div>
          </div>
        </section>

        {/* Section: Payment Method */}
        <section
          className="border-border rounded-xl border p-6 shadow-sm lg:p-8"
          style={{ background: 'var(--surface-1)' }}>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-foreground text-xl font-bold">{t('payment_method')}</h2>
            <Lock size={18} className="text-muted-foreground" strokeWidth={1.75} />
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {/* Current Card Display */}
            <div className="border-border bg-background group relative overflow-hidden rounded-xl border p-5 shadow-sm">
              <div
                className="absolute top-0 right-0 -mt-10 -mr-10 h-32 w-32 rounded-full opacity-20 blur-3xl transition-transform duration-700 group-hover:scale-110"
                style={{ background: 'var(--color-cobalt)' }}
              />
              <div className="relative z-10 mb-6 flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="bg-muted flex h-6 w-10 items-center justify-center rounded">
                    <span className="text-muted-foreground text-[10px] font-black tracking-tighter uppercase">
                      Visa
                    </span>
                  </div>
                  <span className="text-foreground text-sm font-bold">{t('primary_card')}</span>
                </div>
                <button
                  type="button"
                  className="text-[10px] font-black tracking-widest uppercase hover:underline"
                  style={{ color: 'var(--color-cobalt)' }}>
                  {t('edit_card')}
                </button>
              </div>
              <div className="text-foreground relative z-10 mb-2 font-mono text-xl tracking-widest">
                •••• •••• •••• 4242
              </div>
              <div className="text-muted-foreground relative z-10 flex justify-between text-[10px] font-bold tracking-widest uppercase">
                <span>{t('card_expires')}</span>
                <span>{t('corporate_card')}</span>
              </div>
            </div>

            {/* Add New Card */}
            <div className="flex flex-col justify-center">
              <h3 className="text-muted-foreground mb-4 text-xs font-black tracking-widest uppercase">
                {t('add_payment')}
              </h3>
              <form className="space-y-3">
                <div className="relative">
                  <CreditCard
                    size={18}
                    strokeWidth={1.75}
                    className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2"
                  />
                  <input
                    className="border-border bg-background text-foreground placeholder:text-muted-foreground w-full rounded-md border py-2.5 pr-3 pl-10 font-mono text-sm outline-none focus:ring-1"
                    style={{ '--tw-ring-color': 'var(--color-cobalt)' } as React.CSSProperties}
                    placeholder="0000 0000 0000 0000"
                    type="text"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    className="border-border bg-background text-foreground placeholder:text-muted-foreground w-full rounded-md border px-3 py-2.5 font-mono text-sm outline-none focus:ring-1"
                    style={{ '--tw-ring-color': 'var(--color-cobalt)' } as React.CSSProperties}
                    placeholder="MM/AA"
                    type="text"
                  />
                  <input
                    className="border-border bg-background text-foreground placeholder:text-muted-foreground w-full rounded-md border px-3 py-2.5 font-mono text-sm outline-none focus:ring-1"
                    style={{ '--tw-ring-color': 'var(--color-cobalt)' } as React.CSSProperties}
                    placeholder="CVC"
                    type="text"
                  />
                </div>
                <button
                  className="border-border text-foreground hover:bg-muted flex w-full items-center justify-center gap-2 rounded-md border py-2.5 text-xs font-bold tracking-widest uppercase transition-all active:scale-[0.98]"
                  type="button">
                  <Plus size={16} strokeWidth={2} />
                  {t('add_card_btn')}
                </button>
              </form>
            </div>
          </div>
        </section>
      </div>

      {/* Right Column: Billing History */}
      <div className="flex flex-col gap-6 lg:col-span-4">
        <section
          className="border-border flex flex-1 flex-col rounded-xl border p-6 shadow-sm"
          style={{ background: 'var(--surface-1)' }}>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-foreground text-xl font-bold">{t('history_title')}</h2>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground transition-colors">
              <Download size={20} strokeWidth={1.75} />
            </button>
          </div>

          <div className="-mx-6 flex-1 overflow-x-auto px-6">
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
                    {t('col_receipt')}
                  </th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {[
                  { date: '2023-10-01', amount: '199.00' },
                  { date: '2023-09-01', amount: '199.00' },
                  { date: '2023-08-01', amount: '199.00' },
                  { date: '2023-07-01', amount: '199.00' },
                  { date: '2023-06-01', amount: '49.00' },
                ].map((item, idx) => (
                  <tr
                    key={idx}
                    className={`border-border/50 hover:bg-muted/30 border-b transition-colors ${idx % 2 !== 0 ? 'bg-muted/20' : ''}`}>
                    <td className="text-muted-foreground px-2 py-3 font-mono text-[11px]">
                      {item.date}
                    </td>
                    <td className="text-foreground px-2 py-3 text-right font-mono text-xs font-bold">
                      ${item.amount}
                    </td>
                    <td className="px-2 py-3 text-right">
                      <button
                        type="button"
                        className="text-[10px] font-black tracking-widest uppercase hover:underline"
                        style={{ color: 'var(--color-cobalt)' }}>
                        PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-border mt-6 border-t pt-4">
            <button
              type="button"
              className="group flex w-full items-center justify-center gap-2 text-xs font-black tracking-widest uppercase transition-colors hover:underline"
              style={{ color: 'var(--color-cobalt)' }}>
              {t('view_all')}
              <ArrowRight
                size={14}
                strokeWidth={2}
                className="transition-transform group-hover:translate-x-1"
              />
            </button>
          </div>
        </section>

        {/* Help Snippet */}
        <section
          className="border-border flex items-start gap-4 rounded-xl border p-5 shadow-sm"
          style={{ background: 'var(--surface-1)' }}>
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            style={{ background: 'color-mix(in srgb, var(--color-cobalt) 12%, transparent)' }}>
            <HelpCircle size={20} strokeWidth={1.75} style={{ color: 'var(--color-cobalt)' }} />
          </div>
          <div>
            <h3 className="text-foreground mb-1 text-sm font-bold">{t('help_title')}</h3>
            <p className="text-muted-foreground mb-3 text-[11px] leading-relaxed">
              {t('help_desc')}
            </p>
            <button
              type="button"
              className="text-[10px] font-black tracking-widest uppercase hover:underline active:scale-95"
              style={{ color: 'var(--color-cobalt)' }}>
              {t('help_btn')}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
