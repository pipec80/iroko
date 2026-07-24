'use client';

import { useTranslations } from 'next-intl';

import { BillingTab } from '@/components/dashboard/org/billing-tab';
import { Button } from '@/components/ui/button';

export function StepPlan({ onNext }: { onNext: () => void }) {
  const t = useTranslations('Onboarding');
  return (
    <div className="space-y-4">
      <BillingTab />
      <Button type="button" onClick={onNext}>
        {t('next')}
      </Button>
    </div>
  );
}
