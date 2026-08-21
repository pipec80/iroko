import { createClient } from '@/lib/supabase/server';
import type { MembershipRole } from '@/lib/permissions';

/** account_id activo desde app_metadata del JWT; null si no hay sesión o claim. */
export async function getActiveAccountId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return (data?.claims?.app_metadata?.account_id as string | undefined) ?? null;
}

/** Rol del usuario en la cuenta activa desde app_metadata del JWT; null si no hay sesión o claim. */
export async function getActiveAccountRole(): Promise<MembershipRole | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return (data?.claims?.app_metadata?.role as MembershipRole | undefined) ?? null;
}

/**
 * Revalida el rol del usuario autenticado contra memberships antes de un
 * efecto sensible. Los claims del JWT solo son adecuados para la UI porque
 * pueden permanecer obsoletos hasta que el token se renueve.
 */
export async function requireAccountRole(
  accountId: string,
  allowedRoles: readonly MembershipRole[],
): Promise<void> {
  const supabase = await createClient();
  const { data: role, error } = await supabase.rpc('get_my_account_role', {
    p_account_id: accountId,
  });

  if (error || !role || !allowedRoles.includes(role)) {
    throw new Error('not_authorized');
  }
}
