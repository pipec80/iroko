import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import es from '../../../../../messages/es.json';
import { AuditLogTable } from '../audit-log-table';
import { getAccountAuditLogs } from '@/app/[locale]/dashboard/activity/actions';
import { getPlatformAuditLogs } from '@/app/[locale]/dashboard/admin/audit/actions';

vi.mock('@/app/[locale]/dashboard/activity/actions', () => ({
  getAccountAuditLogs: vi.fn(),
}));
vi.mock('@/app/[locale]/dashboard/admin/audit/actions', () => ({
  getPlatformAuditLogs: vi.fn(),
}));

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      {ui}
    </NextIntlClientProvider>,
  );
}

const baseEntry = {
  id: 1,
  actorId: 'u1',
  actorName: 'Alice',
  avatarUrl: null,
  action: 'create' as const,
  resourceType: 'projects',
  resourceId: 'p1',
  createdAt: '2026-07-01T10:00:00Z',
};

describe('AuditLogTable', () => {
  beforeEach(() => {
    vi.mocked(getAccountAuditLogs).mockReset();
    vi.mocked(getPlatformAuditLogs).mockReset();
    vi.mocked(getAccountAuditLogs).mockResolvedValue({ data: { entries: [], nextCursor: null } });
  });
  it('renders the default account variant without the platform columns', () => {
    renderWithIntl(
      <AuditLogTable initialEntries={[baseEntry]} initialCursor={null} timezone="UTC" />,
    );
    expect(screen.getByText('Alice')).toBeTruthy();
    expect(screen.queryByText('Suplantado por')).toBeNull();
  });

  it('renders account and impersonator columns in the platform variant', () => {
    renderWithIntl(
      <AuditLogTable
        variant="platform"
        initialEntries={[{ ...baseEntry, accountName: 'Acme', impersonatorName: null }]}
        initialCursor={null}
        timezone="UTC"
      />,
    );
    expect(screen.getAllByText('Cuenta').length).toBeGreaterThan(0);
    expect(screen.getByText('Suplantado por')).toBeTruthy();
    expect(screen.getByText('Acme')).toBeTruthy();
  });

  const initialCursor = { createdAt: baseEntry.createdAt, id: 1 };
  const platformEntry = {
    ...baseEntry,
    id: 2,
    actorName: 'Bob',
    accountId: 'account-b',
    impersonatorId: 'admin-a',
  };
  const actionSelect = () =>
    screen.getByRole('combobox', { name: es.ActivityLog.filter_action_label });
  const loadMore = () => screen.getByRole('button', { name: es.ActivityLog.load_more });
  function renderPlatform() {
    renderWithIntl(
      <AuditLogTable
        variant="platform"
        initialEntries={[baseEntry]}
        initialCursor={initialCursor}
      />,
    );
  }

  it('filters and paginates globally while preserving account and impersonator IDs', async () => {
    vi.mocked(getPlatformAuditLogs)
      .mockResolvedValueOnce({
        data: { entries: [platformEntry], nextCursor: { ...initialCursor, id: 2 } },
      })
      .mockResolvedValueOnce({
        data: { entries: [{ ...platformEntry, id: 3, actorName: 'Carol' }], nextCursor: null },
      });
    renderPlatform();
    fireEvent.change(actionSelect(), { target: { value: 'create' } });
    await screen.findByText('Bob');
    await waitFor(() => expect((actionSelect() as HTMLSelectElement).disabled).toBe(false));
    expect(screen.getByText('account-b')).toBeTruthy();
    expect(screen.getByText('admin-a')).toBeTruthy();
    expect(getPlatformAuditLogs).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ action: 'create', resourceType: null }),
    );
    fireEvent.click(loadMore());
    await screen.findByText('Carol');
    expect(getPlatformAuditLogs).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ cursor: { ...initialCursor, id: 2 }, action: 'create' }),
    );
    expect(screen.getByText('Bob')).toBeTruthy();
    expect(getAccountAuditLogs).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: es.ActivityLog.load_more })).toBeNull();
  });

  it('keeps account requests scoped to account when filtering resources', async () => {
    vi.mocked(getAccountAuditLogs).mockResolvedValue({
      data: { entries: [{ ...baseEntry, actorName: 'Scoped' }], nextCursor: null },
    });
    renderWithIntl(<AuditLogTable initialEntries={[baseEntry]} initialCursor={null} />);
    fireEvent.change(screen.getByRole('combobox', { name: es.ActivityLog.filter_resource_label }), {
      target: { value: 'profiles' },
    });
    await screen.findByText('Scoped');
    expect(getAccountAuditLogs).toHaveBeenCalledWith(
      expect.objectContaining({ resourceType: 'profiles' }),
    );
    expect(getPlatformAuditLogs).not.toHaveBeenCalled();
  });

  it('filters resources globally and preserves the returned account context', async () => {
    vi.mocked(getPlatformAuditLogs).mockResolvedValue({
      data: { entries: [platformEntry], nextCursor: null },
    });
    renderPlatform();
    fireEvent.change(screen.getByRole('combobox', { name: es.ActivityLog.filter_resource_label }), {
      target: { value: 'profiles' },
    });
    await screen.findByText('Bob');
    expect(screen.getByText('account-b')).toBeTruthy();
    expect(screen.getByText('admin-a')).toBeTruthy();
    expect(getPlatformAuditLogs).toHaveBeenCalledWith(
      expect.objectContaining({ resourceType: 'profiles' }),
    );
    expect(getAccountAuditLogs).not.toHaveBeenCalled();
  });

  it('restores applied filters after failure and retries the requested filter', async () => {
    vi.mocked(getPlatformAuditLogs)
      .mockResolvedValueOnce({ data: null, error: 'fetch_failed' })
      .mockResolvedValueOnce({ data: { entries: [platformEntry], nextCursor: null } });
    renderPlatform();
    fireEvent.change(actionSelect(), { target: { value: 'create' } });
    await screen.findByRole('alert');
    await waitFor(() => expect((actionSelect() as HTMLSelectElement).disabled).toBe(false));
    expect(screen.getByText('Alice')).toBeTruthy();
    expect((actionSelect() as HTMLSelectElement).value).toBe('');
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await screen.findByText('Bob');
    await waitFor(() => expect((actionSelect() as HTMLSelectElement).disabled).toBe(false));
    expect((actionSelect() as HTMLSelectElement).value).toBe('create');
    expect(getPlatformAuditLogs).toHaveBeenLastCalledWith(
      expect.objectContaining({ action: 'create' }),
    );
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('discards failed filter retry when pagination succeeds using the applied filter', async () => {
    vi.mocked(getPlatformAuditLogs)
      .mockResolvedValueOnce({ data: null, error: 'fetch_failed' })
      .mockResolvedValueOnce({ data: { entries: [platformEntry], nextCursor: null } });
    renderPlatform();
    fireEvent.change(actionSelect(), { target: { value: 'create' } });
    await screen.findByRole('alert');
    await waitFor(() => expect((actionSelect() as HTMLSelectElement).disabled).toBe(false));
    fireEvent.click(loadMore());
    await screen.findByText('Bob');
    expect(getPlatformAuditLogs).toHaveBeenLastCalledWith(
      expect.objectContaining({ cursor: initialCursor, action: null }),
    );
    expect(screen.getByText('Alice')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Reintentar' })).toBeNull();
  });

  it('preserves rows and cursor on transport failure and retries the same page', async () => {
    vi.mocked(getPlatformAuditLogs)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ data: { entries: [platformEntry], nextCursor: null } });
    renderPlatform();
    fireEvent.click(loadMore());
    await screen.findByRole('alert');
    await waitFor(() => expect((actionSelect() as HTMLSelectElement).disabled).toBe(false));
    expect(screen.getByText('Alice')).toBeTruthy();
    expect((loadMore() as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await screen.findByText('Bob');
    expect(getPlatformAuditLogs).toHaveBeenLastCalledWith(
      expect.objectContaining({ cursor: initialCursor }),
    );
    expect(screen.getByText('Alice')).toBeTruthy();
  });

  it('serializes duplicate clicks and blocks filter changes while a request is pending', async () => {
    let resolvePage!: (value: Awaited<ReturnType<typeof getPlatformAuditLogs>>) => void;
    vi.mocked(getPlatformAuditLogs).mockReturnValue(
      new Promise((resolve) => {
        resolvePage = resolve;
      }),
    );
    renderPlatform();
    const button = loadMore();
    act(() => {
      fireEvent.click(button);
      fireEvent.click(button);
    });
    await waitFor(() => expect(getPlatformAuditLogs).toHaveBeenCalledTimes(1));
    expect((actionSelect() as HTMLSelectElement).disabled).toBe(true);
    await act(async () => resolvePage({ data: { entries: [platformEntry], nextCursor: null } }));
    expect(screen.getAllByText('Bob')).toHaveLength(1);
    expect((actionSelect() as HTMLSelectElement).disabled).toBe(false);
  });
});
