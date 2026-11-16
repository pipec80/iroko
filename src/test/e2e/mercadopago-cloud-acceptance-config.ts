export const MERCADOPAGO_PRODUCTION_URL = 'https://project-a89lv.vercel.app';

/** Raw GoTrue HTTP responses are flat; only the SDK wraps them in properties. */
export function supabaseGenerateLinkTokenHash(body: unknown): string {
  if (
    typeof body === 'object' &&
    body !== null &&
    'hashed_token' in body &&
    typeof body.hashed_token === 'string' &&
    body.hashed_token.length > 0
  )
    return body.hashed_token;
  throw new Error('mercadopago_cloud_acceptance_invalid_generate_link_response');
}

/** Headers for the protected Node-side Auth admin request, never a browser request. */
export function supabaseAdminHeaders(secretKey: string): Record<string, string> {
  const headers: Record<string, string> = {
    apikey: secretKey,
    // Node-only bootstrap: secret keys must not use a browser identity.
    'User-Agent': 'Iroko-Cloud-Acceptance/1.0',
  };
  if (!secretKey.startsWith('sb_secret_')) headers.Authorization = `Bearer ${secretKey}`;
  return headers;
}

/**
 * Production acceptance must exercise the stable application origin used by
 * Mercado Pago and Cloudflare. Per-deployment Vercel URLs are not webhook
 * origins and can carry deployment-specific configuration.
 */
export function assertCanonicalCloudAcceptanceUrl(baseUrl: string) {
  if (baseUrl !== MERCADOPAGO_PRODUCTION_URL) {
    throw new Error('mercadopago_cloud_acceptance_requires_canonical_production_url');
  }
}

/** Keeps the workflow diagnosis useful without exposing a provider response body. */
export function assertSupabaseGenerateLinkStatus(status: number) {
  if (status < 200 || status >= 300) {
    throw new Error(`mercadopago_cloud_acceptance_generate_link_failed_${status}`);
  }
}
