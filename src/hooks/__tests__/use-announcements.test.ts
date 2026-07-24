import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ── Mocks ──────────────────────────────────────────────────────────────────

const mocks = vi.hoisted(() => {
  const queryResult = {
    current: { data: [] as unknown[], error: null as Error | null },
  };

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
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockImplementation(() => Promise.resolve(queryResult.current)),
  };

  const from = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue(selectBuilder) });
  const channelFn = vi.fn().mockReturnValue(channel);

  const storage = new Map<string, string>();

  return {
    queryResult,
    channel,
    from,
    channelFn,
    setAuth,
    removeChannel,
    selectBuilder,
    storage,
  };
});

vi.mock('@/lib/logger-client', () => ({
  logClient: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn().mockReturnValue({
    from: mocks.from,
    channel: mocks.channelFn,
    realtime: { setAuth: mocks.setAuth },
    removeChannel: mocks.removeChannel,
  }),
}));

import { useAnnouncements } from '../use-announcements';
import type { Announcement } from '../use-announcements';

const MOCK_ANNOUNCEMENT: Announcement = {
  id: 'ann-1',
  type: 'info',
  title: 'Mantenimiento programado',
  body: null,
  link: null,
  created_at: '2026-07-24T10:00:00Z',
};

// ── Tests ──────────────────────────────────────────────────────────────────

describe('useAnnouncements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.queryResult.current = { data: [], error: null };
    mocks.channel.state = 'closed';
    mocks.storage.clear();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => mocks.storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        mocks.storage.set(key, value);
      },
    });
  });

  it('should load recent announcements on mount', async () => {
    mocks.queryResult.current = { data: [MOCK_ANNOUNCEMENT], error: null };

    const { result } = renderHook(() => useAnnouncements());
    await act(async () => {});

    expect(result.current.announcements).toHaveLength(1);
    expect(result.current.announcements[0]?.id).toBe('ann-1');
  });

  it('should report unreadCount = announcements.length when nothing was seen before', async () => {
    mocks.queryResult.current = { data: [MOCK_ANNOUNCEMENT], error: null };

    const { result } = renderHook(() => useAnnouncements());
    await act(async () => {});

    expect(result.current.unreadCount).toBe(1);
  });

  it('should report unreadCount = 0 for announcements older than the stored cursor', async () => {
    mocks.storage.set('iroko:announcements:last_seen_at', '2026-07-25T00:00:00Z');
    mocks.queryResult.current = { data: [MOCK_ANNOUNCEMENT], error: null };

    const { result } = renderHook(() => useAnnouncements());
    await act(async () => {});

    expect(result.current.unreadCount).toBe(0);
  });

  it('should subscribe to the global platform:announcements channel', async () => {
    renderHook(() => useAnnouncements());
    await act(async () => {});

    expect(mocks.channelFn).toHaveBeenCalledWith(
      'platform:announcements',
      expect.objectContaining({ config: expect.objectContaining({ private: true }) }),
    );
    expect(mocks.channel.on).toHaveBeenCalledWith(
      'broadcast',
      { event: 'announcement_created' },
      expect.any(Function),
    );
  });

  it('should persist the cursor and zero out unreadCount when markAllSeen is called', async () => {
    mocks.queryResult.current = { data: [MOCK_ANNOUNCEMENT], error: null };

    const { result } = renderHook(() => useAnnouncements());
    await act(async () => {});
    expect(result.current.unreadCount).toBe(1);

    act(() => {
      result.current.markAllSeen();
    });

    expect(mocks.storage.get('iroko:announcements:last_seen_at')).toBe(
      MOCK_ANNOUNCEMENT.created_at,
    );
    expect(result.current.unreadCount).toBe(0);
  });

  it('should cleanup the realtime channel on unmount', async () => {
    const { unmount } = renderHook(() => useAnnouncements());
    await act(async () => {});

    unmount();

    expect(mocks.removeChannel).toHaveBeenCalled();
  });
});
