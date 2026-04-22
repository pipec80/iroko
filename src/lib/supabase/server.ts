import { env } from "@/env"
import type { Database } from "@/types/database"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

// Cliente para Server Components / Server Actions / Route Handlers
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // El método `setAll` fue llamado desde un Server Component.
          // Esto puede ignorarse si tienes un middleware refrescando sesiones.
        }
      },
    },
  })
}
