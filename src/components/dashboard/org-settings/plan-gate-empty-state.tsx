'use client';

import { Lock } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/routing';

/** Empty state para features fuera del plan (patrón "free ve esto"). El gate
 * real vive en Postgres; esto es solo presentación (F3-3H-1). */
export function PlanGateEmptyState({ featureKey, note }: { featureKey: string; note?: string }) {
  const t = useTranslations('OrgSettings');
  return (
    <div className="border-border flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-12 text-center">
      <Lock className="text-muted-foreground size-8" aria-hidden />
      <h3 className="text-foreground text-lg font-semibold">{t('plan_gate_title')}</h3>
      <p className="text-muted-foreground max-w-md text-sm">
        {t('plan_gate_body', { feature: t(featureKey) })}
      </p>
      {note ?
        <p className="text-muted-foreground max-w-md text-xs">{t(note)}</p>
      : null}
      <Link
        href="/dashboard/billing"
        className="bg-primary text-primary-foreground mt-2 rounded-lg px-4 py-2 text-sm font-medium">
        {t('plan_gate_cta')}
      </Link>
    </div>
  );
}
