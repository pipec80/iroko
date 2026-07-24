'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { completeOnboarding } from '@/app/[locale]/dashboard/onboarding/actions';
import { StepBranding } from '@/components/dashboard/onboarding/step-branding';
import { StepInvite } from '@/components/dashboard/onboarding/step-invite';
import { StepOrg } from '@/components/dashboard/onboarding/step-org';
import { StepPlan } from '@/components/dashboard/onboarding/step-plan';
import { Button } from '@/components/ui/button';
import { Stepper } from '@/components/ui/stepper';
import { appConfig } from '@/config/app.config';

export function OnboardingWizard({ initialOrgName }: { initialOrgName: string | null }) {
  const t = useTranslations('Onboarding');
  const [step, setStep] = useState(0);

  const labels = [
    t('step_org'),
    t('step_invite'),
    ...(appConfig.features.billing ? [t('step_plan')] : []),
    t('step_branding'),
  ];

  const goNext = () => setStep((s) => s + 1);
  const handleSkip = () => {
    void completeOnboarding();
  };

  const renderStep = () => {
    if (step === 0) return <StepOrg initialName={initialOrgName} onNext={goNext} />;
    if (step === 1) return <StepInvite onNext={goNext} />;
    if (appConfig.features.billing && step === 2) return <StepPlan onNext={goNext} />;
    return <StepBranding />;
  };

  return (
    <div className="mx-auto max-w-xl space-y-6 p-6">
      <Stepper steps={labels} current={step} />
      {renderStep()}
      <Button type="button" variant="ghost" onClick={handleSkip}>
        {t('skip_setup')}
      </Button>
    </div>
  );
}
