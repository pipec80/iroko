import { createClient as createSupabaseClient } from '@supabase/supabase-js';

import { env } from '@/env';
import type { Database } from '@/types/database';

/**
 * Service-role client — bypasses RLS. Use ONLY in server-side code
 * (webhooks, background jobs, admin tasks). Never expose to the client.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
