import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

const harness = vi.hoisted(() => ({
  scenario: undefined as undefined | ((args: { page: unknown }) => Promise<void>),
  capture: undefined as unknown,
  post: vi.fn(),
  dispose: vi.fn(),
}));

vi.mock('@playwright/test', () => {
  const test = Object.assign(
    (_name: string, callback: (args: { page: unknown }) => Promise<void>) => {
      harness.scenario = callback;
    },
    {
      skip: vi.fn(),
      use: (policy: unknown) => {
        harness.capture = policy;
      },
    },
  );
  return {
    test,
    expect,
    request: {
      newContext: vi.fn(async () => ({ post: harness.post, dispose: harness.dispose })),
    },
  };
});

import './e2e/mercadopago-cloud-acceptance.spec';

describe('Cloud acceptance credential containment', () => {
  it('disables every browser capture for the privileged scenario', () => {
    expect(harness.capture).toEqual({ trace: 'off', screenshot: 'off', video: 'off' });
  });

  it('does not reflect transport headers or OTP URLs in public failure output', async () => {
    vi.stubEnv('PLAYWRIGHT_BASE_URL', 'https://project-a89lv.vercel.app');
    vi.stubEnv('MERCADOPAGO_CLOUD_ACCEPTANCE', '1');
    vi.stubEnv('IROKO_E2E_TEST_USER_EMAIL', 'fixture@example.invalid');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://fixture.supabase.co');
    vi.stubEnv('SUPABASE_SECRET_KEY', 'sb_secret_fixture_canary');
    harness.post.mockRejectedValueOnce(
      new Error('apikey: sb_secret_fixture_canary token_hash=canary'),
    );
    try {
      await expect(harness.scenario!({ page: {} })).rejects.toThrow(
        /^mercadopago_cloud_acceptance_scenario_failed$/,
      );
      expect(harness.dispose).toHaveBeenCalledOnce();
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('never uploads the raw Cloud browser report', () => {
    const workflow = readFileSync('.github/workflows/mercadopago-sandbox-acceptance.yml', 'utf8');
    expect(workflow).toContain('--reporter=line --trace=off');
    expect(workflow).not.toContain('path: playwright-report/');
    const nightly = readFileSync('.github/workflows/nightly.yml', 'utf8');
    expect(nightly).not.toContain('name: nightly-playwright-report');
  });
});
