import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Mock encadenable del query builder de Supabase. Cada método devuelve el
 * mismo builder; el resultado se entrega en los métodos terminales
 * (order/maybeSingle/single) según el caso de uso de cada fetcher.
 */
const mocks = vi.hoisted(() => {
  const result = { current: { data: null as unknown, error: null as unknown } };
  const builder = {
    select: vi.fn(),
    eq: vi.fn(),
    is: vi.fn(),
    insert: vi.fn(),
    order: vi.fn(),
    maybeSingle: vi.fn(),
    single: vi.fn(),
  };
  builder.select.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  builder.is.mockReturnValue(builder);
  builder.insert.mockReturnValue(builder);
  builder.order.mockImplementation(() => Promise.resolve(result.current));
  builder.maybeSingle.mockImplementation(() => Promise.resolve(result.current));
  builder.single.mockImplementation(() => Promise.resolve(result.current));
  return { builder, result, from: vi.fn(() => builder) };
});

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({ from: mocks.from }),
}));

import { listByAccount, getBySlug, create } from '../projects';

const ACCOUNT_ID = 'acct-uuid-1';

describe('listByAccount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.result.current = { data: null, error: null };
  });

  it('queries projects scoped to the account and excludes soft-deleted rows', async () => {
    mocks.result.current = { data: [{ id: 'p1' }], error: null };
    const projects = await listByAccount(ACCOUNT_ID);

    expect(mocks.from).toHaveBeenCalledWith('projects');
    expect(mocks.builder.eq).toHaveBeenCalledWith('account_id', ACCOUNT_ID);
    expect(mocks.builder.is).toHaveBeenCalledWith('deleted_at', null);
    expect(projects).toEqual([{ id: 'p1' }]);
  });

  it('returns empty array when the query yields no rows', async () => {
    mocks.result.current = { data: null, error: null };
    expect(await listByAccount(ACCOUNT_ID)).toEqual([]);
  });

  it('throws when the query errors — caller decides how to surface it', async () => {
    mocks.result.current = { data: null, error: new Error('permission denied') };
    await expect(listByAccount(ACCOUNT_ID)).rejects.toThrow('permission denied');
  });
});

describe('getBySlug', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.result.current = { data: null, error: null };
  });

  it('returns the project when found', async () => {
    mocks.result.current = { data: { id: 'p1', slug: 'mi-proyecto' }, error: null };
    const project = await getBySlug(ACCOUNT_ID, 'mi-proyecto');

    expect(mocks.builder.eq).toHaveBeenCalledWith('slug', 'mi-proyecto');
    expect(project).toEqual({ id: 'p1', slug: 'mi-proyecto' });
  });

  it('returns null when no project matches', async () => {
    mocks.result.current = { data: null, error: null };
    expect(await getBySlug(ACCOUNT_ID, 'inexistente')).toBeNull();
  });

  it('throws when the query errors', async () => {
    mocks.result.current = { data: null, error: new Error('boom') };
    await expect(getBySlug(ACCOUNT_ID, 'x')).rejects.toThrow('boom');
  });
});

describe('create', () => {
  const input = {
    account_id: ACCOUNT_ID,
    name: 'Nuevo',
    slug: 'nuevo',
    created_by: 'user-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.result.current = { data: null, error: null };
  });

  it('inserts the row and returns the created project', async () => {
    mocks.result.current = { data: { id: 'p9', ...input }, error: null };
    const project = await create(input);

    expect(mocks.builder.insert).toHaveBeenCalledWith(input);
    expect(project).toMatchObject({ id: 'p9', slug: 'nuevo' });
  });

  it('throws on insert error (e.g. duplicate slug)', async () => {
    mocks.result.current = { data: null, error: new Error('duplicate key value') };
    await expect(create(input)).rejects.toThrow('duplicate key value');
  });
});
