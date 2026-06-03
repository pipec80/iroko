'use client';

import { useActionState, useRef, useState } from 'react';
import { Plus } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { createDocument } from '@/app/[locale]/dashboard/projects/[slug]/doc/actions';

interface NewDocumentDialogProps {
  projectId: string;
  accountId: string;
  projectSlug: string;
  variant?: 'card';
}

export function NewDocumentDialog({
  projectId,
  accountId,
  projectSlug,
  variant,
}: NewDocumentDialogProps) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const [state, action, isPending] = useActionState(
    async (_prev: { error?: string; docId?: string }, formData: FormData) => {
      formData.set('projectId', projectId);
      formData.set('accountId', accountId);
      const result = await createDocument(formData);
      if (result.docId) {
        formRef.current?.reset();
        setOpen(false);
        // pathname es next-intl aware (sin prefijo de locale); construyo la URL completa
        const locale = window.location.pathname.split('/')[1] ?? 'es';
        window.location.href = `/${locale}/dashboard/projects/${projectSlug}/doc/${result.docId}`;
      }
      return result;
    },
    {},
  );

  const trigger =
    variant === 'card' ?
      <button
        type="button"
        className="border-border group flex w-full flex-col items-center justify-center gap-3 rounded-[10px] border border-dashed py-10 transition-colors hover:border-transparent"
        style={{ background: 'var(--surface-elevated)' }}>
        <div
          className="flex h-[30px] w-[30px] items-center justify-center rounded-md"
          style={{ background: 'rgba(217,33,33,0.10)' }}>
          <Plus size={14} style={{ color: 'var(--color-iron)' }} strokeWidth={1.5} />
        </div>
        <span className="text-muted-foreground group-hover:text-foreground text-[13px] font-medium transition-colors">
          Nuevo documento
        </span>
      </button>
    : <button type="button" className="btn btn-iron" style={{ padding: '10px 18px', fontSize: 13 }}>
        <Plus size={14} strokeWidth={1.5} />
        Nuevo documento
      </button>;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo documento</DialogTitle>
          <DialogDescription>
            Un documento es una página de conocimiento dentro del proyecto.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={action} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="doc-name" className="text-on-surface text-sm font-semibold">
              Nombre
            </label>
            <input
              id="doc-name"
              name="name"
              type="text"
              required
              maxLength={120}
              placeholder="ej. Brief del cliente, Instrucciones de deploy"
              className="bg-surface-container-low border-outline-variant/30 text-on-surface placeholder:text-on-surface-variant/40 focus:border-primary w-full rounded-lg border px-3 py-2.5 text-sm transition-colors focus:outline-none"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="doc-desc" className="text-on-surface text-sm font-semibold">
              Descripción{' '}
              <span className="text-on-surface-variant font-normal opacity-60">(opcional)</span>
            </label>
            <textarea
              id="doc-desc"
              name="description"
              rows={2}
              maxLength={300}
              placeholder="ej. Contexto del cliente para el equipo"
              className="bg-surface-container-low border-outline-variant/30 text-on-surface placeholder:text-on-surface-variant/40 focus:border-primary w-full rounded-lg border px-3 py-2.5 text-sm transition-colors focus:outline-none"
            />
          </div>

          {state.error && (
            <p className="bg-error/10 text-error rounded-lg px-3 py-2 text-xs font-medium">
              {state.error}
            </p>
          )}

          <DialogFooter>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="border-outline-variant/30 text-on-surface hover:bg-surface-container-high rounded-lg border px-4 py-2 text-sm font-medium transition-colors">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="bg-primary text-on-primary rounded-lg px-4 py-2 text-sm font-bold shadow-md transition-all hover:shadow-lg active:scale-95 disabled:opacity-50">
              {isPending ? 'Creando…' : 'Crear documento'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
