import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, it, expect, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ onlineUserIds: new Set(['user-1']) }));

vi.mock('@/hooks/use-presence', () => ({
  usePresence: () => ({ onlineUserIds: mocks.onlineUserIds }),
}));
vi.mock('@/app/[locale]/dashboard/team/actions', () => ({ removeMember: vi.fn() }));

import { MembersTable } from '../members-table';
import es from '../../../../../messages/es.json';

const MEMBER_ONLINE = {
  user_id: 'user-1',
  email: 'a@example.com',
  role: 'member' as const,
  status: 'active' as const,
  given_name: 'Ana',
  family_name: 'Lopez',
  display_name: null,
  avatar_url: null,
  joined_at: '2026-01-01T00:00:00Z',
};

const MEMBER_OFFLINE = { ...MEMBER_ONLINE, user_id: 'user-2', given_name: 'Bea' };
const ADMIN_MEMBER = { ...MEMBER_ONLINE, user_id: 'user-3', role: 'admin' as const };

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe('MembersTable presence dot', () => {
  it('should show the online indicator only for members present in onlineUserIds', () => {
    renderWithIntl(
      <MembersTable
        members={[MEMBER_ONLINE, MEMBER_OFFLINE]}
        accountId="acc-1"
        currentUserId="user-1"
        currentUserRole="owner"
      />,
    );
    const dots = screen.getAllByLabelText('En línea');
    expect(dots).toHaveLength(1);
  });
});

describe('MembersTable — role-awareness de RowActions', () => {
  it('should hide the remove-member button for a viewer, even over a non-owner member', () => {
    // Antes, el gate solo miraba el rol de la FILA (nunca remover a un owner)
    // sin importar el rol de quien mira: un viewer veía el botón de eliminar
    // sobre cualquier admin/member, aunque el RPC lo iba a rechazar igual.
    renderWithIntl(
      <MembersTable
        members={[ADMIN_MEMBER]}
        accountId="acc-1"
        currentUserId="user-1"
        currentUserRole="viewer"
      />,
    );
    expect(screen.queryByRole('button', { name: /acciones para/i })).toBeNull();
  });

  it('should show the remove-member button for an owner over a non-owner member', () => {
    renderWithIntl(
      <MembersTable
        members={[ADMIN_MEMBER]}
        accountId="acc-1"
        currentUserId="user-1"
        currentUserRole="owner"
      />,
    );
    expect(screen.queryByRole('button', { name: /acciones para/i })).not.toBeNull();
  });
});
