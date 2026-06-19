import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  const insertResult = { current: { error: null as Error | null } };
  const insert = vi.fn().mockImplementation(() => Promise.resolve(insertResult.current));
  const from = vi.fn().mockReturnValue({ insert });
  const mockGetUserById = vi.fn();
  const mockSendNotificationEmail = vi.fn();
  return { from, insert, insertResult, mockGetUserById, mockSendNotificationEmail };
});

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn().mockReturnValue({
    from: mocks.from,
    auth: { admin: { getUserById: mocks.mockGetUserById } },
  }),
}));

vi.mock('@/lib/email', () => ({
  sendNotificationEmail: mocks.mockSendNotificationEmail,
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

  it('envía email cuando emailDelivery es true y el usuario tiene email', async () => {
    mocks.insertResult.current = { error: null };
    mocks.mockGetUserById.mockResolvedValue({
      data: { user: { email: 'user@example.com' } },
      error: null,
    });

    mocks.mockSendNotificationEmail.mockResolvedValue(undefined as unknown);

    await notify(USER_ID, {
      type: 'info',
      title: 'Título',
      body: 'Cuerpo',
      emailDelivery: true,
    });

    expect(mocks.mockSendNotificationEmail).toHaveBeenCalledWith('user@example.com', {
      type: 'info',
      title: 'Título',
      body: 'Cuerpo',
      link: undefined,
    });
  });

  it('NO envía email cuando emailDelivery es false o no se pasa', async () => {
    mocks.insertResult.current = { error: null };

    await notify(USER_ID, { type: 'info', title: 'Título' });

    expect(mocks.mockSendNotificationEmail).not.toHaveBeenCalled();
  });

  it('loguea el error pero no lanza si sendNotificationEmail falla', async () => {
    mocks.insertResult.current = { error: null };
    mocks.mockGetUserById.mockResolvedValue({
      data: { user: { email: 'user@example.com' } },
      error: null,
    });
    mocks.mockSendNotificationEmail.mockRejectedValue(new Error('Resend down'));

    await expect(
      notify(USER_ID, { type: 'error', title: 'Error', emailDelivery: true }),
    ).resolves.toBeUndefined();
  });

  it('loguea el error pero no lanza si getUserById falla', async () => {
    mocks.insertResult.current = { error: null };
    mocks.mockGetUserById.mockRejectedValue(new Error('Auth admin unavailable'));

    const { logger } = await import('@/lib/logger');
    await expect(
      notify('user-id-123', { type: 'info', title: 'Título', emailDelivery: true }),
    ).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalled();
  });
});
