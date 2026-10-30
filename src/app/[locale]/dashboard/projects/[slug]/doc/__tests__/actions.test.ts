import { describe, it, expect, vi, beforeEach } from 'vitest';
import { appConfig } from '@/config/app.config';

vi.mock('@/config/app.config', () => ({ appConfig: { features: { projects: true } } }));

const mocks = vi.hoisted(() => ({
  getClaims: vi.fn(),
  getActiveAccountId: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  updateContentAtRevision: vi.fn(),
  revalidatePath: vi.fn(),
  captureServer: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getClaims: mocks.getClaims },
  }),
}));

vi.mock('@/lib/active-account', () => ({ getActiveAccountId: mocks.getActiveAccountId }));

vi.mock('@/lib/project-documents', () => ({
  create: mocks.create,
  update: mocks.update,
  updateContentAtRevision: mocks.updateContentAtRevision,
}));

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

import { createDocument } from '../actions';
import { saveDocument } from '../[docId]/actions';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

const PROJECT_ID = '550e8400-e29b-41d4-a716-446655440000';
const DOC_ID = '660e8400-e29b-41d4-a716-446655440111';

const validDoc = { name: 'Especificación', projectId: PROJECT_ID };

function mockAuthenticatedWithAccount() {
  appConfig.features.projects = true;
  mocks.getClaims.mockResolvedValue({ data: { claims: { sub: 'user-uuid-1' } } });
  mocks.getActiveAccountId.mockResolvedValue('acct-uuid-1');
}

// ─── createDocument ──────────────────────────────────────────────────────────

describe('createDocument', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticatedWithAccount();
    mocks.create.mockResolvedValue({ id: DOC_ID });
  });

  it('rejects the disabled module before authentication or persistence', async () => {
    appConfig.features.projects = false;
    expect(await createDocument(makeFormData(validDoc))).toEqual({ error: 'module_disabled' });
    expect(mocks.getClaims).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('returns error when name is empty', async () => {
    const result = await createDocument(makeFormData({ ...validDoc, name: '' }));
    expect(result.error).toBeDefined();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('returns error when projectId is not a UUID', async () => {
    const result = await createDocument(makeFormData({ ...validDoc, projectId: '123' }));
    expect(result.error).toBeDefined();
  });

  it('returns session error when there are no claims', async () => {
    mocks.getClaims.mockResolvedValue({ data: null });
    const result = await createDocument(makeFormData(validDoc));
    expect(result.error).toBe('invalid_session');
  });

  it('returns account error when getActiveAccountId resolves empty', async () => {
    mocks.getActiveAccountId.mockResolvedValue(null);
    const result = await createDocument(makeFormData(validDoc));
    expect(result.error).toBe('account_not_found');
  });

  it('derives account_id server-side — never trusts the form', async () => {
    const fd = makeFormData({ ...validDoc, account_id: 'attacker-account' });
    await createDocument(fd);

    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({ account_id: 'acct-uuid-1', created_by: 'user-uuid-1' }),
    );
  });

  it('returns generic error when persistence throws — no internals leaked', async () => {
    mocks.create.mockRejectedValue(new Error('relation "project_documents" does not exist'));
    const result = await createDocument(makeFormData(validDoc));
    expect(result.error).toBe('create_failed');
    expect(result.error).not.toContain('relation');
    expect(mocks.captureServer).not.toHaveBeenCalled();
  });

  it('returns a safe invalid project error when account and project differ', async () => {
    mocks.create.mockRejectedValue({ code: '23503', message: 'foreign account details' });
    const result = await createDocument(makeFormData(validDoc));
    expect(result).toEqual({ error: 'invalid_project' });
    expect(mocks.captureServer).not.toHaveBeenCalled();
  });

  it('returns the new docId on success', async () => {
    const result = await createDocument(makeFormData(validDoc));
    expect(result.docId).toBe(DOC_ID);
    expect(result.error).toBeUndefined();
    expect(mocks.captureServer).toHaveBeenCalledWith({
      event: 'document_uploaded',
      properties: {},
      distinctId: 'user-uuid-1',
      accountId: 'acct-uuid-1',
    });
  });
});

// ─── saveDocument ────────────────────────────────────────────────────────────

describe('saveDocument', () => {
  it('rejects the disabled module before authentication or a revision write', async () => {
    vi.clearAllMocks();
    appConfig.features.projects = false;
    expect(await saveDocument(DOC_ID, 'content', 0)).toEqual({
      success: false,
      error: 'module_disabled',
    });
    expect(mocks.getClaims).not.toHaveBeenCalled();
    expect(mocks.updateContentAtRevision).not.toHaveBeenCalled();
  });
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticatedWithAccount();
    mocks.updateContentAtRevision.mockResolvedValue(1);
  });
  it.each([-1, 1.5, Number.NaN])('rejects invalid revision %s', async (revision) => {
    expect(await saveDocument(DOC_ID, 'content', revision)).toEqual({
      success: false,
      error: 'invalid_input',
    });
    expect(mocks.updateContentAtRevision).not.toHaveBeenCalled();
  });
  it('rejects invalid document id', async () => {
    expect(await saveDocument('invalid', 'content', 0)).toEqual({
      success: false,
      error: 'invalid_input',
    });
  });
  it('rejects unauthenticated writes', async () => {
    mocks.getClaims.mockResolvedValue({ data: null });
    expect(await saveDocument(DOC_ID, 'content', 0)).toEqual({
      success: false,
      error: 'not_authenticated',
    });
  });
  it('retains a generic conflict for missing or unavailable rows', async () => {
    mocks.updateContentAtRevision.mockResolvedValue(null);
    expect(await saveDocument(DOC_ID, 'content', 0)).toEqual({
      success: false,
      error: 'conflict_or_unavailable',
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
  it('returns safe error for RPC failure', async () => {
    mocks.updateContentAtRevision.mockRejectedValue(new Error('private database detail'));
    expect(await saveDocument(DOC_ID, 'content', 0)).toEqual({
      success: false,
      error: 'save_failed',
    });
  });
  it('saves at the expected revision and returns the confirmed revision', async () => {
    expect(await saveDocument(DOC_ID, 'content', 0)).toEqual({ success: true, revision: 1 });
    expect(mocks.updateContentAtRevision).toHaveBeenCalledWith(DOC_ID, 'content', 0);
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/', 'layout');
  });
});
