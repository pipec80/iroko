import { setRequestLocale } from 'next-intl/server';
import { BillingTab } from '@/components/dashboard/org/billing-tab';

import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  return { title: 'Billing — Iroko' };
}

export default async function BillingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="animate-in fade-in space-y-6 duration-700">
      <header className="space-y-1">
        <h1 className="text-foreground text-3xl font-extrabold tracking-tight">Facturación</h1>
        <p className="text-muted-foreground text-sm">
          Gestiona tu plan, método de pago e historial de facturas.
        </p>
      </header>

      <BillingTab />
    </div>
  );
}
