import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Link } from '@/i18n/routing';
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

  const t = await getTranslations('Admin');

  return (
    <div className="flex flex-col gap-6">
      <nav className="flex gap-4 border-b border-(--border) pb-3">
        <Link href="/dashboard/admin/accounts" className="text-sm font-medium">
          {t('nav_accounts')}
        </Link>
        <Link href="/dashboard/admin/audit" className="text-sm font-medium">
          {t('nav_audit')}
        </Link>
      </nav>
      {children}
    </div>
  );
}
