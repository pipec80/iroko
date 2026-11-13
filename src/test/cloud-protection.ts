import path from 'node:path';

/** Explicit loopback servers share the local policy even when a bypass is loaded. */
export function isCloudBrowserTarget(baseUrl: string | undefined): boolean {
  if (!baseUrl) return false;
  const host = new URL(baseUrl).hostname;
  return !['localhost', '127.0.0.1', '[::1]'].includes(host);
}

/** Credential state belongs outside reports and is removed by global teardown. */
export function cloudProtectionStatePath(projectRoot: string): string {
  return path.join(projectRoot, '.playwright-auth', 'iroko-bypass.json');
}

/** Cloud captures can retain provider credentials even from isolated API contexts. */
export function cloudCapturePolicy(hosted: boolean) {
  return {
    trace: hosted ? ('off' as const) : ('retain-on-failure' as const),
    screenshot: hosted ? ('off' as const) : ('only-on-failure' as const),
    video: 'off' as const,
  };
}
