import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  CONSENT_COOKIE_NAME,
  hasConsent,
  isConsentBannerVisible,
  parseConsentCookie,
  reopenConsentBanner,
  subscribeToConsent,
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

describe('subscribeToConsent', () => {
  afterEach(() => {
    document.cookie = `${CONSENT_COOKIE_NAME}=; path=/; max-age=0`;
  });

  it('notifies subscribed listeners when writeConsentCookie is called', () => {
    const listener = vi.fn();
    subscribeToConsent(listener);

    writeConsentCookie({ analytics: true, marketing: false });

    expect(listener).toHaveBeenCalledOnce();
  });

  it('stops notifying a listener after it unsubscribes', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToConsent(listener);
    unsubscribe();

    writeConsentCookie({ analytics: true, marketing: false });

    expect(listener).not.toHaveBeenCalled();
  });

  it('notifies every subscribed listener on the same write', () => {
    const first = vi.fn();
    const second = vi.fn();
    subscribeToConsent(first);
    subscribeToConsent(second);

    writeConsentCookie({ analytics: false, marketing: true });

    expect(first).toHaveBeenCalledOnce();
    expect(second).toHaveBeenCalledOnce();
  });

  it('notifies subscribed listeners when reopenConsentBanner is called', () => {
    const listener = vi.fn();
    subscribeToConsent(listener);

    reopenConsentBanner();

    expect(listener).toHaveBeenCalledOnce();
  });
});

describe('isConsentBannerVisible', () => {
  afterEach(() => {
    document.cookie = `${CONSENT_COOKIE_NAME}=; path=/; max-age=0`;
  });

  it('is true when there is no stored choice yet', () => {
    expect(isConsentBannerVisible()).toBe(true);
  });

  it('is false once a choice has been written', () => {
    writeConsentCookie({ analytics: true, marketing: false });
    expect(isConsentBannerVisible()).toBe(false);
  });

  it('becomes true again after reopenConsentBanner, without touching the existing cookie', () => {
    writeConsentCookie({ analytics: true, marketing: false });

    reopenConsentBanner();

    expect(isConsentBannerVisible()).toBe(true);
    expect(hasConsent('analytics')).toBe(true);
  });

  it('returns to false once a new choice is saved after reopening', () => {
    writeConsentCookie({ analytics: true, marketing: false });
    reopenConsentBanner();

    writeConsentCookie({ analytics: false, marketing: false });

    expect(isConsentBannerVisible()).toBe(false);
  });
});
