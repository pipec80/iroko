import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { verifyOtp, createServerClient } = vi.hoisted(() => ({
  verifyOtp: vi.fn(),
  createServerClient: vi.fn(),
}));

vi.mock('@supabase/ssr', () => ({ createServerClient }));
vi.mock('@/i18n/routing', () => ({ routing: { locales: ['es', 'en', 'fr', 'pt'] } }));
vi.mock('@/env', () => ({
  env: {
    SITE_URL: 'http://localhost:3000',
    NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'publishable',
  },
}));
vi.mock('@/lib/email', () => ({ sendWelcomeEmail: vi.fn() }));
vi.mock('@/lib/logger', () => ({ logger: { warn: vi.fn() } }));

import { GET } from '../route';

const params = { params: Promise.resolve({ locale: 'es' }) };

function emailChangeRequest() {
  return new NextRequest(
    'http://localhost:3000/es/auth/confirm?type=email_change&token_hash=test&next=%2Fes%2Fdashboard',
  );
}

describe('email change confirmation', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    createServerClient.mockReturnValue({ auth: { verifyOtp } });
  });

  it('returns to Profile with a pending status after one confirmation', async () => {
    verifyOtp.mockResolvedValue({ data: { session: null, user: null }, error: null });

    const response = await GET(emailChangeRequest(), params);

    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: 'test', type: 'email_change' });
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/es/dashboard/account?tab=profile&emailChange=pending',
    );
    expect(response.headers.get('cache-control')).toBe('private, no-store');
  });

  it('returns to Profile after the final confirmation and preserves the new session cookie', async () => {
    createServerClient.mockImplementation((_url, _key, options) => ({
      auth: {
        verifyOtp: async () => {
          options.cookies.setAll([
            { name: 'test-session', value: 'renewed', options: { path: '/' } },
          ]);
          return { data: { session: { access_token: 'test' } }, error: null };
        },
      },
    }));

    const response = await GET(emailChangeRequest(), params);

    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/es/dashboard/account?tab=profile&emailChange=complete',
    );
    expect(response.cookies.get('test-session')?.value).toBe('renewed');
    expect(response.headers.get('cache-control')).toBe('private, no-store');
  });

  it('does not display a successful update after a rejected confirmation', async () => {
    verifyOtp.mockResolvedValue({
      data: { session: null, user: null },
      error: { code: 'otp_expired', message: 'Expired' },
    });

    const response = await GET(emailChangeRequest(), params);

    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/es/login?error=confirmation_failed',
    );
  });
});
