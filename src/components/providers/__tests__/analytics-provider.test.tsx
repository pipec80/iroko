import { act, render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  claims: { sub: 'user-A', app_metadata: { account_id: 'account-A' } },
  callback: (() => {}) as () => void,
  identify: vi.fn(),
  group: vi.fn(),
  capture: vi.fn(),
  reset: vi.fn(),
  persist: vi.fn(),
  authCallbacks: [] as Array<() => void>,
}));
vi.mock('next/navigation', () => ({ usePathname: () => '/es/dashboard' }));
vi.mock('@/lib/cookie-consent', () => ({
  hasConsent: () => true,
  subscribeToConsent: () => () => {},
}));
vi.mock('@/lib/analytics/client', () => ({
  capturePageview: mocks.capture,
  identifyUser: mocks.identify,
  setAccountGroup: mocks.group,
  resetAnalytics: mocks.reset,
  initAnalytics: async () => {},
  isAnalyticsReady: () => true,
  disableAnalytics: vi.fn(),
  pauseCapturing: vi.fn(),
  resumeCapturing: vi.fn(),
}));
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getClaims: async () => ({ data: { claims: mocks.claims } }),
      onAuthStateChange: (callback: () => void) => {
        mocks.authCallbacks.push(callback);
        mocks.callback = callback;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
    },
    from: () => ({ update: () => ({ eq: mocks.persist }) }),
  }),
}));
import { AnalyticsProvider } from '../analytics-provider';

describe('analytics identity groups', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.claims = { sub: 'user-A', app_metadata: { account_id: 'account-A' } };
    mocks.authCallbacks = [];
    mocks.persist.mockResolvedValue({ error: null });
  });
  it('updates group for the same user without a duplicate identify', async () => {
    render(<AnalyticsProvider />);
    await waitFor(() => expect(mocks.group).toHaveBeenCalledWith('account-A'));
    mocks.claims = { sub: 'user-A', app_metadata: { account_id: 'account-B' } };
    await act(async () => mocks.callback());
    expect(mocks.group).toHaveBeenLastCalledWith('account-B');
    expect(mocks.identify).toHaveBeenCalledTimes(1);
  });
  it('clears prior person and group state before identifying a different user', async () => {
    render(<AnalyticsProvider />);
    await waitFor(() => expect(mocks.group).toHaveBeenCalledWith('account-A'));
    mocks.claims = { sub: 'user-B', app_metadata: { account_id: 'account-B' } };
    await act(async () => mocks.callback());
    expect(mocks.reset).toHaveBeenCalledTimes(1);
    expect(mocks.identify).toHaveBeenLastCalledWith('user-B');
    expect(mocks.reset.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.identify.mock.invocationCallOrder[1]!,
    );
  });
  it('rechecks account claims after a same-path Server Action transition without an Auth event', async () => {
    render(<AnalyticsProvider />);
    await waitFor(() => expect(mocks.group).toHaveBeenCalledWith('account-A'));
    mocks.claims = { sub: 'user-A', app_metadata: { account_id: 'account-B' } };
    await act(async () => {
      window.dispatchEvent(new Event('iroko:identity-scope-changed'));
    });
    expect(mocks.group).toHaveBeenLastCalledWith('account-B');
    expect(mocks.identify).toHaveBeenCalledTimes(1);
  });

  it('retries failed consent persistence on an Auth event without overwriting an impersonated target', async () => {
    mocks.persist.mockResolvedValueOnce({ error: { message: 'transient' } });
    render(<AnalyticsProvider />);
    await waitFor(() => expect(mocks.persist).toHaveBeenCalledTimes(1));
    await act(async () => mocks.authCallbacks[0]?.());
    await waitFor(() => expect(mocks.persist).toHaveBeenCalledTimes(2));

    mocks.claims = {
      sub: 'user-A',
      app_metadata: { account_id: 'account-A', impersonated_by: 'admin-A' },
    } as typeof mocks.claims;
    await act(async () => mocks.authCallbacks[0]?.());
    expect(mocks.persist).toHaveBeenCalledTimes(2);
  });
});
