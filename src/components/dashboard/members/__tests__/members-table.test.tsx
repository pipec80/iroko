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
      />,
    );
    const dots = screen.getAllByLabelText('En línea');
    expect(dots).toHaveLength(1);
  });
});
