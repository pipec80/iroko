import type { QueryClient } from '@tanstack/react-query';

export type IdentityScope = { userId: string; accountId: string; impersonatedBy: string | null };

/** Signals verified cookie/Server Action identity changes without exposing identity in the event. */
export const IDENTITY_SCOPE_CHANGED_EVENT = 'iroko:identity-scope-changed';

/** Cache partitions are identity boundaries, never authorization decisions. */
export function identityQueryKey(scope: IdentityScope, resource: string): readonly string[] {
  return ['identity', scope.userId, scope.accountId, scope.impersonatedBy ?? '', resource];
}

/** Cancels outstanding work before removing only the retired identity partition. */
export async function retireIdentityQueries(
  client: QueryClient,
  scope: IdentityScope,
): Promise<void> {
  const queryKey = identityQueryKey(scope, '').slice(0, -1);
  await client.cancelQueries({ queryKey });
  client.removeQueries({ queryKey });
}
