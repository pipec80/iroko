import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

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
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.setAuth.mockResolvedValue(undefined);
  });

  it('does not subscribe after cleanup wins the setAuth race', async () => {
    let resolveAuth!: () => void;
    mocks.setAuth.mockImplementationOnce(
      () => new Promise<void>((resolve) => (resolveAuth = resolve)),
    );
    const { unmount } = renderHook(() => usePresence('acc-1', 'user-1'));
    unmount();
    await act(async () => resolveAuth());
    expect(mocks.channel.subscribe).not.toHaveBeenCalled();
    expect(mocks.removeChannel).toHaveBeenCalledWith(mocks.channel);
  });

  it('does not subscribe or reject unhandled when realtime auth fails', async () => {
    mocks.setAuth.mockRejectedValueOnce(new Error('synthetic auth failure'));
    renderHook(() => usePresence('acc-1', 'user-1'));
    await act(async () => {});
    expect(mocks.channel.subscribe).not.toHaveBeenCalled();
  });

  it('keeps the replacement account channel when old auth resolves late', async () => {
    const makeChannel = () => ({
      state: 'closed',
      track: vi.fn(),
      presenceState: vi.fn().mockReturnValue({}),
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    });
    const oldChannel = makeChannel();
    const newChannel = makeChannel();
    mocks.channelFn.mockReturnValueOnce(oldChannel).mockReturnValueOnce(newChannel);
    let resolveOld!: () => void;
    mocks.setAuth.mockImplementationOnce(
      () => new Promise<void>((resolve) => (resolveOld = resolve)),
    );

    const { rerender } = renderHook(({ accountId }) => usePresence(accountId, 'user-1'), {
      initialProps: { accountId: 'acc-1' },
    });
    rerender({ accountId: 'acc-2' });
    await act(async () => resolveOld());

    expect(oldChannel.subscribe).not.toHaveBeenCalled();
    expect(newChannel.subscribe).toHaveBeenCalledOnce();
    expect(mocks.removeChannel).toHaveBeenCalledWith(oldChannel);
    expect(mocks.removeChannel).not.toHaveBeenCalledWith(newChannel);
  });

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

  it('hides old account presence immediately when account identity changes', async () => {
    mocks.channel.presenceState.mockReturnValue({ 'user-from-old-account': [{}] });
    let syncCallback: (() => void) | undefined;
    mocks.channel.on.mockImplementation((event: string, _filter: unknown, cb?: () => void) => {
      if (event === 'presence') syncCallback = cb;
      return mocks.channel;
    });
    const { result, rerender } = renderHook(({ accountId }) => usePresence(accountId, 'user-1'), {
      initialProps: { accountId: 'old-account' },
    });
    await waitFor(() => expect(syncCallback).toBeDefined());
    act(() => syncCallback?.());
    expect(result.current.onlineUserIds.has('user-from-old-account')).toBe(true);

    rerender({ accountId: 'new-account' });
    expect(result.current.onlineUserIds.has('user-from-old-account')).toBe(false);
  });
});
