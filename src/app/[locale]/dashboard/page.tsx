import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { setRequestLocale } from 'next-intl/server';
import { cn } from '@/lib/utils';
export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const userDisplayName = 'Admin';

  return (
    <div className="animate-in fade-in space-y-10 p-2 duration-700">
      <header className="space-y-2">
        <h1 className="text-on-surface font-sans text-4xl font-extrabold tracking-tighter">
          Dashboard Overview
        </h1>
        <p className="text-on-surface-variant max-w-2xl font-sans text-lg tracking-tight opacity-80">
          Bienvenido de nuevo, <span className="text-primary font-bold">{userDisplayName}</span>.
          Aquí tienes un resumen de las métricas de Axiom Ledger para hoy.
        </p>
      </header>

      {/* KPI Bento Grid */}
      <section className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Sales Volume"
          value="$1,284,500.00"
          change="+12.5%"
          icon="trending_up"
          trend="up"
        />
        <StatCard title="Active Sessions" value="14,209" change="+3.1%" icon="bolt" trend="up" />
        <StatCard
          title="Conversion Rate"
          value="3.42%"
          change="-0.8%"
          icon="monitoring"
          trend="down"
        />
        <StatCard
          title="Inventory Health"
          value="98.2%"
          change="+1.2%"
          icon="inventory_2"
          trend="up"
        />
      </section>

      {/* System Performance Section */}
      <div className="grid gap-6">
        <Card className="bg-surface-container-highest overflow-hidden rounded-2xl border-none shadow-none">
          <CardHeader className="p-8 pb-4">
            <div className="mb-2 flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">analytics</span>
              <CardTitle className="font-sans text-xl font-bold tracking-tight">
                System Performance
              </CardTitle>
            </div>
            <p className="text-on-surface-variant font-sans text-sm opacity-70">
              Estado de la red y métricas de procesamiento en tiempo real.
            </p>
          </CardHeader>
          <CardContent className="flex h-[350px] items-center justify-center p-8 pt-0">
            <div className="bg-surface-container-low border-outline-variant/30 flex h-full w-full items-center justify-center rounded-xl border border-dashed">
              <span className="text-on-surface-variant font-mono text-xs tracking-widest uppercase opacity-40">
                [ Waiting for telemetry data... ]
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  change,
  icon,
  trend = 'up',
}: {
  title: string;
  value: string;
  change: string;
  icon: string;
  trend?: 'up' | 'down';
}) {
  return (
    <Card className="bg-surface-container-highest hover:bg-surface-container-high group rounded-2xl border-none shadow-none transition-all">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <p className="text-on-surface-variant text-[10px] font-black tracking-[0.2em] uppercase opacity-60 transition-opacity group-hover:opacity-100">
          {title}
        </p>
        <span className="material-symbols-outlined text-on-surface-variant/40 group-hover:text-primary transition-colors">
          {icon}
        </span>
      </CardHeader>
      <CardContent>
        <div className="text-on-surface font-mono text-3xl font-semibold tracking-tighter lg:text-4xl">
          {value}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span
            className={cn(
              'rounded-full px-2 py-0.5 font-mono text-[10px] font-bold',
              trend === 'up' ? 'bg-primary/10 text-primary' : 'bg-error/10 text-error',
            )}>
            {change}
          </span>
          <span className="text-on-surface-variant font-sans text-[10px] font-medium tracking-wider uppercase opacity-50">
            vs last period
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
