import { mkdir, open, unlink } from 'node:fs/promises';
import path from 'node:path';
import { request } from '@playwright/test';
import type { APIRequestContext, FullConfig } from '@playwright/test';
import { cloudProtectionStatePath, isCloudBrowserTarget } from './cloud-protection';
import { MERCADOPAGO_PRODUCTION_URL } from './e2e/mercadopago-cloud-acceptance-config';

type StorageState = Awaited<ReturnType<APIRequestContext['storageState']>>;

function bypassOnlyState(state: StorageState, publicLocaleRedirect: boolean): StorageState {
  const cookies = state.cookies.filter((cookie) => cookie.name === '_vercel_jwt');
  // The public canonical alias can return the application's locale redirect
  // without issuing a protection cookie. Preserve no app cookies in that case;
  // subsequent browser assertions must still prove the page is accessible.
  if (cookies.length === 0 && publicLocaleRedirect) return { cookies: [], origins: [] };
  const cookie = cookies[0];
  if (
    cookies.length !== 1 ||
    !cookie ||
    !cookie.value ||
    cookie.domain !== new URL(MERCADOPAGO_PRODUCTION_URL).hostname ||
    cookie.path !== '/' ||
    !cookie.secure
  ) {
    throw new Error('cloud_protection_invalid_cookie');
  }
  return { cookies: [{ ...cookie, httpOnly: true, sameSite: 'Lax' }], origins: [] };
}

/**
 * Runs outside TestInfo so bypass headers cannot enter Playwright traces.
 * Redirects are disabled: the secret is sent only to the fixed Iroko origin.
 */
export default async function setup(config: FullConfig) {
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL;
  if (!isCloudBrowserTarget(baseUrl)) return;
  if (baseUrl !== MERCADOPAGO_PRODUCTION_URL) {
    throw new Error('cloud_protection_requires_canonical_origin');
  }
  const secret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  if (!secret) return;
  if (!config.configFile) throw new Error('cloud_protection_config_file_required');

  const statePath = cloudProtectionStatePath(path.dirname(config.configFile));
  let context: APIRequestContext | undefined;
  let ownsState = false;
  const cleanup = async () => {
    if (ownsState) {
      try {
        await unlink(statePath);
        ownsState = false;
      } catch {
        throw new Error('cloud_protection_cleanup_failed');
      }
    }
  };

  try {
    try {
      context = await request.newContext();
      const response = await context.get(MERCADOPAGO_PRODUCTION_URL, {
        headers: {
          'x-vercel-protection-bypass': secret,
          'x-vercel-set-bypass-cookie': 'true',
        },
        maxRedirects: 0,
      });
      if (response.status() < 200 || response.status() >= 400) {
        throw new Error('cloud_protection_bootstrap_rejected');
      }
      const publicLocaleRedirect =
        response.status() === 307 && /^\/(es|en|pt|fr)$/.test(response.headers().location ?? '');
      const state = bypassOnlyState(await context.storageState(), publicLocaleRedirect);
      await mkdir(path.dirname(statePath), { recursive: true, mode: 0o700 });
      // Exclusive create prevents overwriting/deleting state owned by another run.
      const file = await open(statePath, 'wx', 0o600);
      ownsState = true;
      try {
        await file.writeFile(JSON.stringify(state));
      } finally {
        await file.close();
      }
    } finally {
      await context?.dispose();
    }
  } catch {
    await cleanup();
    // Playwright transport/filesystem exceptions may contain headers or cookie data.
    throw new Error('cloud_protection_bootstrap_failed');
  }
  return cleanup;
}
