import { describe, expect, it } from 'vitest';

import { getSafeNavigationHref, normalizeNavigationLink } from './navigation-link';

describe('navigation links', () => {
  it.each([
    [undefined, null],
    [null, null],
    ['', null],
    ['   ', null],
    ['/', '/'],
    ['/dashboard/billing', '/dashboard/billing'],
    ['/es/dashboard/members?tab=all#users', '/es/dashboard/members?tab=all#users'],
    [' /a/../es/café ', '/es/caf%C3%A9'],
    ['HTTPS://EXAMPLE.COM:443/a/../b?q=é#ñ', 'https://example.com/b?q=%C3%A9#%C3%B1'],
    ['https://mañana.example', 'https://xn--maana-pta.example/'],
  ])('normalizes %j to %j and is idempotent', (input, href) => {
    expect(normalizeNavigationLink(input)).toEqual({ valid: true, href });
    expect(normalizeNavigationLink(href)).toEqual({ valid: true, href });
  });

  it.each([
    'javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    'data:text/html,x',
    'vbscript:x',
    'file:///etc/passwd',
    'ftp://example.com',
    'mailto:a@example.com',
    'http://example.com',
    '//example.com',
    '/a/..//example.com',
    '/a\\b',
    '\n/es/dashboard',
    '/es/\tusers',
    '/a\u007fb',
    '/a\u0085b',
    'https://user:pass@example.com',
    'https://@example.com',
    'https:/example.com',
    'https:///example.com',
    'https://',
    '/bad%zz',
    '/bad%',
    42,
    {},
  ])('rejects %j and renders without navigation', (input) => {
    expect(normalizeNavigationLink(input)).toEqual({ valid: false, error: 'invalid_link' });
    expect(getSafeNavigationHref(input)).toBeNull();
  });

  it('enforces the length of the encoded canonical href', () => {
    const boundary = '/' + 'a'.repeat(1999);
    expect(getSafeNavigationHref(boundary)).toBe(boundary);
    expect(getSafeNavigationHref(boundary + 'a')).toBeNull();
    expect(getSafeNavigationHref('/' + 'é'.repeat(334))).toBeNull();
  });
});
