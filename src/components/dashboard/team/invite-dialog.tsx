'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { UserPlus } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { InviteForm } from '@/components/dashboard/team/invite-form';

export function InviteDialog() {
  const t = useTranslations('Team');
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="bg-primary flex cursor-pointer items-center gap-2 rounded-lg px-[18px] py-[10px] text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
          style={{ border: 0 }}>
          <UserPlus style={{ width: 14, height: 14, strokeWidth: 1.5 }} />
          {t('invite_member')}
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('invite_title')}</DialogTitle>
          <DialogDescription>{t('invite_description')}</DialogDescription>
        </DialogHeader>

        <InviteForm
          onSuccess={() => setOpen(false)}
          secondaryButton={
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="border-outline-variant/30 text-on-surface hover:bg-surface-container-high rounded-lg border px-4 py-2 text-sm font-medium transition-colors">
              {t('cancel')}
            </button>
          }
        />
      </DialogContent>
    </Dialog>
  );
}
