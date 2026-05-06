import React from 'react';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Navigation' });

  return {
    title: t('reports'),
  };
}

const REPORT_CATEGORIES = [
  {
    id: 'sales',
    title: 'Sales & Revenue',
    icon: 'payments',
    reports: [
      {
        id: 'daily-revenue',
        title: 'Daily Revenue Breakdown',
        desc: 'Track daily earnings and transaction volumes.',
        trend: '+12.5%',
      },
      {
        id: 'customer-ltv',
        title: 'Customer Lifetime Value',
        desc: 'Analyze long-term revenue potential per segment.',
        trend: '+8.2%',
      },
    ],
  },
  {
    id: 'inventory',
    title: 'Inventory & Stock',
    icon: 'inventory_2',
    reports: [
      {
        id: 'stock-turnover',
        title: 'Stock Turnover Ratio',
        desc: 'Measure how quickly inventory is sold and replaced.',
        trend: 'High',
      },
      {
        id: 'low-stock-alert',
        title: 'Low Stock Intelligence',
        desc: 'AI-driven predictions for upcoming stockouts.',
        trend: 'Critical',
      },
    ],
  },
  {
    id: 'performance',
    title: 'Operational Efficiency',
    icon: 'speed',
    reports: [
      {
        id: 'order-fulfillment',
        title: 'Fulfillment Latency',
        desc: 'Average time from order placement to shipping.',
        trend: '-15ms',
      },
      {
        id: 'system-uptime',
        title: 'API & Gateway Uptime',
        desc: 'Real-time monitoring of service availability.',
        trend: '99.99%',
      },
    ],
  },
];

export default async function ReportsPage() {
  const t = await getTranslations('Navigation');

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 flex flex-col gap-8 p-8 duration-1000 ease-out">
      {/* Header Section */}
      <div className="flex flex-col gap-2">
        <h1 className="font-headline text-on-surface text-3xl font-extrabold tracking-tight">
          {t('reports')}
        </h1>
        <p className="text-on-surface-variant max-w-2xl text-base">
          Access comprehensive analytics and generate high-precision data exports across all retail
          operations.
        </p>
      </div>

      {/* Featured / Favorite Reports Section */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {REPORT_CATEGORIES.map((category) => (
          <div
            key={category.id}
            className="bg-surface-container-low ambient-shadow group hover:bg-surface-container flex flex-col rounded-3xl p-6 transition-all hover:scale-[1.02]">
            <div className="mb-6 flex items-center justify-between">
              <div className="bg-primary-container/20 group-hover:bg-primary/10 flex h-14 w-14 items-center justify-center rounded-2xl transition-colors">
                <span className="material-symbols-outlined text-primary text-3xl">
                  {category.icon}
                </span>
              </div>
              <button className="text-on-surface-variant hover:text-primary flex h-10 w-10 items-center justify-center rounded-full transition-colors">
                <span className="material-symbols-outlined text-xl">more_vert</span>
              </button>
            </div>

            <h2 className="text-on-surface mb-6 text-xl font-bold">{category.title}</h2>

            <div className="space-y-4">
              {category.reports.map((report) => (
                <Link
                  key={report.id}
                  href={`/dashboard/reports/${report.id}`}
                  className="bg-surface-container-highest/30 ghost-border group/item hover:bg-surface-container-highest flex items-center justify-between rounded-xl p-4 transition-all">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-on-surface group-hover/item:text-primary text-sm font-bold">
                      {report.title}
                    </span>
                    <span className="text-on-surface-variant font-mono text-[10px] tracking-wider uppercase opacity-60">
                      {report.desc.slice(0, 35)}...
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-primary font-mono text-xs font-bold">{report.trend}</span>
                    <span className="material-symbols-outlined text-on-surface-variant text-sm transition-transform group-hover/item:translate-x-1">
                      chevron_right
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            <button className="text-primary hover:bg-primary/5 mt-6 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-colors">
              View all {category.title}
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>
        ))}
      </div>

      {/* Info Section - Data Export */}
      <div className="glass ghost-border flex items-center justify-between rounded-3xl p-8 backdrop-blur-xl">
        <div className="flex items-center gap-6">
          <div className="bg-secondary-container/30 flex h-16 w-16 items-center justify-center rounded-2xl">
            <span className="material-symbols-outlined text-secondary text-3xl">download</span>
          </div>
          <div>
            <h3 className="text-on-surface text-lg font-bold">Scheduled Exports</h3>
            <p className="text-on-surface-variant text-sm">
              Configure automated delivery of key reports to your email or cloud storage.
            </p>
          </div>
        </div>
        <button className="bg-primary text-primary-foreground shadow-primary/20 rounded-xl px-6 py-3 text-sm font-bold shadow-lg transition-transform hover:scale-105 active:scale-95">
          Configure Export
        </button>
      </div>
    </div>
  );
}
