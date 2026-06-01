import { env } from '@/env';

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;

/** Convierte un path de storage en URL pública del CDN.
 *  Guarda el path en DB, construye la URL aquí al renderizar.
 *  Ejemplo: "avatars/abc-123/avatar.jpg" → "https://xxx.supabase.co/storage/v1/object/public/avatars/abc-123/avatar.jpg"
 */
export function storageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('http')) return path; // URL legacy completa — compatibilidad hacia atrás
  return `${SUPABASE_URL}/storage/v1/object/public/${path}`;
}

/** Devuelve el bucket del path: "avatars/abc/avatar.jpg" → "avatars" */
export function storageBucket(path: string): string {
  return path.split('/')[0] ?? '';
}
