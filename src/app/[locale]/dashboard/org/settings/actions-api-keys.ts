'use server';

import { z } from 'zod';

import { getActiveAccountId } from '@/lib/active-account';
import { logger } from '@/lib/logger';
import { withServerAction } from '@/lib/server-action';
import { createClient } from '@/lib/supabase/server';
import { apiKeyCreateSchema, type ApiKeyCreateInput } from '@/lib/validation/api-keys';

export type ApiKey = {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
};

type ActionResult<T> = { data: T | null; error?: string };

const revokeInputSchema = z.object({ id: z.uuid() });

/**
 * Crea una API key y devuelve el plaintext UNA única vez.
 * La autorización (owner/admin) la aplica el RPC create_api_key.
 */
export const createApiKey = withServerAction(async function createApiKey(
  input: ApiKeyCreateInput,
): Promise<ActionResult<{ id: string; key: string }>> {
  const parsed = apiKeyCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { data: null, error: 'validation_error' };
  }

  const accountId = await getActiveAccountId();
  if (!accountId) return { data: null, error: 'no_account' };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('create_api_key', {
    p_account_id: accountId,
    p_name: parsed.data.name,
    p_expires_at: parsed.data.expiresAt ?? undefined,
  });

  if (error) {
    logger.warn(
      { action: 'api_key.create', code: error.code, message: error.message },
      'create_api_key failed',
    );
    return { data: null, error: error.message ?? 'create_failed' };
  }

  const row = data?.[0];
  if (!row) return { data: null, error: 'create_failed' };
  return { data: { id: row.id, key: row.key } };
});

/** Lista las API keys de la cuenta activa (owner/admin, sin hash). */
export const listApiKeys = withServerAction(async function listApiKeys(): Promise<
  ActionResult<ApiKey[]>
> {
  const accountId = await getActiveAccountId();
  if (!accountId) return { data: null, error: 'no_account' };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('list_api_keys', { p_account_id: accountId });

  if (error) {
    logger.warn(
      { action: 'api_key.list', code: error.code, message: error.message },
      'list_api_keys failed',
    );
    return { data: null, error: error.message ?? 'fetch_failed' };
  }

  const keys: ApiKey[] = (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    keyPrefix: row.key_prefix,
    lastUsedAt: row.last_used_at,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    createdAt: row.created_at,
  }));

  return { data: keys };
});

/** Revoca (soft) una API key de la cuenta activa. */
export const revokeApiKey = withServerAction(async function revokeApiKey(input: {
  id: string;
}): Promise<ActionResult<true>> {
  const parsed = revokeInputSchema.safeParse(input);
  if (!parsed.success) {
    return { data: null, error: 'validation_error' };
  }

  const accountId = await getActiveAccountId();
  if (!accountId) return { data: null, error: 'no_account' };

  const supabase = await createClient();
  const { error } = await supabase.rpc('revoke_api_key', { p_key_id: parsed.data.id });

  if (error) {
    logger.warn(
      { action: 'api_key.revoke', code: error.code, message: error.message },
      'revoke_api_key failed',
    );
    return { data: null, error: error.message ?? 'revoke_failed' };
  }

  return { data: true };
});
