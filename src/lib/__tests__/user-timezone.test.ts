import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  from: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({}));

import { getUserTimezone } from '../user-timezone';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

function makeClient() {
  const selectChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
  };
  mocks.from.mockReturnValue(selectChain);

  return {
    auth: { getUser: mocks.getUser },
    from: mocks.from,
    _selectChain: selectChain,
  } as unknown as SupabaseClient<Database> & { _selectChain: typeof selectChain };
}

describe('getUserTimezone', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns UTC when user is not authenticated', async () => {
    const client = makeClient();
    mocks.getUser.mockResolvedValue({ data: { user: null } });

    const tz = await getUserTimezone(client);
    expect(tz).toBe('UTC');
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('returns UTC when profile has no timezone set', async () => {
    const client = makeClient();
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    client._selectChain.single.mockResolvedValue({ data: { timezone: null } });

    const tz = await getUserTimezone(client);
    expect(tz).toBe('UTC');
  });

  it('returns the stored timezone from the profile', async () => {
    const client = makeClient();
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    client._selectChain.single.mockResolvedValue({ data: { timezone: 'America/Santiago' } });

    const tz = await getUserTimezone(client);
    expect(tz).toBe('America/Santiago');
    expect(mocks.from).toHaveBeenCalledWith('profiles');
  });

  it('returns UTC when profiles query returns null data', async () => {
    const client = makeClient();
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    client._selectChain.single.mockResolvedValue({ data: null });

    const tz = await getUserTimezone(client);
    expect(tz).toBe('UTC');
  });
});
