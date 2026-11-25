import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  config: { features: { billing: true } },
  account: vi.fn(),
  rpc: vi.fn(),
}));
vi.mock('@/config/app.config', () => ({ appConfig: mocks.config }));
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_HTTP_ERROR_FALLBACK;404');
  },
}));
vi.mock('next-intl/server', () => ({
  getTranslations: async () => (key: string) => key,
  setRequestLocale: vi.fn(),
}));
vi.mock('@/lib/active-account', () => ({
  getActiveAccountId: mocks.account,
}));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ rpc: mocks.rpc }) }));
vi.mock('@/components/dashboard/org/billing-tab', () => ({ BillingTab: () => null }));
import BillingPage from '../page';
describe('billing page availability', () => {
  beforeEach(() => {
    mocks.config.features.billing = true;
    mocks.account.mockReset().mockResolvedValue('qa-account');
    mocks.rpc.mockReset().mockResolvedValue({ data: 'owner', error: null });
  });
  it('rejects a direct URL before fetching account data when billing is disabled', async () => {
    mocks.config.features.billing = false;
    await expect(BillingPage({ params: Promise.resolve({ locale: 'es' }) })).rejects.toThrow(
      'NEXT_HTTP_ERROR_FALLBACK;404',
    );
    expect(mocks.account).not.toHaveBeenCalled();
  });
  it.each(['owner', 'admin'])('allows %s to open the enabled billing route', async (role) => {
    mocks.rpc.mockResolvedValue({ data: role, error: null });
    await expect(BillingPage({ params: Promise.resolve({ locale: 'es' }) })).resolves.toBeDefined();
    expect(mocks.rpc).toHaveBeenCalledWith('get_my_account_role', { p_account_id: 'qa-account' });
  });
  it.each(['member', 'viewer'])('denies %s access to the enabled billing route', async (role) => {
    mocks.rpc.mockResolvedValue({ data: role, error: null });
    await expect(BillingPage({ params: Promise.resolve({ locale: 'es' }) })).rejects.toThrow(
      'NEXT_HTTP_ERROR_FALLBACK;404',
    );
  });
});
