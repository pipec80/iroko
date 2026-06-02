import { getTranslations } from 'next-intl/server';
import {
  BarChart2,
  Package,
  Gauge,
  MoreHorizontal,
  ChevronRight,
  ArrowRight,
  Download,
} from 'lucide-react';

import type { LucideIcon } from 'lucide-react';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Navigation' });
  return { title: t('reports') };
}

type ReportCategory = {
  id: string;
  title: string;
  Icon: LucideIcon;
  color: string;
  reports: { id: string; title: string; desc: string; trend: string }[];
};

const REPORT_CATEGORIES: ReportCategory[] = [
  {
    id: 'sales',
    title: 'Sales & Revenue',
    Icon: BarChart2,
    color: 'var(--color-cobalt)',
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
    Icon: Package,
    color: 'var(--color-gold)',
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
    Icon: Gauge,
    color: 'var(--color-poppy)',
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
    <div className="animate-in fade-in space-y-6 duration-700">
      {/* Header */}
      <header className="space-y-1">
        <h1 className="text-foreground text-3xl font-extrabold tracking-tight">{t('reports')}</h1>
        <p className="text-muted-foreground max-w-2xl text-sm">
          Access comprehensive analytics and generate high-precision data exports across all
          operations.
        </p>
      </header>

      {/* Category grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {REPORT_CATEGORIES.map((category) => (
          <div key={category.id} className="card flex flex-col p-5">
            {/* Category header */}
            <div className="mb-5 flex items-center justify-between">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ background: category.color + '18' }}>
                <category.Icon size={18} style={{ color: category.color }} strokeWidth={1.75} />
              </div>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground rounded-lg p-1 transition-colors">
                <MoreHorizontal size={16} strokeWidth={1.75} />
              </button>
            </div>

            <h2 className="text-foreground mb-4 text-[14px] font-semibold">{category.title}</h2>

            <div className="flex flex-1 flex-col gap-2">
              {category.reports.map((report) => (
                <a
                  key={report.id}
                  href={`/dashboard/reports/${report.id}`}
                  className="border-border group/item hover:bg-surface-3 flex items-center justify-between rounded-xl border px-3 py-3 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground truncate text-[12px] font-semibold">
                      {report.title}
                    </p>
                    <p className="text-muted-foreground truncate font-mono text-[10px] tracking-wide">
                      {report.desc.slice(0, 38)}…
                    </p>
                  </div>
                  <div className="ml-3 flex shrink-0 items-center gap-2">
                    <span
                      className="font-mono text-[10px] font-bold"
                      style={{ color: category.color }}>
                      {report.trend}
                    </span>
                    <ChevronRight
                      size={13}
                      className="text-muted-foreground transition-transform group-hover/item:translate-x-0.5"
                      strokeWidth={2}
                    />
                  </div>
                </a>
              ))}
            </div>

            <button
              type="button"
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-[12px] font-medium transition-colors"
              style={{ color: category.color }}>
              Ver todos
              <ArrowRight size={13} strokeWidth={2} />
            </button>
          </div>
        ))}
      </div>

      {/* Export banner */}
      <div className="card flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{ background: 'var(--color-cobalt)18' }}>
            <Download size={18} style={{ color: 'var(--color-cobalt)' }} strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="text-foreground text-[14px] font-semibold">Scheduled Exports</h3>
            <p className="text-muted-foreground text-[12px]">
              Configure automated delivery of key reports to your email or cloud storage.
            </p>
          </div>
        </div>
        <button
          type="button"
          className="shrink-0 rounded-lg px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: 'var(--color-cobalt)' }}>
          Configure Export
        </button>
      </div>
    </div>
  );
}
