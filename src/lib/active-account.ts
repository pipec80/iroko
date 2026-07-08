import { createClient } from '@/lib/supabase/server';

/** account_id activo desde app_metadata del JWT; null si no hay sesión o claim. */
export async function getActiveAccountId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return (data?.claims?.app_metadata?.account_id as string | undefined) ?? null;
}
