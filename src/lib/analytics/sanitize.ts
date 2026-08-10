const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Query params that legitimately carry a value analytics must never see:
// invitation/recovery tokens and the visitor's own email echoed back from
// signup/confirm links.
const SENSITIVE_QUERY_PARAMS = ['token', 'email', 'code'];

/**
 * Strips path segments and query params that can carry a project slug,
 * a database UUID, or a token/email — the shape pageview capture
 * (`$current_url` / `$pathname`) is normalized through before it ever
 * reaches PostHog. Pure and total: never throws on a malformed input.
 */
export function sanitizePath(pathname: string): string {
  const segments = pathname.split('/');

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    if (!segment) continue;

    if (UUID_PATTERN.test(segment)) {
      segments[i] = ':id';
      continue;
    }

    // The segment right after /projects/ is a user-chosen project slug —
    // the one non-UUID dynamic route param in the app today.
    const previous = segments[i - 1];
    if (previous === 'projects' && segment !== ':id') {
      segments[i] = ':slug';
    }
  }

  return segments.join('/');
}

/** Same normalization as `sanitizePath`, applied to a full URL's pathname + query string. */
export function sanitizeUrl(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return sanitizePath(url);
  }

  parsed.pathname = sanitizePath(parsed.pathname);
  for (const param of SENSITIVE_QUERY_PARAMS) {
    if (parsed.searchParams.has(param)) parsed.searchParams.set(param, ':redacted');
  }

  return `${parsed.pathname}${parsed.search}`;
}
