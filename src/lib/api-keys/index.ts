import { logger } from '@/lib/logger';
import { createAdminClient } from '@/lib/supabase/admin';

export type ApiKeyAuthResult = { accountId: string } | { error: 'missing_key' | 'invalid_key' };

/** SHA-256 hex de una clave — mismo formato que guarda create_api_key en la DB. */
export async function hashApiKey(key: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Autentica un request externo por header `Authorization: Bearer irk_…`.
 * Usa el admin client porque el caller no tiene JWT de Supabase; la clave nunca
 * se loguea ni viaja en claro a la DB (solo su hash SHA-256).
 */
export async function authenticateApiKey(request: Request): Promise<ApiKeyAuthResult> {
  const header = request.headers.get('authorization');
  if (!header?.startsWith('Bearer irk_')) {
    return { error: 'missing_key' };
  }

  const keyHash = await hashApiKey(header.slice('Bearer '.length));
  const admin = createAdminClient();
  const { data, error } = await admin.rpc('verify_api_key', { p_key_hash: keyHash });

  if (error) {
    logger.error({ action: 'api_key.verify', code: error.code }, 'verify_api_key failed');
    return { error: 'invalid_key' };
  }
  if (!data) {
    return { error: 'invalid_key' };
  }
  return { accountId: data };
}
