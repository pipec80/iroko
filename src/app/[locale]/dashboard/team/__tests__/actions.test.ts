import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  getClaims: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getClaims: mocks.getClaims },
    rpc: mocks.rpc,
  }),
}));

vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }));

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

import { getTeamMembers, inviteMembers, removeMember } from '../actions';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

const ACCOUNT_ID = 'acct-uuid-111';

function mockAuthenticatedWithAccount(accountId = ACCOUNT_ID) {
  mocks.getClaims.mockResolvedValue({
    data: { claims: { app_metadata: { account_id: accountId } } },
  });
}

function mockNoAccount() {
  mocks.getClaims.mockResolvedValue({
    data: { claims: { app_metadata: {} } },
  });
}

// ─── getTeamMembers ───────────────────────────────────────────────────────────

describe('getTeamMembers', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return empty array and error when no account_id in claims', async () => {
    mockNoAccount();
    const result = await getTeamMembers();
    expect(result.data).toEqual([]);
    expect(result.error).toBe('no_account');
  });

  it('should return empty array and error code when RPC fails', async () => {
    mockAuthenticatedWithAccount();
    mocks.rpc.mockResolvedValue({ data: null, error: { code: 'fetch_failed' } });
    const result = await getTeamMembers();
    expect(result.data).toEqual([]);
    expect(result.error).toBe('fetch_failed');
  });

  it('should return team members array on success', async () => {
    mockAuthenticatedWithAccount();
    const members = [
      {
        user_id: 'u1',
        email: 'alice@example.com',
        display_name: 'Alice',
        given_name: 'Alice',
        family_name: 'Smith',
        avatar_url: null,
        role: 'admin',
        status: 'active',
        joined_at: '2025-01-01',
      },
    ];
    mocks.rpc.mockResolvedValue({ data: members, error: null });
    const result = await getTeamMembers();
    expect(result.data).toEqual(members);
    expect(result.error).toBeUndefined();
  });
});

// ─── inviteMembers ────────────────────────────────────────────────────────────

describe('inviteMembers', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return validation error when emails field is empty', async () => {
    const fd = makeFormData({ emails: '', role: 'member' });
    const result = await inviteMembers(fd);
    expect(result.error).toBeDefined();
  });

  it('should return validation error when email format is invalid', async () => {
    const fd = makeFormData({ emails: 'not-an-email', role: 'member' });
    const result = await inviteMembers(fd);
    expect(result.error).toMatch(/email/i);
  });

  it('should return validation error when more than 10 emails are provided', async () => {
    const emails = Array.from({ length: 11 }, (_, i) => `user${i}@example.com`).join(',');
    const fd = makeFormData({ emails, role: 'member' });
    const result = await inviteMembers(fd);
    expect(result.error).toBeDefined();
  });

  it('should return validation error for invalid role', async () => {
    const fd = makeFormData({ emails: 'user@example.com', role: 'owner' });
    const result = await inviteMembers(fd);
    expect(result.error).toBeDefined();
  });

  it('should return no_account when account_id is missing from claims', async () => {
    mockNoAccount();
    const fd = makeFormData({ emails: 'user@example.com', role: 'member' });
    const result = await inviteMembers(fd);
    expect(result.error).toBe('no_account');
  });

  it('should return RPC error message when invite_members fails', async () => {
    mockAuthenticatedWithAccount();
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { message: 'invite quota exceeded', code: 'P0001' },
    });
    const fd = makeFormData({ emails: 'user@example.com', role: 'member' });
    const result = await inviteMembers(fd);
    expect(result.error).toBe('invite quota exceeded');
  });

  it('should return success with count and revalidate on happy path', async () => {
    mockAuthenticatedWithAccount();
    mocks.rpc.mockResolvedValue({ data: 2, error: null });
    const fd = makeFormData({ emails: 'alice@example.com,bob@example.com', role: 'member' });
    const result = await inviteMembers(fd);
    expect(result.success).toBe(true);
    expect(result.count).toBe(2);
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/dashboard/team');
  });
});

// ─── removeMember ─────────────────────────────────────────────────────────────

describe('removeMember', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return invalid_user_id when userId is not a UUID', async () => {
    const fd = makeFormData({ userId: 'not-a-uuid' });
    const result = await removeMember(fd);
    expect(result.error).toBe('invalid_user_id');
  });

  it('should return no_account when account_id is missing from claims', async () => {
    mockNoAccount();
    const fd = makeFormData({ userId: '550e8400-e29b-41d4-a716-446655440000' });
    const result = await removeMember(fd);
    expect(result.error).toBe('no_account');
  });

  it('should return RPC error message when remove_member fails', async () => {
    mockAuthenticatedWithAccount();
    mocks.rpc.mockResolvedValue({ error: { message: 'cannot remove last owner' } });
    const fd = makeFormData({ userId: '550e8400-e29b-41d4-a716-446655440000' });
    const result = await removeMember(fd);
    expect(result.error).toBe('cannot remove last owner');
  });

  it('should return success and revalidate on happy path', async () => {
    mockAuthenticatedWithAccount();
    mocks.rpc.mockResolvedValue({ error: null });
    const fd = makeFormData({ userId: '550e8400-e29b-41d4-a716-446655440000' });
    const result = await removeMember(fd);
    expect(result.success).toBe(true);
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/dashboard/team');
  });
});
