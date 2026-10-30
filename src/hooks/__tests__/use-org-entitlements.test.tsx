import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mocks = vi.hoisted(() => ({
  getOrgEntitlements: vi.fn(),
  claims: { sub: 'user', app_metadata: { account_id: 'account' } } as {
    sub: string;
    app_metadata: { account_id: string };
  } | null,
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
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  }),
}));

vi.mock('@/app/[locale]/dashboard/org/settings/actions-entitlements', () => ({
  getOrgEntitlements: mocks.getOrgEntitlements,
}));

import { useOrgEntitlements } from '../use-org-entitlements';
import { IdentityScopeProvider } from '@/components/providers/query-provider';

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={client}>
      <IdentityScopeProvider scope={{ userId: 'user', accountId: 'account', impersonatedBy: null }}>
        {children}
      </IdentityScopeProvider>
    </QueryClientProvider>
  );
}

describe('useOrgEntitlements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.claims = { sub: 'user', app_metadata: { account_id: 'account' } };
  });

  it('does not request entitlements outside a verified identity boundary', async () => {
    const client = new QueryClient();
    const { result } = renderHook(() => useOrgEntitlements(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    });
    expect(result.current.data).toBeUndefined();
    expect(mocks.getOrgEntitlements).not.toHaveBeenCalled();
  });

  it('should return the entitlements of the active account', async () => {
    mocks.getOrgEntitlements.mockResolvedValue({
      data: { planSlug: 'pro', features: { webhooks_enabled: true }, limits: { api_keys_max: 20 } },
    });
    const { result } = renderHook(() => useOrgEntitlements(), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.planSlug).toBe('pro');
  });

  it('should surface an error when the server action fails', async () => {
    mocks.getOrgEntitlements.mockResolvedValue({ data: null, error: 'no_active_account' });
    const { result } = renderHook(() => useOrgEntitlements(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
