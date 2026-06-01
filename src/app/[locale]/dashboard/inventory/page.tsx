import { setRequestLocale } from 'next-intl/server';
import { InventoryStats } from '@/components/dashboard/inventory-stats';
import { IngestionHub } from '@/components/dashboard/ingestion-hub';
import { InventoryGrid } from '@/components/dashboard/inventory-grid';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getTranslations } from 'next-intl/server';

export default async function InventoryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'Dashboard' });

  return (
    <div className="animate-in fade-in flex flex-col gap-8 p-6 duration-700">
      <header className="flex flex-col gap-1">
        <h1 className="text-on-surface font-sans text-3xl font-extrabold tracking-tight">
          {t('inventory_title')}
        </h1>
        <p className="text-on-surface-variant max-w-2xl text-sm opacity-80">
          {t('inventory_desc')}
        </p>
      </header>

      {/* Stats Row */}
      <InventoryStats />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Ingestion Hub */}
        <div className="lg:col-span-2">
          <IngestionHub />
        </div>

        {/* Category Distribution */}
        <Card className="bg-surface-container-lowest/80 ghost-border ambient-shadow glass overflow-hidden rounded-3xl">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-on-surface-variant font-sans text-xs font-bold tracking-widest uppercase opacity-60">
                Stock by Category
              </CardTitle>
              <span className="material-symbols-outlined text-primary/40">pie_chart</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 py-6">
            <CategoryBar label="Abarrotes" percentage={45} color="bg-primary" />
            <CategoryBar label="Limpieza" percentage={30} color="bg-primary-container" />
            <CategoryBar label="Lácteos" percentage={25} color="bg-secondary" />
            <div className="bg-surface-container-low mt-8 flex items-center justify-center rounded-xl p-4">
              <p className="text-on-surface-variant text-[11px] font-medium opacity-60">
                Full category breakdown available in Reports
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Inventory Grid */}
      <section className="bg-surface-container-lowest ghost-border rounded-2xl p-1">
        <InventoryGrid />
      </section>
    </div>
  );
}

function CategoryBar({
  label,
  percentage,
  color,
}: {
  label: string;
  percentage: number;
  color: string;
}) {
  return (
    <div className="w-full">
      <div className="mb-2 flex justify-between text-sm">
        <span className="text-on-surface font-bold">{label}</span>
        <span className="text-on-surface-variant font-mono">{percentage}%</span>
      </div>
      <div className="bg-surface-container-low h-2.5 w-full rounded-full">
        <div
          className={`${color} h-2.5 rounded-full transition-all duration-1000`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
