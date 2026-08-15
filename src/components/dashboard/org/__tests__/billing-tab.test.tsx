import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NextIntlClientProvider } from 'next-intl';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  getBillingData: vi.fn(),
  startCheckout: vi.fn(),
  cancelSubscription: vi.fn(),
  listInvoices: vi.fn(),
  track: vi.fn(),
}));

vi.mock('@/app/[locale]/dashboard/billing/actions', () => ({
  getBillingData: mocks.getBillingData,
  startCheckout: mocks.startCheckout,
  cancelSubscription: mocks.cancelSubscription,
  listInvoices: mocks.listInvoices,
}));

vi.mock('@/lib/analytics/client', () => ({ track: mocks.track }));

import { BillingTab } from '../billing-tab';
import es from '../../../../../messages/es.json';

const PLAN_FREE = {
  slug: 'free',
  name: 'Free',
  description: null,
  interval: 'month' as const,
  price: 0,
  currency: 'USD',
  trialDays: 0,
  features: {},
  limits: {},
};

const PLAN_PRO = { ...PLAN_FREE, slug: 'pro', name: 'Pro', price: 2900 };

function renderBillingTab(role: 'owner' | 'admin' | 'member' | 'viewer' | null) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <NextIntlClientProvider locale="es" messages={es}>
        <BillingTab currentUserRole={role} />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe('BillingTab — role-awareness', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getBillingData.mockResolvedValue({
      data: { plans: [PLAN_FREE, PLAN_PRO], overview: null },
    });
  });

  it('should show the read-only notice for a member', async () => {
    renderBillingTab('member');
    await waitFor(() => expect(screen.getByTestId('subscribe-pro')).toBeDefined());
    expect(screen.getByText(es.Billing.readonly_notice)).toBeDefined();
  });

  it('should not show the read-only notice for an admin', async () => {
    renderBillingTab('admin');
    await waitFor(() => expect(screen.getByTestId('subscribe-pro')).toBeDefined());
    expect(screen.queryByText(es.Billing.readonly_notice)).toBeNull();
  });

  it('should disable the subscribe button for a viewer', async () => {
    renderBillingTab('viewer');
    const button = await waitFor(() => screen.getByTestId('subscribe-pro'));
    expect(button).toHaveProperty('disabled', true);
  });

  it('should enable the subscribe button for an owner', async () => {
    renderBillingTab('owner');
    const button = await waitFor(() => screen.getByTestId('subscribe-pro'));
    expect(button).toHaveProperty('disabled', false);
  });

  it('should render the checkout error instead of failing silently', async () => {
    // Antes, un not_authorized (el backend ya valida owner/admin) quedaba solo
    // en checkout.error sin que ningún JSX lo renderizara — el fallo
    // desaparecía en silencio y el usuario no se enteraba.
    mocks.startCheckout.mockResolvedValue({ data: null, error: 'not_authorized' });
    renderBillingTab('owner');
    const button = await waitFor(() => screen.getByTestId('subscribe-pro'));

    button.click();

    await waitFor(() => expect(screen.getByText(es.Billing.checkout_error)).toBeDefined());
  });
});
