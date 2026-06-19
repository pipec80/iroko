import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ── Mocks ──────────────────────────────────────────────────────────────────

const mocks = vi.hoisted(() => {
  // Resultado de la query inicial
  const queryResult = {
    current: { data: [] as unknown[], error: null as Error | null },
  };

  // Resultado de rpc mark_notifications_read
  const rpcResult = { current: { error: null as Error | null } };

  // Canal Realtime simulado
  const channel = {
    state: 'closed' as string,
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockImplementation(function (this: { state: string }) {
      this.state = 'joined';
      return this;
    }),
  };

  const setAuth = vi.fn().mockImplementation(async () => {});
  const removeChannel = vi.fn().mockImplementation(async () => {});

  const selectBuilder = {
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockImplementation(() => Promise.resolve(queryResult.current)),
  };

  const from = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue(selectBuilder) });
  const rpc = vi.fn().mockImplementation(() => Promise.resolve(rpcResult.current));
  const channelFn = vi.fn().mockReturnValue(channel);

  return {
    queryResult,
    rpcResult,
    channel,
    from,
    rpc,
    channelFn,
    setAuth,
    removeChannel,
    selectBuilder,
  };
});

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn().mockReturnValue({
    from: mocks.from,
    rpc: mocks.rpc,
    channel: mocks.channelFn,
    realtime: { setAuth: mocks.setAuth },
    removeChannel: mocks.removeChannel,
  }),
}));

import { useNotifications } from '../use-notifications';
import type { Notification } from '../use-notifications';

const USER_ID = 'user-uuid-abc';

const MOCK_NOTIF: Notification = {
  id: 'notif-1',
  type: 'info',
  title: 'Bienvenido',
  body: null,
  link: null,
  read_at: null,
  created_at: '2026-06-18T10:00:00Z',
};

// ── Tests ──────────────────────────────────────────────────────────────────

describe('useNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.queryResult.current = { data: [], error: null };
    mocks.rpcResult.current = { error: null };
    mocks.channel.state = 'closed';
  });

  it('should load initial notifications on mount', async () => {
    mocks.queryResult.current = { data: [MOCK_NOTIF], error: null };

    const { result } = renderHook(() => useNotifications(USER_ID));

    // Esperar a que se resuelva el efecto asíncrono
    await act(async () => {});

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0]!.id).toBe('notif-1');
  });

  it('should report unreadCount = 0 when all notifications are read', async () => {
    mocks.queryResult.current = {
      data: [{ ...MOCK_NOTIF, read_at: '2026-06-18T11:00:00Z' }],
      error: null,
    };

    const { result } = renderHook(() => useNotifications(USER_ID));
    await act(async () => {});

    expect(result.current.unreadCount).toBe(0);
  });

  it('should report unreadCount = 1 when one notification is unread', async () => {
    mocks.queryResult.current = { data: [MOCK_NOTIF], error: null };

    const { result } = renderHook(() => useNotifications(USER_ID));
    await act(async () => {});

    expect(result.current.unreadCount).toBe(1);
  });

  it('should subscribe to the correct realtime channel', async () => {
    renderHook(() => useNotifications(USER_ID));
    await act(async () => {});

    expect(mocks.channelFn).toHaveBeenCalledWith(
      `user:${USER_ID}:notifications`,
      expect.objectContaining({ config: expect.objectContaining({ private: true }) }),
    );
    expect(mocks.channel.on).toHaveBeenCalledWith(
      'broadcast',
      { event: 'notification_created' },
      expect.any(Function),
    );
  });

  it('should mark notifications as read via RPC and update local state', async () => {
    mocks.queryResult.current = { data: [MOCK_NOTIF], error: null };

    const { result } = renderHook(() => useNotifications(USER_ID));
    await act(async () => {});

    await act(async () => {
      await result.current.markAsRead(['notif-1']);
    });

    expect(mocks.rpc).toHaveBeenCalledWith('mark_notifications_read', { p_ids: ['notif-1'] });
    expect(result.current.notifications[0]!.read_at).not.toBeNull();
    expect(result.current.unreadCount).toBe(0);
  });

  it('should cleanup the realtime channel on unmount', async () => {
    const { unmount } = renderHook(() => useNotifications(USER_ID));
    await act(async () => {});

    unmount();

    expect(mocks.removeChannel).toHaveBeenCalled();
  });
});
