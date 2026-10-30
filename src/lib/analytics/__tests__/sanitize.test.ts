import { describe, expect, it } from 'vitest';
import { sanitizeAnalyticsProperties, sanitizePath, sanitizeUrl } from '../sanitize';

describe('analytics privacy boundary', () => {
  it.each([
    'gclsrc',
    'gbraid',
    'wbraid',
    'li_fat_id',
    'igshid',
    'rdt_cid',
    'epik',
    'sccid',
    '_kx',
    'gad_source',
    'ph_keyword',
    'client_session_props',
  ])('removes SDK attribution %s and initial/session copies', (key) => {
    const result = sanitizeAnalyticsProperties({
      [key]: 'PRIVATE_MARKER',
      [`$initial_${key}`]: 'PRIVATE_MARKER',
      [`$session_entry_${key}`]: 'PRIVATE_MARKER',
    });
    expect(JSON.stringify(result)).not.toContain('PRIVATE_MARKER');
  });
  it.each(['token_hash', 'access_token', 'refresh_token', 'code', 'email', 'next'])(
    'removes %s and every URL component except the safe path',
    (key) => {
      const marker = 'PRIVATE_MARKER';
      for (const url of [
        `https://user:password@example.com/es/pricing?${key}=${marker}#${marker}`,
        `/es/pricing?${key}=${encodeURIComponent(encodeURIComponent(marker))}`,
        `http://[invalid?${key}=${marker}`,
      ]) {
        expect(sanitizeUrl(url)).not.toContain(marker);
        expect(sanitizeUrl(url)).not.toContain('example.com');
      }
      expect(sanitizeUrl(`/es/pricing?${key}=${marker}`)).toBe('/es/pricing');
    },
  );
  it('fails closed for malformed inputs', () => {
    expect(sanitizeUrl('not a valid url PRIVATE_MARKER')).toBe(':redacted');
  });
  it('retains static paths and anonymizes UUIDs and project slugs', () => {
    expect(
      sanitizePath('/es/dashboard/projects/secret/doc/3f2e1a10-9b8c-4d5e-8f7a-1234567890ab'),
    ).toBe('/es/dashboard/projects/:slug/doc/:id');
  });
  it('sanitizes SDK initial, referrer, person and campaign copies while preserving taxonomy', () => {
    const secret = 'PRIVATE_MARKER';
    const input = {
      $current_url: `/es/pricing?token_hash=${secret}`,
      $pathname: `/es/pricing?code=${secret}`,
      $referrer: `https://ref.example/?email=${secret}`,
      $set: {
        $initial_current_url: `/es?next=${secret}`,
        $initial_referrer: `/es#${secret}`,
        utm_source: secret,
      },
      $set_once: { $initial_utm_campaign: secret, $initial_current_url: `/es?code=${secret}` },
      utm_campaign: secret,
      $initial_gclid: secret,
      method: 'password',
    };
    const result = sanitizeAnalyticsProperties(input);
    expect(JSON.stringify(result)).not.toContain(secret);
    expect(result.method).toBe('password');
    expect(result.$current_url).toBe('/es/pricing');
    expect(input.utm_campaign).toBe(secret);
  });
});
