import React from 'react';
import { getTranslations } from 'next-intl/server';
import { OperationsDashboard } from '@/components/dashboard/operations/operations-dashboard';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Dashboard' });

  return {
    title: t('operations_title'),
  };
}

export default async function OperationsPage({ params }: { params: Promise<{ locale: string }> }) {
  await params;
  return (
    <div className="flex flex-col gap-6 p-6">
      <OperationsDashboard />
    </div>
  );
}
