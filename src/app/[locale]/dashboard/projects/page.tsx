import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Folder, Users, GitBranch } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { listByAccount } from '@/lib/projects';
import { logger } from '@/lib/logger';
import { Link } from '@/i18n/routing';
import { NewProjectDialog } from '@/components/dashboard/projects/new-project-dialog';

import type { Metadata } from 'next';
import type { Project } from '@/lib/projects';
import { appConfig } from '@/config/app.config';

export async function generateMetadata(): Promise<Metadata> {
  return { title: `Proyectos — ${appConfig.brand}` };
}

const STATUS_TO_ENV: Record<string, string> = {
  active: 'prod',
  paused: 'staging',
  draft: 'preview',
};

const ENV_BG: Record<string, string> = {
  prod: 'rgba(111,147,98,0.16)',
  staging: 'rgba(217,164,65,0.18)',
  preview: 'rgba(60,79,115,0.16)',
};

const ENV_FG: Record<string, string> = {
  prod: '#4f6f44',
  staging: '#a87a1f',
  preview: '#2a3a5a',
};

export default async function ProjectsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('Projects');

  const supabase = await createClient();

  // Direct SELECT on accounts_memberships is revoked for authenticated — use RPC.
  const { data: accountId } = await supabase.rpc('get_my_account_id');

  let projects: Project[] = [];
  if (accountId) {
    projects = await listByAccount(accountId).catch((err: unknown) => {
      logger.error(
        { action: 'list_projects', accountId },
        err instanceof Error ? err.message : 'Failed to fetch projects',
      );
      return [];
    });
  }

  return (
    <div className="animate-in fade-in space-y-6 duration-700">
      {/* Header */}
      <header className="flex flex-col items-start gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <span className="eyebrow-sm">{t('page_eyebrow')}</span>
          <h1
            className="display-italic text-foreground mt-1.5"
            style={{ fontSize: 44, lineHeight: 1 }}>
            {t('page_title')}
          </h1>
          <p className="text-muted-foreground mt-1.5 text-[15px]">
            {t('page_lead', { brand: appConfig.brand })}
          </p>
        </div>
        <NewProjectDialog />
      </header>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} locale={locale} />
        ))}

        <NewProjectDialog variant="card" />
      </div>
    </div>
  );
}

function ProjectCard({ project, locale }: { project: Project; locale: string }) {
  const env = STATUS_TO_ENV[project.status] ?? 'preview';
  const color = project.color ?? 'var(--color-iron)';

  return (
    <Link href={`/dashboard/projects/${project.slug}`} className="block">
      <article className="card flex flex-col gap-3.5 p-[22px] transition-shadow hover:shadow-md">
        {/* Top row */}
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-md text-white"
            style={{ background: color }}>
            <Folder size={14} strokeWidth={1.5} />
          </span>
          <span className="text-foreground font-mono text-[13px] font-semibold">
            {project.name}
          </span>
          <span
            className="ml-auto rounded font-mono text-[9px] font-bold tracking-[0.12em] uppercase"
            style={{
              padding: '2px 8px',
              background: ENV_BG[env] ?? 'var(--surface-2)',
              color: ENV_FG[env] ?? 'var(--text-tertiary)',
            }}>
            {env}
          </span>
        </div>

        {/* Description */}
        <p className="text-muted-foreground text-[13px] leading-relaxed">
          {project.description ?? '—'}
        </p>

        {/* Footer */}
        <div className="border-border flex items-center gap-3 border-t pt-3">
          <span className="text-muted-foreground flex items-center gap-1 font-mono text-[11px]">
            <Users size={11} strokeWidth={1.5} />4
          </span>
          <span className="text-muted-foreground flex items-center gap-1 font-mono text-[11px]">
            <GitBranch size={11} strokeWidth={1.5} />
            main
          </span>
          <span className="text-muted-foreground ml-auto font-mono text-[11px]">
            {project.updated_at ?
              new Date(project.updated_at).toLocaleDateString(locale, {
                day: 'numeric',
                month: 'short',
              })
            : '—'}
          </span>
        </div>
      </article>
    </Link>
  );
}
