'use client';

import { useTranslations } from 'next-intl';
import { useActionState, useState } from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { removeMember } from '@/app/[locale]/dashboard/team/actions';

type Props = {
  userId: string;
  displayName: string;
};

export function RemoveMemberDialog({ userId, displayName }: Props) {
  const t = useTranslations('Team');
  const [open, setOpen] = useState(false);

  const [state, action, isPending] = useActionState(
    async (_prev: { error?: string; success?: boolean }) => {
      const formData = new FormData();
      formData.set('userId', userId);
      const result = await removeMember(formData);
      if (result.success) setOpen(false);
      return result;
    },
    {},
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="text-on-surface-variant hover:text-error flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
          title={t('remove_member')}>
          <span className="material-symbols-outlined text-[18px]">person_remove</span>
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('remove_title')}</DialogTitle>
          <DialogDescription>{t('remove_description', { name: displayName })}</DialogDescription>
        </DialogHeader>

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
            {t('cancel')}
          </button>
          <form action={action}>
            <button
              type="submit"
              disabled={isPending}
              className="bg-error text-on-primary rounded-lg px-4 py-2 text-sm font-bold shadow-md transition-all hover:shadow-lg active:scale-95 disabled:opacity-50">
              {isPending ? t('removing') : t('confirm_remove')}
            </button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
