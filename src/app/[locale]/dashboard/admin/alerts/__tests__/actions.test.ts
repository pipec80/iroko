import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({ rpc: mocks.rpc }),
}));

vi.mock('@sentry/nextjs', () => ({
  withScope: vi.fn(),
  captureException: vi.fn(),
}));

vi.mock('@/env', () => ({
  env: {
    SITE_URL: 'http://localhost:3000',
    LOG_LEVEL: 'silent',
    NODE_ENV: 'test',
    SUPABASE_SECRET_KEY: 'test-key',
    NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'test-anon-key',
  },
}));

import { sendPlatformAlert } from '../actions';

describe('sendPlatformAlert', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns validation_error for an empty subject without calling the RPC', async () => {
    const result = await sendPlatformAlert({ subject: '', body: 'hola' });
    expect(result.error).toBe('validation_error');
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('propagates not_platform_admin from the RPC', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'not_platform_admin' } });
    const result = await sendPlatformAlert({ subject: 'x', body: 'y' });
    expect(result.error).toBe('not_platform_admin');
  });

  it('propagates mfa_required from the RPC', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'mfa_required' } });
    const result = await sendPlatformAlert({ subject: 'x', body: 'y' });
    expect(result.error).toBe('mfa_required');
  });

  it('returns sentCount on success and calls the RPC with the right args', async () => {
    mocks.rpc.mockResolvedValue({ data: 4, error: null });

    const result = await sendPlatformAlert({
      subject: 'Mantenimiento programado',
      body: 'El sábado a las 3am habrá mantenimiento.',
    });

    expect(result.error).toBeUndefined();
    expect(result.data).toEqual({ sentCount: 4 });
    expect(mocks.rpc).toHaveBeenCalledWith('broadcast_alert_email', {
      p_subject: 'Mantenimiento programado',
      p_body: 'El sábado a las 3am habrá mantenimiento.',
    });
  });
});
