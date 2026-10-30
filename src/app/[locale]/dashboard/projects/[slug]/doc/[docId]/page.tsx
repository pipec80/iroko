import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import { getActiveAccountId } from '@/lib/active-account';
import { getBySlug } from '@/lib/projects';
import { getById } from '@/lib/project-documents';
import { logger } from '@/lib/logger';
import { MarkdownEditor } from '@/components/dashboard/projects/markdown-editor';
import { saveDocument } from './actions';

import type { Metadata } from 'next';
import { appConfig } from '@/config/app.config';
import { createClient } from '@/lib/supabase/server';

interface DocEditorPageProps {
  params: Promise<{ locale: string; slug: string; docId: string }>;
}

export async function generateMetadata({ params }: DocEditorPageProps): Promise<Metadata> {
  if (!appConfig.features.projects) notFound();
  const { docId } = await params;
  const doc = await getById(docId).catch((err: unknown) => {
    logger.error(
      { action: 'get_document_metadata', docId },
      err instanceof Error ? err.message : 'Failed to fetch document for metadata',
    );
    return null;
  });
  return { title: doc ? `${doc.name} — ${appConfig.brand}` : `Documento — ${appConfig.brand}` };
}

export default async function DocEditorPage({ params }: DocEditorPageProps) {
  if (!appConfig.features.projects) notFound();
  const { locale, slug, docId } = await params;
  setRequestLocale(locale);

  const accountId = await getActiveAccountId();
  if (!accountId) notFound();

  const project = await getBySlug(accountId, slug).catch((err: unknown) => {
    logger.error(
      { action: 'get_project', accountId },
      err instanceof Error ? err.message : 'Failed to fetch project',
    );
    return null;
  });
  if (!project) notFound();

  const doc = await getById(docId).catch((err: unknown) => {
    logger.error(
      { action: 'get_document', docId },
      err instanceof Error ? err.message : 'Failed to fetch document',
    );
    return null;
  });
  if (!doc || doc.project_id !== project.id) notFound();
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) notFound();

  return (
    <MarkdownEditor
      key={`${userId}:${accountId}:${doc.id}`}
      docId={doc.id}
      userId={userId}
      accountId={accountId}
      initialContent={doc.content}
      initialRevision={doc.revision}
      docName={doc.name}
      projectName={project.name}
      projectSlug={slug}
      saveAction={saveDocument}
    />
  );
}
