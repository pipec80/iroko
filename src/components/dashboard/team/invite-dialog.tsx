'use client';

import { useTranslations } from 'next-intl';
import { useActionState, useRef, useState } from 'react';

import { UserPlus } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { inviteMembers } from '@/app/[locale]/dashboard/team/actions';
import { INVITABLE_ROLES } from '@/lib/validation/team';

export function InviteDialog() {
  const t = useTranslations('Team');
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const [state, action, isPending] = useActionState(
    async (_prev: { error?: string; success?: boolean; count?: number }, formData: FormData) => {
      const result = await inviteMembers(formData);
      if (result.success) {
        formRef.current?.reset();
        setOpen(false);
      }
      return result;
    },
    {},
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="bg-primary flex cursor-pointer items-center gap-2 rounded-[8px] px-[18px] py-[10px] text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
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

        <form ref={formRef} action={action} className="space-y-4">
          {/* Role selector */}
          <div className="space-y-2">
            <label htmlFor="invite-role" className="text-on-surface text-sm font-semibold">
              {t('role_label')}
            </label>
            <select
              id="invite-role"
              name="role"
              defaultValue="member"
              className="bg-surface-container-low border-outline-variant/30 text-on-surface focus:border-primary w-full rounded-lg border px-3 py-2.5 text-sm [color-scheme:light] transition-colors focus:outline-none dark:[color-scheme:dark]">
              {INVITABLE_ROLES.map((role) => (
                <option key={role} value={role}>
                  {t(`role_${role}`)}
                </option>
              ))}
            </select>
          </div>

          {/* Email textarea */}
          <div className="space-y-2">
            <label htmlFor="invite-emails" className="text-on-surface text-sm font-semibold">
              {t('emails_label')}
            </label>
            <textarea
              id="invite-emails"
              name="emails"
              rows={3}
              placeholder={t('emails_placeholder')}
              className="bg-surface-container-low border-outline-variant/30 text-on-surface placeholder:text-on-surface-variant/40 focus:border-primary w-full rounded-lg border px-3 py-2.5 text-sm transition-colors focus:outline-none"
            />
            <p className="text-on-surface-variant text-xs opacity-60">{t('emails_hint')}</p>
          </div>

          {/* Error display */}
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
            <button
              type="submit"
              disabled={isPending}
              className="bg-primary text-on-primary rounded-lg px-4 py-2 text-sm font-bold shadow-md transition-all hover:shadow-lg active:scale-95 disabled:opacity-50">
              {isPending ? t('sending') : t('send_invitation')}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
