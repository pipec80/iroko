'use client';

import { useTranslations } from 'next-intl';
import { useActionState, useRef, useState } from 'react';

import { ChevronDown, Check, UserPlus } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { inviteMembers } from '@/app/[locale]/dashboard/team/actions';
import { INVITABLE_ROLES } from '@/lib/validation/team';

type InvitableRole = (typeof INVITABLE_ROLES)[number];

export function InviteDialog() {
  const t = useTranslations('Team');
  const [open, setOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const [role, setRole] = useState<InvitableRole>('member');
  const formRef = useRef<HTMLFormElement>(null);

  const [state, action, isPending] = useActionState(
    async (_prev: { error?: string; success?: boolean; count?: number }, formData: FormData) => {
      const result = await inviteMembers(formData);
      if (result.success) {
        formRef.current?.reset();
        setRole('member');
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

        <form ref={formRef} action={action} className="space-y-4">
          {/* Role selector */}
          <div className="space-y-2">
            <label className="text-on-surface text-sm font-semibold">{t('role_label')}</label>
            <input type="hidden" name="role" value={role} />
            <DropdownMenu open={roleOpen} onOpenChange={setRoleOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="bg-surface-container-low border-outline-variant/30 text-on-surface focus:border-primary flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-sm transition-colors focus:outline-none">
                  <span>{t(`role_${role}`)}</span>
                  <ChevronDown
                    className="text-on-surface-variant size-4 opacity-60"
                    aria-hidden="true"
                  />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-(--radix-dropdown-menu-trigger-width)">
                {INVITABLE_ROLES.map((r) => (
                  <DropdownMenuItem
                    key={r}
                    onSelect={() => setRole(r)}
                    className="flex items-center justify-between">
                    <span>{t(`role_${r}`)}</span>
                    {role === r && <Check className="size-4" aria-hidden="true" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
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
