import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { MockCheckoutForm } from '@/components/dashboard/org/mock-checkout-form';
import { verifyMockPayload } from '@/lib/billing/signing';
import { mockCheckoutSchema } from '@/lib/billing/mock-schemas';
import { isMockBillingAllowed } from '@/lib/billing/mock-policy';
import { env } from '@/env';

export default async function MockCheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ data?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { data } = await searchParams;
  if (!isMockBillingAllowed({ nodeEnv: env.NODE_ENV, allowMockBilling: env.ALLOW_MOCK_BILLING }))
    notFound();
  const parsed = mockCheckoutSchema.safeParse(data ? await verifyMockPayload(data) : null);
  if (!parsed.success) notFound();
  const token = parsed.data;

  const t = await getTranslations('Billing');

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 p-6">
      <div className="card space-y-2 p-6">
        <p className="text-muted-foreground text-[11px] font-semibold tracking-widest uppercase">
          {t('mock_badge')}
        </p>
        <h1 className="text-foreground text-2xl font-bold">
          {t('mock_title', { plan: token.planSlug, interval: t(`interval_${token.interval}`) })}
        </h1>
        <p className="text-muted-foreground text-sm">{t('mock_desc')}</p>
        <div className="pt-4">
          <MockCheckoutForm data={data ?? ''} cancelUrl={token.cancelUrl} />
        </div>
      </div>
    </div>
  );
}
