import { env } from "@/env"
import type { Database } from "@/types/database"
import { createClient } from "@supabase/supabase-js"

/**
 * Cliente ADMIN para uso exclusivo de Server Components o Route Handlers (Node.js runtime).
 * Utiliza SERVICE_ROLE para saltarse el RLS (Row Level Security).
 * Útil para auto-aprovisionar usuarios o modificar configuración global.
 */
export const supabaseAdmin = createClient<Database>(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)
