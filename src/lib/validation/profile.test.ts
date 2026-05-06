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
  };

  it('accepts valid input', () => {
    expect(updateProfileSchema.safeParse(base).success).toBe(true);
  });

  it('accepts null phone', () => {
    expect(updateProfileSchema.safeParse({ ...base, phone_number: null }).success).toBe(true);
  });

  it('accepts empty-string phone', () => {
    expect(updateProfileSchema.safeParse({ ...base, phone_number: '' }).success).toBe(true);
  });

  it('rejects local phone format (no country code)', () => {
    expect(updateProfileSchema.safeParse({ ...base, phone_number: '912345678' }).success).toBe(
      false,
    );
  });

  it('rejects unknown locale', () => {
    expect(
      updateProfileSchema.safeParse({ ...base, locale: 'fr' as unknown as 'es' }).success,
    ).toBe(false);
  });

  it('rejects empty given_name', () => {
    expect(updateProfileSchema.safeParse({ ...base, given_name: '' }).success).toBe(false);
  });
});

describe('updateEmailSchema', () => {
  it('accepts valid email', () => {
    expect(updateEmailSchema.safeParse({ email: 'a@b.com' }).success).toBe(true);
  });

  it('rejects invalid email', () => {
    expect(updateEmailSchema.safeParse({ email: 'x' }).success).toBe(false);
  });
});

describe('updatePasswordFromSettingsSchema', () => {
  const valid = {
    current_password: 'OldPass123',
    password: 'NewPass1234',
    confirm_password: 'NewPass1234',
  };

  it('accepts matching strong passwords with a different current', () => {
    expect(updatePasswordFromSettingsSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects mismatched confirm', () => {
    const result = updatePasswordFromSettingsSchema.safeParse({
      ...valid,
      confirm_password: 'NewPass9999',
    });
    expect(result.success).toBe(false);
  });

  it('rejects new password equal to current', () => {
    const result = updatePasswordFromSettingsSchema.safeParse({
      current_password: 'NewPass1234',
      password: 'NewPass1234',
      confirm_password: 'NewPass1234',
    });
    expect(result.success).toBe(false);
  });

  it('rejects weak new password', () => {
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
  it('accepts ELIMINAR', () => {
    expect(deleteAccountSchema.safeParse({ confirmation: 'ELIMINAR' }).success).toBe(true);
  });
  it('accepts DELETE', () => {
    expect(deleteAccountSchema.safeParse({ confirmation: 'DELETE' }).success).toBe(true);
  });
  it('rejects anything else', () => {
    expect(deleteAccountSchema.safeParse({ confirmation: 'eliminar' }).success).toBe(false);
    expect(deleteAccountSchema.safeParse({ confirmation: 'BORRAR' }).success).toBe(false);
    expect(deleteAccountSchema.safeParse({ confirmation: '' }).success).toBe(false);
  });
});

describe('validateAvatarFile', () => {
  function makeFile(size: number, type: string): File {
    return new File([new Uint8Array(size)], 'avatar.png', { type });
  }

  it('accepts valid png under 2 MiB', () => {
    expect(validateAvatarFile(makeFile(100_000, 'image/png'))).toEqual({ ok: true });
  });

  it('rejects unsupported mime', () => {
    const result = validateAvatarFile(makeFile(100, 'application/pdf'));
    expect(result).toEqual({ ok: false, error: 'invalid_mime' });
  });

  it('rejects files over 2 MiB', () => {
    const result = validateAvatarFile(makeFile(AVATAR_MAX_BYTES + 1, 'image/jpeg'));
    expect(result).toEqual({ ok: false, error: 'file_too_large' });
  });
});
