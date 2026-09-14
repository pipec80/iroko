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
