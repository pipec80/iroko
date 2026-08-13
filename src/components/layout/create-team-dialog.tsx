'use client';

import { useTranslations } from 'next-intl';
import { useActionState, useRef, useState } from 'react';
import { Plus } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { createTeam } from '@/app/[locale]/dashboard/actions';

const ERROR_KEYS: Record<string, string> = {
  name_required: 'create_team_error_name_required',
  name_too_long: 'create_team_error_name_too_long',
  team_limit_reached: 'create_team_error_limit',
  create_failed: 'create_team_error_generic',
};

interface CreateTeamDialogProps {
  onOpenChange?: (open: boolean) => void;
  /** Cuando se pasa, el diálogo queda controlado por el padre (ej. atajo de teclado global). */
  open?: boolean;
  /** Oculta el botón trigger visible — para instancias controladas externamente. */
  hideTrigger?: boolean;
}

export function CreateTeamDialog({
  onOpenChange,
  open: openProp,
  hideTrigger,
}: CreateTeamDialogProps) {
  const t = useTranslations('Navigation');
  const [openState, setOpenState] = useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : openState;
  const formRef = useRef<HTMLFormElement>(null);

  function handleOpenChange(next: boolean) {
    if (!isControlled) setOpenState(next);
    onOpenChange?.(next);
  }

  const [state, action, isPending] = useActionState(
    async (_prev: { error?: string }, formData: FormData) => createTeam(formData),
    {},
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <button
            type="button"
            className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5"
            style={{ border: 0, background: 'transparent' }}>
            <div
              className="inline-flex shrink-0 items-center justify-center"
              style={{
                width: 22,
                height: 22,
                borderRadius: 4,
                background: 'var(--surface-3)',
                color: 'var(--text-secondary)',
              }}>
              <Plus size={14} strokeWidth={1.5} />
            </div>
            <span className="text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>
              {t('new_org')}
            </span>
          </button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('create_team_title')}</DialogTitle>
          <DialogDescription>{t('create_team_description')}</DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={action} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="create-team-name" className="text-on-surface text-sm font-semibold">
              {t('create_team_name_label')}
            </label>
            <input
              id="create-team-name"
              name="name"
              type="text"
              maxLength={100}
              aria-invalid={!!state.error}
              className="bg-surface-container-low border-outline-variant/30 text-on-surface w-full rounded-lg border px-3 py-2.5 text-sm transition-colors focus:outline-none"
            />
          </div>

          {state.error && (
            <p
              role="alert"
              className="bg-error/10 text-error rounded-lg px-3 py-2 text-xs font-medium">
              {t((ERROR_KEYS[state.error] ?? 'create_team_error_generic') as never)}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => handleOpenChange(false)}
              className="border-outline-variant/30 text-on-surface hover:bg-surface-container-high rounded-lg border px-4 py-2 text-sm font-medium transition-colors">
              {t('create_team_cancel')}
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="bg-primary text-on-primary rounded-lg px-4 py-2 text-sm font-bold shadow-md transition-all hover:shadow-lg active:scale-95 disabled:opacity-50">
              {isPending ? t('create_team_submitting') : t('create_team_submit')}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
