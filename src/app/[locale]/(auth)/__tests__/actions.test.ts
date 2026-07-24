import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.hoisted() garantiza que las referencias estén disponibles cuando vi.mock() es hoisted
const mocks = vi.hoisted(() => ({
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
  signInWithOtp: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn(),
  resend: vi.fn(),
  listFactors: vi.fn(),
  mfaChallenge: vi.fn(),
  mfaVerify: vi.fn(),
  getClaims: vi.fn(),
  rpc: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      signUp: mocks.signUp,
      signInWithPassword: mocks.signInWithPassword,
      signInWithOtp: mocks.signInWithOtp,
      resetPasswordForEmail: mocks.resetPasswordForEmail,
      updateUser: mocks.updateUser,
      resend: mocks.resend,
      getClaims: mocks.getClaims,
      mfa: {
        listFactors: mocks.listFactors,
        challenge: mocks.mfaChallenge,
        verify: mocks.mfaVerify,
      },
    },
    rpc: mocks.rpc,
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

vi.mock('@/config/app.config', () => ({
  appConfig: { features: { onboarding: true } },
}));

import { appConfig } from '@/config/app.config';

import {
  signUpAction,
  signInAction,
  verifyMfaAction,
  verifyRecoveryAction,
  magicLinkAction,
  forgotPasswordAction,
  updatePasswordAction,
  resendConfirmationAction,
} from '../actions';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

/** El mock de redirect lanza, igual que el redirect real de next-intl/Next.js. */
function mockRedirectThrows() {
  mocks.redirect.mockImplementation(() => {
    throw new Error('NEXT_REDIRECT');
  });
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
    mockRedirectThrows();
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
    mockRedirectThrows();
    mocks.listFactors.mockResolvedValue({ data: { all: [] } });
    mocks.getClaims.mockResolvedValue({ data: { claims: { app_metadata: {} } } });
    appConfig.features.onboarding = true;
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

      expect(mocks.redirect).toHaveBeenCalledWith({ href: '/dashboard', locale: 'es' });
    });

    // F3-C4: signInAction is the request that actually creates the session — the
    // middleware runs BEFORE this action, so it can never see the freshly-minted
    // claim to redirect the resulting navigation itself. The action must pick the
    // right destination directly from the session it just created.
    it('redirects to /dashboard/onboarding when the fresh session has onboarding_completed=false', async () => {
      mocks.signInWithPassword.mockResolvedValue({
        data: { user: { id: 'uuid-123' }, session: {} },
        error: null,
      });
      mocks.getClaims.mockResolvedValue({
        data: { claims: { app_metadata: { onboarding_completed: false } } },
      });

      const fd = makeFormData(validLoginData);
      await expect(signInAction(PREV, fd)).rejects.toThrow('NEXT_REDIRECT');

      expect(mocks.redirect).toHaveBeenCalledWith({ href: '/dashboard/onboarding', locale: 'es' });
    });

    it('redirects to /dashboard (not onboarding) when the feature flag is off', async () => {
      appConfig.features.onboarding = false;
      mocks.signInWithPassword.mockResolvedValue({
        data: { user: { id: 'uuid-123' }, session: {} },
        error: null,
      });
      mocks.getClaims.mockResolvedValue({
        data: { claims: { app_metadata: { onboarding_completed: false } } },
      });

      const fd = makeFormData(validLoginData);
      await expect(signInAction(PREV, fd)).rejects.toThrow('NEXT_REDIRECT');

      expect(mocks.redirect).toHaveBeenCalledWith({ href: '/dashboard', locale: 'es' });
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

// ─── verifyMfaAction ─────────────────────────────────────────────────────────

describe('verifyMfaAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRedirectThrows();
    mocks.getClaims.mockResolvedValue({ data: { claims: { app_metadata: {} } } });
    appConfig.features.onboarding = true;
  });

  describe('validation', () => {
    it('returns fieldErrors when code is not 6 digits', async () => {
      const fd = makeFormData({ code: '123', factorId: 'factor-1' });
      const result = await verifyMfaAction(PREV, fd);
      expect(result.fieldErrors?.code).toBeDefined();
      expect(mocks.mfaChallenge).not.toHaveBeenCalled();
    });

    it('returns fieldErrors when factorId is missing', async () => {
      const fd = makeFormData({ code: '123456', factorId: '' });
      const result = await verifyMfaAction(PREV, fd);
      expect(result.fieldErrors?.factorId).toBeDefined();
    });
  });

  it('returns mfa_challenge_failed when challenge creation fails', async () => {
    mocks.mfaChallenge.mockResolvedValue({ data: null, error: { code: 'factor_not_found' } });

    const fd = makeFormData({ code: '123456', factorId: 'factor-1' });
    const result = await verifyMfaAction(PREV, fd);

    expect(result.error).toBe('mfa_challenge_failed');
    expect(mocks.mfaVerify).not.toHaveBeenCalled();
  });

  it('returns invalid_mfa_code when verification fails — generic, no detail leak', async () => {
    mocks.mfaChallenge.mockResolvedValue({ data: { id: 'challenge-1' }, error: null });
    mocks.mfaVerify.mockResolvedValue({ error: { code: 'mfa_verification_failed' } });

    const fd = makeFormData({ code: '000000', factorId: 'factor-1' });
    const result = await verifyMfaAction(PREV, fd);

    expect(result.error).toBe('invalid_mfa_code');
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it('verifies against the challenge and redirects to /dashboard on success', async () => {
    mocks.mfaChallenge.mockResolvedValue({ data: { id: 'challenge-1' }, error: null });
    mocks.mfaVerify.mockResolvedValue({ error: null });

    const fd = makeFormData({ code: '123456', factorId: 'factor-1' });
    await expect(verifyMfaAction(PREV, fd)).rejects.toThrow('NEXT_REDIRECT');

    expect(mocks.mfaVerify).toHaveBeenCalledWith({
      factorId: 'factor-1',
      challengeId: 'challenge-1',
      code: '123456',
    });
    expect(mocks.redirect).toHaveBeenCalledWith({ href: '/dashboard', locale: 'es' });
  });

  // F3-C4: same fresh-session-decides-the-destination fix as signInAction.
  it('redirects to /dashboard/onboarding when the verified session has onboarding_completed=false', async () => {
    mocks.mfaChallenge.mockResolvedValue({ data: { id: 'challenge-1' }, error: null });
    mocks.mfaVerify.mockResolvedValue({ error: null });
    mocks.getClaims.mockResolvedValue({
      data: { claims: { app_metadata: { onboarding_completed: false } } },
    });

    const fd = makeFormData({ code: '123456', factorId: 'factor-1' });
    await expect(verifyMfaAction(PREV, fd)).rejects.toThrow('NEXT_REDIRECT');

    expect(mocks.redirect).toHaveBeenCalledWith({ href: '/dashboard/onboarding', locale: 'es' });
  });
});

// ─── verifyRecoveryAction ────────────────────────────────────────────────────

describe('verifyRecoveryAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRedirectThrows();
  });

  it('returns fieldErrors for malformed recovery code', async () => {
    const fd = makeFormData({ code: 'not-a-code' });
    const result = await verifyRecoveryAction(PREV, fd);
    expect(result.fieldErrors?.code).toBeDefined();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('normalizes lowercase input before consuming (trim + uppercase)', async () => {
    mocks.rpc.mockResolvedValue({ data: true, error: null });

    const fd = makeFormData({ code: '  ab12-cd34  ' });
    await expect(verifyRecoveryAction(PREV, fd)).rejects.toThrow('NEXT_REDIRECT');

    expect(mocks.rpc).toHaveBeenCalledWith('consume_recovery_code', { p_code: 'AB12-CD34' });
  });

  it('returns recovery_invalid when the RPC errors — same response as wrong code', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: 'P0001' } });

    const fd = makeFormData({ code: 'AB12-CD34' });
    const result = await verifyRecoveryAction(PREV, fd);

    expect(result.error).toBe('recovery_invalid');
  });

  it('returns recovery_invalid when the code was not consumed (already used / unknown)', async () => {
    mocks.rpc.mockResolvedValue({ data: false, error: null });

    const fd = makeFormData({ code: 'AB12-CD34' });
    const result = await verifyRecoveryAction(PREV, fd);

    expect(result.error).toBe('recovery_invalid');
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it('redirects to security tab with reenroll flag on success', async () => {
    mocks.rpc.mockResolvedValue({ data: true, error: null });

    const fd = makeFormData({ code: 'AB12-CD34' });
    await expect(verifyRecoveryAction(PREV, fd)).rejects.toThrow('NEXT_REDIRECT');

    expect(mocks.redirect).toHaveBeenCalledWith({
      href: '/dashboard/account?tab=security&reenroll=1',
      locale: 'es',
    });
  });
});

// ─── magicLinkAction ─────────────────────────────────────────────────────────

describe('magicLinkAction', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns fieldErrors for invalid email', async () => {
    const fd = makeFormData({ email: 'not-an-email' });
    const result = await magicLinkAction(PREV, fd);
    expect(result.fieldErrors?.email).toBeDefined();
  });

  it('never creates users via magic link (anti-enumeration)', async () => {
    mocks.signInWithOtp.mockResolvedValue({ error: null });

    const fd = makeFormData({ email: 'ana@example.com' });
    await magicLinkAction(PREV, fd);

    expect(mocks.signInWithOtp).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({ shouldCreateUser: false }),
      }),
    );
  });

  it('returns the Supabase error code when sending fails', async () => {
    mocks.signInWithOtp.mockResolvedValue({ error: { code: 'over_email_send_rate_limit' } });

    const fd = makeFormData({ email: 'ana@example.com' });
    const result = await magicLinkAction(PREV, fd);

    expect(result.error).toBe('over_email_send_rate_limit');
  });

  it('returns magic_link_sent on success', async () => {
    mocks.signInWithOtp.mockResolvedValue({ error: null });

    const fd = makeFormData({ email: 'ana@example.com' });
    const result = await magicLinkAction(PREV, fd);

    expect(result.success).toBe('magic_link_sent');
  });
});

// ─── forgotPasswordAction ────────────────────────────────────────────────────

describe('forgotPasswordAction', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns fieldErrors for invalid email', async () => {
    const fd = makeFormData({ email: 'x' });
    const result = await forgotPasswordAction(PREV, fd);
    expect(result.fieldErrors?.email).toBeDefined();
  });

  it('sends the reset link with redirect to /auth/confirm → /reset-password', async () => {
    mocks.resetPasswordForEmail.mockResolvedValue({ error: null });

    const fd = makeFormData({ email: 'ana@example.com' });
    const result = await forgotPasswordAction(PREV, fd);

    expect(result.success).toBe('reset_link_sent');
    expect(mocks.resetPasswordForEmail).toHaveBeenCalledWith(
      'ana@example.com',
      expect.objectContaining({
        redirectTo: expect.stringContaining('/auth/confirm?next=/es/reset-password'),
      }),
    );
  });

  it('returns the Supabase error code when sending fails', async () => {
    mocks.resetPasswordForEmail.mockResolvedValue({ error: { code: 'over_request_rate_limit' } });

    const fd = makeFormData({ email: 'ana@example.com' });
    const result = await forgotPasswordAction(PREV, fd);

    expect(result.error).toBe('over_request_rate_limit');
  });
});

// ─── updatePasswordAction ────────────────────────────────────────────────────

describe('updatePasswordAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRedirectThrows();
  });

  it('returns fieldErrors when passwords do not match', async () => {
    const fd = makeFormData({ password: 'StrongPass1!', confirm_password: 'Different1!x' });
    const result = await updatePasswordAction(PREV, fd);
    expect(result.fieldErrors?.confirm_password).toBeDefined();
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });

  it('returns fieldErrors when password violates the policy even if both match', async () => {
    const fd = makeFormData({ password: 'weak', confirm_password: 'weak' });
    const result = await updatePasswordAction(PREV, fd);
    expect(result.fieldErrors?.password).toBeDefined();
  });

  it('returns the Supabase error code when update fails (e.g. same_password)', async () => {
    mocks.updateUser.mockResolvedValue({ error: { code: 'same_password' } });

    const fd = makeFormData({ password: 'StrongPass1!', confirm_password: 'StrongPass1!' });
    const result = await updatePasswordAction(PREV, fd);

    expect(result.error).toBe('same_password');
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it('redirects to /dashboard on success — session is already established', async () => {
    mocks.updateUser.mockResolvedValue({ error: null });

    const fd = makeFormData({ password: 'StrongPass1!', confirm_password: 'StrongPass1!' });
    await expect(updatePasswordAction(PREV, fd)).rejects.toThrow('NEXT_REDIRECT');

    expect(mocks.updateUser).toHaveBeenCalledWith({ password: 'StrongPass1!' });
    expect(mocks.redirect).toHaveBeenCalledWith({ href: '/dashboard', locale: 'es' });
  });
});

// ─── resendConfirmationAction ────────────────────────────────────────────────

describe('resendConfirmationAction', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns invalid_email for malformed input', async () => {
    const fd = makeFormData({ email: 'nope' });
    const result = await resendConfirmationAction(PREV, fd);
    expect(result.error).toBe('invalid_email');
    expect(mocks.resend).not.toHaveBeenCalled();
  });

  it('returns the Supabase error code when resend fails', async () => {
    mocks.resend.mockResolvedValue({ error: { code: 'over_email_send_rate_limit' } });

    const fd = makeFormData({ email: 'ana@example.com' });
    const result = await resendConfirmationAction(PREV, fd);

    expect(result.error).toBe('over_email_send_rate_limit');
  });

  it('resends the signup confirmation and reports success', async () => {
    mocks.resend.mockResolvedValue({ error: null });

    const fd = makeFormData({ email: 'ana@example.com' });
    const result = await resendConfirmationAction(PREV, fd);

    expect(result.success).toBe('confirmation_resent');
    expect(mocks.resend).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'signup', email: 'ana@example.com' }),
    );
  });
});
