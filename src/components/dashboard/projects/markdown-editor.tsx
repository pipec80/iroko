'use client';

import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChevronLeft, Save, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

import { Link } from '@/i18n/routing';

const AUTOSAVE_DELAY = 800;

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface MarkdownEditorProps {
  docId: string;
  initialContent: string;
  docName: string;
  projectName: string;
  projectSlug: string;
  saveAction: (docId: string, content: string) => Promise<{ error?: string; success?: boolean }>;
}

export function MarkdownEditor({
  docId,
  initialContent,
  docName,
  projectName,
  projectSlug,
  saveAction,
}: MarkdownEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef(initialContent);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Set placeholder client-side: newlines in HTML attributes are normalized to
  // spaces during SSR serialization, causing a React hydration mismatch.
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.placeholder = '# Título del documento\n\nEscribe aquí en Markdown...';
    }
  }, []);

  async function save(value: string) {
    if (value === lastSavedRef.current) return;
    setStatus('saving');
    const result = await saveAction(docId, value);
    if (result.success) {
      lastSavedRef.current = value;
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    } else {
      setStatus('error');
    }
  }

  function handleChange(value: string) {
    setContent(value);
    setStatus('idle');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void save(value);
    }, AUTOSAVE_DELAY);
  }

  // Manual save with Ctrl+S / Cmd+S
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (debounceRef.current) clearTimeout(debounceRef.current);
        void save(content);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [content, save]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col">
      {/* Topbar */}
      <div
        className="border-border flex shrink-0 items-center gap-3 border-b px-4 py-2.5"
        style={{ background: 'var(--surface-1)' }}>
        <Link
          href={`/dashboard/projects/${projectSlug}`}
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
            onClick={() => save(content)}
            disabled={status === 'saving'}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-semibold transition-all disabled:opacity-50"
            style={{ background: 'var(--surface-3)', color: 'var(--text-primary)' }}>
            <Save size={12} strokeWidth={1.5} />
            Guardar
          </button>
        </div>
      </div>

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
            onChange={(e) => handleChange(e.target.value)}
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
  if (status === 'idle') return null;

  if (status === 'saving')
    return (
      <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
        <Loader2 size={11} className="animate-spin" />
        Guardando…
      </span>
    );

  if (status === 'saved')
    return (
      <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--color-iron)' }}>
        <CheckCircle2 size={11} />
        Guardado
      </span>
    );

  return (
    <span className="flex items-center gap-1 text-[11px]" style={{ color: '#e55' }}>
      <AlertCircle size={11} />
      Error al guardar
    </span>
  );
}
