import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

/**
 * Contexto requerido para evaluar un feature flag por cuenta.
 */
export type FlagContext = {
  /** UUID de la cuenta contra la que se evalúa el flag. */
  accountId: string;
};

/**
 * Comprueba si un feature flag está habilitado para la cuenta dada.
 *
 * Resolución en el servidor (RPC `is_flag_enabled`):
 * 1. Override por cuenta en `feature_flag_overrides`
 * 2. Features del plan activo/trialing en `billing.plans.features`
 * 3. Default global en `feature_flags.enabled`
 * 4. `false` si el flag no existe (fail-safe)
 *
 * @param flag - Slug del flag, p.ej. `'webhooks'`, `'api_keys'`
 * @param ctx - Contexto de cuenta para la comprobación
 * @returns `true` si el flag está habilitado para esa cuenta
 * @throws si Supabase devuelve un error inesperado
 *
 * @example
 * const canUseWebhooks = await isEnabled('webhooks', { accountId })
 * if (!canUseWebhooks) redirect('/upgrade')
 */
export async function isEnabled(flag: string, ctx: FlagContext): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('is_flag_enabled', {
    p_flag_name: flag,
    p_account_id: ctx.accountId,
  });

  if (error) {
    logger.error({ flag, accountId: ctx.accountId, action: 'is_flag_enabled' }, error.message);
    throw error;
  }

  return data ?? false;
}
