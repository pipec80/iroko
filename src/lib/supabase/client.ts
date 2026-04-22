import { env } from "@/env"
import type { Database } from "@/types/database"
import { createBrowserClient } from "@supabase/ssr"

// Cliente Singleton para el navegador (Client Components)
export function createClient() {
  return createBrowserClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}
