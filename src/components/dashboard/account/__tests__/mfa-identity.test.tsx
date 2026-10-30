import { act, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  account: 'A' as string | null,
  listFactors: vi.fn(),
  rpc: vi.fn(),
}));
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/components/providers/query-provider', () => ({
  useIdentityQueryKey: (resource: string) => ({
    scope:
      mocks.account ?
        { userId: mocks.account, accountId: mocks.account, impersonatedBy: null }
      : null,
    queryKey: ['identity', mocks.account ?? 'unresolved', mocks.account ?? '', '', resource],
  }),
}));
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: { mfa: { listFactors: mocks.listFactors } }, rpc: mocks.rpc }),
}));
vi.mock('@/app/[locale]/dashboard/account/actions', () => ({
  generateRecoveryCodesAction: vi.fn(),
}));
import { MfaSetup } from '../mfa-setup';

describe('MFA identity state', () => {
  beforeEach(() => {
    mocks.account = 'A';
    vi.clearAllMocks();
    mocks.listFactors.mockImplementation(async () => ({
      data: {
        all:
          mocks.account === 'A' ?
            [{ id: 'factor-A', factor_type: 'totp', status: 'verified' }]
          : [],
      },
      error: null,
    }));
    mocks.rpc.mockImplementation(async () =>
      mocks.account === 'A' ? { data: 7 } : { data: null, error: new Error('unavailable') },
    );
  });
  it('does not retain A factors or recovery count when B has no factor and its count fails', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    });
    const { rerender } = render(
      <QueryClientProvider client={client}>
        <MfaSetup />
      </QueryClientProvider>,
    );
    await waitFor(() => expect(screen.getByText('status_enabled')).toBeTruthy());
    await waitFor(() => expect(screen.getByRole('button', { name: 'regenerate' })).toBeTruthy());
    mocks.account = 'B';
    rerender(
      <QueryClientProvider client={client}>
        <MfaSetup />
      </QueryClientProvider>,
    );
    await waitFor(() => expect(screen.getByRole('button', { name: 'generate' })).toBeTruthy());
    expect(screen.queryByText('status_enabled')).toBeNull();
    expect(screen.queryByRole('button', { name: 'regenerate' })).toBeNull();
  });
  it('does not fetch or show MFA state without verified claims', async () => {
    mocks.account = null;
    const client = new QueryClient();
    render(
      <QueryClientProvider client={client}>
        <MfaSetup />
      </QueryClientProvider>,
    );
    await act(async () => {});
    expect(mocks.listFactors).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(screen.queryByText('mfa_heading')).toBeNull();
  });
});
