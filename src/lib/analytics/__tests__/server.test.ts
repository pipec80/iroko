import { beforeEach, describe, expect, it, vi } from 'vitest';

const { captureMock, shutdownMock, PostHogMock } = vi.hoisted(() => {
  const captureMock = vi.fn();
  const shutdownMock = vi.fn(async () => {});
  const PostHogMock = vi.fn().mockImplementation(function PostHogMockCtor() {
    return { capture: captureMock, shutdown: shutdownMock };
  });
  return { captureMock, shutdownMock, PostHogMock };
});
vi.mock('posthog-node', () => ({ PostHog: PostHogMock }));

const { loggerMock } = vi.hoisted(() => ({
  loggerMock: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));
vi.mock('@/lib/logger', () => ({ logger: loggerMock }));

const { envMock } = vi.hoisted(() => ({
  envMock: {
    NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: 'phc_test_token' as string | undefined,
    POSTHOG_HOST: 'https://us.i.posthog.com',
  },
}));
vi.mock('@/env', () => ({ env: envMock }));

const { cookieGetMock } = vi.hoisted(() => ({ cookieGetMock: vi.fn() }));
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({ get: cookieGetMock })),
}));

const { maybeSingleMock } = vi.hoisted(() => ({ maybeSingleMock: vi.fn() }));
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: maybeSingleMock })) })),
    })),
  })),
}));

/** Encodes a `cookie_consent` value the way `writeConsentCookie` does. */
function consentCookieValue(analytics: boolean): string {
  return encodeURIComponent(JSON.stringify({ necessary: true, analytics, marketing: false }));
}

describe('captureServer', () => {
  beforeEach(() => {
    vi.resetModules();
    envMock.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN = 'phc_test_token';
    // Default: consented via cookie, matching every pre-existing test below
    // that isn't specifically exercising the consent gate.
    cookieGetMock.mockReturnValue({ value: consentCookieValue(true) });
    maybeSingleMock.mockResolvedValue({ data: null });
  });

  it('is a no-op when the project token is missing', async () => {
    envMock.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN = undefined;
    const { captureServer } = await import('../server');

    await captureServer({
      event: 'project_created',
      properties: { type: 'docs', tone: 'iron' },
      distinctId: 'user-uuid',
    });

    expect(PostHogMock).not.toHaveBeenCalled();
  });

  it('creates a client with flushAt:1 and flushInterval:0, captures, and shuts down', async () => {
    const { captureServer } = await import('../server');

    await captureServer({
      event: 'project_created',
      properties: { type: 'docs', tone: 'iron' },
      distinctId: 'user-uuid',
      accountId: 'account-uuid',
    });

    expect(PostHogMock).toHaveBeenCalledWith('phc_test_token', {
      host: 'https://us.i.posthog.com',
      flushAt: 1,
      flushInterval: 0,
    });
    expect(captureMock).toHaveBeenCalledWith({
      distinctId: 'user-uuid',
      event: 'project_created',
      properties: { type: 'docs', tone: 'iron' },
      groups: { account: 'account-uuid' },
    });
    expect(shutdownMock).toHaveBeenCalledOnce();
  });

  it('omits groups when no accountId is given', async () => {
    const { captureServer } = await import('../server');

    await captureServer({
      event: 'mfa_challenge_completed',
      properties: {},
      distinctId: 'user-uuid',
    });

    expect(captureMock).toHaveBeenCalledWith({
      distinctId: 'user-uuid',
      event: 'mfa_challenge_completed',
      properties: {},
      groups: undefined,
    });
  });

  it('sets $insert_id for de-duplication when insertId is given', async () => {
    const { captureServer } = await import('../server');

    await captureServer({
      event: 'subscription_activated',
      properties: { plan_slug: 'pro', interval: 'month', provider: 'mock' },
      distinctId: 'user-uuid',
      insertId: 'evt_123',
    });

    expect(captureMock).toHaveBeenCalledWith(
      expect.objectContaining({
        properties: expect.objectContaining({ $insert_id: 'evt_123' }),
      }),
    );
  });

  it('throws for a property outside the event taxonomy instead of silently sending it', async () => {
    const { captureServer } = await import('../server');

    await expect(
      captureServer({
        event: 'project_created',
        // @ts-expect-error — deliberately outside the schema
        properties: { type: 'docs', tone: 'iron', email: 'leak@test.com' },
        distinctId: 'user-uuid',
      }),
    ).rejects.toThrow();
    expect(captureMock).not.toHaveBeenCalled();
  });

  it('logs and resolves without throwing when the PostHog client fails to capture', async () => {
    captureMock.mockImplementationOnce(() => {
      throw new Error('network down');
    });
    const { captureServer } = await import('../server');

    await expect(
      captureServer({
        event: 'mfa_challenge_completed',
        properties: {},
        distinctId: 'user-uuid',
      }),
    ).resolves.toBeUndefined();
    expect(loggerMock.error).toHaveBeenCalled();
  });

  describe('consent gate', () => {
    it('does not capture when the cookie explicitly rejects analytics', async () => {
      cookieGetMock.mockReturnValue({ value: consentCookieValue(false) });
      const { captureServer } = await import('../server');

      await captureServer({
        event: 'mfa_challenge_completed',
        properties: {},
        distinctId: 'user-uuid',
      });

      expect(captureMock).not.toHaveBeenCalled();
      // No cookie signal to work from means no DB fallback should be needed either.
      expect(maybeSingleMock).not.toHaveBeenCalled();
    });

    it('falls back to profiles.analytics_consent when no cookie is present (e.g. a webhook)', async () => {
      cookieGetMock.mockReturnValue();
      maybeSingleMock.mockResolvedValue({ data: { analytics_consent: true } });
      const { captureServer } = await import('../server');

      await captureServer({
        event: 'subscription_activated',
        properties: { plan_slug: 'pro', interval: 'month', provider: 'mock' },
        distinctId: 'account-owner-uuid',
      });

      expect(captureMock).toHaveBeenCalledOnce();
    });

    it('does not capture when no cookie is present and profiles.analytics_consent is not true', async () => {
      cookieGetMock.mockReturnValue();
      maybeSingleMock.mockResolvedValue({ data: { analytics_consent: null } });
      const { captureServer } = await import('../server');

      await captureServer({
        event: 'subscription_activated',
        properties: { plan_slug: 'pro', interval: 'month', provider: 'mock' },
        distinctId: 'account-owner-uuid',
      });

      expect(captureMock).not.toHaveBeenCalled();
    });

    it('does not capture when no cookie is present and the profile row does not exist', async () => {
      cookieGetMock.mockReturnValue();
      maybeSingleMock.mockResolvedValue({ data: null });
      const { captureServer } = await import('../server');

      await captureServer({
        event: 'mfa_challenge_completed',
        properties: {},
        distinctId: 'user-uuid',
      });

      expect(captureMock).not.toHaveBeenCalled();
    });
  });
});
