'use server';

import { getActiveAccountId } from '@/lib/active-account';
import { logger } from '@/lib/logger';
import { withServerAction } from '@/lib/server-action';
import { createClient } from '@/lib/supabase/server';
import { auditLogQuerySchema, type AuditLogQueryInput } from '@/lib/validation/audit-log';
import type { Database } from '@/types/database';

export type AuditAction = Database['audit']['Enums']['action_type'];

export type AuditLogEntry = {
  id: number;
  actorId: string | null;
  actorName: string | null;
  avatarUrl: string | null;
  action: AuditAction;
  resourceType: string;
  resourceId: string | null;
  createdAt: string;
};

export type AuditLogCursor = { createdAt: string; id: number };

export type AuditLogPage = {
  entries: AuditLogEntry[];
  nextCursor: AuditLogCursor | null;
};

type ActionResult = { data: AuditLogPage | null; error?: string };

/**
 * Fetches one page of audit log entries for the current account.
 * Authorization (owner/admin only) is enforced by the `get_account_audit_logs`
 * RPC — a rejected caller gets `{ error: 'not_authorized' }` back, not a throw.
 */
export const getAccountAuditLogs = withServerAction(async function getAccountAuditLogs(
  input: AuditLogQueryInput,
): Promise<ActionResult> {
  const parsed = auditLogQuerySchema.safeParse(input);
  if (!parsed.success) {
    return { data: null, error: 'validation_error' };
  }

  const accountId = await getActiveAccountId();
  if (!accountId) return { data: null, error: 'no_account' };

  const { limit, cursor, action, resourceType } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_account_audit_logs', {
    p_account_id: accountId,
    p_limit: limit,
    p_cursor_created_at: cursor?.createdAt ?? undefined,
    p_cursor_id: cursor?.id ?? undefined,
    p_action: action ?? undefined,
    p_resource_type: resourceType ?? undefined,
  });

  if (error) {
    logger.warn(
      { action: 'audit_log.list', code: error.code, message: error.message },
      'get_account_audit_logs failed',
    );
    return { data: null, error: error.message ?? 'fetch_failed' };
  }

  const entries: AuditLogEntry[] = (data ?? []).map((row) => ({
    id: row.id,
    actorId: row.actor_id,
    actorName: row.actor_name,
    avatarUrl: row.avatar_url,
    action: row.action,
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    createdAt: row.created_at,
  }));

  const last = entries.at(-1);
  const nextCursor: AuditLogCursor | null =
    entries.length === limit && last ? { createdAt: last.createdAt, id: last.id } : null;

  return { data: { entries, nextCursor } };
});
