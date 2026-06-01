import { z } from 'zod';

// Keep this list in sync with src/i18n/routing.ts `locales`.
const SUPPORTED_LOCALES = ['en', 'es'] as const;

// IANA timezone names (loose: just a non-empty string, DB is the source of truth).
const timezoneSchema = z.string().min(1).max(80);

// E.164: +<1-3 digit country code><up to 12 digits>. Optional.
const phoneSchema = z
  .string()
  .regex(/^\+[1-9]\d{1,14}$/, { message: 'invalid_phone' })
  .nullable()
  .optional()
  .or(z.literal(''));

export const updateProfileSchema = z.object({
  given_name: z.string().min(1, { message: 'required' }).max(80),
  family_name: z.string().min(1, { message: 'required' }).max(80),
  locale: z.enum(SUPPORTED_LOCALES),
  timezone: timezoneSchema,
  phone_number: phoneSchema,
});

export const updateEmailSchema = z.object({
  email: z.string().email({ message: 'invalid_email' }),
});

const MIN_PASSWORD_LENGTH = 10;
const PASSWORD_POLICY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;

export const updatePasswordFromSettingsSchema = z
  .object({
    current_password: z.string().min(1),
    password: z
      .string()
      .min(MIN_PASSWORD_LENGTH, { message: 'password_too_short' })
      .regex(PASSWORD_POLICY_REGEX, { message: 'weak_password' }),
    confirm_password: z.string().min(1),
  })
  .refine((d) => d.password === d.confirm_password, {
    message: 'passwords_do_not_match',
    path: ['confirm_password'],
  })
  .refine((d) => d.current_password !== d.password, {
    message: 'new_password_same_as_current',
    path: ['password'],
  });

// Delete account requires typing a confirmation phrase in the user's locale.
// UI accepts both "ELIMINAR" (es) and "DELETE" (en).
export const deleteAccountSchema = z.object({
  confirmation: z.string().refine((v) => v === 'ELIMINAR' || v === 'DELETE', {
    message: 'invalid_confirmation_phrase',
  }),
});

// Avatar upload: validated client-side before FormData is sent.
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024; // 2 MiB
export const AVATAR_ALLOWED_MIME = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
] as const;

export function validateAvatarFile(file: File): { ok: true } | { ok: false; error: string } {
  if (!(AVATAR_ALLOWED_MIME as readonly string[]).includes(file.type)) {
    return { ok: false, error: 'invalid_mime' };
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return { ok: false, error: 'file_too_large' };
  }
  return { ok: true };
}

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdateEmailInput = z.infer<typeof updateEmailSchema>;
export type UpdatePasswordFromSettingsInput = z.infer<typeof updatePasswordFromSettingsSchema>;
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
