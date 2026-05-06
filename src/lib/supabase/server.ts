import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import { env } from '@/env';
import type { Database } from '@/types/database';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet)
              cookieStore.set(name, value, options);
          } catch {
            // Called from a Server Component — cookies are read-only.
            // The proxy (src/proxy.ts) refreshes sessions instead.
          }
        },
      },
    },
  );
}
