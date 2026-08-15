'use client';

import { useTranslations } from 'next-intl';

import { BillingTab } from '@/components/dashboard/org/billing-tab';
import { Button } from '@/components/ui/button';

export function StepPlan({ onNext }: { onNext: () => void }) {
  const t = useTranslations('Onboarding');
  return (
    <div className="space-y-4">
      {/* El paso 0 del wizard (StepOrg) crea o renombra el team del usuario, así
          que en este paso el rol es siempre owner — no hay ninguna otra forma
          de llegar acá. */}
      <BillingTab currentUserRole="owner" />
      <Button type="button" onClick={onNext}>
        {t('next')}
      </Button>
    </div>
  );
}
