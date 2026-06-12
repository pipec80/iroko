import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mismo builder encadenable que en projects.test.ts: los métodos intermedios
// devuelven el builder y los terminales resuelven el resultado configurado.
const mocks = vi.hoisted(() => {
  const result = { current: { data: null as unknown, error: null as unknown } };
  const builder = {
    select: vi.fn(),
    eq: vi.fn(),
    is: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    order: vi.fn(),
    maybeSingle: vi.fn(),
    single: vi.fn(),
  };
  builder.select.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  builder.is.mockReturnValue(builder);
  builder.insert.mockReturnValue(builder);
  builder.update.mockReturnValue(builder);
  builder.order.mockImplementation(() => Promise.resolve(result.current));
  builder.maybeSingle.mockImplementation(() => Promise.resolve(result.current));
  builder.single.mockImplementation(() => Promise.resolve(result.current));
  return { builder, result, from: vi.fn(() => builder) };
});

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({ from: mocks.from }),
}));

import { listByProject, getById, create, update } from '../project-documents';

const PROJECT_ID = 'proj-uuid-1';
const DOC_ID = 'doc-uuid-1';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.result.current = { data: null, error: null };
});

describe('listByProject', () => {
  it('queries documents for the project excluding soft-deleted ones', async () => {
    mocks.result.current = { data: [{ id: DOC_ID }], error: null };
    const docs = await listByProject(PROJECT_ID);

    expect(mocks.from).toHaveBeenCalledWith('documents');
    expect(mocks.builder.eq).toHaveBeenCalledWith('project_id', PROJECT_ID);
    expect(mocks.builder.is).toHaveBeenCalledWith('deleted_at', null);
    expect(docs).toEqual([{ id: DOC_ID }]);
  });

  it('returns empty array when there are no documents', async () => {
    expect(await listByProject(PROJECT_ID)).toEqual([]);
  });

  it('throws on query error', async () => {
    mocks.result.current = { data: null, error: new Error('permission denied') };
    await expect(listByProject(PROJECT_ID)).rejects.toThrow('permission denied');
  });
});

describe('getById', () => {
  it('returns the document when found and null when missing', async () => {
    mocks.result.current = { data: { id: DOC_ID }, error: null };
    expect(await getById(DOC_ID)).toEqual({ id: DOC_ID });

    mocks.result.current = { data: null, error: null };
    expect(await getById('missing')).toBeNull();
  });

  it('throws on query error', async () => {
    mocks.result.current = { data: null, error: new Error('boom') };
    await expect(getById(DOC_ID)).rejects.toThrow('boom');
  });
});

describe('create', () => {
  const input = { project_id: PROJECT_ID, account_id: 'acct-1', name: 'Doc', created_by: 'u1' };

  it('inserts and returns the created document', async () => {
    mocks.result.current = { data: { id: DOC_ID, ...input }, error: null };
    const doc = await create(input);

    expect(mocks.builder.insert).toHaveBeenCalledWith(input);
    expect(doc).toMatchObject({ id: DOC_ID });
  });

  it('throws on insert error', async () => {
    mocks.result.current = { data: null, error: new Error('fk violation') };
    await expect(create(input)).rejects.toThrow('fk violation');
  });
});

describe('update', () => {
  it('updates by id and returns the updated row', async () => {
    mocks.result.current = { data: { id: DOC_ID, content: '# Hola' }, error: null };
    const doc = await update(DOC_ID, { content: '# Hola' });

    expect(mocks.builder.update).toHaveBeenCalledWith({ content: '# Hola' });
    expect(mocks.builder.eq).toHaveBeenCalledWith('id', DOC_ID);
    expect(doc).toMatchObject({ content: '# Hola' });
  });

  it('throws on update error', async () => {
    mocks.result.current = { data: null, error: new Error('row not found') };
    await expect(update(DOC_ID, { content: 'x' })).rejects.toThrow('row not found');
  });
});
