import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  getClaims: vi.fn(),
  getActiveAccountId: vi.fn(),
  create: vi.fn(),
  revalidatePath: vi.fn(),
  captureServer: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getClaims: mocks.getClaims },
  }),
}));

vi.mock('@/lib/active-account', () => ({ getActiveAccountId: mocks.getActiveAccountId }));

vi.mock('@/lib/projects', () => ({ create: mocks.create }));

vi.mock('@/lib/analytics/server', () => ({ captureServer: mocks.captureServer }));

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

import { createProject } from '../actions';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

const validProject = { name: 'Mi Proyecto', tone: 'iron', type: 'docs' };

function mockAuthenticatedWithAccount() {
  mocks.getClaims.mockResolvedValue({ data: { claims: { sub: 'user-uuid-1' } } });
  mocks.getActiveAccountId.mockResolvedValue('acct-uuid-1');
}

// ─── createProject ───────────────────────────────────────────────────────────

describe('createProject', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticatedWithAccount();
    mocks.create.mockResolvedValue({ id: 'project-uuid-1' });
  });

  describe('validation', () => {
    it('returns error when name is empty', async () => {
      const fd = makeFormData({ ...validProject, name: '' });
      const result = await createProject(fd);
      expect(result.error).toBeDefined();
      expect(mocks.create).not.toHaveBeenCalled();
    });

    it('returns error when tone is not a known tone', async () => {
      const fd = makeFormData({ ...validProject, tone: 'magenta' });
      const result = await createProject(fd);
      expect(result.error).toBeDefined();
    });

    it('returns error when type is unknown', async () => {
      const fd = makeFormData({ ...validProject, type: 'spreadsheet' });
      const result = await createProject(fd);
      expect(result.error).toBeDefined();
    });
  });

  describe('account context', () => {
    it('returns session error when there are no claims', async () => {
      mocks.getClaims.mockResolvedValue({ data: null });
      const result = await createProject(makeFormData(validProject));
      expect(result.error).toBe('invalid_session');
    });

    it('returns session error when getActiveAccountId resolves empty', async () => {
      mocks.getActiveAccountId.mockResolvedValue(null);
      const result = await createProject(makeFormData(validProject));
      expect(result.error).toBe('invalid_session');
    });
  });

  describe('persistence', () => {
    it('maps duplicate-name DB errors to a user-friendly message', async () => {
      mocks.create.mockRejectedValue(
        new Error('duplicate key value violates unique constraint "projects_slug_key"'),
      );
      const result = await createProject(makeFormData(validProject));
      expect(result.error).toBe('duplicate_name');
      expect(mocks.captureServer).not.toHaveBeenCalled();
    });

    it('maps any other DB error to a generic message — no internals leaked', async () => {
      mocks.create.mockRejectedValue(new Error('connection refused 10.0.0.5:5432'));
      const result = await createProject(makeFormData(validProject));
      expect(result.error).toBe('create_failed');
      expect(result.error).not.toContain('10.0.0.5');
      expect(mocks.captureServer).not.toHaveBeenCalled();
    });

    it('derives a normalized slug from the name (accents and spaces)', async () => {
      const fd = makeFormData({ ...validProject, name: 'Visión García 2026' });
      await createProject(fd);

      expect(mocks.create).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: 'vision-garcia-2026',
          account_id: 'acct-uuid-1',
          created_by: 'user-uuid-1',
        }),
      );
    });

    it('returns success and revalidates both locale listings', async () => {
      const result = await createProject(makeFormData(validProject));

      expect(result.success).toBe(true);
      expect(mocks.revalidatePath).toHaveBeenCalledWith('/[locale]/dashboard/projects', 'page');
      expect(mocks.captureServer).toHaveBeenCalledWith({
        event: 'project_created',
        properties: { type: 'docs', tone: 'iron' },
        distinctId: 'user-uuid-1',
        accountId: 'acct-uuid-1',
      });
    });
  });
});
