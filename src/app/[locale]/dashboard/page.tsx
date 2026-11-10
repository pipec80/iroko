import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { createClient } from '@/lib/supabase/server';
import { listByAccount } from '@/lib/projects';
import { logger } from '@/lib/logger';
import { getActiveAccountId } from '@/lib/active-account';
import { Link } from '@/i18n/routing';
import { appConfig } from '@/config/app.config';
import { resolveProductModules } from '@/config/product-modules';
import type { Database } from '@/types/database';

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
  const tNav = await getTranslations('Navigation');

  const supabase = await createClient();
  const [{ data: claimsData }, accountId] = await Promise.all([
    supabase.auth.getClaims(),
    getActiveAccountId(),
  ]);

  const displayName =
    (claimsData?.claims.user_metadata?.given_name as string | undefined) ||
    (claimsData?.claims.user_metadata?.display_name as string | undefined) ||
    (claimsData?.claims.email as string | undefined) ||
    '';

  let workspaceName = '';
  let accountRole: Database['public']['Enums']['membership_role'] | undefined;
  if (accountId) {
    const { data: accounts, error: accountsError } = await supabase.rpc('get_my_accounts');
    if (accountsError) {
      logger.error({ action: 'get_account_name', accountId }, accountsError.message);
    }
    const account = accounts?.find((a) => a.account_id === accountId);
    workspaceName = account?.name ?? '';
    accountRole = account?.role;
  }

  const modules = resolveProductModules(appConfig, accountRole);
  const projectsEnabled = modules.some(({ id }) => id === 'projects');
  const projects =
    projectsEnabled && accountId ?
      await listByAccount(accountId).catch((err: unknown) => {
        logger.error(
          { action: 'list_projects', accountId },
          err instanceof Error ? err.message : 'Failed to fetch projects',
        );
        return [];
      })
    : [];

  const quickLinks = modules
    .flatMap((module) => (module.home ? [{ ...module, home: module.home }] : []))
    .sort((left, right) => left.home.order - right.home.order)
    .map(({ id, href, label, home }) => ({
      Icon: home.Icon,
      title:
        home.titleKey ? t(home.titleKey)
        : 'brandSuffix' in label ? `${appConfig.brand}${label.brandSuffix}`
        : tNav(label.key),
      desc: t(home.descriptionKey),
      href,
      color: home.color,
      count: id === 'projects' ? projects.length : null,
    }));

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <header className="flex flex-col gap-2">
        <p className="text-muted-foreground font-mono text-[10px] font-bold tracking-[0.22em] uppercase">
          {workspaceName ? `${workspaceName} · Overview` : 'Overview'}
        </p>
        <h1 className="text-foreground text-[44px] leading-none font-bold tracking-[-0.03em]">
          {t('welcome_back', { name: displayName })}
        </h1>
        <p className="text-muted-foreground text-[14px] leading-snug">{t('welcome_subtitle')}</p>
      </header>

      {/* Quick links */}
      <section className="grid grid-cols-1 gap-[14px] sm:grid-cols-2 lg:grid-cols-4">
        {quickLinks.map(({ Icon, title, desc, href, color, count }) => (
          <Link
            key={href}
            href={href}
            className="card group flex items-start gap-4 p-5 transition-colors hover:border-transparent">
            <div
              className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl"
              style={{ background: `${color}18` }}>
              <Icon size={18} style={{ color }} strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <p className="text-foreground text-[13px] font-semibold">{title}</p>
              <p className="text-muted-foreground text-[11px]">{desc}</p>
              {count !== null && (
                <p className="mt-1 font-mono text-[10px] font-semibold" style={{ color }}>
                  {count}
                </p>
              )}
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
