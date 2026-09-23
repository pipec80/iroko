'use client';

import { AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { paymentFailureReason, type BillingPaymentHealth } from '@/lib/billing/payment-health';

export function BillingPaymentHealthNotice({
  paymentHealth,
}: {
  paymentHealth: BillingPaymentHealth | undefined;
}) {
  const t = useTranslations('Billing');

  if (paymentHealth?.state !== 'attention_required') return null;

  const reason = paymentFailureReason(paymentHealth.lastFailureCode);

  return (
    <div
      role="alert"
      className="flex gap-3 rounded-lg border p-4"
      style={{
        background: 'var(--color-warning-wash)',
        borderColor: 'var(--color-warning)',
        color: 'var(--color-warning)',
      }}>
      <AlertTriangle aria-hidden className="mt-0.5 size-5 shrink-0" strokeWidth={1.5} />
      <div>
        <p className="text-sm font-semibold">{t('payment_attention_title')}</p>
        <p className="mt-1 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
          {t('payment_attention_body')}
        </p>
        {reason && (
          <p className="mt-2 text-[13px] font-medium" data-testid="payment-failure-reason">
            {t(`payment_reason_${reason}`)}
          </p>
        )}
        <p className="mt-2 text-[13px] font-semibold">{t('payment_attention_action')}</p>
      </div>
    </div>
  );
}
