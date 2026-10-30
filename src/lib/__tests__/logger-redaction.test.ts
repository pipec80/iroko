import { expect, it, vi } from 'vitest';

vi.mock('@/env', () => ({ env: { LOG_LEVEL: 'info', NODE_ENV: 'test' } }));

it('redacts recipient fields in the real serialized Pino output', async () => {
  const chunks: string[] = [];
  const write = vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
    chunks.push(String(chunk));
    return true;
  });
  try {
    const { logger } = await import('@/lib/logger');
    logger.error(
      {
        to: 'RECIPIENT_MARKER@example.invalid',
        delivery: { to: 'NESTED_RECIPIENT_MARKER@example.invalid' },
        action: 'send_email',
        provider: 'resend',
        status: 429,
      },
      'Email delivery failed',
    );
  } finally {
    write.mockRestore();
  }
  const serialized = chunks.join('');
  expect(serialized).not.toContain('RECIPIENT_MARKER');
  expect(serialized).not.toContain('NESTED_RECIPIENT_MARKER');
  expect(serialized).toContain('send_email');
  expect(serialized).toContain('resend');
  expect(serialized).toContain('429');
});
