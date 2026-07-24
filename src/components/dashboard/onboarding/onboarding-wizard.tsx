'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { Building2, PartyPopper, Send, Users } from 'lucide-react';

import { completeOnboarding } from '@/app/[locale]/dashboard/onboarding/actions';
import { StepBranding } from '@/components/dashboard/onboarding/step-branding';
import { StepInvite } from '@/components/dashboard/onboarding/step-invite';
import { StepOrg } from '@/components/dashboard/onboarding/step-org';
import { StepPlan } from '@/components/dashboard/onboarding/step-plan';
import { Button } from '@/components/ui/button';
import { Stepper } from '@/components/ui/stepper';
import { appConfig } from '@/config/app.config';

const STEP_ICONS = [Building2, Users, Send, PartyPopper];

export function OnboardingWizard({ initialOrgName }: { initialOrgName: string | null }) {
  const t = useTranslations('Onboarding');
  const [step, setStep] = useState(0);

  const labels = [
    t('step_org'),
    t('step_invite'),
    ...(appConfig.features.billing ? [t('step_plan')] : []),
    t('step_branding'),
  ];
  const descriptions = [
    t('step_org_description'),
    t('step_invite_description'),
    ...(appConfig.features.billing ? [t('step_plan_description')] : []),
    t('step_branding_description'),
  ];
  const StepIcon = STEP_ICONS[step] ?? Building2;

  const goNext = () => setStep((s) => s + 1);
  const goBack = () => setStep((s) => Math.max(0, s - 1));
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
    <div className="mx-auto w-full max-w-2xl space-y-6 py-4">
      <Stepper steps={labels} current={step} />

      <div className="border-border relative overflow-hidden rounded-xl border shadow-sm">
        <div className="from-primary to-secondary absolute inset-x-0 top-0 h-1 bg-linear-to-r" />

        <div className="space-y-6 p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-full">
              <StepIcon className="size-5" strokeWidth={2} />
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                {t('step_counter', { current: step + 1, total: labels.length })}
              </p>
              <h1 className="text-foreground text-xl font-bold tracking-tight">{labels[step]}</h1>
              <p className="text-muted-foreground text-sm">{descriptions[step]}</p>
            </div>
          </div>

          {renderStep()}

          {step > 0 && (
            <Button type="button" variant="ghost" onClick={goBack} className="-ml-3">
              {t('back')}
            </Button>
          )}
        </div>
      </div>

      <div className="text-center">
        <Button type="button" variant="ghost" size="sm" onClick={handleSkip}>
          {t('skip_setup')}
        </Button>
      </div>
    </div>
  );
}
