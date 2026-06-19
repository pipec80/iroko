import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockSend } = vi.hoisted(() => {
  const mockSend = vi.fn();
  return { mockSend };
});

vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(function () {
    return { emails: { send: mockSend } };
  }),
}));

vi.mock('@/env', () => ({
  env: {
    RESEND_API_KEY: 're_test_key',
    FROM_EMAIL: 'noreply@test.com',
    SITE_URL: 'http://localhost:3000',
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

vi.mock('@/lib/email/templates/welcome', () => ({
  WelcomeEmail: vi.fn().mockReturnValue(null),
}));

vi.mock('@/lib/email/templates/invitation', () => ({
  InvitationEmail: vi.fn().mockReturnValue(null),
}));

vi.mock('@/lib/email/templates/notification', () => ({
  NotificationEmail: vi.fn().mockReturnValue(null),
}));

describe('sendEmail', () => {
  beforeEach(() => {
    mockSend.mockReset();
  });

  it('llama a Resend con los parámetros correctos', async () => {
    mockSend.mockResolvedValue({ data: { id: 'email-1' }, error: null });
    const { sendEmail } = await import('@/lib/email');
    const fakeElement = { type: 'div', props: {}, key: null } as unknown as React.ReactElement;

    await sendEmail('user@example.com', 'Asunto', fakeElement);

    expect(mockSend).toHaveBeenCalledWith({
      from: 'noreply@test.com',
      to: 'user@example.com',
      subject: 'Asunto',
      react: fakeElement,
    });
  });

  it('lanza error y loguea cuando Resend falla', async () => {
    mockSend.mockResolvedValue({ data: null, error: { message: 'API error' } });
    const { sendEmail } = await import('@/lib/email');
    const { logger } = await import('@/lib/logger');
    const fakeElement = { type: 'div', props: {}, key: null } as unknown as React.ReactElement;

    await expect(sendEmail('user@example.com', 'Asunto', fakeElement)).rejects.toThrow('API error');
    expect(logger.error).toHaveBeenCalled();
  });

  it('sendWelcomeEmail llama a sendEmail con subject correcto', async () => {
    mockSend.mockResolvedValue({ data: { id: 'email-2' }, error: null });
    const { sendWelcomeEmail } = await import('@/lib/email');

    await sendWelcomeEmail('alice@example.com', 'Alice');

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'alice@example.com',
        subject: expect.stringContaining('Iroko'),
      }),
    );
  });

  it('sendInvitationEmail llama a sendEmail con el inviteUrl en subject o body', async () => {
    mockSend.mockResolvedValue({ data: { id: 'email-3' }, error: null });
    const { sendInvitationEmail } = await import('@/lib/email');

    await sendInvitationEmail('bob@example.com', {
      inviterEmail: 'admin@example.com',
      teamRole: 'member',
      inviteUrl: 'http://localhost:3000/es/auth/accept-invitation?token=abc123',
    });

    expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({ to: 'bob@example.com' }));
  });

  it('sendNotificationEmail llama a sendEmail con los datos de la notificación', async () => {
    mockSend.mockResolvedValue({ data: { id: 'email-4' }, error: null });
    const { sendNotificationEmail } = await import('@/lib/email');

    await sendNotificationEmail('carol@example.com', {
      type: 'info',
      title: 'Tu archivo está listo',
      body: 'Descárgalo aquí',
      link: '/files/123',
    });

    expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({ to: 'carol@example.com' }));
  });
});
