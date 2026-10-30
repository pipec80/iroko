'use client';

import { isServer, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import {
  IDENTITY_SCOPE_CHANGED_EVENT,
  identityQueryKey,
  retireIdentityQueries,
  type IdentityScope,
} from '@/lib/query-identity';

const IdentityContext = React.createContext<IdentityScope | null>(null);

/** Verified server claims scope all protected client state, including mutation callbacks. */
export function IdentityScopeProvider({
  scope,
  children,
}: {
  scope: IdentityScope;
  children: React.ReactNode;
}) {
  const client = useQueryClient();
  const pathname = usePathname();
  const router = useRouter();
  const { userId, accountId, impersonatedBy } = scope;
  const serverKey = identityQueryKey(scope, '').join(':');
  const [verified, setVerified] = React.useState({
    scope: scope as IdentityScope | null,
    pathname,
    serverKey,
    pending: false,
  });
  const current =
    (
      verified.pathname === pathname &&
      verified.serverKey === serverKey &&
      !verified.pending &&
      verified.scope &&
      identityQueryKey(verified.scope, '').join(':') === serverKey
    ) ?
      verified.scope
    : null;
  const previous = React.useRef<IdentityScope | null>(scope);
  const lastNotifiedKey = React.useRef<string | null | undefined>(undefined);
  React.useEffect(() => {
    const supabase = createClient();
    let generation = 0;
    let active = true;
    async function verify() {
      const request = ++generation;
      setVerified((previous) => ({ ...previous, pathname, serverKey, pending: true }));
      const { data } = await supabase.auth.getClaims();
      if (!active || request !== generation) return;
      const claims = data?.claims;
      const accountId = claims?.app_metadata?.account_id;
      const impersonatedBy = claims?.app_metadata?.impersonated_by;
      const next: IdentityScope | null =
        claims && typeof accountId === 'string' ?
          {
            userId: claims.sub,
            accountId,
            impersonatedBy: typeof impersonatedBy === 'string' ? impersonatedBy : null,
          }
        : null;
      const old = previous.current;
      if (
        old &&
        (!next || identityQueryKey(old, '').join(':') !== identityQueryKey(next, '').join(':'))
      ) {
        await retireIdentityQueries(client, old);
      }
      if (!active || request !== generation) return;
      previous.current = next;
      setVerified({ scope: next, pathname, serverKey, pending: false });
      const nextKey = next ? identityQueryKey(next, '').join(':') : null;
      if (lastNotifiedKey.current !== nextKey) {
        lastNotifiedKey.current = nextKey;
        window.dispatchEvent(new Event(IDENTITY_SCOPE_CHANGED_EVENT));
      }
      if (next && identityQueryKey(next, '').join(':') !== serverKey) router.refresh();
    }
    void verify();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void verify();
    });
    return () => {
      active = false;
      generation++;
      subscription.unsubscribe();
    };
  }, [client, pathname, router, serverKey]);
  React.useEffect(
    () => () => {
      void retireIdentityQueries(client, { userId, accountId, impersonatedBy });
    },
    [client, userId, accountId, impersonatedBy],
  );
  // Preserve the subtree during ordinary claim checks; remount only for an actual identity change.
  const key = identityQueryKey(verified.scope ?? scope, '').join(':');
  return (
    <IdentityContext.Provider value={current}>
      <div hidden={!current}>
        <React.Fragment key={key}>{children}</React.Fragment>
      </div>
    </IdentityContext.Provider>
  );
}
/** Null outside the verified dashboard boundary: protected queries must remain disabled. */
export function useIdentityScope(): IdentityScope | null {
  return React.useContext(IdentityContext);
}

export function useIdentityQueryKey(resource: string) {
  const scope = useIdentityScope();
  return {
    scope,
    queryKey: scope ? identityQueryKey(scope, resource) : ['identity', 'unresolved', resource],
  };
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // With SSR, we usually want to set some default staleTime
        // above 0 to avoid refetching immediately on the client
        staleTime: 60 * 1000,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
  if (isServer) {
    // Server: always make a new query client
    return makeQueryClient();
  } else {
    // Browser: make a new query client if we don't already have one
    // This is very important, so we don't re-make a new client if React
    // suspends during the initial render. This may not be needed if we
    // have a suspense boundary BELOW the creation of the query client
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // NOTE: Avoid useState when initializing the query client if you're
  // using suspense in SSR.
  const queryClient = getQueryClient();

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
