import { env } from '@/env';

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;

/**
 * Absolute-URL origins we trust for stored image references. Keeping the check
 * here (not just at the CSP layer) means that if a bad `avatar_url` ever lands
 * in the DB, we never hand the browser an attacker-controlled origin.
 * - Supabase Storage: our own bucket CDN.
 * - lh3.googleusercontent.com: Google OAuth profile pictures (OIDC `picture`).
 */
const TRUSTED_IMAGE_HOSTS = new Set(['lh3.googleusercontent.com']);

function isTrustedAbsoluteUrl(value: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:') return false;
  if (value.startsWith(SUPABASE_URL)) return true;
  return TRUSTED_IMAGE_HOSTS.has(parsed.hostname);
}

/** Convierte un path de storage en URL pública del CDN.
 *  Guarda el path en DB, construye la URL aquí al renderizar.
 *  Ejemplo: "avatars/abc-123/avatar.jpg" → "https://xxx.supabase.co/storage/v1/object/public/avatars/abc-123/avatar.jpg"
 *
 *  Los valores absolutos (URLs legacy o avatares de OAuth) solo se devuelven si
 *  provienen de un origen de confianza; cualquier otro origen retorna null para
 *  que la UI caiga al avatar por defecto en vez de cargar una imagen ajena.
 */
export function storageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) {
    return isTrustedAbsoluteUrl(path) ? path : null;
  }
  return `${SUPABASE_URL}/storage/v1/object/public/${path}`;
}
