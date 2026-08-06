import { describe, expect, it } from 'vitest';

import { sanitizePath, sanitizeUrl } from '../sanitize';

describe('sanitizePath', () => {
  it('replaces a UUID segment with :id', () => {
    expect(sanitizePath('/es/dashboard/admin/accounts/3f2e1a10-9b8c-4d5e-8f7a-1234567890ab')).toBe(
      '/es/dashboard/admin/accounts/:id',
    );
  });

  it('replaces a project slug with :slug', () => {
    expect(sanitizePath('/es/dashboard/projects/my-secret-launch')).toBe(
      '/es/dashboard/projects/:slug',
    );
  });

  it('replaces both the project slug and the document UUID', () => {
    expect(
      sanitizePath(
        '/es/dashboard/projects/my-secret-launch/doc/3f2e1a10-9b8c-4d5e-8f7a-1234567890ab',
      ),
    ).toBe('/es/dashboard/projects/:slug/doc/:id');
  });

  it('leaves a static path untouched', () => {
    expect(sanitizePath('/es/dashboard/billing')).toBe('/es/dashboard/billing');
  });

  it('never throws on an empty or malformed path', () => {
    expect(() => sanitizePath('')).not.toThrow();
    expect(() => sanitizePath('not-a-path??')).not.toThrow();
  });
});

describe('sanitizeUrl', () => {
  it('redacts a token query param used by invitation/recovery links', () => {
    const result = sanitizeUrl('https://example.com/es/auth/accept-invitation?token=abc123secret');
    expect(result).toBe('/es/auth/accept-invitation?token=%3Aredacted');
  });

  it('redacts an email query param echoed back on the signup confirmation page', () => {
    const result = sanitizeUrl('https://example.com/es/signup/confirmation?email=user%40test.com');
    expect(result).not.toContain('user%40test.com');
    expect(result).not.toContain('@');
  });

  it('sanitizes the path portion together with the query string', () => {
    const result = sanitizeUrl(
      'https://example.com/es/dashboard/projects/my-secret-launch?tab=settings',
    );
    expect(result).toBe('/es/dashboard/projects/:slug?tab=settings');
  });

  it('never throws on a malformed URL', () => {
    expect(() => sanitizeUrl('not a valid url')).not.toThrow();
  });
});
