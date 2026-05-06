import { Suspense } from 'react';
import { setRequestLocale } from 'next-intl/server';

import { ConfirmationClient } from './confirmation-client';

export default async function SignupConfirmationPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ email?: string; emailValue?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const email = sp.email ?? sp.emailValue ?? 'user@company.com';

  return (
    <Suspense>
      <ConfirmationClient email={email} />
    </Suspense>
  );
}
