import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { Folder, FileText } from 'lucide-react';

import { createClient } from '@/lib/supabase/server';
import { getBySlug } from '@/lib/projects';
import { listByProject } from '@/lib/project-documents';
import { Link } from '@/i18n/routing';
import { NewDocumentDialog } from '@/components/dashboard/projects/new-document-dialog';

import type { Metadata } from 'next';
import type { ProjectDocument } from '@/lib/project-documents';

interface ProjectDetailPageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateMetadata({ params }: ProjectDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  return { title: `${slug} — Iroko` };
}

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data: accountId } = await supabase.rpc('get_my_account_id');
  if (!accountId) notFound();

  const project = await getBySlug(accountId, slug).catch(() => null);
  if (!project) notFound();

  const documents = await listByProject(project.id).catch(() => []);

  return (
    <div className="animate-in fade-in space-y-6 duration-700">
      {/* Header */}
      <header className="flex items-end justify-between">
        <div className="flex items-center gap-3">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white"
            style={{ background: project.color ?? 'var(--color-iron)' }}>
            <Folder size={16} strokeWidth={1.5} />
          </span>
          <div>
            <span className="eyebrow-sm">Proyecto</span>
            <h1
              className="display-italic text-foreground mt-0.5"
              style={{ fontSize: 32, lineHeight: 1 }}>
              {project.name}
            </h1>
            {project.description && (
              <p className="text-muted-foreground mt-1 text-[13px]">{project.description}</p>
            )}
          </div>
        </div>
        <NewDocumentDialog projectId={project.id} projectSlug={slug} />
      </header>

      {/* Documents grid */}
      {documents.length === 0 ?
        <EmptyState projectId={project.id} projectSlug={slug} />
      : <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {documents.map((doc) => (
            <DocumentCard key={doc.id} doc={doc} slug={slug} />
          ))}
          <NewDocumentDialog projectId={project.id} projectSlug={slug} variant="card" />
        </div>
      }
    </div>
  );
}

function DocumentCard({ doc, slug }: { doc: ProjectDocument; slug: string }) {
  const preview = doc.content.slice(0, 120);

  return (
    <Link
      href={`/dashboard/projects/${slug}/doc/${doc.id}`}
      className="card flex flex-col gap-3 p-5 transition-shadow hover:shadow-md">
      <div className="flex items-center gap-2">
        <FileText size={14} strokeWidth={1.5} className="text-muted-foreground shrink-0" />
        <span className="text-foreground truncate font-mono text-[13px] font-semibold">
          {doc.name}
        </span>
      </div>
      {doc.description && <p className="text-muted-foreground text-[12px]">{doc.description}</p>}
      {preview && (
        <p className="text-muted-foreground line-clamp-2 text-[11px] leading-relaxed opacity-70">
          {preview}
        </p>
      )}
      <div className="border-border mt-auto border-t pt-3">
        <span className="text-muted-foreground font-mono text-[11px]">
          {doc.updated_at ?
            new Date(doc.updated_at).toLocaleDateString('es', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })
          : '—'}
        </span>
      </div>
    </Link>
  );
}

function EmptyState({ projectId, projectSlug }: { projectId: string; projectSlug: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <div
        className="flex h-12 w-12 items-center justify-center rounded-xl"
        style={{ background: 'var(--surface-2)' }}>
        <FileText size={20} strokeWidth={1.5} className="text-muted-foreground" />
      </div>
      <div>
        <p className="text-foreground text-[15px] font-semibold">Sin documentos</p>
        <p className="text-muted-foreground mt-1 text-[13px]">
          Crea el primero para empezar a documentar este proyecto.
        </p>
      </div>
      <NewDocumentDialog projectId={projectId} projectSlug={projectSlug} variant="card" />
    </div>
  );
}
