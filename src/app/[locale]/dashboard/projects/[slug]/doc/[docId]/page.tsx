import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import { createClient } from '@/lib/supabase/server';
import { getBySlug } from '@/lib/projects';
import { getById } from '@/lib/project-documents';
import { MarkdownEditor } from '@/components/dashboard/projects/markdown-editor';
import { saveDocument } from './actions';

import type { Metadata } from 'next';

interface DocEditorPageProps {
  params: Promise<{ locale: string; slug: string; docId: string }>;
}

export async function generateMetadata({ params }: DocEditorPageProps): Promise<Metadata> {
  const { docId } = await params;
  const doc = await getById(docId).catch(() => null);
  return { title: doc ? `${doc.name} — Iroko` : 'Documento — Iroko' };
}

export default async function DocEditorPage({ params }: DocEditorPageProps) {
  const { locale, slug, docId } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data: accountId } = await supabase.rpc('get_my_account_id');
  if (!accountId) notFound();

  const project = await getBySlug(accountId, slug).catch(() => null);
  if (!project) notFound();

  const doc = await getById(docId).catch(() => null);
  if (!doc || doc.project_id !== project.id) notFound();

  return (
    <MarkdownEditor
      docId={doc.id}
      initialContent={doc.content}
      docName={doc.name}
      projectName={project.name}
      projectSlug={slug}
      saveAction={saveDocument}
    />
  );
}
