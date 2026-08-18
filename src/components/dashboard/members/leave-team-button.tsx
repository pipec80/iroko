'use client';

import { useActionState, useState } from 'react';
import { useTranslations } from 'next-intl';

import { leaveTeam } from '@/app/[locale]/dashboard/team/actions';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const LEAVE_ERROR_KEYS = [
  'error_last_owner_must_transfer',
  'error_account_not_found',
  'error_not_a_team',
  'error_not_a_member',
] as const;

type LeaveErrorKey = (typeof LEAVE_ERROR_KEYS)[number];

function leaveErrorKey(error: string): LeaveErrorKey | 'error_not_authorized' {
  const key = `error_${error}`;
  return (LEAVE_ERROR_KEYS as readonly string[]).includes(key) ?
      (key as LeaveErrorKey)
    : 'error_not_authorized';
}

/**
 * Botón "Salir del equipo" — solo tiene sentido sobre una cuenta de tipo
 * team (las personales son 1:1, no hay a dónde salir). leave_team() redirige
 * a /dashboard por sí mismo tras refrescar la sesión, así que este componente
 * no necesita manejar el caso de éxito.
 */
export function LeaveTeamButton() {
  const t = useTranslations('Team');
  const [open, setOpen] = useState(false);
  const [state, action, isPending] = useActionState(
    async (_prev: { error?: string }) => leaveTeam(),
    {},
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border px-4 py-2 text-[13px] font-semibold transition-opacity hover:opacity-80"
        style={{ borderColor: 'var(--color-poppy)', color: 'var(--color-poppy)' }}>
        {t('leave_team_action')}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('leave_team_title')}</DialogTitle>
            <DialogDescription>{t('leave_team_description')}</DialogDescription>
          </DialogHeader>
          {state.error && (
            <p
              role="alert"
              className="rounded-lg px-3 py-2 text-xs font-medium"
              style={{ background: 'var(--color-poppy-wash)', color: 'var(--color-poppy)' }}>
              {t(leaveErrorKey(state.error))}
            </p>
          )}
          <DialogFooter>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="border-border text-foreground rounded-lg border px-4 py-2 text-sm font-medium transition-colors">
              {t('cancel')}
            </button>
            <form action={action}>
              <button
                type="submit"
                disabled={isPending}
                className="rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                style={{ border: 0, background: 'var(--color-poppy)' }}>
                {isPending ? t('leave_team_leaving') : t('leave_team_confirm')}
              </button>
            </form>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
