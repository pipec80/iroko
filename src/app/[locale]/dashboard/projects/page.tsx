import { setRequestLocale } from 'next-intl/server';
import { FolderTree, Plus, Users, GitBranch } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { listByAccount } from '@/lib/projects';

import type { Metadata } from 'next';
import type { Project } from '@/lib/projects';

export async function generateMetadata(): Promise<Metadata> {
  return { title: 'Proyectos — Iroko' };
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

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;

  let projects: Project[] = [];
  if (userId) {
    const { data: memberships } = await supabase
      .from('accounts_memberships')
      .select('account_id')
      .eq('user_id', userId)
      .limit(1);

    const accountId = memberships?.[0]?.account_id;
    if (accountId) {
      projects = await listByAccount(accountId).catch(() => []);
    }
  }

  return (
    <div className="animate-in fade-in space-y-6 duration-700">
      {/* Header */}
      <header className="flex items-end justify-between">
        <div>
          <span className="eyebrow-sm">Bosque</span>
          <h1
            className="display-italic text-foreground mt-1.5"
            style={{ fontSize: 44, lineHeight: 1 }}>
            Tus proyectos
          </h1>
          <p className="text-muted-foreground mt-1.5 text-[15px]">
            Cada proyecto es una rama que crece del mismo tronco Iroko.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-iron"
          style={{ padding: '10px 18px', fontSize: 13 }}>
          <Plus size={14} strokeWidth={1.5} />
          Nuevo proyecto
        </button>
      </header>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}

        {/* New project CTA card */}
        <button
          type="button"
          className="border-border group flex flex-col items-center justify-center gap-3 rounded-[10px] border border-dashed py-12 transition-colors hover:border-transparent"
          style={{ background: 'var(--surface-elevated)' }}>
          <div
            className="flex h-[30px] w-[30px] items-center justify-center rounded-md"
            style={{ background: 'rgba(217,33,33,0.10)' }}>
            <Plus size={14} style={{ color: 'var(--color-iron)' }} strokeWidth={1.5} />
          </div>
          <span className="text-muted-foreground group-hover:text-foreground text-[13px] font-medium transition-colors">
            Nuevo proyecto
          </span>
        </button>
      </div>
    </div>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const env = STATUS_TO_ENV[project.status] ?? 'preview';
  const color = project.color ?? 'var(--color-iron)';

  return (
    <article className="card flex flex-col gap-3.5 p-[22px]">
      {/* Top row */}
      <div className="flex items-center gap-2.5">
        <span
          className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-md text-white"
          style={{ background: color }}>
          <FolderTree size={14} strokeWidth={1.5} />
        </span>
        <span className="text-foreground font-mono text-[13px] font-semibold">{project.name}</span>
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
      <p className="text-muted-foreground text-[13px] leading-relaxed">{project.description}</p>

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
            new Date(project.updated_at).toLocaleDateString('es', {
              day: 'numeric',
              month: 'short',
            })
          : '—'}
        </span>
      </div>
    </article>
  );
}
