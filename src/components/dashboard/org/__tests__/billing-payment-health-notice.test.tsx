import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

import { BillingPaymentHealthNotice } from '../billing-payment-health-notice';

describe('BillingPaymentHealthNotice', () => {
  it('renders one alert with explanatory copy when payment needs attention', () => {
    render(
      <BillingPaymentHealthNotice
        paymentHealth={{
          state: 'attention_required',
          lastAttemptAt: '2026-09-11T10:00:00Z',
          lastFailureCode: 'cc_rejected_other_reason',
        }}
      />,
    );

    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.getByText('payment_attention_title')).toBeDefined();
    expect(screen.getByText('payment_attention_body')).toBeDefined();
    expect(screen.getByText('payment_attention_action')).toBeDefined();
  });

  it('explains the rejection when the failure code is actionable', () => {
    render(
      <BillingPaymentHealthNotice
        paymentHealth={{
          state: 'attention_required',
          lastAttemptAt: '2026-09-22T22:14:15Z',
          lastFailureCode: 'cc_rejected_max_attempts',
        }}
      />,
    );

    expect(screen.getByTestId('payment-failure-reason').textContent).toBe(
      'payment_reason_attempts',
    );
    expect(screen.getByText('payment_attention_body')).toBeDefined();
  });

  it.each([null, 'cc_rejected_duplicated_payment', 'something_new'])(
    'falls back to the generic copy without a reason line for the code %j',
    (lastFailureCode) => {
      render(
        <BillingPaymentHealthNotice
          paymentHealth={{
            state: 'attention_required',
            lastAttemptAt: '2026-09-22T22:14:15Z',
            lastFailureCode,
          }}
        />,
      );

      expect(screen.queryByTestId('payment-failure-reason')).toBeNull();
      expect(screen.getByText('payment_attention_body')).toBeDefined();
    },
  );

  it.each(['healthy', 'unknown'] as const)('renders nothing for %s health', (state) => {
    const { container } = render(
      <BillingPaymentHealthNotice
        paymentHealth={{ state, lastAttemptAt: null, lastFailureCode: null }}
      />,
    );

    expect(container.innerHTML).toBe('');
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
