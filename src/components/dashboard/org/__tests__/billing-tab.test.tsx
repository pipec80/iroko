import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getBillingData: vi.fn(),
  getCheckoutConfirmation: vi.fn(),
  startCheckout: vi.fn(),
  cancelSubscription: vi.fn(),
  listInvoices: vi.fn(),
  track: vi.fn(),
  searchParams: new URLSearchParams(),
  replace: vi.fn(),
}));

vi.mock('@/app/[locale]/dashboard/billing/actions', () => ({
  getBillingData: mocks.getBillingData,
  getCheckoutConfirmation: mocks.getCheckoutConfirmation,
  startCheckout: mocks.startCheckout,
  cancelSubscription: mocks.cancelSubscription,
  listInvoices: mocks.listInvoices,
}));

vi.mock('@/lib/analytics/client', () => ({ track: mocks.track }));

vi.mock('next/navigation', () => ({
  useSearchParams: () => mocks.searchParams,
}));

vi.mock('@/i18n/routing', () => ({
  useRouter: () => ({ replace: mocks.replace }),
}));

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

const NO_CAPABILITIES = {
  customerPortal: false,
  cancelImmediately: false,
  cancelAtPeriodEnd: false,
  updatePaymentMethod: false,
  changePlan: false,
  pauseSubscription: false,
};

const ACTIVE_PRO_OVERVIEW = {
  planSlug: 'pro',
  planName: 'Pro',
  planInterval: 'month' as const,
  status: 'active',
  currentPeriodEnd: '2026-09-01T00:00:00.000Z',
  cancelAtPeriodEnd: false,
  trialEnd: null,
  provider: 'mercadopago',
  externalSubscriptionId: 'preapproval_1',
  capabilities: NO_CAPABILITIES,
};

function renderBillingTab(
  role: 'owner' | 'admin' | 'member' | 'viewer' | null,
  accountId = 'account-1',
) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = render(
    <QueryClientProvider client={client}>
      <NextIntlClientProvider locale="es" messages={es}>
        <BillingTab currentUserRole={role} accountId={accountId} />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
  return { ...view, client };
}

describe('BillingTab — role-awareness', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.searchParams = new URLSearchParams();
    mocks.getBillingData.mockResolvedValue({
      data: { plans: [PLAN_FREE, PLAN_PRO], overview: null },
    });
    mocks.getCheckoutConfirmation.mockResolvedValue({
      data: {
        state: 'pending',
        externalSubscriptionId: 'preapproval_1',
        status: 'incomplete',
      },
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

  it('loads a distinct billing query when the active account changes', async () => {
    const { rerender, client } = renderBillingTab('owner', 'account-1');
    await waitFor(() => expect(mocks.getBillingData).toHaveBeenCalledTimes(1));

    rerender(
      <QueryClientProvider client={client}>
        <NextIntlClientProvider locale="es" messages={es}>
          <BillingTab currentUserRole="owner" accountId="account-2" />
        </NextIntlClientProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => expect(mocks.getBillingData).toHaveBeenCalledTimes(2));
  });

  it('keeps the catalog visible but disables checkout when the provider is unavailable', async () => {
    mocks.getBillingData.mockResolvedValue({
      data: { plans: [PLAN_FREE, PLAN_PRO], overview: null, checkoutAvailable: false },
    });

    renderBillingTab('owner');

    const button = await waitFor(() => screen.getByTestId('subscribe-pro'));
    expect(button).toHaveProperty('disabled', true);
    expect(screen.getByText(es.Billing.checkout_unavailable)).toBeDefined();
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

  it('shows a redirecting message while a checkout is being created', async () => {
    mocks.startCheckout.mockReturnValue(new Promise(() => {}));
    renderBillingTab('owner');
    const button = await waitFor(() => screen.getByTestId('subscribe-pro'));

    button.click();

    await waitFor(() => expect(screen.getByText('Redirigiendo a Mercado Pago…')).toBeDefined());
  });

  it.each([
    ['processing', 'El checkout ya se está procesando. Vuelve a comprobar en unos instantes.'],
    [
      'needs_review',
      'No pudimos confirmar si Mercado Pago creó el checkout. No vuelvas a intentarlo; revisaremos el estado.',
    ],
  ] as const)('shows the durable %s checkout state without redirecting', async (kind, message) => {
    mocks.startCheckout.mockResolvedValue({ data: { kind, intentId: 'intent-123' } });
    renderBillingTab('owner');
    const button = await waitFor(() => screen.getByTestId('subscribe-pro'));

    fireEvent.click(button);

    await waitFor(() => expect(screen.getByText(message)).toBeDefined());
    expect(window.location.pathname).not.toContain('mercadopago');
    expect(button).toHaveProperty('disabled', true);
  });

  it('keeps confirming a returned Mercado Pago checkout until the subscription activates', async () => {
    mocks.searchParams = new URLSearchParams('preapproval_id=preapproval_1');

    renderBillingTab('owner');

    await waitFor(() =>
      expect(
        screen.getByText('Estamos confirmando tu suscripción con Mercado Pago…'),
      ).toBeDefined(),
    );
    expect(mocks.getCheckoutConfirmation).toHaveBeenCalledWith({
      externalSubscriptionId: 'preapproval_1',
    });
  });

  it('does not confirm the return from an active overview for a different subscription', async () => {
    mocks.searchParams = new URLSearchParams('preapproval_id=preapproval_returned');
    mocks.getBillingData.mockResolvedValue({
      data: { plans: [PLAN_FREE, PLAN_PRO], overview: ACTIVE_PRO_OVERVIEW },
    });
    mocks.getCheckoutConfirmation.mockResolvedValue({
      data: {
        state: 'pending',
        externalSubscriptionId: 'preapproval_returned',
        status: 'incomplete',
      },
    });

    renderBillingTab('owner');

    await waitFor(() =>
      expect(
        screen.getByText('Estamos confirmando tu suscripción con Mercado Pago…'),
      ).toBeDefined(),
    );
  });

  it('stops polling, refreshes billing, and removes the exact id after pending becomes confirmed', async () => {
    vi.useFakeTimers();
    try {
      mocks.searchParams = new URLSearchParams('preapproval_id=preapproval_1');
      mocks.getCheckoutConfirmation
        .mockResolvedValueOnce({
          data: {
            state: 'pending',
            externalSubscriptionId: 'preapproval_1',
            status: 'incomplete',
          },
        })
        .mockResolvedValue({
          data: {
            state: 'confirmed',
            externalSubscriptionId: 'preapproval_1',
            status: 'active',
          },
        });
      const { client } = renderBillingTab('owner');
      const invalidate = vi.spyOn(client, 'invalidateQueries');

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(mocks.getCheckoutConfirmation).toHaveBeenCalledTimes(1);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(3_000);
        await Promise.resolve();
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1);
      });

      expect(mocks.getCheckoutConfirmation).toHaveBeenCalledTimes(2);
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['billing', 'data', 'account-1'] });
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['billing', 'invoices', 'account-1'] });
      expect(mocks.replace).toHaveBeenCalledWith('/dashboard/billing', { scroll: false });
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not dispatch two checkout mutations after the subscribe button is disabled', async () => {
    mocks.startCheckout.mockReturnValue(new Promise(() => {}));
    renderBillingTab('owner');
    const button = await waitFor(() => screen.getByTestId('subscribe-pro'));

    fireEvent.click(button);
    fireEvent.click(button);

    await waitFor(() => expect(mocks.startCheckout).toHaveBeenCalledTimes(1));
    expect(button).toHaveProperty('disabled', true);
  });

  it('stops confirmation polling after 20 attempts and offers a recoverable retry', async () => {
    vi.useFakeTimers();
    try {
      mocks.searchParams = new URLSearchParams('preapproval_id=preapproval_1');
      mocks.getCheckoutConfirmation.mockResolvedValue({
        data: {
          state: 'pending',
          externalSubscriptionId: 'preapproval_1',
          status: 'incomplete',
        },
      });
      renderBillingTab('owner');

      await act(async () => {
        await vi.advanceTimersByTimeAsync(60_000);
        await Promise.resolve();
      });

      expect(mocks.getCheckoutConfirmation).toHaveBeenCalledTimes(20);
      expect(screen.getByText('La confirmación está tardando más de lo esperado.')).toBeDefined();

      fireEvent.click(screen.getByRole('button', { name: 'Volver a comprobar' }));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(mocks.getCheckoutConfirmation).toHaveBeenCalledTimes(21);
    } finally {
      vi.useRealTimers();
    }
  });

  it('shows a failed return without presenting confirmation success', async () => {
    mocks.searchParams = new URLSearchParams('preapproval_id=preapproval_failed');
    mocks.getCheckoutConfirmation.mockResolvedValue({
      data: {
        state: 'failed',
        externalSubscriptionId: 'preapproval_failed',
        status: 'canceled',
      },
    });

    renderBillingTab('owner');

    await waitFor(() =>
      expect(screen.getByText('La suscripción no pudo confirmarse.')).toBeDefined(),
    );
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it('shows an unmatched return without trusting another subscription', async () => {
    mocks.searchParams = new URLSearchParams('preapproval_id=preapproval_unknown');
    mocks.getCheckoutConfirmation.mockResolvedValue({
      data: {
        state: 'not_found',
        externalSubscriptionId: 'preapproval_unknown',
        status: null,
      },
    });

    renderBillingTab('owner');

    await waitFor(() =>
      expect(
        screen.getByText('No encontramos esta suscripción en la cuenta activa.'),
      ).toBeDefined(),
    );
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it('does not offer a second paid checkout while a paid subscription is active', async () => {
    mocks.getBillingData.mockResolvedValue({
      data: { plans: [PLAN_FREE, PLAN_PRO], overview: ACTIVE_PRO_OVERVIEW },
    });

    renderBillingTab('owner');

    const button = await waitFor(() => screen.getByTestId('subscribe-pro'));
    expect(button).toHaveProperty('disabled', true);
  });

  it('hides unsupported cancellation actions from provider capabilities', async () => {
    mocks.getBillingData.mockResolvedValue({
      data: { plans: [PLAN_FREE, PLAN_PRO], overview: ACTIVE_PRO_OVERVIEW },
    });

    renderBillingTab('owner');

    await waitFor(() => expect(screen.getByTestId('current-plan')).toBeDefined());
    expect(screen.queryByTestId('cancel-period-end')).toBeNull();
    expect(screen.queryByTestId('cancel-immediately')).toBeNull();
  });

  it('renders immediate cancellation only when the provider advertises it', async () => {
    mocks.getBillingData.mockResolvedValue({
      data: {
        plans: [PLAN_FREE, PLAN_PRO],
        overview: {
          ...ACTIVE_PRO_OVERVIEW,
          capabilities: { ...NO_CAPABILITIES, cancelImmediately: true },
        },
      },
    });

    renderBillingTab('owner');

    await waitFor(() => expect(screen.getByTestId('cancel-immediately')).toBeDefined());
    expect(screen.queryByTestId('cancel-period-end')).toBeNull();
  });

  it('shows Chilean prices without offering an unavailable annual checkout', async () => {
    mocks.getBillingData.mockResolvedValue({
      data: {
        plans: [
          { ...PLAN_FREE, currency: 'CLP' },
          { ...PLAN_PRO, name: 'Plus', price: 19_990, currency: 'CLP' },
          {
            ...PLAN_PRO,
            slug: 'scale',
            name: 'Pro',
            price: 102_990,
            currency: 'CLP',
          },
        ],
        overview: null,
      },
    });

    renderBillingTab('owner');

    await waitFor(() => expect(screen.getByText(/19[.\s]990/)).toBeDefined());
    expect(screen.queryByText(es.Billing.toggle_yearly)).toBeNull();
  });
});
