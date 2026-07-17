import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mocks = vi.hoisted(() => ({ getOrgEntitlements: vi.fn() }));

vi.mock('@/app/[locale]/dashboard/org/settings/actions-entitlements', () => ({
  getOrgEntitlements: mocks.getOrgEntitlements,
}));

import { useOrgEntitlements } from '../use-org-entitlements';

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useOrgEntitlements', () => {
  beforeEach(() => vi.clearAllMocks());

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
