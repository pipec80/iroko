'use client';

import { useTransition } from 'react';
import { useTranslations } from 'next-intl';

import { confirmMockCheckout } from '@/app/[locale]/dashboard/billing/actions';

/** Form de la hosted-page simulada: Pagar dispara el webhook; Declinar vuelve. */
export function MockCheckoutForm({ data, cancelUrl }: { data: string; cancelUrl: string }) {
  const t = useTranslations('Billing');
  const [pending, startTransition] = useTransition();

  const pay = () =>
    startTransition(async () => {
      const res = await confirmMockCheckout({ data });
      window.location.href = res.data?.redirectUrl ?? cancelUrl;
    });

  return (
    <div className="flex gap-3">
      <button
        type="button"
        disabled={pending}
        onClick={pay}
        data-testid="mock-pay"
        className="rounded-lg px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        style={{ background: 'var(--color-cobalt)' }}>
        {t('mock_pay_btn')}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => (window.location.href = cancelUrl)}
        className="border-border text-foreground rounded-lg border px-4 py-2 text-[13px] font-semibold">
        {t('mock_decline_btn')}
      </button>
    </div>
  );
}
