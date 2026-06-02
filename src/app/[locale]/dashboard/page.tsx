import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { TrendingUp, TrendingDown, Zap, Activity, BarChart2, Clock } from 'lucide-react';

import { createClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';

// 12 meses de actividad con opacidad progresiva en el chart
const CHART_DATA = [
  { month: 1, value: 42, label: 'ene' },
  { month: 2, value: 58, label: 'feb' },
  { month: 3, value: 71, label: 'mar' },
  { month: 4, value: 65, label: 'abr' },
  { month: 5, value: 80, label: 'may' },
  { month: 6, value: 55, label: 'jun' },
  { month: 7, value: 88, label: 'jul' },
  { month: 8, value: 76, label: 'ago' },
  { month: 9, value: 91, label: 'sep' },
  { month: 10, value: 83, label: 'oct' },
  { month: 11, value: 87, label: 'nov' },
  { month: 12, value: 100, label: 'dic' },
];

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
  { id: 5, label: 'Configuración guardada', time: 'ayer', Icon: Clock, color: 'var(--color-ink)' },
];

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
  const [{ data: claimsData }, { data: accounts }] = await Promise.all([
    supabase.auth.getClaims(),
    supabase.rpc('get_my_accounts'),
  ]);
  const displayName =
    (claimsData?.claims.user_metadata?.given_name as string | undefined) ||
    (claimsData?.claims.user_metadata?.display_name as string | undefined) ||
    (claimsData?.claims.email as string | undefined) ||
    '';
  const workspaceName = accounts?.[0]?.name ?? '';

  return (
    <div className="flex flex-col gap-8">
      {/* Header — eyebrow + display + subtitle */}
      <header className="flex flex-col gap-2">
        <p className="text-muted-foreground font-mono text-[10px] font-bold tracking-[0.22em] uppercase">
          {workspaceName ? `${workspaceName} · Overview` : 'Overview'}
        </p>
        <h1 className="text-foreground text-[44px] leading-none font-bold tracking-[-0.03em]">
          {t('welcome_back', { name: displayName })}
        </h1>
        <p className="text-muted-foreground text-[14px] leading-snug">{t('welcome_subtitle')}</p>
      </header>

      {/* KPI Grid — gap 14px como el reference */}
      <section className="grid grid-cols-1 gap-[14px] md:grid-cols-2 lg:grid-cols-4">
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

      {/* Chart + Activity — ratio 1.6fr 1fr como el reference */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr]">
        {/* Chart */}
        <div className="card flex flex-col gap-4 p-6">
          <div className="flex items-start justify-between">
            <div>
              <span className="eyebrow">Ingresos · últimos 12 meses</span>
              <div
                className="text-foreground mt-2 font-mono text-[28px] leading-none font-semibold"
                style={{ letterSpacing: '-0.04em' }}>
                $48,720
              </div>
              <div
                className="text-muted-foreground mt-1 font-mono text-[11px]"
                style={{ letterSpacing: '0.04em' }}>
                +$5,420 vs período anterior
              </div>
            </div>
            <select
              className="border-border text-muted-foreground rounded-md border font-mono text-[11px] outline-none"
              style={{ padding: '5px 10px', background: 'var(--surface-2)' }}>
              <option>12 meses</option>
              <option>30 días</option>
              <option>7 días</option>
            </select>
          </div>
          <MiniBarChart data={CHART_DATA} />
        </div>

        {/* Activity feed */}
        <div className="card flex flex-col gap-4 p-6">
          <div className="flex items-center gap-2">
            <Activity className="text-muted-foreground size-4" strokeWidth={1.75} />
            <span className="text-foreground text-[13px] font-semibold">Actividad reciente</span>
          </div>
          <div className="flex flex-1 flex-col gap-3">
            {ACTIVITY_FEED.map((item) => (
              <div key={item.id} className="flex items-start gap-3">
                <div
                  className="mt-0.5 flex shrink-0 items-center justify-center"
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 5,
                    background: 'var(--color-poppy-wash)',
                  }}>
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

const MONTH_LABELS = ['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

function MiniBarChart({ data }: { data: { month: number; value: number; label: string }[] }) {
  const max = Math.max(...data.map((d) => d.value));

  return (
    <div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${data.length}, 1fr)`,
          gap: 6,
          alignItems: 'end',
          height: 160,
        }}>
        {data.map((d, i) => {
          const isLast = i === data.length - 1;
          const stopA = (0.3 + (i / data.length) * 0.45).toFixed(3);
          const stopB = (0.15 + (i / data.length) * 0.25).toFixed(3);
          return (
            <div
              key={d.month}
              style={{
                height: `${(d.value / max) * 100}%`,
                background:
                  isLast ? 'var(--color-poppy)' : (
                    `linear-gradient(to top, rgba(217,33,33,${stopA}), rgba(0,71,171,${stopB}))`
                  ),
                borderRadius: '4px 4px 2px 2px',
              }}
            />
          );
        })}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${data.length}, 1fr)`,
          gap: 6,
          marginTop: 10,
        }}>
        {MONTH_LABELS.map((m, i) => (
          <span
            key={i}
            className="text-center font-mono text-[9px]"
            style={{ color: 'var(--color-gray-500)', letterSpacing: '0.05em' }}>
            {m}
          </span>
        ))}
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
    <div className="card flex flex-col gap-3 px-5 py-[18px]">
      <p className="text-muted-foreground font-mono text-[10px] font-bold tracking-[0.18em] uppercase">
        {title}
      </p>
      <p className="text-foreground font-mono text-[30px] leading-none font-semibold tracking-[-0.04em]">
        {value}
      </p>
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
      className="card group flex items-center gap-4 p-5 transition-colors hover:border-transparent">
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
