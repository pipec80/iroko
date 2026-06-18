import { describe, expect, it } from 'vitest';

import {
  AVATAR_MAX_BYTES,
  deleteAccountSchema,
  updateEmailSchema,
  updatePasswordFromSettingsSchema,
  updateProfileSchema,
  validateAvatarFile,
} from './profile';

describe('updateProfileSchema', () => {
  const base = {
    given_name: 'Ada',
    family_name: 'Lovelace',
    locale: 'es' as const,
    timezone: 'America/Santiago',
    phone_number: '+56912345678',
    birth_date: '1990-01-15',
    bio: 'Software engineer.',
    website_url: 'https://ada.dev',
    company: 'Acme Corp',
  };

  it('should accept valid full input', () => {
    expect(updateProfileSchema.safeParse(base).success).toBe(true);
  });

  it('should accept null phone', () => {
    expect(updateProfileSchema.safeParse({ ...base, phone_number: null }).success).toBe(true);
  });

  it('should accept empty-string phone', () => {
    expect(updateProfileSchema.safeParse({ ...base, phone_number: '' }).success).toBe(true);
  });

  it('should reject local phone format (no country code)', () => {
    expect(updateProfileSchema.safeParse({ ...base, phone_number: '912345678' }).success).toBe(
      false,
    );
  });

  it('should accept all supported locales', () => {
    for (const loc of ['en', 'es', 'pt', 'fr'] as const) {
      expect(updateProfileSchema.safeParse({ ...base, locale: loc }).success).toBe(true);
    }
  });

  it('should reject unknown locale', () => {
    expect(
      updateProfileSchema.safeParse({ ...base, locale: 'de' as unknown as 'es' }).success,
    ).toBe(false);
  });

  it('should reject empty given_name', () => {
    expect(updateProfileSchema.safeParse({ ...base, given_name: '' }).success).toBe(false);
  });

  it('should accept null bio', () => {
    expect(updateProfileSchema.safeParse({ ...base, bio: null }).success).toBe(true);
  });

  it('should accept empty bio (clear)', () => {
    expect(updateProfileSchema.safeParse({ ...base, bio: '' }).success).toBe(true);
  });

  it('should reject bio over 500 chars', () => {
    expect(updateProfileSchema.safeParse({ ...base, bio: 'a'.repeat(501) }).success).toBe(false);
  });

  it('should accept empty website_url (clear)', () => {
    expect(updateProfileSchema.safeParse({ ...base, website_url: '' }).success).toBe(true);
  });

  it('should reject invalid website_url', () => {
    expect(updateProfileSchema.safeParse({ ...base, website_url: 'not-a-url' }).success).toBe(
      false,
    );
  });

  it('should accept valid birth_date', () => {
    expect(updateProfileSchema.safeParse({ ...base, birth_date: '1990-06-15' }).success).toBe(true);
  });

  it('should reject invalid birth_date format', () => {
    expect(updateProfileSchema.safeParse({ ...base, birth_date: '15/06/1990' }).success).toBe(
      false,
    );
  });

  it('should accept null birth_date', () => {
    expect(updateProfileSchema.safeParse({ ...base, birth_date: null }).success).toBe(true);
  });

  it('should accept null company', () => {
    expect(updateProfileSchema.safeParse({ ...base, company: null }).success).toBe(true);
  });

  it('should reject company over 100 chars', () => {
    expect(updateProfileSchema.safeParse({ ...base, company: 'a'.repeat(101) }).success).toBe(
      false,
    );
  });
});

describe('updateEmailSchema', () => {
  it('should accept valid email', () => {
    expect(updateEmailSchema.safeParse({ email: 'a@b.com' }).success).toBe(true);
  });

  it('should reject invalid email', () => {
    expect(updateEmailSchema.safeParse({ email: 'x' }).success).toBe(false);
  });
});

describe('updatePasswordFromSettingsSchema', () => {
  const valid = {
    current_password: 'OldPass123',
    password: 'NewPass1234',
    confirm_password: 'NewPass1234',
  };

  it('should accept matching strong passwords with a different current', () => {
    expect(updatePasswordFromSettingsSchema.safeParse(valid).success).toBe(true);
  });

  it('should reject mismatched confirm', () => {
    const result = updatePasswordFromSettingsSchema.safeParse({
      ...valid,
      confirm_password: 'NewPass9999',
    });
    expect(result.success).toBe(false);
  });

  it('should reject new password equal to current', () => {
    const result = updatePasswordFromSettingsSchema.safeParse({
      current_password: 'NewPass1234',
      password: 'NewPass1234',
      confirm_password: 'NewPass1234',
    });
    expect(result.success).toBe(false);
  });

  it('should reject weak new password', () => {
    expect(
      updatePasswordFromSettingsSchema.safeParse({
        ...valid,
        password: 'weak',
        confirm_password: 'weak',
      }).success,
    ).toBe(false);
  });
});

describe('deleteAccountSchema', () => {
  it('should accept ELIMINAR', () => {
    expect(deleteAccountSchema.safeParse({ confirmation: 'ELIMINAR' }).success).toBe(true);
  });
  it('should accept DELETE', () => {
    expect(deleteAccountSchema.safeParse({ confirmation: 'DELETE' }).success).toBe(true);
  });
  it('should reject anything else', () => {
    expect(deleteAccountSchema.safeParse({ confirmation: 'eliminar' }).success).toBe(false);
    expect(deleteAccountSchema.safeParse({ confirmation: 'BORRAR' }).success).toBe(false);
    expect(deleteAccountSchema.safeParse({ confirmation: '' }).success).toBe(false);
  });
});

describe('validateAvatarFile', () => {
  function makeFile(size: number, type: string): File {
    return new File([new Uint8Array(size)], 'avatar.png', { type });
  }

  it('should accept valid png under 2 MiB', () => {
    expect(validateAvatarFile(makeFile(100_000, 'image/png'))).toEqual({ ok: true });
  });

  it('should reject unsupported mime', () => {
    const result = validateAvatarFile(makeFile(100, 'application/pdf'));
    expect(result).toEqual({ ok: false, error: 'invalid_mime' });
  });

  it('should reject files over 2 MiB', () => {
    const result = validateAvatarFile(makeFile(AVATAR_MAX_BYTES + 1, 'image/jpeg'));
    expect(result).toEqual({ ok: false, error: 'file_too_large' });
  });
});
