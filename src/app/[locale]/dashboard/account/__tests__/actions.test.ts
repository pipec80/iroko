import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  getClaims: vi.fn(),
  getUser: vi.fn(),
  updateUser: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  signOut: vi.fn(),
  storageUpload: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getClaims: mocks.getClaims,
      getUser: mocks.getUser,
      updateUser: mocks.updateUser,
      resetPasswordForEmail: mocks.resetPasswordForEmail,
      signOut: mocks.signOut,
    },
    rpc: mocks.rpc,
    storage: {
      from: () => ({ upload: mocks.storageUpload }),
    },
  }),
}));

vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }));

vi.mock('next-intl/server', () => ({
  getLocale: vi.fn().mockResolvedValue('es'),
}));

vi.mock('@/i18n/routing', () => ({ redirect: mocks.redirect }));

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

vi.mock('@sentry/nextjs', () => ({
  withScope: vi.fn(),
  captureException: vi.fn(),
}));

import {
  updateProfileAction,
  updateEmailAction,
  deleteAccountAction,
  generateRecoveryCodesAction,
  revokeSessionAction,
  revokeAllOtherSessionsAction,
} from '../actions';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

function mockAuthenticated(userId = 'user-uuid-123') {
  mocks.getClaims.mockResolvedValue({ data: { claims: { sub: userId } } });
}

function mockUnauthenticated() {
  mocks.getClaims.mockResolvedValue({ data: null });
}

const PREV = {};

const validProfileData = {
  given_name: 'Ana',
  family_name: 'García',
  locale: 'es',
  timezone: 'Europe/Madrid',
  phone_number: '',
  birth_date: '',
  bio: '',
  website_url: '',
  company: '',
};

// ─── updateProfileAction ─────────────────────────────────────────────────────

describe('updateProfileAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rpc.mockResolvedValue({ error: null });
  });

  it('should return fieldErrors when given_name is empty', async () => {
    mockAuthenticated();
    const fd = makeFormData({ ...validProfileData, given_name: '' });
    const result = await updateProfileAction(PREV, fd);
    expect(result.fieldErrors?.given_name).toBeDefined();
    expect(result.error).toBeUndefined();
  });

  it('should return fieldErrors when locale is unsupported', async () => {
    mockAuthenticated();
    const fd = makeFormData({ ...validProfileData, locale: 'fr' });
    const result = await updateProfileAction(PREV, fd);
    expect(result.fieldErrors?.locale).toBeDefined();
  });

  it('should return not_authenticated when session is missing', async () => {
    mockUnauthenticated();
    const fd = makeFormData(validProfileData);
    const result = await updateProfileAction(PREV, fd);
    expect(result.error).toBe('not_authenticated');
  });

  it('should return RPC error code when update fails', async () => {
    mockAuthenticated();
    mocks.rpc.mockResolvedValue({ error: { code: 'P0001' } });
    const fd = makeFormData(validProfileData);
    const result = await updateProfileAction(PREV, fd);
    expect(result.error).toBe('P0001');
    expect(result.success).toBeUndefined();
  });

  it('should return success and revalidate path on happy path', async () => {
    mockAuthenticated();
    const fd = makeFormData(validProfileData);
    const result = await updateProfileAction(PREV, fd);
    expect(result.success).toBe('profile_updated');
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/dashboard/settings');
  });
});

// ─── updateEmailAction ───────────────────────────────────────────────────────

describe('updateEmailAction', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return fieldErrors for invalid email format', async () => {
    mockAuthenticated();
    const fd = makeFormData({ email: 'not-an-email' });
    const result = await updateEmailAction(PREV, fd);
    expect(result.fieldErrors?.email).toBeDefined();
  });

  it('should return not_authenticated when no session', async () => {
    mockUnauthenticated();
    const fd = makeFormData({ email: 'new@example.com' });
    const result = await updateEmailAction(PREV, fd);
    expect(result.error).toBe('not_authenticated');
  });

  it('should return auth error code when Supabase updateUser fails', async () => {
    mockAuthenticated();
    mocks.updateUser.mockResolvedValue({ error: { code: 'email_exists' } });
    const fd = makeFormData({ email: 'taken@example.com' });
    const result = await updateEmailAction(PREV, fd);
    expect(result.error).toBe('email_exists');
  });

  it('should return email_change_requested on success', async () => {
    mockAuthenticated();
    mocks.updateUser.mockResolvedValue({ error: null });
    const fd = makeFormData({ email: 'new@example.com' });
    const result = await updateEmailAction(PREV, fd);
    expect(result.success).toBe('email_change_requested');
  });
});

// ─── deleteAccountAction ─────────────────────────────────────────────────────

describe('deleteAccountAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.redirect.mockImplementation(() => {
      throw Object.assign(new Error('redirect'), {
        digest: 'NEXT_REDIRECT:replace:/es/login?deleted=1',
      });
    });
    mocks.signOut.mockResolvedValue({ error: null });
  });

  it('should return fieldErrors when confirmation phrase is wrong', async () => {
    const fd = makeFormData({ confirmation: 'BORRAR' });
    const result = await deleteAccountAction(PREV, fd);
    expect(result.fieldErrors?.confirmation).toBeDefined();
  });

  it('should return not_authenticated when no session', async () => {
    mockUnauthenticated();
    const fd = makeFormData({ confirmation: 'ELIMINAR' });
    const result = await deleteAccountAction(PREV, fd);
    expect(result.error).toBe('not_authenticated');
  });

  it('should return RPC error code when soft-delete fails', async () => {
    mockAuthenticated();
    mocks.rpc.mockResolvedValue({ error: { code: 'permission_denied' } });
    const fd = makeFormData({ confirmation: 'ELIMINAR' });
    const result = await deleteAccountAction(PREV, fd);
    expect(result.error).toBe('permission_denied');
  });

  it('should also accept "DELETE" as confirmation phrase (EN locale)', async () => {
    mockAuthenticated();
    mocks.rpc.mockResolvedValue({ error: null });
    const fd = makeFormData({ confirmation: 'DELETE' });
    await expect(deleteAccountAction(PREV, fd)).rejects.toThrow('redirect');
  });

  it('should sign out and redirect to /login?deleted=1 on success', async () => {
    mockAuthenticated();
    mocks.rpc.mockResolvedValue({ error: null });
    const fd = makeFormData({ confirmation: 'ELIMINAR' });
    await expect(deleteAccountAction(PREV, fd)).rejects.toThrow('redirect');
    expect(mocks.signOut).toHaveBeenCalledOnce();
    expect(mocks.redirect).toHaveBeenCalledWith(
      expect.objectContaining({ href: expect.stringContaining('/login?deleted=1') }),
    );
  });
});

// ─── generateRecoveryCodesAction ─────────────────────────────────────────────

describe('generateRecoveryCodesAction', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return not_authenticated when no session', async () => {
    mockUnauthenticated();
    const result = await generateRecoveryCodesAction(PREV, new FormData());
    expect(result.error).toBe('not_authenticated');
  });

  it('should return error code when RPC fails', async () => {
    mockAuthenticated();
    mocks.rpc.mockResolvedValue({ error: { code: 'recovery_generate_failed' } });
    const result = await generateRecoveryCodesAction(PREV, new FormData());
    expect(result.error).toBe('recovery_generate_failed');
  });

  it('should return codes array and revalidate on success', async () => {
    mockAuthenticated();
    mocks.rpc.mockResolvedValue({ data: ['code-1', 'code-2'], error: null });
    const result = await generateRecoveryCodesAction(PREV, new FormData());
    expect(result.success).toBe('recovery_codes_generated');
    expect(result.codes).toEqual(['code-1', 'code-2']);
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/dashboard/account');
  });
});

// ─── revokeSessionAction ──────────────────────────────────────────────────────

describe('revokeSessionAction', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return invalid_session_id for non-UUID input', async () => {
    const result = await revokeSessionAction('not-a-uuid');
    expect(result.error).toBe('invalid_session_id');
  });

  it('should return not_authenticated when no session', async () => {
    mockUnauthenticated();
    const result = await revokeSessionAction('550e8400-e29b-41d4-a716-446655440000');
    expect(result.error).toBe('not_authenticated');
  });

  it('should return RPC error code when revoke fails', async () => {
    mockAuthenticated();
    mocks.rpc.mockResolvedValue({ error: { code: 'session_not_found' } });
    const result = await revokeSessionAction('550e8400-e29b-41d4-a716-446655440000');
    expect(result.error).toBe('session_not_found');
  });

  it('should return success and revalidate on happy path', async () => {
    mockAuthenticated();
    mocks.rpc.mockResolvedValue({ error: null });
    const result = await revokeSessionAction('550e8400-e29b-41d4-a716-446655440000');
    expect(result.success).toBe('session_revoked');
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/dashboard/settings');
  });
});

// ─── revokeAllOtherSessionsAction ────────────────────────────────────────────

describe('revokeAllOtherSessionsAction', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return not_authenticated when no session', async () => {
    mockUnauthenticated();
    const result = await revokeAllOtherSessionsAction();
    expect(result.error).toBe('not_authenticated');
  });

  it('should return Supabase error code on sign out failure', async () => {
    mockAuthenticated();
    mocks.signOut.mockResolvedValue({ error: { code: 'network_error' } });
    const result = await revokeAllOtherSessionsAction();
    expect(result.error).toBe('network_error');
  });

  it('should return other_sessions_revoked and revalidate on success', async () => {
    mockAuthenticated();
    mocks.signOut.mockResolvedValue({ error: null });
    const result = await revokeAllOtherSessionsAction();
    expect(result.success).toBe('other_sessions_revoked');
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/dashboard/settings');
  });
});
