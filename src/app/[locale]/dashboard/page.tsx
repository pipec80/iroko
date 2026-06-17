import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Bot, CreditCard, FolderOpen, Users } from 'lucide-react';

import { createClient } from '@/lib/supabase/server';
import { listByAccount } from '@/lib/projects';
import { Link } from '@/i18n/routing';
import { appConfig } from '@/config/app.config';

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

  const supabase = await createClient();
  const [{ data: claimsData }, { data: accounts }] = await Promise.all([
    supabase.auth.getClaims(),
    supabase.rpc('get_my_accounts'),
  ]);

  const displayName =
    (claimsData?.claims.user_metadata?.given_name as string | undefined) ||
    (claimsData?.claims.user_metadata?.display_name as string | undefined) ||
    (claimsData?.claims.email as string | undefined) ||
    '';

  const account = accounts?.[0];
  const workspaceName = account?.name ?? '';
  const accountId = account?.account_id ?? null;

  const projects = accountId ? await listByAccount(accountId).catch(() => []) : [];

  type QuickLink = {
    Icon: React.ElementType;
    title: string;
    desc: string;
    href: string;
    color: string;
    count: number | null;
  };

  const quickLinks: QuickLink[] = [
    ...(appConfig.features.projects ?
      [
        {
          Icon: FolderOpen,
          title: t('quick_projects'),
          desc: t('quick_projects_desc'),
          href: '/dashboard/projects',
          color: 'var(--color-cobalt)',
          count: projects.length,
        },
      ]
    : []),
    ...(appConfig.features.members ?
      [
        {
          Icon: Users,
          title: t('quick_members'),
          desc: t('quick_members_desc'),
          href: '/dashboard/members',
          color: 'var(--color-gold)',
          count: null,
        },
      ]
    : []),
    ...(appConfig.features.billing ?
      [
        {
          Icon: CreditCard,
          title: t('quick_billing'),
          desc: t('quick_billing_desc'),
          href: '/dashboard/billing',
          color: 'var(--color-poppy)',
          count: null,
        },
      ]
    : []),
    ...(appConfig.features.verticals.robot ?
      [
        {
          Icon: Bot,
          title: `${appConfig.brand} Robot`,
          desc: t('quick_robot_desc'),
          href: '/dashboard/robot',
          color: 'var(--color-ink)',
          count: null,
        },
      ]
    : []),
  ];

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
              className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
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
