const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function normalizePath(pathname: string): string {
  const segments = pathname.split('/');
  return segments
    .map((segment, index) => {
      if (UUID_PATTERN.test(segment)) return ':id';
      if (segments[index - 1] === 'projects' && segment) return ':slug';
      return segment;
    })
    .join('/');
}

/** Analytics retains only a normalized pathname; URL parsing failures fail closed. */
export function sanitizeUrl(url: string): string {
  try {
    if (!url.startsWith('/') && !/^https?:\/\//i.test(url)) return ':redacted';
    const parsed = new URL(url, 'https://analytics.invalid');
    if (!['http:', 'https:'].includes(parsed.protocol)) return ':redacted';
    return normalizePath(parsed.pathname);
  } catch {
    return ':redacted';
  }
}

/** Removes query/fragment data and anonymizes dynamic route segments. */
export function sanitizePath(pathname: string): string {
  return sanitizeUrl(pathname);
}

// posthog-js session-props and persistence also emit initial and session-entry copies.
const URL_PROPERTY = /^\$(?:(?:initial|session_entry)_)?(?:current_url|url|pathname|referrer)$/;
// CAMPAIGN_PARAMS/PERSONAL_DATA_CAMPAIGN_PARAMS and getSearchInfo in the installed
// @posthog/browser-common SDK. Treat all prefix variants identically.
const ATTRIBUTION_NAMES = new Set([
  'client_session_props',
  'gclid',
  'gclsrc',
  'dclid',
  'gbraid',
  'wbraid',
  'fbclid',
  'msclkid',
  'twclid',
  'li_fat_id',
  'igshid',
  'ttclid',
  'rdt_cid',
  'epik',
  'qclid',
  'sccid',
  'irclid',
  '_kx',
  'gad_source',
  'mc_cid',
  'mc_eid',
  'ph_keyword',
  'campaign_params',
  'referrer_info',
  'person_info',
  'referring_domain',
  'search_engine',
  'search_keyword',
]);

/** Sanitizes SDK-generated properties before serialization, preserving taxonomy fields. */
export function sanitizeAnalyticsProperties(
  properties: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(properties)) {
    const attribution = key.replace(/^\$?(?:(?:initial|session_entry)_)?/, '').toLowerCase();
    if (attribution.startsWith('utm_') || ATTRIBUTION_NAMES.has(attribution)) continue;
    if (URL_PROPERTY.test(key)) {
      result[key] = typeof value === 'string' ? sanitizeUrl(value) : ':redacted';
    } else if (key === '$set' || key === '$set_once') {
      if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
        result[key] = sanitizeAnalyticsProperties(value as Record<string, unknown>);
      }
    } else {
      result[key] = value;
    }
  }
  return result;
}
