import { describe, expect, it } from 'vitest';

import { isLocalValidation } from '@/lib/local-validation';

const local = {
  LOCAL_VALIDATION: 'true',
  SITE_URL: 'http://localhost:3000',
  NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
};

describe('local validation boundary', () => {
  it('preserves normal operation by default', () => {
    expect(isLocalValidation({})).toBe(false);
  });
  it('accepts an explicit local environment including local CI', () => {
    expect(isLocalValidation({ ...local, CI: 'true' })).toBe(true);
  });
  it.each(['VERCEL', 'VERCEL_ENV', 'NEXT_PUBLIC_VERCEL_ENV', 'NETLIFY', 'CF_PAGES'])(
    'rejects hosting marker %s',
    (marker) => {
      expect(() => isLocalValidation({ ...local, [marker]: '1' })).toThrow();
    },
  );
  it.each([
    'https://example.com',
    'http://localhost.example.com',
    'http://user:pass@localhost:3000',
    'invalid',
    undefined,
  ])('rejects a non-local site %s', (SITE_URL) => {
    expect(() => isLocalValidation({ ...local, SITE_URL })).toThrow();
  });
  it.each([
    'http://localhost:3000/path',
    'http://localhost:3000/?a=1',
    'http://localhost:3000/#fragment',
  ])('rejects a non-origin URL %s', (SITE_URL) => {
    expect(() => isLocalValidation({ ...local, SITE_URL })).toThrow();
  });
  it('rejects Cloud Supabase', () => {
    expect(() =>
      isLocalValidation({ ...local, NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co' }),
    ).toThrow();
  });
  it('rejects an independently supplied browser flag', () => {
    expect(() => isLocalValidation({ NEXT_PUBLIC_LOCAL_VALIDATION: 'true' })).toThrow();
  });
  it('accepts matching derived browser opt-in', () => {
    expect(isLocalValidation({ ...local, NEXT_PUBLIC_LOCAL_VALIDATION: 'true' })).toBe(true);
  });
  it.each(['false', 'yes'])(
    'rejects inconsistent browser flag %s',
    (NEXT_PUBLIC_LOCAL_VALIDATION) => {
      expect(() => isLocalValidation({ ...local, NEXT_PUBLIC_LOCAL_VALIDATION })).toThrow();
    },
  );
  it('accepts IPv6 loopback URLs', () => {
    expect(
      isLocalValidation({
        ...local,
        SITE_URL: 'http://[::1]:3000',
        NEXT_PUBLIC_SUPABASE_URL: 'http://[::1]:54321',
      }),
    ).toBe(true);
  });
  it('rejects malformed opt-in', () => {
    expect(() => isLocalValidation({ ...local, LOCAL_VALIDATION: 'yes' })).toThrow();
  });
});
