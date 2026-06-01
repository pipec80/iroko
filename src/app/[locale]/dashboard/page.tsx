import { getTranslations, setRequestLocale } from 'next-intl/server';
import { TrendingUp, TrendingDown, Zap, Activity, BarChart2, Clock } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';

import type { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Dashboard' });
  return { title: t('page_title'), description: t('page_description') };
}

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('Dashboard');

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const displayName =
    (claimsData?.claims.user_metadata?.given_name as string | undefined) ||
    (claimsData?.claims.user_metadata?.display_name as string | undefined) ||
    (claimsData?.claims.email as string | undefined) ||
    '';

  return (
    <div className="animate-in fade-in space-y-8 duration-700">
      {/* Header */}
      <header className="space-y-1">
        <h1 className="text-foreground text-3xl font-extrabold tracking-tight">
          {t('page_title')}
        </h1>
        <p className="text-muted-foreground text-sm">{t('welcome_back', { name: displayName })}</p>
      </header>

      {/* KPI Grid */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t('kpis.total_sales')}
          value="$1,284,500"
          change="+12.5%"
          trend="up"
          periodLabel={t('vs_period')}
        />
        <StatCard
          title={t('kpis.orders')}
          value="14,209"
          change="+3.1%"
          trend="up"
          periodLabel={t('vs_period')}
        />
        <StatCard
          title={t('kpis.conversion')}
          value="3.42%"
          change="-0.8%"
          trend="down"
          periodLabel={t('vs_period')}
        />
        <StatCard
          title={t('metrics.system_health')}
          value="98.2%"
          change="+1.2%"
          trend="up"
          periodLabel={t('vs_period')}
        />
      </section>

      {/* Chart + Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Chart placeholder */}
        <div
          className="border-border flex flex-col gap-4 rounded-2xl border p-6 lg:col-span-2"
          style={{ background: 'var(--surface-1)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart2 className="text-muted-foreground size-4" strokeWidth={1.75} />
              <span className="text-foreground text-[13px] font-semibold">
                {t('system_performance')}
              </span>
            </div>
            <span className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
              Últ. 30 días
            </span>
          </div>
          <div
            className="border-border flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed"
            style={{ minHeight: 220 }}>
            <BarChart2 className="text-muted-foreground size-8 opacity-20" strokeWidth={1.25} />
            <span className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase opacity-40">
              {t('waiting_telemetry')}
            </span>
          </div>
        </div>

        {/* Activity feed */}
        <div
          className="border-border flex flex-col gap-4 rounded-2xl border p-6"
          style={{ background: 'var(--surface-1)' }}>
          <div className="flex items-center gap-2">
            <Activity className="text-muted-foreground size-4" strokeWidth={1.75} />
            <span className="text-foreground text-[13px] font-semibold">Actividad reciente</span>
          </div>
          <div className="flex flex-1 flex-col gap-3">
            {ACTIVITY_FEED.map((item) => (
              <div key={item.id} className="flex items-start gap-3">
                <div
                  className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                  style={{ background: item.color + '20' }}>
                  <item.Icon size={12} style={{ color: item.color }} strokeWidth={2} />
                </div>
                <div className="min-w-0">
                  <p className="text-foreground truncate text-[12px] font-medium">{item.label}</p>
                  <p className="text-muted-foreground font-mono text-[10px]">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <QuickAction
          icon={Zap}
          title="Nuevo proyecto"
          desc="Inicia un proyecto desde cero"
          href="/dashboard/projects"
          color="var(--color-cobalt)"
        />
        <QuickAction
          icon={Clock}
          title="Ver reportes"
          desc="Analítica de rendimiento"
          href="/dashboard/reports"
          color="var(--color-gold)"
        />
        <QuickAction
          icon={Activity}
          title="Operaciones"
          desc="Estado de los servicios"
          href="/dashboard/operations"
          color="var(--color-poppy)"
        />
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  change,
  trend,
  periodLabel,
}: {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
  periodLabel: string;
}) {
  const TrendIcon = trend === 'up' ? TrendingUp : TrendingDown;
  return (
    <div
      className="border-border group flex flex-col gap-3 rounded-2xl border p-5"
      style={{ background: 'var(--surface-1)' }}>
      <p className="text-muted-foreground font-mono text-[10px] font-bold tracking-[0.18em] uppercase">
        {title}
      </p>
      <p className="text-foreground font-mono text-3xl font-bold tracking-tight">{value}</p>
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] font-bold',
            trend === 'up' ?
              'text-emerald-700 dark:text-emerald-400'
            : 'text-red-600 dark:text-red-400',
          )}
          style={{
            background: trend === 'up' ? 'rgba(16,185,129,0.1)' : 'rgba(217,33,33,0.1)',
          }}>
          <TrendIcon size={10} strokeWidth={2.5} />
          {change}
        </span>
        <span className="text-muted-foreground font-mono text-[10px] tracking-wider uppercase opacity-60">
          {periodLabel}
        </span>
      </div>
    </div>
  );
}

function QuickAction({
  icon: Icon,
  title,
  desc,
  href,
  color,
}: {
  icon: React.ElementType;
  title: string;
  desc: string;
  href: string;
  color: string;
}) {
  return (
    <a
      href={href}
      className="border-border group flex items-center gap-4 rounded-2xl border p-5 transition-colors hover:border-transparent"
      style={{ background: 'var(--surface-1)' }}>
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{ background: color + '18' }}>
        <Icon size={18} style={{ color }} strokeWidth={1.75} />
      </div>
      <div className="min-w-0">
        <p className="text-foreground text-[13px] font-semibold">{title}</p>
        <p className="text-muted-foreground text-[11px]">{desc}</p>
      </div>
    </a>
  );
}

const ACTIVITY_FEED = [
  {
    id: 1,
    label: 'Nuevo miembro agregado',
    time: 'hace 5 min',
    Icon: Zap,
    color: 'var(--color-cobalt)',
  },
  {
    id: 2,
    label: 'Proyecto actualizado',
    time: 'hace 23 min',
    Icon: Activity,
    color: 'var(--color-gold)',
  },
  {
    id: 3,
    label: 'Reporte generado',
    time: 'hace 1 h',
    Icon: BarChart2,
    color: 'var(--color-poppy)',
  },
  {
    id: 4,
    label: 'Operación completada',
    time: 'hace 3 h',
    Icon: TrendingUp,
    color: 'var(--color-cobalt)',
  },
  {
    id: 5,
    label: 'Configuración guardada',
    time: 'ayer',
    Icon: Clock,
    color: 'var(--color-ink)',
  },
];
