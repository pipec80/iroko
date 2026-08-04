'use client';

import { useActionState, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
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

const ERROR_KEYS: Record<string, string> = {
  name_required: 'error_name_required',
  name_too_long: 'error_name_too_long',
  description_too_long: 'error_description_too_long',
  invalid_session: 'error_generic',
  account_not_found: 'error_generic',
  create_failed: 'error_generic',
};

interface NewDocumentDialogProps {
  projectId: string;
  projectSlug: string;
  variant?: 'card';
}

export function NewDocumentDialog({ projectId, projectSlug, variant }: NewDocumentDialogProps) {
  const t = useTranslations('Projects');
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const [state, action, isPending] = useActionState(
    async (_prev: { error?: string; docId?: string }, formData: FormData) => {
      formData.set('projectId', projectId);
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
        className="border-border group flex w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-10 transition-colors hover:border-transparent"
        style={{ background: 'var(--surface-elevated)' }}>
        <div
          className="flex size-[30px] items-center justify-center rounded-md"
          style={{ background: 'rgba(217,33,33,0.10)' }}>
          <Plus size={14} style={{ color: 'var(--color-iron)' }} strokeWidth={1.5} />
        </div>
        <span className="text-muted-foreground group-hover:text-foreground text-[13px] font-medium transition-colors">
          {t('doc_dialog_title')}
        </span>
      </button>
    : <button type="button" className="btn btn-iron" style={{ padding: '10px 18px', fontSize: 13 }}>
        <Plus size={14} strokeWidth={1.5} />
        {t('doc_dialog_title')}
      </button>;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('doc_dialog_title')}</DialogTitle>
          <DialogDescription>{t('doc_dialog_desc')}</DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={action} noValidate className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="doc-name" className="text-on-surface text-sm font-semibold">
              {t('form_name_label')}
            </label>
            <input
              id="doc-name"
              name="name"
              type="text"
              required
              maxLength={120}
              placeholder={t('doc_form_name_placeholder')}
              aria-invalid={!!state.error}
              className="bg-surface-container-low border-outline-variant/30 text-on-surface placeholder:text-on-surface-variant/40 focus:border-primary w-full rounded-lg border px-3 py-2.5 text-sm transition-colors focus:outline-none"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="doc-desc" className="text-on-surface text-sm font-semibold">
              {t('form_desc_label')}{' '}
              <span className="text-on-surface-variant font-normal opacity-60">
                {t('form_desc_optional')}
              </span>
            </label>
            <textarea
              id="doc-desc"
              name="description"
              rows={2}
              maxLength={300}
              placeholder={t('doc_form_desc_placeholder')}
              className="bg-surface-container-low border-outline-variant/30 text-on-surface placeholder:text-on-surface-variant/40 focus:border-primary w-full rounded-lg border px-3 py-2.5 text-sm transition-colors focus:outline-none"
            />
          </div>

          {state.error && (
            <p
              role="alert"
              className="bg-error/10 text-error rounded-lg px-3 py-2 text-xs font-medium">
              {t((ERROR_KEYS[state.error] ?? 'error_generic') as never)}
            </p>
          )}

          <DialogFooter>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="border-outline-variant/30 text-on-surface hover:bg-surface-container-high rounded-lg border px-4 py-2 text-sm font-medium transition-colors">
              {t('btn_cancel')}
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="bg-primary text-on-primary rounded-lg px-4 py-2 text-sm font-bold shadow-md transition-all hover:shadow-lg active:scale-95 disabled:opacity-50">
              {isPending ? t('btn_creating') : t('doc_btn_create')}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
