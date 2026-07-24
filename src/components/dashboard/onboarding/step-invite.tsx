'use client';

import { useTranslations } from 'next-intl';

import { InviteForm } from '@/components/dashboard/team/invite-form';
import { Button } from '@/components/ui/button';

export function StepInvite({ onNext }: { onNext: () => void }) {
  const t = useTranslations('Onboarding');
  return (
    <InviteForm
      onSuccess={onNext}
      secondaryButton={
        <Button type="button" variant="outline" onClick={onNext}>
          {t('invite_later')}
        </Button>
      }
    />
  );
}
