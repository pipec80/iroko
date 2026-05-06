import { describe, expect, it } from 'vitest';

import {
  forgotPasswordSchema,
  loginSchema,
  magicLinkSchema,
  signupSchema,
  updatePasswordSchema,
} from './auth';

describe('loginSchema', () => {
  it('accepts valid email + any password length (legacy users)', () => {
    expect(loginSchema.safeParse({ email: 'a@b.com', password: 'x' }).success).toBe(true);
  });

  it('rejects invalid email', () => {
    expect(loginSchema.safeParse({ email: 'notanemail', password: 'any' }).success).toBe(false);
  });

  it('rejects empty password', () => {
    expect(loginSchema.safeParse({ email: 'a@b.com', password: '' }).success).toBe(false);
  });
});

describe('signupSchema (strong password policy)', () => {
  const base = { first_name: 'Ada', last_name: 'Lovelace', email: 'ada@example.com' };

  it('accepts password meeting policy (10+ chars, lower+upper+digit)', () => {
    expect(signupSchema.safeParse({ ...base, password: 'SafePass123' }).success).toBe(true);
  });

  it('rejects password shorter than 10 chars', () => {
    const result = signupSchema.safeParse({ ...base, password: 'Short1A' });
    expect(result.success).toBe(false);
  });

  it('rejects password without uppercase', () => {
    expect(signupSchema.safeParse({ ...base, password: 'alllowercase1' }).success).toBe(false);
  });

  it('rejects password without lowercase', () => {
    expect(signupSchema.safeParse({ ...base, password: 'ALLUPPERCASE1' }).success).toBe(false);
  });

  it('rejects password without digit', () => {
    expect(signupSchema.safeParse({ ...base, password: 'NoDigitsHere' }).success).toBe(false);
  });

  it('rejects empty first_name', () => {
    expect(
      signupSchema.safeParse({ ...base, first_name: '', password: 'SafePass123' }).success,
    ).toBe(false);
  });

  it('rejects first_name longer than 80 chars', () => {
    expect(
      signupSchema.safeParse({ ...base, first_name: 'a'.repeat(81), password: 'SafePass123' })
        .success,
    ).toBe(false);
  });
});

describe('magicLinkSchema', () => {
  it('accepts valid email', () => {
    expect(magicLinkSchema.safeParse({ email: 'a@b.com' }).success).toBe(true);
  });

  it('rejects invalid email', () => {
    expect(magicLinkSchema.safeParse({ email: 'x' }).success).toBe(false);
  });
});

describe('forgotPasswordSchema', () => {
  it('accepts valid email', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'a@b.com' }).success).toBe(true);
  });
});

describe('updatePasswordSchema', () => {
  it('accepts matching strong passwords', () => {
    expect(
      updatePasswordSchema.safeParse({
        password: 'SafePass123',
        confirm_password: 'SafePass123',
      }).success,
    ).toBe(true);
  });

  it('rejects mismatched passwords', () => {
    const result = updatePasswordSchema.safeParse({
      password: 'SafePass123',
      confirm_password: 'DifferentPass123',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.confirm_password).toContain(
        'passwords_do_not_match',
      );
    }
  });

  it('rejects weak password even if both match', () => {
    expect(
      updatePasswordSchema.safeParse({ password: 'short', confirm_password: 'short' }).success,
    ).toBe(false);
  });
});
