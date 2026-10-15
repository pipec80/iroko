import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getClaims: vi.fn(),
  rpc: vi.fn(),
  from: vi.fn(),
  list: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
  redirect: vi.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
}));

vi.mock('next/navigation', () => ({ notFound: mocks.notFound, redirect: mocks.redirect }));
vi.mock('@/config/app.config', () => ({
  appConfig: { brand: 'Iroko', features: { verticals: { robot: true } } },
}));
vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.createClient }));
vi.mock('@/components/dashboard/robot/excel-upload', () => ({ ExcelUploadDropzone: () => null }));
vi.mock('@/components/dashboard/robot/robot-data-viewer', () => ({ RobotDataViewer: () => null }));

import { appConfig } from '@/config/app.config';
import RobotConfigPage from '../page';

describe('RobotConfigPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    appConfig.features.verticals.robot = true;
    mocks.getClaims.mockResolvedValue({
      data: {
        claims: { sub: 'user-a', app_metadata: { account_id: 'account-a', role: 'member' } },
      },
    });
    mocks.rpc.mockResolvedValue({ data: 'viewer', error: null });
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [] }),
    };
    mocks.from.mockReturnValue(query);
    mocks.list.mockResolvedValue({ data: [] });
    mocks.createClient.mockResolvedValue({
      auth: { getClaims: mocks.getClaims },
      rpc: mocks.rpc,
      from: mocks.from,
      storage: { from: () => ({ list: mocks.list }) },
    });
  });

  it('returns notFound when disabled before creating a client', async () => {
    appConfig.features.verticals.robot = false;
    await expect(RobotConfigPage()).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mocks.createClient).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.list).not.toHaveBeenCalled();
  });

  it.each([null, 'unexpected'])(
    'denies a non-live membership %s before reading data',
    async (role) => {
      mocks.rpc.mockResolvedValue({ data: role, error: null });
      await expect(RobotConfigPage()).rejects.toThrow('NEXT_NOT_FOUND');
      expect(mocks.from).not.toHaveBeenCalled();
      expect(mocks.list).not.toHaveBeenCalled();
    },
  );

  it('allows a live viewer and scopes data to the active account', async () => {
    await expect(RobotConfigPage()).resolves.toBeDefined();
    expect(mocks.rpc).toHaveBeenCalledWith('get_my_account_role', { p_account_id: 'account-a' });
    expect(mocks.from).toHaveBeenCalledTimes(3);
    expect(mocks.from.mock.results[0]?.value.eq).toHaveBeenCalledWith('account_id', 'account-a');
    expect(mocks.list).toHaveBeenCalledWith('account-a', expect.any(Object));
  });
});
