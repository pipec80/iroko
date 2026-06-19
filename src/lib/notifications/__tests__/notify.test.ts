import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  const insertResult = { current: { error: null as Error | null } };
  const insert = vi.fn().mockImplementation(() => Promise.resolve(insertResult.current));
  const from = vi.fn().mockReturnValue({ insert });
  return { from, insert, insertResult };
});

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn().mockReturnValue({ from: mocks.from }),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { notify } from '../index';

const USER_ID = 'user-uuid-123';

describe('notify', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.insertResult.current = { error: null };
  });

  it('should insert a notification with type, title, body and link', async () => {
    await notify(USER_ID, {
      type: 'success',
      title: 'Invitación enviada',
      body: 'pipec@example.com ha recibido la invitación.',
      link: '/es/dashboard/members',
    });

    expect(mocks.from).toHaveBeenCalledWith('notifications');
    expect(mocks.insert).toHaveBeenCalledWith({
      user_id: USER_ID,
      type: 'success',
      title: 'Invitación enviada',
      body: 'pipec@example.com ha recibido la invitación.',
      link: '/es/dashboard/members',
    });
  });

  it('should insert a notification without optional body and link', async () => {
    await notify(USER_ID, { type: 'info', title: 'Bienvenido' });

    expect(mocks.insert).toHaveBeenCalledWith({
      user_id: USER_ID,
      type: 'info',
      title: 'Bienvenido',
      body: undefined,
      link: undefined,
    });
  });

  it('should throw and log when Supabase returns an error', async () => {
    const { logger } = await import('@/lib/logger');
    mocks.insertResult.current = { error: new Error('insert_failed') };

    await expect(notify(USER_ID, { type: 'error', title: 'Algo salió mal' })).rejects.toThrow(
      'insert_failed',
    );

    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ userId: USER_ID, action: 'notify' }),
      'insert_failed',
    );
  });
});
