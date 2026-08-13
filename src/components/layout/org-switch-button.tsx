'use client';

import Image from 'next/image';
import { useActionState } from 'react';
import { useTranslations } from 'next-intl';

import { switchAccount } from '@/app/[locale]/dashboard/actions';
import { storageUrl } from '@/lib/storage';

import { getOrgTone, orgInitials } from './org-utils';
import type { OrgAccount } from './app-sidebar-client';

const SWITCH_ERROR_KEYS: Record<string, string> = {
  not_a_member: 'switch_org_error_not_member',
  invalid_account_id: 'switch_org_error_generic',
  switch_failed: 'switch_org_error_generic',
};

type Props = { org: OrgAccount; index: number; isSelected: boolean };

/** One org row in the switcher dropdown — owns its own switchAccount call so errors are visible. */
export function OrgSwitchButton({ org, index, isSelected }: Props) {
  const t = useTranslations('Navigation');
  const [state, action, isPending] = useActionState(
    async (_prev: { error?: string }, formData: FormData) => switchAccount(formData),
    {},
  );

  return (
    <form action={action} className="contents">
      <input type="hidden" name="accountId" value={org.account_id} />
      <button
        type="submit"
        role="option"
        aria-selected={isSelected}
        disabled={isPending}
        className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 disabled:cursor-not-allowed disabled:opacity-60"
        style={{
          border: 0,
          background: isSelected ? 'var(--surface-3)' : 'transparent',
        }}>
        {storageUrl(org.logo_url) ?
          <div className="relative size-[22px] shrink-0 overflow-hidden rounded-sm">
            <Image
              src={storageUrl(org.logo_url) as string}
              alt={org.name}
              fill
              unoptimized
              className="object-cover"
            />
          </div>
        : <div
            className="inline-flex shrink-0 items-center justify-center"
            style={{
              width: 22,
              height: 22,
              borderRadius: 4,
              background: getOrgTone(index),
              color: '#fff',
              fontWeight: 700,
              fontSize: 10,
            }}>
            {orgInitials(org.name)}
          </div>
        }
        <span
          className="flex-1 text-left text-[13px] font-medium"
          style={{ color: 'var(--text-primary)' }}>
          {org.name}
        </span>
        {org.plan && (
          <span
            className="font-mono text-[10px] uppercase"
            style={{ color: 'var(--text-tertiary)', letterSpacing: '0.1em' }}>
            {org.plan}
          </span>
        )}
      </button>
      {state.error && (
        <p role="alert" className="text-error px-2 pt-1 pb-0.5 text-[11px] font-medium">
          {t((SWITCH_ERROR_KEYS[state.error] ?? 'switch_org_error_generic') as never)}
        </p>
      )}
    </form>
  );
}
