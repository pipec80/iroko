import { getTranslations, setRequestLocale } from 'next-intl/server';
import { FolderTree, Plus, Clock, MoreHorizontal } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { listByAccount } from '@/lib/projects';

import type { Metadata } from 'next';
import type { Project } from '@/lib/projects';

export async function generateMetadata(): Promise<Metadata> {
  return { title: 'Proyectos — Iroko' };
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Activo',
  paused: 'Pausado',
  draft: 'Borrador',
};

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  active: { bg: 'rgba(16,185,129,0.1)', text: '#10b981' },
  paused: { bg: 'rgba(217,164,65,0.15)', text: 'var(--color-gold)' },
  draft: { bg: 'rgba(100,116,139,0.1)', text: '#64748b' },
};

export default async function ProjectsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('Dashboard');

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
      <header className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-foreground text-3xl font-extrabold tracking-tight">
            {t('inventory_title')}
          </h1>
          <p className="text-muted-foreground text-sm">
            {projects.length} {t('inventory_desc').toLowerCase()}
          </p>
        </div>
        <button
          type="button"
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 active:opacity-80"
          style={{ background: 'var(--color-poppy)' }}>
          <Plus size={15} strokeWidth={2.5} />
          {t('new_order')}
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
          className="border-border group flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed py-12 transition-colors hover:border-transparent"
          style={{ background: 'var(--surface-1)' }}>
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl transition-colors"
            style={{ background: 'var(--color-poppy)18' }}>
            <Plus size={18} style={{ color: 'var(--color-poppy)' }} strokeWidth={2} />
          </div>
          <span className="text-muted-foreground group-hover:text-foreground text-[13px] font-medium transition-colors">
            {t('new_order')}
          </span>
        </button>
      </div>
    </div>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const statusStyle = STATUS_STYLES[project.status] ?? STATUS_STYLES.draft;
  const color = project.color ?? 'var(--color-cobalt)';

  return (
    <div
      className="border-border group flex flex-col gap-4 rounded-2xl border p-5 transition-colors"
      style={{ background: 'var(--surface-1)' }}>
      {/* Top row */}
      <div className="flex items-start justify-between">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ background: color + '18' }}>
          <FolderTree size={16} style={{ color }} strokeWidth={1.75} />
        </div>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground -mr-1 rounded-lg p-1 transition-colors">
          <MoreHorizontal size={16} strokeWidth={1.75} />
        </button>
      </div>

      {/* Name + description */}
      <div className="space-y-1">
        <h3 className="text-foreground text-[14px] font-semibold">{project.name}</h3>
        <p className="text-muted-foreground line-clamp-2 text-[12px] leading-relaxed">
          {project.description}
        </p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1">
        <span
          className="rounded-full px-2 py-0.5 font-mono text-[9px] font-bold tracking-wider uppercase"
          style={{ background: statusStyle.bg, color: statusStyle.text }}>
          {STATUS_LABELS[project.status]}
        </span>
        <div className="text-muted-foreground flex items-center gap-3">
          <span className="flex items-center gap-1 font-mono text-[10px]">
            <Clock size={10} strokeWidth={2} />
            {new Date(project.updated_at).toLocaleDateString('es', {
              day: 'numeric',
              month: 'short',
            })}
          </span>
        </div>
      </div>
    </div>
  );
}
