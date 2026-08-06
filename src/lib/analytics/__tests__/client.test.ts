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
  },
}));
vi.mock('posthog-js', () => ({ default: posthogMock }));

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
