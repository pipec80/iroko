export type NavigationLinkResult =
  { valid: true; href: string | null } | { valid: false; error: 'invalid_link' };

const INTERNAL_BASE = 'https://navigation.invalid';
const INVALID_LINK = { valid: false, error: 'invalid_link' } as const;

/** Canonicalizes navigation only; this does not authorize server-side URL fetching. */
export function normalizeNavigationLink(value: unknown): NavigationLinkResult {
  if (value === undefined || value === null) return { valid: true, href: null };
  if (typeof value !== 'string') return INVALID_LINK;
  // URL parsing strips some controls; inspect the original input before trimming.
  if (/[\u0000-\u001f\u007f-\u009f\\]/u.test(value)) return INVALID_LINK;
  const input = value.trim();
  if (!input) return { valid: true, href: null };
  if (/%(?![\da-f]{2})/iu.test(input)) return INVALID_LINK;

  const internal = input.startsWith('/') && !input.startsWith('//');
  if (!internal && !/^https:\/\/[^/?#@]+(?:[/?#]|$)/iu.test(input)) return INVALID_LINK;
  try {
    const url = new URL(input, INTERNAL_BASE);
    if (url.protocol !== 'https:' || url.username || url.password) return INVALID_LINK;
    const href = internal ? `${url.pathname}${url.search}${url.hash}` : url.href;
    if (
      href.length > 2000 ||
      (internal && (url.origin !== INTERNAL_BASE || href.startsWith('//')))
    ) {
      return INVALID_LINK;
    }
    return { valid: true, href };
  } catch {
    return INVALID_LINK;
  }
}

/** Historical or untrusted data fails closed without removing its surrounding content. */
export function getSafeNavigationHref(value: unknown): string | null {
  const result = normalizeNavigationLink(value);
  return result.valid ? result.href : null;
}
