'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

export function OperationsDashboard() {
  const t = useTranslations('Dashboard');

  return (
    <div className="animate-in fade-in flex flex-col gap-8 duration-700">
      {/* KPIs Bento Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title={t('kpis.total_sales')}
          value="$124,592.00"
          trend="+12.5%"
          trendLabel={t('kpis.vs_yesterday')}
          icon="payments"
          variant="primary"
        />
        <KPICard
          title={t('kpis.orders')}
          value="452"
          trend="+8.2%"
          trendLabel={t('kpis.vs_yesterday')}
          icon="shopping_cart"
          variant="secondary"
        />
        <KPICard
          title={t('kpis.avg_ticket')}
          value="$275.60"
          trend="-2.4%"
          trendLabel={t('kpis.vs_yesterday')}
          icon="receipt"
          variant="tertiary"
        />
        <KPICard
          title={t('kpis.conversion')}
          value="3.24%"
          trend="+0.5%"
          trendLabel={t('kpis.vs_yesterday')}
          icon="trending_up"
          variant="primary"
        />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Sales Chart */}
        <div className="bg-surface-container-lowest/80 ghost-border ambient-shadow glass rounded-3xl p-6 lg:col-span-2">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-primary font-headline text-lg font-bold">{t('sales_volume')}</h3>
              <p className="text-on-surface-variant text-sm">{t('last_7_days')}</p>
            </div>
            <button className="text-primary hover:bg-surface-container-highest flex h-8 w-8 items-center justify-center rounded-full transition-colors">
              <span className="material-symbols-outlined text-[20px]">more_vert</span>
            </button>
          </div>
          <div className="relative h-64 w-full">
            <svg className="h-full w-full overflow-visible" viewBox="0 0 100 40">
              <defs>
                <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
                </linearGradient>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="1.5" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              <path
                className="stroke-primary fill-none stroke-[0.8]"
                d="M 0 35 C 10 32, 20 20, 30 25 C 40 30, 50 10, 60 15 C 70 20, 80 5, 100 8"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#glow)"
              />
              <path
                className="fill-[url(#chartGradient)]"
                d="M 0 35 C 10 32, 20 20, 30 25 C 40 30, 50 10, 60 15 C 70 20, 80 5, 100 8 L 100 40 L 0 40 Z"
              />
              {[0, 30, 60, 100].map((x) => (
                <circle
                  key={x}
                  cx={x}
                  cy={
                    x === 0 ? 35
                    : x === 30 ?
                      25
                    : x === 60 ?
                      15
                    : 8
                  }
                  r="1.2"
                  className="fill-primary stroke-surface-container-lowest stroke-[0.5] shadow-xl"
                />
              ))}
            </svg>
            <div className="text-on-surface-variant/60 mt-4 flex justify-between px-2 text-[10px] font-bold tracking-widest uppercase">
              <span>Lun</span>
              <span>Mar</span>
              <span>Mie</span>
              <span>Jue</span>
              <span>Vie</span>
              <span>Sab</span>
              <span>Dom</span>
            </div>
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-surface-container-lowest/80 ghost-border ambient-shadow glass rounded-3xl p-6">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-primary font-headline text-lg font-bold">{t('top_selling')}</h3>
            <button className="text-primary hover:bg-surface-container-highest flex h-8 w-8 items-center justify-center rounded-full transition-colors">
              <span className="material-symbols-outlined text-[20px]">more_vert</span>
            </button>
          </div>
          <div className="space-y-4">
            <TopProductItem
              name="Sony Alpha a7 IV"
              sku="ELC-2049-A"
              sales="124"
              revenue="$309,752"
              icon="camera"
            />
            <TopProductItem
              name='MacBook Pro 16"'
              sku="ELC-1092-B"
              sales="86"
              revenue="$300,914"
              icon="laptop_mac"
            />
            <TopProductItem
              name="Aeron Chair"
              sku="HME-3329-X"
              sales="52"
              revenue="$93,860"
              icon="chair"
            />
            <TopProductItem
              name="Air Zoom Pegasus"
              sku="APP-1102-Z"
              sales="245"
              revenue="$31,850"
              icon="footprint"
            />
          </div>
          <button className="text-primary hover:bg-surface-container-highest mt-6 w-full rounded-lg py-2 text-sm font-bold transition-colors">
            {t('view_all')}
          </button>
        </div>
      </div>

      {/* Alerts */}
      <div className="bg-surface-container-lowest/80 ghost-border ambient-shadow glass rounded-3xl p-6">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-primary font-headline text-lg font-bold">{t('recent_alerts')}</h3>
          <span className="bg-error-container/30 text-error rounded-full px-3 py-1 text-xs font-bold tracking-wider uppercase">
            3 New
          </span>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <AlertCard
            title="Low Stock Warning"
            desc="Sony Alpha a7 IV at Madrid Central (14 units left)"
            time="2m ago"
            type="error"
          />
          <AlertCard
            title="Price Discrepancy"
            desc="MacBook Pro SKU mismatch between Shopify and ERP"
            time="15m ago"
            type="warning"
          />
          <AlertCard
            title="Delayed Shipment"
            desc="PO-2024-089 from Global Tech Intl delayed by 2 days"
            time="1h ago"
            type="info"
          />
        </div>
      </div>
    </div>
  );
}

function KPICard({
  title,
  value,
  trend,
  trendLabel,
  icon,
  variant,
}: {
  title: string;
  value: string;
  trend: string;
  trendLabel: string;
  icon: string;
  variant: 'primary' | 'secondary' | 'tertiary';
}) {
  const isPositive = trend.startsWith('+');

  return (
    <div className="bg-surface-container-lowest/80 ghost-border ambient-shadow group glass flex flex-col gap-4 rounded-3xl p-5 transition-all duration-500 hover:-translate-y-1 hover:scale-[1.02]">
      <div className="flex items-center justify-between">
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-xl',
            variant === 'primary' && 'bg-primary-container text-on-primary-container',
            variant === 'secondary' && 'bg-secondary-container text-on-secondary-container',
            variant === 'tertiary' && 'bg-tertiary-container text-on-tertiary-container',
          )}>
          <span className="material-symbols-outlined text-[22px]">{icon}</span>
        </div>
        <div
          className={cn(
            'flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold',
            isPositive ?
              'bg-primary-container/20 text-primary'
            : 'bg-error-container/20 text-error',
          )}>
          <span className="material-symbols-outlined text-[14px]">
            {isPositive ? 'arrow_upward' : 'arrow_downward'}
          </span>
          {trend}
        </div>
      </div>
      <div>
        <p className="text-on-surface-variant text-xs font-medium tracking-wider uppercase opacity-60">
          {title}
        </p>
        <h3 className="text-on-surface font-mono text-2xl font-bold tracking-tight">{value}</h3>
        <p className="text-on-surface-variant mt-1 text-[10px] font-medium opacity-40">
          {trendLabel}
        </p>
      </div>
    </div>
  );
}

function TopProductItem({
  name,
  sku,
  sales,
  revenue,
  icon,
}: {
  name: string;
  sku: string;
  sales: string;
  revenue: string;
  icon: string;
}) {
  return (
    <div className="flex items-center gap-4 py-2">
      <div className="bg-surface-container-high text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
        <span className="material-symbols-outlined text-[20px]">{icon}</span>
      </div>
      <div className="min-w-0 flex-grow">
        <p className="text-on-surface truncate text-sm font-bold">{name}</p>
        <p className="text-on-surface-variant font-mono text-[10px] opacity-60">{sku}</p>
      </div>
      <div className="text-right">
        <p className="text-on-surface text-sm font-bold">{revenue}</p>
        <p className="text-on-surface-variant text-[10px] font-medium opacity-60">{sales} vtas</p>
      </div>
    </div>
  );
}

function AlertCard({
  title,
  desc,
  time,
  type,
}: {
  title: string;
  desc: string;
  time: string;
  type: 'error' | 'warning' | 'info';
}) {
  return (
    <div
      className={cn(
        'rounded-r-xl border-l-4 p-4 transition-all hover:translate-x-1',
        type === 'error' && 'bg-error-container/10 border-error',
        type === 'warning' && 'bg-tertiary-container/10 border-tertiary',
        type === 'info' && 'bg-primary-container/10 border-primary',
      )}>
      <div className="mb-1 flex items-center justify-between">
        <p
          className={cn(
            'text-xs font-bold tracking-wider uppercase',
            type === 'error' && 'text-error',
            type === 'warning' && 'text-tertiary',
            type === 'info' && 'text-primary',
          )}>
          {title}
        </p>
        <span className="text-on-surface-variant font-mono text-[10px] opacity-50">{time}</span>
      </div>
      <p className="text-on-surface text-sm leading-snug">{desc}</p>
    </div>
  );
}
