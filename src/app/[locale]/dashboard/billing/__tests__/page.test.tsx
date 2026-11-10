import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  config: { features: { billing: true } },
  account: vi.fn(),
  role: vi.fn(),
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
  getActiveAccountRole: mocks.role,
}));
vi.mock('@/components/dashboard/org/billing-tab', () => ({ BillingTab: () => null }));
import BillingPage from '../page';
describe('billing page availability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.config.features.billing = true;
  });
  it('rejects a direct URL before fetching account data when billing is disabled', async () => {
    mocks.config.features.billing = false;
    await expect(BillingPage({ params: Promise.resolve({ locale: 'es' }) })).rejects.toThrow(
      'NEXT_HTTP_ERROR_FALLBACK;404',
    );
    expect(mocks.account).not.toHaveBeenCalled();
  });
  it('keeps the billing route available when enabled', async () => {
    await expect(BillingPage({ params: Promise.resolve({ locale: 'es' }) })).resolves.toBeDefined();
  });
});
