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

import { publishAnnouncement } from '../actions';

describe('publishAnnouncement', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns validation_error for an empty title without calling the RPC', async () => {
    const result = await publishAnnouncement({ type: 'info', title: '' });
    expect(result.error).toBe('validation_error');
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('returns validation_error for an invalid link without calling the RPC', async () => {
    const result = await publishAnnouncement({ type: 'info', title: 'x', link: 'not-a-url' });
    expect(result.error).toBe('validation_error');
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('propagates not_platform_admin from the RPC', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'not_platform_admin' } });
    const result = await publishAnnouncement({ type: 'info', title: 'x' });
    expect(result.error).toBe('not_platform_admin');
  });

  it('propagates mfa_required from the RPC', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'mfa_required' } });
    const result = await publishAnnouncement({ type: 'info', title: 'x' });
    expect(result.error).toBe('mfa_required');
  });

  it('returns the published row on success and calls the RPC with the right args', async () => {
    const row = {
      id: 'ann-1',
      type: 'info',
      title: 'Mantenimiento programado',
      body: 'El sábado a las 3am',
      link: null,
      created_by: 'admin-1',
      created_at: '2026-07-24T10:00:00Z',
    };
    mocks.rpc.mockResolvedValue({ data: row, error: null });

    const result = await publishAnnouncement({
      type: 'info',
      title: 'Mantenimiento programado',
      body: 'El sábado a las 3am',
      link: '',
    });

    expect(result.error).toBeUndefined();
    expect(result.data).toEqual(row);
    expect(mocks.rpc).toHaveBeenCalledWith('publish_announcement', {
      p_type: 'info',
      p_title: 'Mantenimiento programado',
      p_body: 'El sábado a las 3am',
      p_link: undefined,
    });
  });
});
