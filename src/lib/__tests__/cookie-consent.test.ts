import { afterEach, describe, expect, it } from 'vitest';

import {
  CONSENT_COOKIE_NAME,
  hasConsent,
  parseConsentCookie,
  writeConsentCookie,
} from '../cookie-consent';

describe('parseConsentCookie', () => {
  it('returns null when the cookie string is empty', () => {
    expect(parseConsentCookie('')).toBeNull();
  });

  it('returns null when the consent cookie is not present among other cookies', () => {
    expect(parseConsentCookie('theme=dark; NEXT_LOCALE=es')).toBeNull();
  });

  it('parses a valid consent cookie with mixed categories', () => {
    const cookieString = `${CONSENT_COOKIE_NAME}=${encodeURIComponent(
      JSON.stringify({ necessary: true, analytics: true, marketing: false }),
    )}`;
    expect(parseConsentCookie(cookieString)).toEqual({
      necessary: true,
      analytics: true,
      marketing: false,
    });
  });

  it('returns null for corrupted JSON instead of throwing', () => {
    const cookieString = `${CONSENT_COOKIE_NAME}=not-json-at-all`;
    expect(() => parseConsentCookie(cookieString)).not.toThrow();
    expect(parseConsentCookie(cookieString)).toBeNull();
  });

  it('returns null when the parsed value has the wrong shape', () => {
    const cookieString = `${CONSENT_COOKIE_NAME}=${encodeURIComponent(JSON.stringify({ foo: 'bar' }))}`;
    expect(parseConsentCookie(cookieString)).toBeNull();
  });

  it('reads the target cookie among several cookies on the document', () => {
    const cookieString = `theme=dark; ${CONSENT_COOKIE_NAME}=${encodeURIComponent(
      JSON.stringify({ necessary: true, analytics: false, marketing: true }),
    )}; NEXT_LOCALE=es`;
    expect(parseConsentCookie(cookieString)).toEqual({
      necessary: true,
      analytics: false,
      marketing: true,
    });
  });
});

describe('hasConsent', () => {
  afterEach(() => {
    document.cookie = `${CONSENT_COOKIE_NAME}=; path=/; max-age=0`;
  });

  it('returns false when there is no consent cookie', () => {
    expect(hasConsent('analytics')).toBe(false);
    expect(hasConsent('marketing')).toBe(false);
  });

  it('returns true for a category set to true in a real document.cookie', () => {
    writeConsentCookie({ analytics: true, marketing: false });
    expect(hasConsent('analytics')).toBe(true);
    expect(hasConsent('marketing')).toBe(false);
  });
});
