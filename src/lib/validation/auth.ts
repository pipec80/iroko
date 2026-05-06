import { z } from 'zod';

// Mirrors supabase/config.toml: minimum_password_length = 10,
// password_requirements = "lower_upper_letters_digits"
const MIN_PASSWORD_LENGTH = 10;
const PASSWORD_POLICY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;

const strongPassword = z
  .string()
  .min(MIN_PASSWORD_LENGTH, { message: 'password_too_short' })
  .regex(PASSWORD_POLICY_REGEX, { message: 'weak_password' });

export const emailSchema = z.string().email();

export const loginSchema = z.object({
  email: emailSchema,
  // Login accepts any length to allow legacy users; server enforces on signup.
  password: z.string().min(1),
});

export const magicLinkSchema = z.object({
  email: emailSchema,
});

export const signupSchema = z.object({
  first_name: z.string().min(1).max(80),
  last_name: z.string().min(1).max(80),
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

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type MagicLinkInput = z.infer<typeof magicLinkSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;
