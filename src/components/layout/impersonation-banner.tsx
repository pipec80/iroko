'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

import { endImpersonation } from '@/app/[locale]/dashboard/admin/accounts/[accountId]/impersonation-actions';
import { Button } from '@/components/ui/button';

const REFRESH_INTERVAL_MS = 30_000;
const MS_PER_MINUTE = 60_000;

type Props = {
  targetName: string;
  targetEmail: string;
  expiresAt: string;
};

function minutesLeftFor(expiresAt: string): number {
  return Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / MS_PER_MINUTE));
}

export function ImpersonationBanner({ targetName, targetEmail, expiresAt }: Props) {
  const t = useTranslations('Impersonation');
  const [minutesLeft, setMinutesLeft] = useState(() => minutesLeftFor(expiresAt));

  useEffect(() => {
    const interval = setInterval(() => {
      setMinutesLeft(minutesLeftFor(expiresAt));
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return (
    <div
      className="flex items-center justify-between px-4 py-2 text-sm font-medium"
      style={{
        background: 'var(--color-warning-wash, #fef3c7)',
        color: 'var(--color-warning, #92400e)',
      }}>
      <span>
        {t('banner_text', { name: targetName, email: targetEmail })} ·{' '}
        {t('banner_time_remaining', { minutes: minutesLeft })}
      </span>
      <form
        action={async () => {
          await endImpersonation();
        }}>
        <Button type="submit" size="sm" variant="outline">
          {t('banner_exit_button')}
        </Button>
      </form>
    </div>
  );
}
