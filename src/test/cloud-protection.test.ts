// @vitest-environment node
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { FullConfig } from '@playwright/test';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cloudCapturePolicy,
  cloudProtectionStatePath,
  isCloudBrowserTarget,
} from './cloud-protection';
import setup from './cloud-protection-setup';

const api = vi.hoisted(() => ({
  newContext: vi.fn(),
  get: vi.fn(),
  storageState: vi.fn(),
  dispose: vi.fn(),
}));
vi.mock('@playwright/test', () => ({ request: { newContext: api.newContext } }));

const origin = 'https://project-a89lv.vercel.app';

describe('local and Cloud browser policy', () => {
  it.each([undefined, 'http://localhost:3000', 'http://127.0.0.1:3000', 'http://[::1]:3000'])(
    'keeps loopback local: %s',
    (url) => {
      expect(isCloudBrowserTarget(url)).toBe(false);
    },
  );
  it('requires Cloud policy for the canonical protected app', () => {
    expect(isCloudBrowserTarget(origin)).toBe(true);
  });
});
const cookie = {
  name: '_vercel_jwt',
  value: 'test-cookie',
  domain: 'project-a89lv.vercel.app',
  path: '/',
  expires: -1,
  httpOnly: true,
  secure: true,
  sameSite: 'Lax' as const,
};
let root: string;
let config: FullConfig;

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), 'iroko-cloud-protection-'));
  config = { configFile: path.join(root, 'playwright.config.ts') } as FullConfig;
  vi.stubEnv('PLAYWRIGHT_BASE_URL', origin);
  vi.stubEnv('VERCEL_AUTOMATION_BYPASS_SECRET', 'test-bypass');
  api.newContext.mockResolvedValue(api);
  api.get.mockResolvedValue({ status: () => 307, headers: () => ({}) });
  api.storageState.mockResolvedValue({ cookies: [cookie], origins: [] });
  api.dispose.mockImplementation(() => Promise.resolve());
});

afterEach(async () => {
  vi.unstubAllEnvs();
  vi.resetAllMocks();
  await rm(root, { recursive: true, force: true });
});

describe('Cloud acceptance protection', () => {
  it('disables credential-bearing captures only for hosted runs', () => {
    expect(cloudCapturePolicy(true)).toEqual({ trace: 'off', screenshot: 'off', video: 'off' });
    expect(cloudCapturePolicy(false)).toEqual({
      trace: 'retain-on-failure',
      screenshot: 'only-on-failure',
      video: 'off',
    });
  });

  it('bootstraps once without redirects and persists only the host-bound bypass cookie', async () => {
    api.storageState.mockResolvedValue({
      cookies: [cookie, { ...cookie, name: 'sb-auth-token' }],
      origins: [{ origin, localStorage: [{ name: 'auth', value: 'do-not-persist' }] }],
    });
    const teardown = await setup(config);
    expect(api.newContext).toHaveBeenCalledWith();
    expect(api.get).toHaveBeenCalledExactlyOnceWith(origin, {
      headers: {
        'x-vercel-protection-bypass': 'test-bypass',
        'x-vercel-set-bypass-cookie': 'true',
      },
      maxRedirects: 0,
    });
    expect(JSON.parse(await readFile(cloudProtectionStatePath(root), 'utf8'))).toEqual({
      cookies: [cookie],
      origins: [],
    });
    expect(api.dispose).toHaveBeenCalledOnce();
    const unrelated = path.join(path.dirname(cloudProtectionStatePath(root)), 'other.json');
    await writeFile(unrelated, 'keep');
    await teardown?.();
    await expect(readFile(cloudProtectionStatePath(root))).rejects.toMatchObject({
      code: 'ENOENT',
    });
    expect(await readFile(unrelated, 'utf8')).toBe('keep');
  });

  it.each(['https://evil.example', `${origin}/path`, `${origin}?secret=value`])(
    'rejects noncanonical destinations before sending credentials: %s',
    async (url) => {
      vi.stubEnv('PLAYWRIGHT_BASE_URL', url);
      await expect(setup(config)).rejects.toThrow('cloud_protection_requires_canonical_origin');
      expect(api.newContext).not.toHaveBeenCalled();
    },
  );

  it.each(['vercel.app', '.vercel.app', 'evil.example', '.project-a89lv.vercel.app'])(
    'rejects cookies that are not strictly host-only: %s',
    async (domain) => {
      api.storageState.mockResolvedValue({ cookies: [{ ...cookie, domain }], origins: [] });
      await expect(setup(config)).rejects.toThrow('cloud_protection_bootstrap_failed');
      expect(api.dispose).toHaveBeenCalledOnce();
      await expect(readFile(cloudProtectionStatePath(root))).rejects.toMatchObject({
        code: 'ENOENT',
      });
    },
  );

  it('rejects an absent bypass cookie instead of persisting app authentication', async () => {
    api.storageState.mockResolvedValue({ cookies: [{ ...cookie, name: 'auth' }], origins: [] });
    await expect(setup(config)).rejects.toThrow('cloud_protection_bootstrap_failed');
  });

  it('uses empty state when the public alias returns its exact app locale redirect', async () => {
    api.get.mockResolvedValue({ status: () => 307, headers: () => ({ location: '/es' }) });
    api.storageState.mockResolvedValue({
      cookies: [{ ...cookie, name: 'NEXT_LOCALE' }],
      origins: [],
    });
    const cleanup = await setup(config);
    expect(JSON.parse(await readFile(cloudProtectionStatePath(root), 'utf8'))).toEqual({
      cookies: [],
      origins: [],
    });
    await cleanup!();
  });

  it.each(['https://vercel.com/login', 'https://evil.example/es', '/es/login'])(
    'rejects a missing bypass cookie on another redirect: %s',
    async (location) => {
      api.get.mockResolvedValue({ status: () => 307, headers: () => ({ location }) });
      api.storageState.mockResolvedValue({ cookies: [], origins: [] });
      await expect(setup(config)).rejects.toThrow('cloud_protection_bootstrap_failed');
    },
  );

  it('does not bootstrap local runs or hosted runs without a bypass secret', async () => {
    vi.stubEnv('PLAYWRIGHT_BASE_URL', 'http://localhost:3000');
    expect(await setup(config)).toBeUndefined();
    vi.stubEnv('PLAYWRIGHT_BASE_URL', origin);
    vi.stubEnv('VERCEL_AUTOMATION_BYPASS_SECRET', '');
    expect(await setup(config)).toBeUndefined();
    expect(api.newContext).not.toHaveBeenCalled();
  });

  it('sanitizes transport errors and disposes the context', async () => {
    api.get.mockRejectedValue(new Error('request headers contain test-bypass'));
    await expect(setup(config)).rejects.toEqual(new Error('cloud_protection_bootstrap_failed'));
    expect(api.dispose).toHaveBeenCalledOnce();
  });

  it('does not persist state when the bootstrap is rejected', async () => {
    api.get.mockResolvedValue({ status: () => 401 });
    await expect(setup(config)).rejects.toEqual(new Error('cloud_protection_bootstrap_failed'));
    expect(api.storageState).not.toHaveBeenCalled();
    expect(api.dispose).toHaveBeenCalledOnce();
  });

  it('removes its own credential file and sanitizes disposal errors', async () => {
    api.dispose.mockRejectedValue(new Error('transport contained test-bypass'));
    await expect(setup(config)).rejects.toEqual(new Error('cloud_protection_bootstrap_failed'));
    await expect(readFile(cloudProtectionStatePath(root))).rejects.toMatchObject({
      code: 'ENOENT',
    });
  });

  it('preserves an existing state file owned by another run', async () => {
    await mkdir(path.dirname(cloudProtectionStatePath(root)), { recursive: true });
    await writeFile(cloudProtectionStatePath(root), 'keep');
    await expect(setup(config)).rejects.toThrow('cloud_protection_bootstrap_failed');
    expect(await readFile(cloudProtectionStatePath(root), 'utf8')).toBe('keep');
    expect(api.dispose).toHaveBeenCalledOnce();
  });
});
