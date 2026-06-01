import { getTranslations } from 'next-intl/server';
import { OperationsDashboard } from '@/components/dashboard/operations/operations-dashboard';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Dashboard' });
  return { title: t('operations_title') };
}

export default async function OperationsPage({ params }: { params: Promise<{ locale: string }> }) {
  await params;
  return (
    <div className="animate-in fade-in space-y-6 duration-700">
      <header className="space-y-1">
        <h1 className="text-foreground text-3xl font-extrabold tracking-tight">Operaciones</h1>
        <p className="text-muted-foreground text-sm">
          Monitoreo en tiempo real de servicios y procesos.
        </p>
      </header>
      <OperationsDashboard />
    </div>
  );
}
