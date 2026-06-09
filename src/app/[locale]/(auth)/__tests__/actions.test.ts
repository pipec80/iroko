import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.hoisted() garantiza que las referencias estén disponibles cuando vi.mock() es hoisted
const mocks = vi.hoisted(() => ({
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
  listFactors: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      signUp: mocks.signUp,
      signInWithPassword: mocks.signInWithPassword,
      mfa: { listFactors: mocks.listFactors },
    },
  }),
}));

vi.mock('next-intl/server', () => ({
  getLocale: vi.fn().mockResolvedValue('es'),
}));

vi.mock('@/i18n/routing', () => ({
  redirect: mocks.redirect,
}));

vi.mock('@/env', () => ({
  env: {
    SITE_URL: 'http://localhost:3000',
    LOG_LEVEL: 'silent',
    NODE_ENV: 'test',
    SUPABASE_SECRET_KEY: 'test-key',
    NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'test-anon-key',
  },
}));

import { signUpAction, signInAction } from '../actions';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

const validSignupData = {
  first_name: 'Ana',
  last_name: 'García',
  email: 'ana@example.com',
  password: 'StrongPass1!',
};

const validLoginData = {
  email: 'ana@example.com',
  password: 'StrongPass1!',
};

const PREV = {};

// ─── signUpAction ────────────────────────────────────────────────────────────

describe('signUpAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.redirect.mockImplementation(() => {
      throw new Error('NEXT_REDIRECT');
    });
  });

  describe('validation', () => {
    it('returns fieldErrors when email is empty', async () => {
      const fd = makeFormData({ ...validSignupData, email: '' });
      const result = await signUpAction(PREV, fd);
      expect(result.fieldErrors).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it('returns fieldErrors when password is too weak (< 10 chars)', async () => {
      const fd = makeFormData({ ...validSignupData, password: 'weak' });
      const result = await signUpAction(PREV, fd);
      expect(result.fieldErrors).toBeDefined();
    });

    it('returns fieldErrors when password has no digit', async () => {
      const fd = makeFormData({ ...validSignupData, password: 'NoDigitHere!!' });
      const result = await signUpAction(PREV, fd);
      expect(result.fieldErrors).toBeDefined();
    });
  });

  describe('anti-enumeration (F3-02)', () => {
    it('redirects to /signup/confirmation when user_already_exists — same UX as new signup', async () => {
      mocks.signUp.mockResolvedValue({
        error: { code: 'user_already_exists', message: 'User already registered' },
      });

      const fd = makeFormData(validSignupData);
      await expect(signUpAction(PREV, fd)).rejects.toThrow('NEXT_REDIRECT');

      expect(mocks.redirect).toHaveBeenCalledWith(
        expect.objectContaining({
          href: expect.stringContaining('/signup/confirmation'),
        }),
      );
    });

    it('redirects when email_exists variant is returned', async () => {
      mocks.signUp.mockResolvedValue({
        error: { code: 'email_exists', message: 'Email already in use' },
      });

      const fd = makeFormData(validSignupData);
      await expect(signUpAction(PREV, fd)).rejects.toThrow('NEXT_REDIRECT');

      expect(mocks.redirect).toHaveBeenCalledWith(
        expect.objectContaining({
          href: expect.stringContaining('/signup/confirmation'),
        }),
      );
    });

    it('returns error code for other signup failures — not enumeration-safe errors', async () => {
      mocks.signUp.mockResolvedValue({
        error: { code: 'over_email_send_rate_limit', message: 'Too many requests' },
      });

      const fd = makeFormData(validSignupData);
      const result = await signUpAction(PREV, fd);

      expect(result.error).toBe('over_email_send_rate_limit');
      expect(mocks.redirect).not.toHaveBeenCalled();
    });

    it('redirects to /signup/confirmation on successful new signup', async () => {
      mocks.signUp.mockResolvedValue({ error: null, data: { user: { id: 'uuid-123' } } });

      const fd = makeFormData(validSignupData);
      await expect(signUpAction(PREV, fd)).rejects.toThrow('NEXT_REDIRECT');

      expect(mocks.redirect).toHaveBeenCalledWith(
        expect.objectContaining({
          href: expect.stringContaining('/signup/confirmation'),
        }),
      );
    });
  });
});

// ─── signInAction ────────────────────────────────────────────────────────────

describe('signInAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.redirect.mockImplementation(() => {
      throw new Error('NEXT_REDIRECT');
    });
    mocks.listFactors.mockResolvedValue({ data: { all: [] } });
  });

  describe('validation', () => {
    it('returns fieldErrors when email is missing', async () => {
      const fd = makeFormData({ ...validLoginData, email: '' });
      const result = await signInAction(PREV, fd);
      expect(result.fieldErrors).toBeDefined();
    });

    it('returns fieldErrors when password is missing', async () => {
      const fd = makeFormData({ ...validLoginData, password: '' });
      const result = await signInAction(PREV, fd);
      expect(result.fieldErrors).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('returns generic error code on invalid credentials — does not leak detail', async () => {
      mocks.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { code: 'invalid_credentials', message: 'Invalid login credentials' },
      });

      const fd = makeFormData(validLoginData);
      const result = await signInAction(PREV, fd);

      expect(result.error).toBe('invalid_credentials');
      expect(mocks.redirect).not.toHaveBeenCalled();
    });

    it('falls back to invalid_credentials when error has no code', async () => {
      mocks.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Unknown error' },
      });

      const fd = makeFormData(validLoginData);
      const result = await signInAction(PREV, fd);

      expect(result.error).toBe('invalid_credentials');
    });
  });

  describe('success flow', () => {
    it('redirects to /dashboard on successful login without MFA', async () => {
      mocks.signInWithPassword.mockResolvedValue({
        data: { user: { id: 'uuid-123' }, session: {} },
        error: null,
      });
      mocks.listFactors.mockResolvedValue({ data: { all: [] } });

      const fd = makeFormData(validLoginData);
      await expect(signInAction(PREV, fd)).rejects.toThrow('NEXT_REDIRECT');

      expect(mocks.redirect).toHaveBeenCalled();
    });

    it('returns mfa_required when user has a verified TOTP factor', async () => {
      mocks.signInWithPassword.mockResolvedValue({
        data: { user: { id: 'uuid-123' }, session: {} },
        error: null,
      });
      mocks.listFactors.mockResolvedValue({
        data: { all: [{ id: 'factor-totp', status: 'verified', factor_type: 'totp' }] },
      });

      const fd = makeFormData(validLoginData);
      const result = await signInAction(PREV, fd);

      expect(result.success).toBe('mfa_required');
      expect(result.mfaFactorId).toBe('factor-totp');
    });
  });
});
