export const MERCADOPAGO_PRODUCTION_URL = 'https://project-a89lv.vercel.app';

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
