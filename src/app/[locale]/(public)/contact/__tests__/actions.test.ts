import { describe, it, expect, vi, beforeEach } from 'vitest';

const { sendNotificationEmail } = vi.hoisted(() => ({ sendNotificationEmail: vi.fn() }));
vi.mock('@/lib/email', () => ({ sendNotificationEmail }));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('@/config/app.config', () => ({
  appConfig: { supportEmail: 'support@example.com' },
}));

vi.mock('@sentry/nextjs', () => ({
  withScope: vi.fn(),
  captureException: vi.fn(),
}));

import { submitContactForm } from '../actions';

function formData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  return fd;
}

describe('submitContactForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends a notification email to the support address and returns success', async () => {
    const result = await submitContactForm(
      {},
      formData({
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        company_size: '6-20',
        message: 'Hola, quiero más info.',
      }),
    );

    expect(result).toEqual({ success: true });
    expect(sendNotificationEmail).toHaveBeenCalledWith(
      'support@example.com',
      expect.objectContaining({
        type: 'info',
        title: expect.stringContaining('Ada Lovelace'),
        body: expect.stringContaining('ada@example.com'),
      }),
    );
  });

  it('returns a validation error and never sends an email when the name is missing', async () => {
    const result = await submitContactForm(
      {},
      formData({ name: '', email: 'ada@example.com', message: 'Hola' }),
    );

    expect(result.error).toBe('name_required');
    expect(sendNotificationEmail).not.toHaveBeenCalled();
  });

  it('returns a validation error for a malformed email', async () => {
    const result = await submitContactForm(
      {},
      formData({ name: 'Ada', email: 'not-an-email', message: 'Hola' }),
    );

    expect(result.error).toBe('invalid_email_format');
  });

  it('returns send_failed and logs a warning when the email provider throws', async () => {
    sendNotificationEmail.mockRejectedValue(new Error('resend down'));

    const result = await submitContactForm(
      {},
      formData({ name: 'Ada', email: 'ada@example.com', message: 'Hola' }),
    );

    expect(result).toEqual({ error: 'send_failed' });
  });

  it('omits the company size line when it was not provided', async () => {
    await submitContactForm(
      {},
      formData({ name: 'Ada', email: 'ada@example.com', message: 'Hola' }),
    );

    const [, opts] = sendNotificationEmail.mock.calls[0] as [string, { body: string }];
    expect(opts.body).not.toContain('Tamaño de empresa');
  });
});
