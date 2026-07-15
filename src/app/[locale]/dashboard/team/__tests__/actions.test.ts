import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  getClaims: vi.fn(),
  revalidatePath: vi.fn(),
}));

const { mockSendInvitationEmail, mockGetUser, mockAdminFrom } = vi.hoisted(() => ({
  mockSendInvitationEmail: vi.fn(() => Promise.resolve() as Promise<void>),
  mockGetUser: vi.fn(),
  mockAdminFrom: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getClaims: mocks.getClaims, getUser: mockGetUser },
    rpc: mocks.rpc,
  }),
}));

vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }));

vi.mock('next-intl/server', () => ({ getLocale: vi.fn().mockResolvedValue('en') }));

vi.mock('next/server', () => ({
  after: vi.fn().mockImplementation((fn: () => unknown) => void fn()),
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

vi.mock('@sentry/nextjs', () => ({
  withScope: vi.fn(),
  captureException: vi.fn(),
}));

vi.mock('@/lib/email', () => ({
  sendInvitationEmail: mockSendInvitationEmail,
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn().mockReturnValue({
    from: mockAdminFrom,
  }),
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

  it('should surface seat_limit_reached as a typed error', async () => {
    mockAuthenticatedWithAccount();
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'seat_limit_reached' } });
    const fd = makeFormData({ emails: 'user@example.com', role: 'member' });
    const result = await inviteMembers(fd);
    expect(result.error).toBe('seat_limit_reached');
  });

  it('should return success with count and revalidate on happy path', async () => {
    mockAuthenticatedWithAccount();
    mocks.rpc.mockResolvedValue({
      data: [
        { email: 'alice@example.com', token: 'tok-a' },
        { email: 'bob@example.com', token: 'tok-b' },
      ],
      error: null,
    });
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const fd = makeFormData({ emails: 'alice@example.com,bob@example.com', role: 'member' });
    const result = await inviteMembers(fd);
    expect(result.success).toBe(true);
    expect(result.count).toBe(2);
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/[locale]/dashboard/team', 'page');
  });

  it('should send invitation emails after successful RPC', async () => {
    // Arrange — invite_members retorna tokens directamente (ya no consulta la DB)
    const fakeInvitations = [
      { email: 'alice@example.com', token: 'tok-a' },
      { email: 'bob@example.com', token: 'tok-b' },
    ];
    mockAuthenticatedWithAccount();
    mocks.rpc.mockResolvedValue({ data: fakeInvitations, error: null });
    mockGetUser.mockResolvedValue({ data: { user: { email: 'owner@example.com' } } });
    const fd = makeFormData({ emails: 'alice@example.com,bob@example.com', role: 'member' });

    // Act
    await inviteMembers(fd);

    // Assert
    expect(mockSendInvitationEmail).toHaveBeenCalledTimes(2);
    expect(mockSendInvitationEmail).toHaveBeenCalledWith(
      'alice@example.com',
      expect.objectContaining({
        inviterEmail: 'owner@example.com',
        teamRole: 'member',
        // URL uses the inviter's locale (mocked 'en'), not the hardcoded default.
        inviteUrl: 'http://localhost:3000/en/auth/accept-invitation?token=tok-a',
      }),
    );
    expect(mockSendInvitationEmail).toHaveBeenCalledWith(
      'bob@example.com',
      expect.objectContaining({ inviterEmail: 'owner@example.com', teamRole: 'member' }),
    );
  });

  it('should not send emails when RPC returns 0 invitations created', async () => {
    // Arrange
    mockAuthenticatedWithAccount();
    mocks.rpc.mockResolvedValue({ data: [], error: null });
    const fd = makeFormData({ emails: 'alice@example.com', role: 'member' });

    // Act
    await inviteMembers(fd);

    // Assert
    expect(mockSendInvitationEmail).not.toHaveBeenCalled();
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
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/[locale]/dashboard/team', 'page');
  });
});
