import { z } from 'zod';

/** Full domain of `audit.action_type`. create/update/delete come from the generic trigger; impersonate_start/impersonate_end come from begin_/end_impersonation_session (F3-C2); the rest are reserved for future use. */
export const AUDIT_ACTIONS = [
  'create',
  'update',
  'delete',
  'login',
  'logout',
  'invite',
  'role_change',
  'subscription_change',
  'payment',
  'export',
  'impersonate_start',
  'impersonate_end',
] as const;

/** Tables currently wired to `private.audit_log()` (see migration 20260625300001). */
export const AUDIT_RESOURCE_TYPES = [
  'profiles',
  'accounts',
  'accounts_memberships',
  'invitations',
  'projects',
  'documents',
] as const;

export const AUDIT_LOG_DEFAULT_PAGE_SIZE = 20;
export const AUDIT_LOG_MAX_PAGE_SIZE = 100;

const auditLogCursorSchema = z.object({
  createdAt: z.string().datetime({ offset: true }),
  id: z.number().int().positive(),
});

/** Query filters for `getAccountAuditLogs`. All fields are optional; omit `cursor` for the first page. */
export const auditLogQuerySchema = z.object({
  limit: z.number().int().min(1).max(AUDIT_LOG_MAX_PAGE_SIZE).default(AUDIT_LOG_DEFAULT_PAGE_SIZE),
  cursor: auditLogCursorSchema.nullable().default(null),
  action: z.enum(AUDIT_ACTIONS).nullable().default(null),
  resourceType: z.enum(AUDIT_RESOURCE_TYPES).nullable().default(null),
});

export type AuditLogCursor = z.infer<typeof auditLogCursorSchema>;
export type AuditLogQueryInput = z.input<typeof auditLogQuerySchema>;
export type AuditLogQuery = z.output<typeof auditLogQuerySchema>;
