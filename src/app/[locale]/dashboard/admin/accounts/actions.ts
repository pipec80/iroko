'use server';

import { logger } from '@/lib/logger';
import { withServerAction } from '@/lib/server-action';
import { createClient } from '@/lib/supabase/server';
import {
  adminAccountsQuerySchema,
  type AdminAccountsCursor,
  type AdminAccountsQueryInput,
} from '@/lib/validation/admin';
import type { Database } from '@/types/database';

export type AdminAccountEntry = {
  accountId: string;
  name: string;
  slug: string;
  type: Database['public']['Enums']['account_type'];
  ownerEmail: string | null;
  planSlug: string | null;
  subscriptionStatus: Database['billing']['Enums']['subscription_status'] | null;
  memberCount: number;
  createdAt: string;
};

export type AdminAccountsPage = {
  entries: AdminAccountEntry[];
  nextCursor: AdminAccountsCursor | null;
};

type ActionResult = { data: AdminAccountsPage | null; error?: string };

/**
 * Fetches one page of accounts for the super-admin back-office.
 * Authorization (platform_admins + aal2) is enforced entirely by the
 * `admin_list_accounts` RPC — a rejected caller gets `{ error: 'not_platform_admin' | 'mfa_required' }` back, not a throw.
 */
export const getAdminAccounts = withServerAction(async function getAdminAccounts(
  input: AdminAccountsQueryInput,
): Promise<ActionResult> {
  const parsed = adminAccountsQuerySchema.safeParse(input);
  if (!parsed.success) {
    return { data: null, error: 'validation_error' };
  }

  const { search, limit, cursor } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('admin_list_accounts', {
    p_search: search ?? undefined,
    p_limit: limit,
    p_cursor_created_at: cursor?.createdAt ?? undefined,
    p_cursor_id: cursor?.id ?? undefined,
  });

  if (error) {
    logger.warn(
      { action: 'admin.accounts.list', code: error.code, message: error.message },
      'admin_list_accounts failed',
    );
    return { data: null, error: error.message ?? 'fetch_failed' };
  }

  const entries: AdminAccountEntry[] = (data ?? []).map((row) => ({
    accountId: row.account_id,
    name: row.name,
    slug: row.slug,
    type: row.type,
    ownerEmail: row.owner_email,
    planSlug: row.plan_slug,
    subscriptionStatus: row.subscription_status,
    memberCount: row.member_count,
    createdAt: row.created_at,
  }));

  const last = entries.at(-1);
  const nextCursor: AdminAccountsCursor | null =
    entries.length === limit && last ? { createdAt: last.createdAt, id: last.accountId } : null;

  return { data: { entries, nextCursor } };
});
