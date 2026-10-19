import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ link: '' }));
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/lib/logger-client', () => ({ logClient: { error: vi.fn() } }));
vi.mock('@/hooks/use-inbox-items', () => ({
  useInboxItems: () => ({
    unreadCount: 0,
    markAllRead: vi.fn(),
    items: [
      {
        kind: 'announcement',
        data: {
          id: '1',
          type: 'info',
          title: 'Historical notice',
          body: 'Preserved message',
          link: state.link,
        },
      },
    ],
  }),
}));
vi.mock('@/components/ui/dropdown-menu', () => {
  const Container = ({ children }: { children: ReactNode }) => <div>{children}</div>;
  return {
    DropdownMenu: Container,
    DropdownMenuTrigger: Container,
    DropdownMenuContent: Container,
  };
});

import { NotificationBell } from './notification-bell';

describe('notification navigation rendering', () => {
  it.each(['javascript:alert(1)', '//evil.example', '/a/..//evil.example'])(
    'preserves unsafe historical message %s without a link',
    (link) => {
      state.link = link;
      render(<NotificationBell userId="local-user" />);
      expect(screen.getByText('Historical notice').textContent).toBe('Historical notice');
      expect(screen.getByText('Preserved message').textContent).toBe('Preserved message');
      expect(screen.queryByRole('link')).toBeNull();
    },
  );

  it('renders a canonical safe href for a historical announcement', () => {
    state.link = '/a/../es/café';
    render(<NotificationBell userId="local-user" />);
    expect(screen.getByRole('link').getAttribute('href')).toBe('/es/caf%C3%A9');
  });
});
