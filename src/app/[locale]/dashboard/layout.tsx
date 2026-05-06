import { setRequestLocale } from 'next-intl/server';

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { redirect } from '@/i18n/routing';
import { createClient } from '@/lib/supabase/server';

export default async function DashboardRouteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Defense in depth: proxy.ts already redirects unauthenticated users,
  // but a missing session here means the claims call returned nothing
  // (e.g. token revoked server-side). Always re-check in Server Components.
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    redirect({ href: '/login', locale });
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
