import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  getActiveAccountId: vi.fn(),
  rpc: vi.fn(),
  storageUpload: vi.fn(),
  storageRemove: vi.fn(),
}));

vi.mock('@/lib/active-account', () => ({ getActiveAccountId: mocks.getActiveAccountId }));
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    rpc: mocks.rpc,
    storage: {
      from: () => ({ upload: mocks.storageUpload, remove: mocks.storageRemove }),
    },
  }),
}));
vi.mock('@sentry/nextjs', () => ({ withScope: vi.fn(), captureException: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { getOrgLogo, updateOrgLogo, removeOrgLogo } from '../actions-logo';

describe('getOrgLogo', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return the logo path of the active account', async () => {
    mocks.getActiveAccountId.mockResolvedValue('acc-1');
    mocks.rpc.mockResolvedValue({
      data: [{ account_id: 'acc-1', logo_url: 'org-assets/acc-1/logo.png' }],
      error: null,
    });
    const res = await getOrgLogo();
    expect(res.data?.logoUrl).toBe('org-assets/acc-1/logo.png');
  });

  it('should return an error when there is no active account', async () => {
    mocks.getActiveAccountId.mockResolvedValue(null);
    const res = await getOrgLogo();
    expect(res.data).toBeNull();
    expect(res.error).toBe('no_active_account');
  });
});

describe('updateOrgLogo', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return no_file when no file is provided', async () => {
    const fd = new FormData();
    const res = await updateOrgLogo({}, fd);
    expect(res.error).toBe('no_file');
  });

  it('should upload and persist the logo path', async () => {
    mocks.getActiveAccountId.mockResolvedValue('acc-1');
    mocks.storageUpload.mockResolvedValue({ error: null });
    mocks.rpc.mockResolvedValue({ error: null });
    const file = new File(['x'], 'logo.png', { type: 'image/png' });
    const fd = new FormData();
    fd.set('logo', file);
    const res = await updateOrgLogo({}, fd);
    expect(mocks.rpc).toHaveBeenCalledWith('set_account_logo', {
      p_account_id: 'acc-1',
      p_path: 'org-assets/acc-1/logo.png',
    });
    expect(res.success).toBe('logo_updated');
  });
});

describe('removeOrgLogo', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should clear the logo path', async () => {
    mocks.getActiveAccountId.mockResolvedValue('acc-1');
    mocks.rpc.mockResolvedValue({ error: null });
    const res = await removeOrgLogo();
    expect(mocks.rpc).toHaveBeenCalledWith('set_account_logo', {
      p_account_id: 'acc-1',
    });
    expect(res.success).toBe('logo_removed');
  });
});
