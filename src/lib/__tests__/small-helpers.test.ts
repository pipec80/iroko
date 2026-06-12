import { describe, expect, it, vi } from 'vitest';

vi.mock('@/env', () => ({
  env: { NEXT_PUBLIC_SUPABASE_URL: 'https://proj.supabase.co' },
}));

import { storageUrl } from '../storage';
import { cn } from '../utils';
import { parseE164, PHONE_COUNTRIES } from '../phone-countries';

describe('storageUrl', () => {
  it('builds the public CDN URL from a storage path', () => {
    expect(storageUrl('avatars/abc-123/avatar.jpg')).toBe(
      'https://proj.supabase.co/storage/v1/object/public/avatars/abc-123/avatar.jpg',
    );
  });

  it('passes through legacy absolute URLs untouched', () => {
    expect(storageUrl('https://cdn.example.com/x.png')).toBe('https://cdn.example.com/x.png');
  });

  it('returns null for null, undefined and empty path', () => {
    const missingPath: string | undefined = undefined;
    expect(storageUrl(null)).toBeNull();
    expect(storageUrl(missingPath)).toBeNull();
    expect(storageUrl('')).toBeNull();
  });
});

describe('cn', () => {
  it('merges conditional classes and resolves Tailwind conflicts', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
    expect(cn('text-sm', false, 'font-bold')).toBe('text-sm font-bold');
  });
});

describe('parseE164', () => {
  it('splits a Chilean number into dial code and local number', () => {
    expect(parseE164('+56912345678')).toEqual({
      iso: 'CL',
      dialCode: '+56',
      localNumber: '912345678',
    });
  });

  it('matches the longest dial code first — +593 is not consumed by +5', () => {
    expect(parseE164('+593987654321')).toEqual({
      iso: 'EC',
      dialCode: '+593',
      localNumber: '987654321',
    });
  });

  it('falls back to the default country when input has no plus sign', () => {
    expect(parseE164('912345678')).toEqual({ iso: 'CL', dialCode: '+56', localNumber: '' });
  });

  it('falls back keeping the digits when the dial code is unknown', () => {
    const result = parseE164('+99912345');
    expect(result.iso).toBe('CL');
    expect(result.localNumber).toBe('99912345');
  });

  it('has unique ISO codes in the country table', () => {
    const isos = PHONE_COUNTRIES.map((c) => c.iso);
    expect(new Set(isos).size).toBe(isos.length);
  });
});
