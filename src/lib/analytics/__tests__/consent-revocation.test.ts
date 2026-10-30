import { expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  releaseImport: null as null | (() => void),
  init: vi.fn(),
  capture: vi.fn(),
  reset: vi.fn(),
  optOut: vi.fn(),
  register: vi.fn(),
}));

vi.mock('@/config/app.config', () => ({ appConfig: { features: { analytics: true } } }));
vi.mock('@/env', () => ({
  env: { NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: 'phc_synthetic', NEXT_PUBLIC_POSTHOG_HOST: '/ingest' },
}));
vi.mock('posthog-js', async () => {
  await new Promise<void>((resolve) => {
    state.releaseImport = resolve;
  });
  return {
    default: {
      init: state.init,
      capture: state.capture,
      reset: state.reset,
      opt_out_capturing: state.optOut,
      register: state.register,
      config: { cookie_expiration: 365, cross_subdomain_cookie: false, secure_cookie: false },
    },
  };
});
vi.mock('posthog-js/lib/src/storage', () => {
  const store = {
    _is_supported: () => true,
    _get: () => undefined,
    _parse: () => undefined,
    _set: () => true,
  };
  return { cookieStore: store, localStore: store };
});

it('revocation during dynamic import cancels init; a later grant initializes once', async () => {
  const { initAnalytics, disableAnalytics, capturePageview } = await import('../client');
  const first = initAnalytics();
  const concurrent = initAnalytics();
  await vi.waitFor(() => expect(state.releaseImport).toBeTypeOf('function'));
  disableAnalytics();
  state.releaseImport?.();
  await Promise.all([first, concurrent]);
  capturePageview();
  expect(state.init).not.toHaveBeenCalled();
  expect(state.capture).not.toHaveBeenCalled();

  await initAnalytics();
  expect(state.init).toHaveBeenCalledOnce();
});
