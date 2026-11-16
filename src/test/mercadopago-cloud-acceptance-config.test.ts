// @vitest-environment node
import { describe, expect, it } from 'vitest';

import {
  assertCanonicalCloudAcceptanceUrl,
  assertSupabaseGenerateLinkStatus,
  MERCADOPAGO_PRODUCTION_URL,
  supabaseAdminHeaders,
  supabaseGenerateLinkTokenHash,
} from './e2e/mercadopago-cloud-acceptance-config';

describe('protected Auth admin requests', () => {
  it('identifies its server caller and sends an opaque secret only as an API key', () => {
    const headers = supabaseAdminHeaders('sb_secret_fixture_not_a_real_key');
    expect(headers.apikey).toBe('sb_secret_fixture_not_a_real_key');
    expect(headers.Authorization).toBeUndefined();
    expect(headers['User-Agent']).toBe('Iroko-Cloud-Acceptance/1.0');
  });

  it('retains JWT authorization for a legacy service key without a browser user agent', () => {
    const headers = supabaseAdminHeaders('eyJfixture.payload.signature');
    expect(headers.Authorization).toBe('Bearer eyJfixture.payload.signature');
    expect(headers['User-Agent']).toBe('Iroko-Cloud-Acceptance/1.0');
  });
});

describe('raw GoTrue generate_link response', () => {
  it('reads the top-level token returned by the HTTP endpoint', () => {
    expect(supabaseGenerateLinkTokenHash({ hashed_token: 'fixture-hash' })).toBe('fixture-hash');
  });

  it.each([
    null,
    {},
    { hashed_token: '' },
    { hashed_token: 123 },
    { properties: { hashed_token: 'fixture-hash' } },
  ])('rejects invalid or SDK-wrapped input without reflecting it', (body) => {
    expect(() => supabaseGenerateLinkTokenHash(body)).toThrow(
      'mercadopago_cloud_acceptance_invalid_generate_link_response',
    );
  });
});

describe('assertCanonicalCloudAcceptanceUrl', () => {
  it('rejects a temporary Vercel deployment URL for production acceptance', () => {
    expect(() =>
      assertCanonicalCloudAcceptanceUrl('https://iroko-5j2mxg7hc-pipec80-labs.vercel.app'),
    ).toThrow('mercadopago_cloud_acceptance_requires_canonical_production_url');
  });

  it('accepts the official stable production URL', () => {
    expect(() => assertCanonicalCloudAcceptanceUrl(MERCADOPAGO_PRODUCTION_URL)).not.toThrow();
  });
});

describe('assertSupabaseGenerateLinkStatus', () => {
  it('reports only the failed HTTP status for a rejected OTP generation', () => {
    expect(() => assertSupabaseGenerateLinkStatus(401)).toThrow(
      'mercadopago_cloud_acceptance_generate_link_failed_401',
    );
  });

  it('accepts a successful OTP generation status', () => {
    expect(() => assertSupabaseGenerateLinkStatus(200)).not.toThrow();
  });
});
