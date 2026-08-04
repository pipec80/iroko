import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mocks = vi.hoisted(() => ({ getAdminAccounts: vi.fn() }));

vi.mock('../actions', () => ({ getAdminAccounts: mocks.getAdminAccounts }));

vi.mock('@/i18n/routing', () => ({
  Link: ({ children, ...props }: React.ComponentProps<'a'>) => <a {...props}>{children}</a>,
}));

import { AccountsTable } from '../accounts-table';
import type { AdminAccountEntry } from '../actions';
import es from '../../../../../../../messages/es.json';

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      {ui}
    </NextIntlClientProvider>,
  );
}

const ACTIVE_ENTRY: AdminAccountEntry = {
  accountId: 'acc-1',
  name: 'Acme Testing Co',
  slug: 'acme-testing-co',
  type: 'team',
  ownerId: 'user-1',
  ownerEmail: 'owner@acme.test',
  planSlug: 'pro',
  subscriptionStatus: 'active',
  memberCount: 3,
  createdAt: '2026-07-01T00:00:00Z',
};

const PAST_DUE_ENTRY: AdminAccountEntry = {
  ...ACTIVE_ENTRY,
  accountId: 'acc-2',
  name: 'Bravo Ventures',
  slug: 'bravo-ventures',
  planSlug: 'scale',
  subscriptionStatus: 'past_due',
};

describe('AccountsTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the initial entries with a real, keyboard-reachable link per row', () => {
    renderWithIntl(<AccountsTable initialEntries={[ACTIVE_ENTRY]} initialCursor={null} />);

    // Two layouts coexist in the DOM (mobile cards + desktop table); Tailwind's
    // `hidden` hides one visually via CSS, which jsdom doesn't evaluate.
    const links = screen.getAllByRole('link', { name: 'Acme Testing Co' });
    expect(links.length).toBeGreaterThanOrEqual(1);
    for (const link of links) {
      expect(link.getAttribute('href')).toBe('/dashboard/admin/accounts/acc-1');
    }
  });

  it('shows the loaded count in the header', () => {
    renderWithIntl(
      <AccountsTable initialEntries={[ACTIVE_ENTRY, PAST_DUE_ENTRY]} initialCursor={null} />,
    );

    expect(screen.getByText('2 cuentas')).toBeDefined();
  });

  it('renders the subscription status value as a chip', () => {
    renderWithIntl(<AccountsTable initialEntries={[ACTIVE_ENTRY]} initialCursor={null} />);

    const chips = screen.getAllByText('active');
    // One in the row's status chip, one as the option in the status filter select.
    expect(chips.length).toBeGreaterThanOrEqual(1);
    expect(chips.some((el) => el.className.includes('chip'))).toBe(true);
  });

  it('shows the empty state when there are no entries', () => {
    renderWithIntl(<AccountsTable initialEntries={[]} initialCursor={null} />);

    expect(
      screen.getAllByText('Ninguna cuenta coincide con tu búsqueda.').length,
    ).toBeGreaterThanOrEqual(1);
  });

  it('debounces the search input before calling getAdminAccounts', async () => {
    vi.useFakeTimers();
    mocks.getAdminAccounts.mockResolvedValue({ data: { entries: [], nextCursor: null } });
    renderWithIntl(<AccountsTable initialEntries={[ACTIVE_ENTRY]} initialCursor={null} />);

    fireEvent.change(screen.getByLabelText('Buscar por nombre o slug'), {
      target: { value: 'bravo' },
    });

    // Not called yet — still inside the debounce window.
    expect(mocks.getAdminAccounts).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(300);
    expect(mocks.getAdminAccounts).toHaveBeenCalledWith({ search: 'bravo' });
  });

  it('replaces the entries after a search resolves', async () => {
    mocks.getAdminAccounts.mockResolvedValue({
      data: { entries: [PAST_DUE_ENTRY], nextCursor: null },
    });
    renderWithIntl(<AccountsTable initialEntries={[ACTIVE_ENTRY]} initialCursor={null} />);

    fireEvent.change(screen.getByLabelText('Buscar por nombre o slug'), {
      target: { value: 'bravo' },
    });

    await waitFor(() =>
      expect(screen.getAllByRole('link', { name: 'Bravo Ventures' }).length).toBeGreaterThanOrEqual(
        1,
      ),
    );
    expect(screen.queryByRole('link', { name: 'Acme Testing Co' })).toBeNull();
  });

  it('shows the "load more" button only when a next cursor exists', () => {
    const cursor = { createdAt: '2026-07-01T00:00:00Z', id: 'acc-1' };
    renderWithIntl(<AccountsTable initialEntries={[ACTIVE_ENTRY]} initialCursor={cursor} />);

    expect(screen.getByRole('button', { name: 'Cargar más' })).toBeDefined();
  });

  it('does not show "load more" when there is no next cursor', () => {
    renderWithIntl(<AccountsTable initialEntries={[ACTIVE_ENTRY]} initialCursor={null} />);

    expect(screen.queryByRole('button', { name: 'Cargar más' })).toBeNull();
  });

  it('appends entries and calls getAdminAccounts with the cursor on "load more"', async () => {
    const cursor = { createdAt: '2026-07-01T00:00:00Z', id: 'acc-1' };
    mocks.getAdminAccounts.mockResolvedValue({
      data: { entries: [PAST_DUE_ENTRY], nextCursor: null },
    });
    renderWithIntl(<AccountsTable initialEntries={[ACTIVE_ENTRY]} initialCursor={cursor} />);

    fireEvent.click(screen.getByRole('button', { name: 'Cargar más' }));

    await waitFor(() =>
      expect(screen.getAllByRole('link', { name: 'Bravo Ventures' }).length).toBeGreaterThanOrEqual(
        1,
      ),
    );
    expect(mocks.getAdminAccounts).toHaveBeenCalledWith({ search: null, cursor });
    // Original entry is still there — load more appends, doesn't replace.
    expect(screen.getAllByRole('link', { name: 'Acme Testing Co' }).length).toBeGreaterThanOrEqual(
      1,
    );
  });
});
