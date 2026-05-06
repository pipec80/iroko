import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface InventoryStatProps {
  title: string;
  value: string;
  change?: string;
  icon: string;
  alert?: boolean;
}

export function InventoryStats() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      <StatCard
        title="Total SKUs"
        value="12,450"
        icon="inventory_2"
        trend="+4.2%"
        trendColor="text-primary"
      />
      <StatCard
        title="Stock Alerts"
        value="24"
        icon="warning"
        alert
        trend="High Priority"
        trendColor="text-error"
      />
      <StatCard
        title="Inventory Value"
        value="$1.42M"
        icon="payments"
        trend="+1.8%"
        trendColor="text-primary"
      />
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  alert,
  trend,
  trendColor,
}: InventoryStatProps & { trend?: string; trendColor?: string }) {
  return (
    <Card className="bg-surface-container-lowest ghost-border group relative overflow-hidden transition-all duration-300 hover:shadow-xl">
      {alert && <div className="bg-error absolute top-0 left-0 h-1 w-full" />}
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-on-surface-variant font-sans text-[10px] font-black tracking-[0.2em] uppercase opacity-60">
              {title}
            </p>
            <h3
              className={cn(
                'font-mono text-3xl font-bold tracking-tighter',
                alert ? 'text-error' : 'text-on-surface',
              )}>
              {value}
            </h3>
            {trend && <p className={cn('text-[11px] font-bold', trendColor)}>{trend}</p>}
          </div>
          <div
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-500',
              alert ? 'bg-error/10 text-error' : (
                'bg-primary/5 text-primary group-hover:bg-primary group-hover:text-on-primary'
              ),
            )}>
            <span className="material-symbols-outlined text-[24px]">{icon}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
