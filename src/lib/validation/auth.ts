import { z } from 'zod';

import { strongPassword } from './shared';

export const emailSchema = z.string().email({ message: 'invalid_email' });

export const loginSchema = z.object({
  email: emailSchema,
  // Login accepts any length to allow legacy users; server enforces on signup.
  password: z.string().min(1, { message: 'required' }),
});

export const magicLinkSchema = z.object({
  email: emailSchema,
});

export const signupSchema = z.object({
  first_name: z.string().min(1, { message: 'required' }).max(80),
  last_name: z.string().min(1, { message: 'required' }).max(80),
  email: emailSchema,
  password: strongPassword,
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const updatePasswordSchema = z
  .object({
    password: strongPassword,
    confirm_password: z.string().min(1),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: 'passwords_do_not_match',
    path: ['confirm_password'],
  });

export const mfaSchema = z.object({
  code: z.string().length(6),
  factorId: z.string().min(1),
});

export const mfaRecoverySchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/, 'invalid_recovery_code'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type MagicLinkInput = z.infer<typeof magicLinkSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;
export type MfaInput = z.infer<typeof mfaSchema>;
export type MfaRecoveryInput = z.infer<typeof mfaRecoverySchema>;
