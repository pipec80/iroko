import { z } from 'zod';

// Mirrors supabase/config.toml: minimum_password_length = 10,
// password_requirements = "lower_upper_letters_digits"
export const MIN_PASSWORD_LENGTH = 10;
export const PASSWORD_POLICY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;

export const strongPassword = z
  .string()
  .min(MIN_PASSWORD_LENGTH, { message: 'password_too_short' })
  .regex(PASSWORD_POLICY_REGEX, { message: 'weak_password' });
