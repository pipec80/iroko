'use client';

import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChevronLeft, Save, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

import { Link, useRouter } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { useDocumentDraft } from '@/hooks/use-document-draft';
import { useDocumentDraftRegistry } from '@/components/providers/document-draft-provider';
import type { SaveDocumentResult } from '@/app/[locale]/dashboard/projects/[slug]/doc/[docId]/actions';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface MarkdownEditorProps {
  docId: string;
  userId: string;
  accountId: string;
  initialContent: string;
  initialRevision: number;
  docName: string;
  projectName: string;
  projectSlug: string;
  saveAction: (
    docId: string,
    content: string,
    expectedRevision: number,
  ) => Promise<SaveDocumentResult>;
}

export function MarkdownEditor({
  docId,
  userId,
  accountId,
  initialContent,
  initialRevision,
  docName,
  projectName,
  projectSlug,
  saveAction,
}: MarkdownEditorProps) {
  const router = useRouter();
  const t = useTranslations('documentEditor');
  const registry = useDocumentDraftRegistry();
  const blocked = useRef(false);
  const [conflict, setConflict] = useState(false);
  const [restorable, setRestorable] = useState(() => registry.get(docId));
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const draft = useDocumentDraft({
    docId,
    userId,
    accountId,
    initialContent,
    initialRevision,
    save: async (value, expectedRevision) => {
      if (blocked.current) return { success: false, error: 'conflict_or_unavailable' };
      const result = await saveAction(docId, value, expectedRevision);
      if (!result.success && result.error === 'conflict_or_unavailable') {
        blocked.current = true;
        setConflict(true);
      }
      return result;
    },
  });
  const { content, setContent } = draft;
  const status: SaveStatus =
    draft.error ? 'error'
    : draft.saving ? 'saving'
    : draft.dirty ? 'idle'
    : 'saved';
  const flushRef = useRef(draft.flush);
  useEffect(() => {
    flushRef.current = draft.flush;
  });
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        void flushRef.current();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
  async function returnToProject(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    if (restorable) return;
    if (await draft.flush()) router.push(`/dashboard/projects/${projectSlug}`);
  }
  return (
    <div className="flex h-[calc(100vh-64px)] flex-col">
      {/* Topbar */}
      <div
        className="border-border flex shrink-0 items-center gap-3 border-b px-4 py-2.5"
        style={{ background: 'var(--surface-1)' }}>
        <Link
          href={`/dashboard/projects/${projectSlug}`}
          onClick={returnToProject}
          className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-[12px] font-medium transition-colors">
          <ChevronLeft size={14} strokeWidth={1.5} />
          {projectName}
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="text-foreground text-[13px] font-semibold">{docName}</span>

        <div className="ml-auto flex items-center gap-2">
          <SaveIndicator status={status} />
          <button
            type="button"
            onClick={() => {
              void draft.flush();
            }}
            disabled={status === 'saving' || Boolean(restorable)}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-semibold transition-all disabled:opacity-50"
            style={{ background: 'var(--surface-3)', color: 'var(--text-primary)' }}>
            <Save size={12} strokeWidth={1.5} />
            {t('save')}
          </button>
        </div>
      </div>

      {restorable && (
        <div role="alert" className="border-border border-b p-3">
          <p>{t('restorePrompt')}</p>
          <button
            type="button"
            onClick={() => {
              draft.restore(restorable);
              setRestorable(undefined);
            }}>
            {t('restore')}
          </button>
          <button
            type="button"
            onClick={() => {
              registry.remove(docId, restorable.content);
              setRestorable(undefined);
            }}>
            {t('discard')}
          </button>
        </div>
      )}
      {conflict && (
        <div role="alert" className="text-destructive p-3">
          <p>{t('conflict')}</p>
          <button type="button" onClick={() => window.location.reload()}>
            {t('reload')}
          </button>
        </div>
      )}
      <p className="text-muted-foreground px-4 text-xs">{t('memoryOnly')}</p>
      {/* Split view */}
      <div className="flex min-h-0 flex-1">
        {/* Editor */}
        <div className="border-border flex w-1/2 flex-col border-r">
          <div
            className="border-border shrink-0 border-b px-4 py-1.5"
            style={{ background: 'var(--surface-1)' }}>
            <span className="text-muted-foreground font-mono text-[10px] font-semibold tracking-widest uppercase">
              Markdown
            </span>
          </div>
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={Boolean(restorable) || !draft.canEdit}
            aria-label={t('content')}
            spellCheck={false}
            className="min-h-0 flex-1 resize-none p-5 font-mono text-[13px] leading-relaxed focus:outline-none"
            style={{
              background: 'var(--surface-base)',
              color: 'var(--text-primary)',
              lineHeight: '1.7',
            }}
          />
        </div>

        {/* Preview */}
        <div className="flex w-1/2 flex-col overflow-hidden">
          <div
            className="border-border shrink-0 border-b px-4 py-1.5"
            style={{ background: 'var(--surface-1)' }}>
            <span className="text-muted-foreground font-mono text-[10px] font-semibold tracking-widest uppercase">
              Preview
            </span>
          </div>
          <div
            className="markdown-preview min-h-0 flex-1 overflow-y-auto p-5"
            style={{ background: 'var(--surface-base)' }}>
            {content.trim() ?
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            : <p className="text-muted-foreground text-[13px] italic">Sin contenido aún.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function SaveIndicator({ status }: { status: SaveStatus }) {
  const t = useTranslations('documentEditor');
  if (status === 'idle') return <span role="status">{t('pending')}</span>;

  if (status === 'saving')
    return (
      <span role="status" className="text-muted-foreground flex items-center gap-1 text-[11px]">
        <Loader2 size={11} className="animate-spin" />
        {t('saving')}
      </span>
    );

  if (status === 'saved')
    return (
      <span
        role="status"
        className="flex items-center gap-1 text-[11px]"
        style={{ color: 'var(--color-success)' }}>
        <CheckCircle2 size={11} />
        {t('saved')}
      </span>
    );

  return (
    <span role="status" className="text-destructive flex items-center gap-1 text-[11px]">
      <AlertCircle size={11} />
      {t('error')}
    </span>
  );
}
