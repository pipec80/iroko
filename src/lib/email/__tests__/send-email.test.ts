import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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

// El transporte local renderiza el template a HTML antes de mandarlo; acá solo
// interesa a dónde se entrega, no el markup.
vi.mock('@react-email/components', () => ({
  render: vi.fn(async () => '<html>rendered</html>'),
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

  it('sendInvitationEmail pasa el inviteUrl real al template React (no solo el to)', async () => {
    mockSend.mockResolvedValue({ data: { id: 'email-3' }, error: null });
    const { sendInvitationEmail } = await import('@/lib/email');

    await sendInvitationEmail('bob@example.com', {
      inviterEmail: 'admin@example.com',
      teamRole: 'member',
      inviteUrl: 'http://localhost:3000/es/auth/accept-invitation?token=abc123',
    });

    // El inviteUrl no viaja en subject/body — sendEmail solo acepta
    // (to, subject, react); Resend renderiza el HTML a partir de `react`.
    // La única forma real de verificar que el link llega es inspeccionar
    // los props del elemento React que efectivamente se le pasó a Resend.
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'bob@example.com',
        react: expect.objectContaining({
          props: expect.objectContaining({
            inviteUrl: 'http://localhost:3000/es/auth/accept-invitation?token=abc123',
            inviterEmail: 'admin@example.com',
            teamRole: 'member',
          }),
        }),
      }),
    );
  });

  it('sendNotificationEmail pasa el contenido real de la notificación al template React', async () => {
    mockSend.mockResolvedValue({ data: { id: 'email-4' }, error: null });
    const { sendNotificationEmail } = await import('@/lib/email');

    await sendNotificationEmail('carol@example.com', {
      type: 'info',
      title: 'Tu archivo está listo',
      body: 'Descárgalo aquí',
      link: '/files/123',
    });

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'carol@example.com',
        subject: 'Tu archivo está listo',
        react: expect.objectContaining({
          props: expect.objectContaining({
            type: 'info',
            title: 'Tu archivo está listo',
            body: 'Descárgalo aquí',
            link: '/files/123',
          }),
        }),
      }),
    );
  });
});

/**
 * Sin catcher local ningún email de la app es visible en desarrollo: Resend es
 * una API HTTP y Mailpit solo intercepta el SMTP de Supabase Auth. Por eso las
 * invitaciones nunca aparecían en la bandeja local.
 */
describe('sendEmail — transporte local', () => {
  const fakeElement = { type: 'div', props: {}, key: null } as unknown as React.ReactElement;

  beforeEach(() => {
    vi.resetModules();
    mockSend.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should deliver to Mailpit over HTTP when MAILPIT_URL is set', async () => {
    // Arrange
    vi.doMock('@/env', () => ({
      env: {
        RESEND_API_KEY: 're_test_key',
        FROM_EMAIL: 'noreply@test.com',
        SITE_URL: 'http://localhost:3000',
        MAILPIT_URL: 'http://127.0.0.1:54324',
      },
    }));
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchSpy);
    const { sendEmail } = await import('@/lib/email');

    // Act
    await sendEmail('user@example.com', 'Asunto', fakeElement);

    // Assert
    expect(fetchSpy).toHaveBeenCalledWith(
      'http://127.0.0.1:54324/api/v1/send',
      expect.objectContaining({ method: 'POST' }),
    );
    const requestInit = fetchSpy.mock.calls[0]?.[1] as { body: string };
    const body = JSON.parse(requestInit.body);
    expect(body).toMatchObject({
      From: { Email: 'noreply@test.com' },
      To: [{ Email: 'user@example.com' }],
      Subject: 'Asunto',
    });
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('should throw when Mailpit rejects the message', async () => {
    // Arrange
    vi.doMock('@/env', () => ({
      env: {
        RESEND_API_KEY: 're_test_key',
        FROM_EMAIL: 'noreply@test.com',
        SITE_URL: 'http://localhost:3000',
        MAILPIT_URL: 'http://127.0.0.1:54324',
      },
    }));
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500, text: async () => 'boom' }),
    );
    const { sendEmail } = await import('@/lib/email');

    // Act + Assert — un fallo de entrega no puede pasar por éxito.
    await expect(sendEmail('user@example.com', 'Asunto', fakeElement)).rejects.toThrow(
      /Mailpit rejected/,
    );
  });
});
