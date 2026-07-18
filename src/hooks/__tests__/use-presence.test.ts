import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const mocks = vi.hoisted(() => {
  const channel = {
    state: 'closed' as string,
    track: vi.fn().mockResolvedValue({ status: 'ok' }),
    presenceState: vi.fn().mockReturnValue({}),
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockImplementation(function (
      this: { state: string },
      cb?: (status: string) => void,
    ) {
      this.state = 'joined';
      cb?.('SUBSCRIBED');
      return this;
    }),
  };
  const setAuth = vi.fn(async () => {});
  const removeChannel = vi.fn().mockResolvedValue('ok');
  const channelFn = vi.fn().mockReturnValue(channel);
  return { channel, setAuth, removeChannel, channelFn };
});

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    channel: mocks.channelFn,
    realtime: { setAuth: mocks.setAuth },
    removeChannel: mocks.removeChannel,
  }),
}));

import { usePresence } from '../use-presence';

describe('usePresence', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should subscribe to the account presence channel and track its own userId', async () => {
    renderHook(() => usePresence('acc-1', 'user-1'));
    await waitFor(() => expect(mocks.channel.subscribe).toHaveBeenCalled());
    await waitFor(() => expect(mocks.channel.track).toHaveBeenCalledWith({ userId: 'user-1' }));
    expect(mocks.channelFn).toHaveBeenCalledWith('account:acc-1:presence', {
      config: { private: true, presence: { key: 'user-1' } },
    });
  });

  it('should populate onlineUserIds from presence_state on sync', async () => {
    mocks.channel.presenceState.mockReturnValue({ 'user-2': [{}] });
    let syncCallback: (() => void) | undefined;
    mocks.channel.on.mockImplementation((event: string, filterOrCb: unknown, cb?: () => void) => {
      if (event === 'presence' && typeof filterOrCb === 'object') syncCallback = cb;
      return mocks.channel;
    });
    const { result } = renderHook(() => usePresence('acc-1', 'user-1'));
    await waitFor(() => expect(mocks.channel.subscribe).toHaveBeenCalled());
    syncCallback?.();
    await waitFor(() => expect(result.current.onlineUserIds.has('user-2')).toBe(true));
  });
});
