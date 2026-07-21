import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import es from '../../../../../messages/es.json';
import { AuditLogTable } from '../audit-log-table';

vi.mock('@/app/[locale]/dashboard/activity/actions', () => ({
  getAccountAuditLogs: vi.fn(),
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
});
