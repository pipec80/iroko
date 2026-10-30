import { act, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  claims: { sub: 'u', app_metadata: { account_id: 'A' } } as {
    sub: string;
    app_metadata: { account_id: string };
  } | null,
  callback: (() => {}) as () => void,
  router: { refresh: vi.fn() },
}));
vi.mock('next/navigation', () => ({
  usePathname: () => '/es/dashboard',
  useRouter: () => mocks.router,
}));
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getClaims: async () => ({ data: { claims: mocks.claims } }),
      onAuthStateChange: (callback: () => void) => {
        mocks.callback = callback;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
    },
  }),
}));
import { IdentityScopeProvider, useIdentityQueryKey } from '../query-provider';

describe('protected identity cache', () => {
  beforeEach(() => {
    mocks.claims = { sub: 'u', app_metadata: { account_id: 'A' } };
  });
  it('hides warm A while B fails and ignores late A results; logout disables protected requests', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const fetch = vi.fn(async (account: string) =>
      account === 'A' ? 'SECRET-A' : Promise.reject(new Error('unavailable')),
    );
    function Consumer() {
      const { scope, queryKey } = useIdentityQueryKey('api-keys');
      const { data } = useQuery({
        queryKey,
        enabled: !!scope,
        queryFn: () => fetch(scope!.accountId),
      });
      return <div>{scope ? (data ?? 'empty') : 'empty'}</div>;
    }
    const { rerender } = render(
      <QueryClientProvider client={client}>
        <IdentityScopeProvider scope={{ userId: 'u', accountId: 'A', impersonatedBy: null }}>
          <Consumer />
          <p>SERVER-A</p>
        </IdentityScopeProvider>
      </QueryClientProvider>,
    );
    await waitFor(() => expect(screen.getByText('SECRET-A')).toBeTruthy());
    mocks.claims = { sub: 'u', app_metadata: { account_id: 'B' } };
    await act(async () => mocks.callback());
    expect(screen.queryByText('SECRET-A')).toBeNull();
    expect(screen.getByText('SERVER-A').closest('[hidden]')).not.toBeNull();
    expect(mocks.router.refresh).toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalledWith('B');
    rerender(
      <QueryClientProvider client={client}>
        <IdentityScopeProvider scope={{ userId: 'u', accountId: 'B', impersonatedBy: null }}>
          <Consumer />
          <p>SERVER-B</p>
        </IdentityScopeProvider>
      </QueryClientProvider>,
    );
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('B'));
    client.setQueryData(['identity', 'u', 'A', '', 'api-keys'], 'LATE-A');
    expect(screen.queryByText('LATE-A')).toBeNull();
    mocks.claims = null;
    await act(async () => mocks.callback());
    const count = fetch.mock.calls.length;
    await act(async () => {
      await client.invalidateQueries();
    });
    expect(fetch).toHaveBeenCalledTimes(count);
    expect(screen.queryByText('SECRET-A')).toBeNull();
  });
});
