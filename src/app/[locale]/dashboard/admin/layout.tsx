import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import { AdminNav } from './admin-nav';
import { createClient } from '@/lib/supabase/server';

/**
 * Defense-in-depth re-check on top of the edge gate (src/lib/supabase/middleware.ts):
 * the edge only trusts the JWT claim for fast routing. This layout re-derives the
 * claim server-side and 404s again if it's missing, so a stale/forged client-side
 * navigation can't skip straight to a child route.
 */
export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const isPlatformAdmin = data?.claims?.app_metadata?.is_platform_admin === true;
  if (!isPlatformAdmin) notFound();

  return (
    <div className="flex flex-col gap-6">
      <AdminNav />
      {children}
    </div>
  );
}
