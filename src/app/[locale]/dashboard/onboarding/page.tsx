import { setRequestLocale } from 'next-intl/server';

import { getOnboardingOrg } from '@/app/[locale]/dashboard/onboarding/actions';
import { OnboardingWizard } from '@/components/dashboard/onboarding/onboarding-wizard';

export default async function OnboardingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const { name } = await getOnboardingOrg();

  return <OnboardingWizard initialOrgName={name} />;
}
