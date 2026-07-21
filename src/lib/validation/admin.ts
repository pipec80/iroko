import { z } from 'zod';

import { AUDIT_ACTIONS, AUDIT_RESOURCE_TYPES } from './audit-log';

export const ADMIN_ACCOUNTS_DEFAULT_PAGE_SIZE = 20;
export const ADMIN_ACCOUNTS_MAX_PAGE_SIZE = 100;

const adminAccountsCursorSchema = z.object({
  createdAt: z.string().datetime({ offset: true }),
  id: z.string().uuid(),
});

/** Query filters for `getAdminAccounts`. All fields optional; omit `cursor` for the first page. */
export const adminAccountsQuerySchema = z.object({
  search: z.string().trim().min(1).nullable().default(null),
  limit: z
    .number()
    .int()
    .min(1)
    .max(ADMIN_ACCOUNTS_MAX_PAGE_SIZE)
    .default(ADMIN_ACCOUNTS_DEFAULT_PAGE_SIZE),
  cursor: adminAccountsCursorSchema.nullable().default(null),
});

export type AdminAccountsCursor = z.infer<typeof adminAccountsCursorSchema>;
export type AdminAccountsQueryInput = z.input<typeof adminAccountsQuerySchema>;
export type AdminAccountsQuery = z.output<typeof adminAccountsQuerySchema>;

const platformAuditLogCursorSchema = z.object({
  createdAt: z.string().datetime({ offset: true }),
  id: z.number().int().positive(),
});

/** Query filters for `getPlatformAuditLogs` — same shape as the account-scoped audit-log schema, plus accountId/actorId filters. */
export const platformAuditLogQuerySchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  cursor: platformAuditLogCursorSchema.nullable().default(null),
  accountId: z.string().uuid().nullable().default(null),
  actorId: z.string().uuid().nullable().default(null),
  action: z.enum(AUDIT_ACTIONS).nullable().default(null),
  resourceType: z.enum(AUDIT_RESOURCE_TYPES).nullable().default(null),
});

export type PlatformAuditLogCursor = z.infer<typeof platformAuditLogCursorSchema>;
export type PlatformAuditLogQueryInput = z.input<typeof platformAuditLogQuerySchema>;
export type PlatformAuditLogQuery = z.output<typeof platformAuditLogQuerySchema>;

/** Input for `sendPlatformAlert` — subject/body of the broadcast email. */
export const platformAlertSchema = z.object({
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(5000),
});

export type PlatformAlertInput = z.input<typeof platformAlertSchema>;
