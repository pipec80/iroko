import { setRequestLocale } from 'next-intl/server';

import { redirect } from '@/i18n/routing';

export default async function OnboardingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  redirect({ href: '/dashboard', locale });
}
