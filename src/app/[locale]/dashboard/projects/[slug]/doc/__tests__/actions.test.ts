import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  getClaims: vi.fn(),
  rpc: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getClaims: mocks.getClaims },
    rpc: mocks.rpc,
  }),
}));

vi.mock('@/lib/project-documents', () => ({
  create: mocks.create,
  update: mocks.update,
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
  mocks.getClaims.mockResolvedValue({ data: { claims: { sub: 'user-uuid-1' } } });
  mocks.rpc.mockResolvedValue({ data: 'acct-uuid-1', error: null });
}

// ─── createDocument ──────────────────────────────────────────────────────────

describe('createDocument', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticatedWithAccount();
    mocks.create.mockResolvedValue({ id: DOC_ID });
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
    expect(result.error).toMatch(/sesión/i);
  });

  it('returns account error when get_my_account_id resolves empty', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: null });
    const result = await createDocument(makeFormData(validDoc));
    expect(result.error).toMatch(/cuenta/i);
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
    expect(result.error).toMatch(/no se pudo crear/i);
    expect(result.error).not.toContain('relation');
  });

  it('returns the new docId on success', async () => {
    const result = await createDocument(makeFormData(validDoc));
    expect(result.docId).toBe(DOC_ID);
    expect(result.error).toBeUndefined();
  });
});

// ─── saveDocument ────────────────────────────────────────────────────────────

describe('saveDocument', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticatedWithAccount();
    mocks.update.mockResolvedValue({ id: DOC_ID });
  });

  it('returns invalid_document_id for non-UUID input', async () => {
    const result = await saveDocument('../../etc/passwd', '# contenido');
    expect(result.error).toBe('invalid_document_id');
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('returns not_authenticated when there are no claims', async () => {
    mocks.getClaims.mockResolvedValue({ data: null });
    const result = await saveDocument(DOC_ID, '# contenido');
    expect(result.error).toBe('not_authenticated');
  });

  it('returns generic error when persistence throws', async () => {
    mocks.update.mockRejectedValue(new Error('permission denied for table'));
    const result = await saveDocument(DOC_ID, '# contenido');
    expect(result.error).toMatch(/no se pudo guardar/i);
  });

  it('saves content and revalidates the layout on success', async () => {
    const result = await saveDocument(DOC_ID, '# Título\n\nContenido.');

    expect(result.success).toBe(true);
    expect(mocks.update).toHaveBeenCalledWith(DOC_ID, { content: '# Título\n\nContenido.' });
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/', 'layout');
  });
});
