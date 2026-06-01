import { setRequestLocale } from 'next-intl/server';
import { FolderTree, Plus, Clock, Users, MoreHorizontal } from 'lucide-react';

import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  return { title: 'Proyectos — Iroko' };
}

// TODO: replace with real DB query once projects table is created
const SEED_PROJECTS = [
  {
    id: '1',
    name: 'Portal de clientes',
    description: 'Interfaz de autogestión para clientes finales.',
    status: 'active' as const,
    members: 4,
    updatedAt: 'hace 2 h',
    color: 'var(--color-cobalt)',
  },
  {
    id: '2',
    name: 'API pública v2',
    description: 'Rediseño de endpoints REST con versioning semántico.',
    status: 'active' as const,
    members: 3,
    updatedAt: 'hace 1 día',
    color: 'var(--color-poppy)',
  },
  {
    id: '3',
    name: 'Dashboard analítico',
    description: 'Visualizaciones en tiempo real con Supabase Realtime.',
    status: 'paused' as const,
    members: 2,
    updatedAt: 'hace 3 días',
    color: 'var(--color-gold)',
  },
  {
    id: '4',
    name: 'Integración Stripe',
    description: 'Facturación recurrente y portal de suscripciones.',
    status: 'active' as const,
    members: 2,
    updatedAt: 'hace 5 días',
    color: 'var(--color-ink)',
  },
  {
    id: '5',
    name: 'Mobile SDK',
    description: 'Librería nativa para iOS y Android.',
    status: 'draft' as const,
    members: 1,
    updatedAt: 'hace 1 sem',
    color: 'var(--color-cobalt)',
  },
  {
    id: '6',
    name: 'Data pipeline ETL',
    description: 'Ingesta y transformación de datos de terceros.',
    status: 'draft' as const,
    members: 2,
    updatedAt: 'hace 2 sem',
    color: 'var(--color-gold)',
  },
];

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

  return (
    <div className="animate-in fade-in space-y-6 duration-700">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-foreground text-3xl font-extrabold tracking-tight">Proyectos</h1>
          <p className="text-muted-foreground text-sm">
            {SEED_PROJECTS.length} proyectos en tu organización
          </p>
        </div>
        <button
          type="button"
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 active:opacity-80"
          style={{ background: 'var(--color-poppy)' }}>
          <Plus size={15} strokeWidth={2.5} />
          Nuevo proyecto
        </button>
      </header>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {SEED_PROJECTS.map((project) => (
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
            Crear proyecto
          </span>
        </button>
      </div>
    </div>
  );
}

function ProjectCard({ project }: { project: (typeof SEED_PROJECTS)[number] }) {
  const statusStyle = STATUS_STYLES[project.status] ?? STATUS_STYLES.draft;
  return (
    <div
      className="border-border group flex flex-col gap-4 rounded-2xl border p-5 transition-colors"
      style={{ background: 'var(--surface-1)' }}>
      {/* Top row */}
      <div className="flex items-start justify-between">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ background: project.color + '18' }}>
          <FolderTree size={16} style={{ color: project.color }} strokeWidth={1.75} />
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
        <div className="flex items-center gap-3">
          <span
            className="rounded-full px-2 py-0.5 font-mono text-[9px] font-bold tracking-wider uppercase"
            style={{ background: statusStyle.bg, color: statusStyle.text }}>
            {STATUS_LABELS[project.status]}
          </span>
        </div>
        <div className="text-muted-foreground flex items-center gap-3">
          <span className="flex items-center gap-1 font-mono text-[10px]">
            <Users size={10} strokeWidth={2} />
            {project.members}
          </span>
          <span className="flex items-center gap-1 font-mono text-[10px]">
            <Clock size={10} strokeWidth={2} />
            {project.updatedAt}
          </span>
        </div>
      </div>
    </div>
  );
}
