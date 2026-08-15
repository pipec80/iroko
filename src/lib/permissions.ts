import type { Database } from '@/types/database';

export type MembershipRole = Database['public']['Enums']['membership_role'];

/**
 * Matriz RBAC canónica — debe reflejar exactamente las policies de
 * supabase/migrations/20260815000000_rbac_matrix.sql. Es la única fuente de
 * verdad de permisos en el frontend: ningún componente debe comparar
 * `role === 'owner'` de forma inline por su cuenta.
 *
 * Esto NO reemplaza el enforcement de la DB — RLS sigue siendo lo único que
 * hace cumplir estas reglas. Su propósito es que la UI deje de ofrecer
 * acciones que la DB va a rechazar de todas formas.
 */
const EDITOR_ROLES: readonly MembershipRole[] = ['owner', 'admin', 'member'];
const ADMIN_ROLES: readonly MembershipRole[] = ['owner', 'admin'];

/** owner/admin/member — crea y edita projects/documents, sube a Storage documents. */
export function canEditContent(role: MembershipRole | null): boolean {
  return role != null && EDITOR_ROLES.includes(role);
}

/** Solo owner — projects/documents. Acción destructiva, no se sube a member. */
export function canDeleteContent(role: MembershipRole | null): boolean {
  return role === 'owner';
}

/** owner/admin — invitar, remover miembros, editar info de la cuenta. */
export function canManageMembers(role: MembershipRole | null): boolean {
  return role != null && ADMIN_ROLES.includes(role);
}

/** owner/admin — checkout, portal de facturación, ver facturas. */
export function canManageBilling(role: MembershipRole | null): boolean {
  return role != null && ADMIN_ROLES.includes(role);
}

/** owner/admin — API keys, webhooks, audit log, logo de la organización. */
export function canManageOrgSettings(role: MembershipRole | null): boolean {
  return role != null && ADMIN_ROLES.includes(role);
}
