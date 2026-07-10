import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import type { logClient as LogClient } from '../logger-client';

const sentryMocks = vi.hoisted(() => ({
  addBreadcrumb: vi.fn(),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

vi.mock('@sentry/nextjs', () => sentryMocks);

describe('logClient in development', () => {
  let logClient: typeof LogClient;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.stubEnv('NODE_ENV', 'test');
    ({ logClient } = await import('../logger-client'));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('info writes to console and adds an info breadcrumb', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    logClient.info({ userId: 'u1' }, 'hello');
    expect(spy).toHaveBeenCalledWith('[info]', 'hello', { userId: 'u1' });
    expect(sentryMocks.addBreadcrumb).toHaveBeenCalledWith({
      message: 'hello',
      data: { userId: 'u1' },
      level: 'info',
    });
    spy.mockRestore();
  });

  it('warn writes to console and adds a warning breadcrumb', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    logClient.warn({ action: 'checkout' }, 'slow response');
    expect(spy).toHaveBeenCalledWith('[warn]', 'slow response', { action: 'checkout' });
    expect(sentryMocks.addBreadcrumb).toHaveBeenCalledWith({
      message: 'slow response',
      data: { action: 'checkout' },
      level: 'warning',
    });
    spy.mockRestore();
  });

  it('error writes to console and captures an Error via captureException', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const err = new Error('boom');
    logClient.error({ component: 'billing' }, 'payment failed', err);
    expect(spy).toHaveBeenCalledWith('[error]', 'payment failed', { component: 'billing' }, err);
    expect(sentryMocks.captureException).toHaveBeenCalledWith(err, {
      extra: { component: 'billing', message: 'payment failed' },
    });
    expect(sentryMocks.captureMessage).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('error captures a plain message via captureMessage when no Error is given', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    logClient.error({ component: 'billing' }, 'unknown failure');
    expect(sentryMocks.captureMessage).toHaveBeenCalledWith('unknown failure', {
      level: 'error',
      extra: { component: 'billing' },
    });
    expect(sentryMocks.captureException).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('error captures via captureMessage when a non-Error value is passed as err', () => {
    logClient.error({ component: 'billing' }, 'unknown failure', 'not-an-error');
    expect(sentryMocks.captureMessage).toHaveBeenCalledWith('unknown failure', {
      level: 'error',
      extra: { component: 'billing' },
    });
    expect(sentryMocks.captureException).not.toHaveBeenCalled();
  });
});

describe('logClient in production', () => {
  let logClient: typeof LogClient;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.stubEnv('NODE_ENV', 'production');
    ({ logClient } = await import('../logger-client'));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('does not write to console but still reports to Sentry', () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    logClient.info({}, 'info message');
    logClient.warn({}, 'warn message');
    logClient.error({}, 'error message');

    expect(infoSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
    expect(sentryMocks.addBreadcrumb).toHaveBeenCalledTimes(2);
    expect(sentryMocks.captureMessage).toHaveBeenCalledTimes(1);

    infoSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
