import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

/**
 * Returns the authenticated user's stored timezone, falling back to 'UTC'.
 * Designed for Server Components — call once per page and pass the result down.
 */
export async function getUserTimezone(supabase: SupabaseClient<Database>): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return 'UTC';

  const { data } = await supabase.from('profiles').select('timezone').eq('id', user.id).single();

  return data?.timezone ?? 'UTC';
}
