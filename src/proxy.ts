import { env } from "@/env"
import { createServerClient } from "@supabase/ssr"
import createMiddleware from "next-intl/middleware"
import { NextRequest } from "next/server"
import { routing } from "./i18n/routing"

const intlMiddleware = createMiddleware(routing)

export async function proxy(request: NextRequest) {
  // 1. Generate Nonce for CSP
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64")
  const isDev = process.env.NODE_ENV === "development"

  // 2. Prepare CSP Header
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' ${!isDev ? "'strict-dynamic'" : "'unsafe-inline'"} ${isDev ? "'unsafe-eval'" : ""} https: http:;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    img-src 'self' blob: data: https://*.supabase.co https://images.unsplash.com https://api.dicebear.com;
    font-src 'self' https://fonts.gstatic.com;
    connect-src 'self' https://*.supabase.co wss://*.supabase.co;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `
    .replace(/\s{2,}/g, " ")
    .trim()

  // 3. Set request headers
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-nonce", nonce)
  requestHeaders.set("Content-Security-Policy", cspHeader)

  // Clone request with new headers for next-intl
  const requestWithNonce = new NextRequest(request.url, {
    headers: requestHeaders,
    method: request.method,
    body: request.body,
    referrer: request.referrer,
  })

  // 4. Execute next-intl middleware
  const response = intlMiddleware(requestWithNonce)

  // 5. Add security headers to the downstream response
  response.headers.set("Content-Security-Policy", cspHeader)
  response.headers.set("x-nonce", nonce)
  // Fix for Next.js 16 Server Components to receive the nonce
  response.headers.set("x-middleware-request-x-nonce", nonce)
  response.headers.set("x-middleware-request-content-security-policy", cspHeader)

  // 6. Supabase Session Refresh
  const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        // Mutate request cookies (upstream)
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value)
        }
        // Mutate response cookies (downstream)
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options)
        }
      },
    },
  })

  // Refresh auth token if necessary
  await supabase.auth.getUser()

  return response
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|manifest.json|.*\\..*).*)", "/", "/(es|en)/:path*"],
}
