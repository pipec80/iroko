'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { startImpersonation } from './impersonation-actions';

const MIN_REASON_LENGTH = 3;

const ERROR_KEYS: Record<string, string> = {
  cannot_impersonate_self: 'error_cannot_impersonate_self',
  cannot_impersonate_admin: 'error_cannot_impersonate_admin',
  target_not_found: 'error_target_not_found',
  not_platform_admin: 'error_not_platform_admin',
  mfa_required: 'error_mfa_required',
  validation_error: 'error_reason_required',
};

export function ImpersonateButton({
  targetUserId,
  targetName,
}: {
  targetUserId: string;
  targetName: string;
}) {
  const t = useTranslations('Impersonation');
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await startImpersonation(targetUserId, reason);
      if (result.error) {
        setError(t((ERROR_KEYS[result.error] ?? 'error_start_failed') as never));
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">{t('button_label', { name: targetName })}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('dialog_title', { name: targetName })}</DialogTitle>
          <DialogDescription>{t('dialog_description')}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="impersonate-reason">{t('reason_label')}</Label>
          <Input
            id="impersonate-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t('reason_placeholder')}
          />
        </div>
        {error && <p className="text-destructive text-sm">{error}</p>}
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {t('cancel_button')}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isPending || reason.trim().length < MIN_REASON_LENGTH}>
            {t('confirm_button')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
