import { describe, expect, it } from 'vitest';

import {
  assertCanonicalCloudAcceptanceUrl,
  assertSupabaseGenerateLinkStatus,
  MERCADOPAGO_PRODUCTION_URL,
} from './e2e/mercadopago-cloud-acceptance-config';

describe('assertCanonicalCloudAcceptanceUrl', () => {
  it('rejects a temporary Vercel deployment URL for production acceptance', () => {
    expect(() =>
      assertCanonicalCloudAcceptanceUrl('https://iroko-5j2mxg7hc-pipec80-labs.vercel.app'),
    ).toThrow('mercadopago_cloud_acceptance_requires_canonical_production_url');
  });

  it('accepts the official stable production URL', () => {
    expect(() => assertCanonicalCloudAcceptanceUrl(MERCADOPAGO_PRODUCTION_URL)).not.toThrow();
  });

  it('rejects a temporary deployment URL in every acceptance path', () => {
    expect(() =>
      assertCanonicalCloudAcceptanceUrl('https://iroko-5j2mxg7hc-pipec80-labs.vercel.app'),
    ).toThrow('mercadopago_cloud_acceptance_requires_canonical_production_url');
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
