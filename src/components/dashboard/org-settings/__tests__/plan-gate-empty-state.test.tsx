import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, it, expect, vi } from 'vitest';

import { PlanGateEmptyState } from '../plan-gate-empty-state';

import es from '../../../../../messages/es.json';

vi.mock('@/i18n/routing', () => ({
  Link: ({ children, ...props }: React.ComponentProps<'a'>) => <a {...props}>{children}</a>,
}));

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe('PlanGateEmptyState', () => {
  it('should render the upgrade CTA with the feature name', () => {
    renderWithIntl(
      <PlanGateEmptyState
        featureKey="plan_gate_webhooks_feature"
        note="plan_gate_webhooks_paused"
      />,
    );
    expect(screen.getByText('Disponible en el plan Pro')).toBeDefined();
    expect(screen.getByRole('link', { name: 'Ver planes' })).toBeDefined();
  });
});
