// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { MERCADOPAGO_PRODUCTION_URL } from '../e2e/mercadopago-cloud-acceptance-config';

const workflow = readFileSync('.github/workflows/nightly.yml', 'utf8');

function workflowStep(name: string): string {
  const step = workflow.split(`      - name: ${name}\n`)[1]?.split('\n      - name:')[0];
  if (!step) throw new Error(`Missing nightly step: ${name}`);
  return step;
}

describe('Nightly Cloud target boundary', () => {
  it('pins the authenticated preflight to the accepted MVP origin', () => {
    const preflight = workflowStep('Preflight — production URL serves the app');
    const origin = preflight.match(/^\s+SITE_URL:\s+(.+)$/m)?.[1]?.trim();

    expect(origin).toBe(MERCADOPAGO_PRODUCTION_URL);
    expect(preflight).not.toContain('secrets.SITE_URL');
    expect(preflight).toContain('"$SITE_URL/es"');
  });

  it('runs browser smoke tests against the same origin accepted by globalSetup', () => {
    const smoke = workflowStep('Run smoke tests against production');
    const origin = smoke.match(/^\s+PLAYWRIGHT_BASE_URL:\s+(.+)$/m)?.[1]?.trim();

    expect(origin).toBe(MERCADOPAGO_PRODUCTION_URL);
    expect(smoke).not.toContain('secrets.SITE_URL');
    expect(smoke).toContain('pnpm test:e2e --grep "@smoke"');
  });

  it('keeps bypass headers on the direct preflight request without following redirects', () => {
    const preflight = workflowStep('Preflight — production URL serves the app');
    const request = preflight.match(/^\s+status=\$\(curl\s+(.+)$/m)?.[1];
    const flags = Array.from(
      request?.matchAll(/(?:^|\s)(['"]?)(--?[a-zA-Z-]+)\1(?=\s|$)/g) ?? [],
      (match) => match[2],
    );
    const bypassArguments = preflight.match(/^\s+bypass_args=\((-H.+)\)$/m)?.[1];

    expect(request).toBeDefined();
    expect(flags).not.toContain('--location');
    expect(flags).not.toContain('--location-trusted');
    expect(flags.filter((flag) => flag?.startsWith('-') && !flag.startsWith('--'))).not.toEqual(
      expect.arrayContaining([expect.stringContaining('L')]),
    );
    expect(request).toContain('"${bypass_args[@]}" "$SITE_URL/es"');
    expect(bypassArguments).toBe(
      '-H "x-vercel-protection-bypass: $VERCEL_AUTOMATION_BYPASS_SECRET"',
    );
  });
});
