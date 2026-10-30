import { beforeEach, describe, expect, it, vi } from 'vitest';

const { posthogMock } = vi.hoisted(() => ({
  posthogMock: {
    init: vi.fn(),
    capture: vi.fn(),
    identify: vi.fn(),
    group: vi.fn(),
    reset: vi.fn(),
    opt_out_capturing: vi.fn(),
    opt_in_capturing: vi.fn(),
    register: vi.fn(),
    unregister: vi.fn(),
    config: { cookie_expiration: 365, cross_subdomain_cookie: false, secure_cookie: false },
  },
}));
vi.mock('posthog-js', () => ({ default: posthogMock }));

const { cookieRecords, localRecords, cookieStoreMock, localStoreMock } = vi.hoisted(() => {
  const cookieRecords = new Map<string, unknown>();
  const localRecords = new Map<string, unknown>();
  const store = (records: Map<string, unknown>) => ({
    _is_supported: vi.fn(() => true),
    _get: vi.fn((key: string) => (records.has(key) ? JSON.stringify(records.get(key)) : undefined)),
    _parse: vi.fn((key: string) => records.get(key)),
    _set: vi.fn((key: string, value: Record<string, unknown>) => {
      records.set(key, value);
      return true;
    }),
  });
  return {
    cookieRecords,
    localRecords,
    cookieStoreMock: store(cookieRecords),
    localStoreMock: store(localRecords),
  };
});
vi.mock('posthog-js/lib/src/storage', () => ({
  cookieStore: cookieStoreMock,
  localStore: localStoreMock,
}));

const { appConfigMock } = vi.hoisted(() => ({
  appConfigMock: { features: { analytics: true } },
}));
vi.mock('@/config/app.config', () => ({ appConfig: appConfigMock }));

const { envMock } = vi.hoisted(() => ({
  envMock: {
    NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: 'phc_test_token' as string | undefined,
    NEXT_PUBLIC_POSTHOG_HOST: '/ingest',
  },
}));
vi.mock('@/env', () => ({ env: envMock }));

describe('analytics/client', () => {
  beforeEach(() => {
    vi.resetModules();
    appConfigMock.features.analytics = true;
    envMock.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN = 'phc_test_token';
    cookieRecords.clear();
    localRecords.clear();
    localStoreMock._is_supported.mockReturnValue(true);
  });

  describe('initAnalytics', () => {
    it('does not initialize posthog-js when the analytics feature flag is off', async () => {
      appConfigMock.features.analytics = false;
      const { initAnalytics } = await import('../client');

      await initAnalytics();

      expect(posthogMock.init).not.toHaveBeenCalled();
    });

    it('does not initialize posthog-js when the project token is missing', async () => {
      envMock.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN = undefined;
      const { initAnalytics } = await import('../client');

      await initAnalytics();

      expect(posthogMock.init).not.toHaveBeenCalled();
    });

    it('initializes posthog-js with autocapture, session recording and feature flags disabled', async () => {
      const { initAnalytics } = await import('../client');

      await initAnalytics();

      expect(posthogMock.init).toHaveBeenCalledOnce();
      const [call] = posthogMock.init.mock.calls;
      if (!call) throw new Error('posthog.init was not called');
      const [token, config] = call;
      expect(token).toBe('phc_test_token');
      expect(config.api_host).toBe('/ingest');
      expect(config.autocapture).toBe(false);
      expect(config.disable_session_recording).toBe(true);
      expect(config.advanced_disable_feature_flags).toBe(true);
      expect(config.person_profiles).toBe('identified_only');
      // Automatic pageview capture races ahead of the async impersonation
      // check in analytics-provider.tsx — must stay off; capturePageview()
      // is the only path that sends $pageview (see its own describe block).
      expect(config.capture_pageview).toBe(false);
    });

    it('is idempotent — calling it twice only initializes posthog-js once', async () => {
      const { initAnalytics } = await import('../client');

      await initAnalytics();
      await initAnalytics();

      expect(posthogMock.init).toHaveBeenCalledOnce();
    });

    it('sanitizes $current_url and $pathname through before_send', async () => {
      const { initAnalytics } = await import('../client');
      await initAnalytics();

      const [call] = posthogMock.init.mock.calls;
      if (!call) throw new Error('posthog.init was not called');
      const config = call[1];
      const event = {
        properties: {
          $current_url: 'https://example.com/es/dashboard/projects/my-secret-launch',
          $pathname: '/es/dashboard/projects/my-secret-launch',
        },
      };

      const result = config.before_send(event);

      expect(result.properties.$current_url).toContain(':slug');
      expect(result.properties.$current_url).not.toContain('my-secret-launch');
      expect(result.properties.$pathname).toBe('/es/dashboard/projects/:slug');
    });
  });

  it('sanitizes all SDK URL and attribution copies in before_send', async () => {
    const { initAnalytics } = await import('../client');
    await initAnalytics();
    const config = posthogMock.init.mock.calls[0]?.[1];
    const result = config.before_send({
      properties: {
        $referrer: '/es?token_hash=PRIVATE_MARKER',
        $set_once: { $initial_current_url: '/es?code=PRIVATE_MARKER' },
        $session_entry_url: '/es?next=PRIVATE_MARKER',
        $session_entry_utm_source: 'PRIVATE_MARKER',
      },
    });
    expect(JSON.stringify(result)).not.toContain('PRIVATE_MARKER');
    expect(result.properties.$referrer).toBe('/es');
  });
  it('sanitizes top-level SDK person updates and removes persisted URL attribution before capture', async () => {
    const { initAnalytics } = await import('../client');
    await initAnalytics();
    const config = posthogMock.init.mock.calls[0]?.[1];
    const result = config.before_send({
      properties: { method: 'password' },
      $set: { $current_url: '/es/login?code=PRIVATE_MARKER' },
      $set_once: { $initial_current_url: '/es/login?token_hash=PRIVATE_MARKER#PRIVATE_MARKER' },
    });
    expect(JSON.stringify(result)).not.toContain('PRIVATE_MARKER');
    expect(result.$set_once.$initial_current_url).toBe('/es/login');
    expect(result.properties.method).toBe('password');
    expect(config.save_referrer).toBe(false);
    expect(config.save_campaign_params).toBe(false);
  });
  it('cleans only this project persistence before SDK init can issue its first request, preserving identity', async () => {
    const key = 'ph_phc_test_token_posthog';
    const retained = {
      distinct_id: 'anonymous-id',
      $device_id: 'device-id',
      $groups: { account: 'account-id' },
      consent: 'retained',
    };
    const legacy = {
      ...retained,
      $client_session_props: {
        sessionId: 'session-id',
        props: { u: '/?code=PRIVATE_MARKER', r: '/#PRIVATE_MARKER' },
      },
      $initial_person_info: { u: '/es/login?code=PRIVATE_MARKER' },
      $initial_campaign_params: { utm_source: 'PRIVATE_MARKER' },
      $initial_referrer_info: { $referrer: '/?code=PRIVATE_MARKER' },
    };
    cookieRecords.set(key, legacy);
    localRecords.set(key, legacy);
    cookieRecords.set('unrelated-project', legacy);
    posthogMock.init.mockImplementationOnce(() => {
      expect(cookieRecords.get(key)).toEqual(retained);
      expect(localRecords.get(key)).toEqual(retained);
    });
    const { initAnalytics } = await import('../client');
    await initAnalytics();
    expect(cookieStoreMock._set).toHaveBeenCalledWith(key, retained, 365, false, false);
    expect(cookieRecords.get('unrelated-project')).toBe(legacy);
  });
  it('does not initialize if URL attribution cannot be removed from the exact cookie', async () => {
    cookieRecords.set('ph_phc_test_token_posthog', {
      distinct_id: 'retained',
      $initial_person_info: { u: '/?code=PRIVATE_MARKER' },
    });
    cookieStoreMock._set.mockReturnValueOnce(false);
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { initAnalytics } = await import('../client');
    await initAnalytics();
    expect(posthogMock.init).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(
      'Analytics initialization blocked: persisted URL cleanup failed',
    );
  });
  it('refuses initialization when SDK storage support would fall back to full cookies', async () => {
    localStoreMock._is_supported.mockReturnValue(false);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { initAnalytics } = await import('../client');
    await initAnalytics();
    expect(posthogMock.init).not.toHaveBeenCalled();
  });
  describe('isAnalyticsReady', () => {
    it('is false before init', async () => {
      const { isAnalyticsReady } = await import('../client');
      expect(isAnalyticsReady()).toBe(false);
    });

    it('is true after init completes', async () => {
      const { initAnalytics, isAnalyticsReady } = await import('../client');
      await initAnalytics();
      expect(isAnalyticsReady()).toBe(true);
    });
  });

  describe('track', () => {
    it('does not capture before initAnalytics has run', async () => {
      const { track } = await import('../client');

      track('signup_started', { method: 'password' });

      expect(posthogMock.capture).not.toHaveBeenCalled();
    });

    it('captures a validated event after init', async () => {
      const { initAnalytics, track } = await import('../client');
      await initAnalytics();

      track('signup_started', { method: 'password' });

      expect(posthogMock.capture).toHaveBeenCalledWith('signup_started', { method: 'password' });
    });

    it('throws instead of silently sending a property outside the taxonomy', async () => {
      const { initAnalytics, track } = await import('../client');
      await initAnalytics();

      expect(() =>
        // @ts-expect-error — deliberately outside the schema
        track('signup_started', { method: 'password', email: 'leak@test.com' }),
      ).toThrow();
      expect(posthogMock.capture).not.toHaveBeenCalled();
    });
  });

  describe('capturePageview', () => {
    it('does not capture before init', async () => {
      const { capturePageview } = await import('../client');
      capturePageview();
      expect(posthogMock.capture).not.toHaveBeenCalled();
    });

    it('captures $pageview after init', async () => {
      const { initAnalytics, capturePageview } = await import('../client');
      await initAnalytics();

      capturePageview();

      expect(posthogMock.capture).toHaveBeenCalledWith('$pageview');
    });
  });

  describe('identity', () => {
    it('identifyUser is a no-op before init', async () => {
      const { identifyUser } = await import('../client');
      identifyUser('user-uuid');
      expect(posthogMock.identify).not.toHaveBeenCalled();
    });

    it('identifyUser calls posthog.identify with the given id after init', async () => {
      const { initAnalytics, identifyUser } = await import('../client');
      await initAnalytics();

      identifyUser('user-uuid');

      expect(posthogMock.identify).toHaveBeenCalledWith('user-uuid');
    });

    it('setAccountGroup groups under "account" after init', async () => {
      const { initAnalytics, setAccountGroup } = await import('../client');
      await initAnalytics();

      setAccountGroup('account-uuid');

      expect(posthogMock.group).toHaveBeenCalledWith('account', 'account-uuid');
    });

    it('resetAnalytics resets identity after init', async () => {
      const { initAnalytics, resetAnalytics } = await import('../client');
      await initAnalytics();

      resetAnalytics();

      expect(posthogMock.reset).toHaveBeenCalledWith(true);
    });
  });

  describe('disableAnalytics', () => {
    it('opts out, resets identity, and stops further capture', async () => {
      const { initAnalytics, disableAnalytics, track } = await import('../client');
      await initAnalytics();

      disableAnalytics();
      track('signup_started', { method: 'password' });

      expect(posthogMock.opt_out_capturing).toHaveBeenCalledOnce();
      expect(posthogMock.reset).toHaveBeenCalledWith(true);
      expect(posthogMock.capture).not.toHaveBeenCalled();
    });

    it('is a no-op before init', async () => {
      const { disableAnalytics } = await import('../client');
      disableAnalytics();
      expect(posthogMock.opt_out_capturing).not.toHaveBeenCalled();
    });
  });

  describe('pauseCapturing / resumeCapturing', () => {
    it('pauseCapturing opts out without discarding the instance', async () => {
      const { initAnalytics, pauseCapturing, resumeCapturing } = await import('../client');
      await initAnalytics();

      pauseCapturing();
      resumeCapturing();

      expect(posthogMock.opt_out_capturing).toHaveBeenCalledOnce();
      expect(posthogMock.opt_in_capturing).toHaveBeenCalledOnce();
    });
  });
});
