'use server';

import { logger } from '@/lib/logger';
import { withServerAction } from '@/lib/server-action';
import { createClient } from '@/lib/supabase/server';
import {
  platformAuditLogQuerySchema,
  type PlatformAuditLogCursor,
  type PlatformAuditLogQueryInput,
} from '@/lib/validation/admin';
import type { Database } from '@/types/database';

export type PlatformAuditAction = Database['audit']['Enums']['action_type'];

export type PlatformAuditLogEntry = {
  id: number;
  actorId: string | null;
  actorName: string | null;
  impersonatorId: string | null;
  accountId: string | null;
  action: PlatformAuditAction;
  resourceType: string;
  resourceId: string | null;
  createdAt: string;
};

export type PlatformAuditLogPage = {
  entries: PlatformAuditLogEntry[];
  nextCursor: PlatformAuditLogCursor | null;
};

type ActionResult = { data: PlatformAuditLogPage | null; error?: string };

/**
 * Fetches one page of the platform-wide (cross-account) audit log.
 * Authorization (platform_admins + aal2) is enforced entirely by the
 * `get_platform_audit_logs` RPC.
 */
export const getPlatformAuditLogs = withServerAction(async function getPlatformAuditLogs(
  input: PlatformAuditLogQueryInput,
): Promise<ActionResult> {
  const parsed = platformAuditLogQuerySchema.safeParse(input);
  if (!parsed.success) {
    return { data: null, error: 'validation_error' };
  }

  const { limit, cursor, accountId, actorId, action, resourceType } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_platform_audit_logs', {
    p_limit: limit,
    p_cursor_created_at: cursor?.createdAt ?? undefined,
    p_cursor_id: cursor?.id ?? undefined,
    p_account_id: accountId ?? undefined,
    p_actor_id: actorId ?? undefined,
    p_action: action ?? undefined,
    p_resource_type: resourceType ?? undefined,
  });

  if (error) {
    logger.warn(
      { action: 'admin.audit.list', code: error.code, message: error.message },
      'get_platform_audit_logs failed',
    );
    return { data: null, error: error.message ?? 'fetch_failed' };
  }

  const entries: PlatformAuditLogEntry[] = (data ?? []).map((row) => ({
    id: row.id,
    actorId: row.actor_id,
    actorName: row.actor_name,
    impersonatorId: row.impersonator_id,
    accountId: row.account_id,
    action: row.action,
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    createdAt: row.created_at,
  }));

  const last = entries.at(-1);
  const nextCursor: PlatformAuditLogCursor | null =
    entries.length === limit && last ? { createdAt: last.createdAt, id: last.id } : null;

  return { data: { entries, nextCursor } };
});
