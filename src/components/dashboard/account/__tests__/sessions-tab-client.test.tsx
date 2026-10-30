import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const actions = vi.hoisted(() => ({
  revokeSessionAction: vi.fn(),
  revokeAllOtherSessionsAction: vi.fn(),
  listMySessions: vi.fn(),
}));

vi.mock('@/app/[locale]/dashboard/account/actions', () => actions);

import { SessionsTabClient } from '../sessions-tab-client';

const labels = {
  heading: 'Sessions',
  description: 'Devices',
  device: 'Device',
  ip: 'IP',
  last_active: 'Last active',
  aal: 'Level',
  actions: 'Actions',
  revoke: 'Revoke',
  revoke_all_others: 'Revoke others',
  current_badge: 'Current',
  none: 'None',
  session_revoked: 'Revoked',
  other_sessions_revoked: 'Others revoked',
  error: 'Could not refresh sessions',
  device_unknown: 'Unknown',
  device_iphone: 'iPhone',
  device_android: 'Android',
  device_windows: 'Windows',
  device_macos: 'macOS',
  device_linux: 'Linux',
  device_browser: 'Browser',
};

const sessions = ['older', 'current'].map((id) => ({
  id,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: null,
  not_after: null,
  user_agent: id,
  ip: null,
  aal: 'aal1',
}));

describe('SessionsTabClient', () => {
  beforeEach(() => vi.clearAllMocks());

  it('marks and protects the verified current session by ID, regardless of order', () => {
    render(
      <SessionsTabClient
        sessions={sessions}
        currentSessionId="current"
        locale="en"
        labels={labels}
      />,
    );
    const rows = screen.getAllByTestId('session-item');
    expect(rows[0]?.textContent).not.toContain('Current');
    expect(rows[1]?.textContent).toContain('Current');
    expect(rows[0]?.querySelector('button')?.disabled).toBe(false);
    expect(rows[1]?.querySelector('button')?.disabled).toBe(true);
  });

  it('does not guess a current session when the verified claim is absent', () => {
    render(
      <SessionsTabClient sessions={sessions} currentSessionId={null} locale="en" labels={labels} />,
    );
    const rows = screen.getAllByTestId('session-item');
    expect(rows.every((row) => !row.textContent?.includes('Current'))).toBe(true);
    expect(rows.every((row) => row.querySelector('button')?.disabled)).toBe(true);
  });

  it('requeries after revoking other sessions and displays the returned survivors', async () => {
    actions.revokeAllOtherSessionsAction.mockResolvedValue({ success: 'other_sessions_revoked' });
    actions.listMySessions.mockResolvedValue([sessions[1]]);
    render(
      <SessionsTabClient
        sessions={sessions}
        currentSessionId="current"
        locale="en"
        labels={labels}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Revoke others' }));
    await waitFor(() => expect(screen.getAllByTestId('session-item')).toHaveLength(1));
    expect(screen.getByText('Others revoked')).toBeTruthy();
  });

  it('preserves visible rows and reports a refresh failure', async () => {
    actions.revokeAllOtherSessionsAction.mockResolvedValue({ success: 'other_sessions_revoked' });
    actions.listMySessions.mockRejectedValue(new Error('synthetic database detail'));
    render(
      <SessionsTabClient
        sessions={sessions}
        currentSessionId="current"
        locale="en"
        labels={labels}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Revoke others' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe(labels.error));
    expect(screen.getAllByTestId('session-item')).toHaveLength(2);
    expect(screen.queryByText('synthetic database detail')).toBeNull();
  });

  it.each(['single', 'others'] as const)(
    'reports a rejected %s action without dropping rows',
    async (target) => {
      actions.revokeSessionAction.mockRejectedValue(new Error('transport detail'));
      actions.revokeAllOtherSessionsAction.mockRejectedValue(new Error('transport detail'));
      render(
        <SessionsTabClient
          sessions={sessions}
          currentSessionId="current"
          locale="en"
          labels={labels}
        />,
      );
      fireEvent.click(
        target === 'single' ?
          screen.getAllByRole('button', { name: 'Revoke' })[0]!
        : screen.getByRole('button', { name: 'Revoke others' }),
      );
      await waitFor(() => expect(screen.getByRole('alert').textContent).toBe(labels.error));
      expect(screen.getAllByTestId('session-item')).toHaveLength(2);
      expect(actions.listMySessions).not.toHaveBeenCalled();
    },
  );
});
