import { describe, expect, it } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { identityQueryKey, retireIdentityQueries } from '../query-identity';

describe('identity query isolation', () => {
  const a = { userId: 'u', accountId: 'a', impersonatedBy: null };
  it('partitions users, accounts and impersonation', () => {
    expect(identityQueryKey(a, 'keys')).toEqual(['identity', 'u', 'a', '', 'keys']);
    expect(identityQueryKey(a, 'keys')).not.toEqual(
      identityQueryKey({ ...a, accountId: 'b' }, 'keys'),
    );
    expect(identityQueryKey(a, 'keys')).not.toEqual(
      identityQueryKey({ ...a, userId: 'b' }, 'keys'),
    );
    expect(identityQueryKey(a, 'keys')).not.toEqual(
      identityQueryKey({ ...a, impersonatedBy: 'admin' }, 'keys'),
    );
  });
  it('removes the retired scope while preserving the next one', async () => {
    const client = new QueryClient();
    client.setQueryData(identityQueryKey(a, 'keys'), ['A']);
    const b = { ...a, accountId: 'b' };
    client.setQueryData(identityQueryKey(b, 'keys'), ['B']);
    await retireIdentityQueries(client, a);
    expect(client.getQueryData(identityQueryKey(a, 'keys'))).toBeUndefined();
    expect(client.getQueryData(identityQueryKey(b, 'keys'))).toEqual(['B']);
  });
});
