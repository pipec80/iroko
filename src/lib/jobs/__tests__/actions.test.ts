import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ rpc: mocks.rpc })),
}));
vi.mock('@sentry/nextjs', () => ({ withScope: vi.fn(), captureException: vi.fn() }));
vi.mock('@/env', () => ({
  env: {
    LOG_LEVEL: 'silent',
    NODE_ENV: 'test',
    SUPABASE_SECRET_KEY: 'k',
    NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'a',
  },
}));

import { broadcastAlertEmail } from '../actions';

describe('broadcastAlertEmail', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should call broadcast_alert_email with the subject and body and return the enqueued count', async () => {
    mocks.rpc.mockResolvedValue({ data: 2, error: null });
    const res = await broadcastAlertEmail({ subject: 'Hola', body: 'Mundo' });
    expect(mocks.rpc).toHaveBeenCalledWith('broadcast_alert_email', {
      p_subject: 'Hola',
      p_body: 'Mundo',
    });
    expect(res.data).toEqual({ enqueued: 2 });
  });

  it('should return the RPC error message when the call fails', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'subject_required' } });
    const res = await broadcastAlertEmail({ subject: '', body: 'Mundo' });
    expect(res.data).toBeNull();
    expect(res.error).toBe('subject_required');
  });
});
