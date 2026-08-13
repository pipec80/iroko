import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  getActiveAccountId: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock('@/lib/active-account', () => ({ getActiveAccountId: mocks.getActiveAccountId }));
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({ rpc: mocks.rpc }),
}));
vi.mock('@sentry/nextjs', () => ({ withScope: vi.fn(), captureException: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { getOrgInfo, updateOrgInfo } from '../actions-info';

describe('getOrgInfo', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return the info of the active account', async () => {
    mocks.getActiveAccountId.mockResolvedValue('acc-1');
    mocks.rpc.mockResolvedValue({
      data: [
        {
          account_id: 'acc-1',
          name: 'Acme',
          slug: 'acme',
          website: 'https://acme.com',
          country: 'Chile',
        },
      ],
      error: null,
    });
    const res = await getOrgInfo();
    expect(res.data).toEqual({
      name: 'Acme',
      slug: 'acme',
      website: 'https://acme.com',
      country: 'Chile',
    });
  });

  it('should default null website/country to empty string', async () => {
    mocks.getActiveAccountId.mockResolvedValue('acc-1');
    mocks.rpc.mockResolvedValue({
      data: [{ account_id: 'acc-1', name: 'Acme', slug: 'acme', website: null, country: null }],
      error: null,
    });
    const res = await getOrgInfo();
    expect(res.data?.website).toBe('');
    expect(res.data?.country).toBe('');
  });

  it('should return an error when there is no active account', async () => {
    mocks.getActiveAccountId.mockResolvedValue(null);
    const res = await getOrgInfo();
    expect(res.data).toBeNull();
    expect(res.error).toBe('no_active_account');
  });
});

describe('updateOrgInfo', () => {
  beforeEach(() => vi.clearAllMocks());

  function formData(fields: Record<string, string>): FormData {
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields)) fd.set(k, v);
    return fd;
  }

  it('should reject an empty name', async () => {
    const fd = formData({ name: '', slug: 'acme', website: '', country: '' });
    const res = await updateOrgInfo({}, fd);
    expect(res.error).toBe('name_required');
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('should reject a slug with invalid characters', async () => {
    const fd = formData({ name: 'Acme', slug: 'Acme Inc!', website: '', country: '' });
    const res = await updateOrgInfo({}, fd);
    expect(res.error).toBe('slug_invalid_format');
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('should reject an invalid website URL', async () => {
    const fd = formData({ name: 'Acme', slug: 'acme', website: 'not-a-url', country: '' });
    const res = await updateOrgInfo({}, fd);
    expect(res.error).toBe('website_invalid');
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('should allow an empty website', async () => {
    mocks.getActiveAccountId.mockResolvedValue('acc-1');
    mocks.rpc.mockResolvedValue({ error: null });
    const fd = formData({ name: 'Acme', slug: 'acme', website: '', country: '' });
    const res = await updateOrgInfo({}, fd);
    expect(res.success).toBe('info_updated');
  });

  it('should call update_account_info with the parsed fields', async () => {
    mocks.getActiveAccountId.mockResolvedValue('acc-1');
    mocks.rpc.mockResolvedValue({ error: null });
    const fd = formData({
      name: 'Acme',
      slug: 'acme-inc',
      website: 'https://acme.com',
      country: 'Chile',
    });
    const res = await updateOrgInfo({}, fd);
    expect(mocks.rpc).toHaveBeenCalledWith('update_account_info', {
      p_account_id: 'acc-1',
      p_name: 'Acme',
      p_slug: 'acme-inc',
      p_website: 'https://acme.com',
      p_country: 'Chile',
    });
    expect(res.success).toBe('info_updated');
  });

  it('should map a slug_taken RPC error', async () => {
    mocks.getActiveAccountId.mockResolvedValue('acc-1');
    mocks.rpc.mockResolvedValue({ error: { message: 'slug_taken', code: 'P0001' } });
    const fd = formData({ name: 'Acme', slug: 'acme', website: '', country: '' });
    const res = await updateOrgInfo({}, fd);
    expect(res.error).toBe('slug_taken');
  });

  it('should fall back to update_failed for unknown RPC errors', async () => {
    mocks.getActiveAccountId.mockResolvedValue('acc-1');
    mocks.rpc.mockResolvedValue({ error: { message: 'boom', code: 'XX000' } });
    const fd = formData({ name: 'Acme', slug: 'acme', website: '', country: '' });
    const res = await updateOrgInfo({}, fd);
    expect(res.error).toBe('update_failed');
  });

  it('should return an error when there is no active account', async () => {
    mocks.getActiveAccountId.mockResolvedValue(null);
    const fd = formData({ name: 'Acme', slug: 'acme', website: '', country: '' });
    const res = await updateOrgInfo({}, fd);
    expect(res.error).toBe('no_active_account');
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
