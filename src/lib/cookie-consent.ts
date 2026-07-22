export const CONSENT_COOKIE_NAME = 'cookie_consent';
const CONSENT_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export type ConsentCategory = 'analytics' | 'marketing';

export interface ConsentState {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
}

function isConsentState(value: unknown): value is ConsentState {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    candidate.necessary === true &&
    typeof candidate.analytics === 'boolean' &&
    typeof candidate.marketing === 'boolean'
  );
}

/**
 * Parses the `cookie_consent` cookie out of a raw `document.cookie` string.
 * Never throws — corrupted or missing cookies resolve to `null` (treated as "no consent").
 */
export function parseConsentCookie(cookieString: string): ConsentState | null {
  const entries = cookieString.split(';').map((entry) => entry.trim());
  const match = entries.find((entry) => entry.startsWith(`${CONSENT_COOKIE_NAME}=`));
  if (!match) return null;

  const rawValue = match.slice(CONSENT_COOKIE_NAME.length + 1);

  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(rawValue));
    return isConsentState(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Reads consent for a single category from the current document. Defaults to `false`. */
export function hasConsent(category: ConsentCategory): boolean {
  const state = parseConsentCookie(document.cookie);
  return state?.[category] ?? false;
}

/** Persists the visitor's cookie choice for 1 year. `necessary` is always `true`. */
export function writeConsentCookie(state: { analytics: boolean; marketing: boolean }): void {
  const value: ConsentState = { necessary: true, ...state };
  document.cookie = `${CONSENT_COOKIE_NAME}=${encodeURIComponent(
    JSON.stringify(value),
  )}; path=/; max-age=${CONSENT_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
}
