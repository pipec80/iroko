import type { APIRequestContext } from '@playwright/test';

export const MAILPIT_BASE = 'http://127.0.0.1:54324';
export const SUPABASE_URL = 'http://127.0.0.1:54321';

export function uniqueEmail(prefix = 'e2e'): string {
  return `${prefix}+${Date.now()}@saasboilerplate.local`;
}

/**
 * Polls Mailpit until an email arrives for `recipient`, then extracts the
 * OTP confirmation URL from its content.
 */
export async function fetchLatestMessageTo(
  request: APIRequestContext,
  recipient: string,
  maxWaitMs = 15_000,
): Promise<{ subject: string; confirmUrl: string | null }> {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    const res = await request.get(`${MAILPIT_BASE}/api/v1/search?query=to:${recipient}`);
    if (res.ok()) {
      const data: { messages?: Array<{ ID: string; Subject: string }> } = await res.json();
      const msg = data.messages?.[0];
      if (msg) {
        const detail = await request.get(`${MAILPIT_BASE}/api/v1/message/${msg.ID}`);
        const body: { Text?: string; HTML?: string } = await detail.json();
        const content = `${body.HTML ?? ''}\n${body.Text ?? ''}`.replace(/&amp;/g, '&');
        const match = content.match(/https?:\/\/[^\s"<>()]+/g);
        const confirmUrl =
          match?.find(
            (u) =>
              /\/(auth\/v1\/)?verify\?/.test(u) ||
              u.includes('/auth/confirm') ||
              u.includes('/auth/click'),
          ) ?? null;
        console.log('EXTRACTED URL:', confirmUrl);
        return { subject: msg.Subject, confirmUrl };
      }
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`No email delivered to ${recipient} within ${maxWaitMs}ms`);
}

/** Creates a pre-confirmed user via Supabase Admin API. Returns the user UUID. */
export async function createConfirmedUser(
  request: APIRequestContext,
  email: string,
  password: string,
  serviceKey: string,
): Promise<string> {
  const res = await request.post(`${SUPABASE_URL}/auth/v1/admin/users`, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    data: { email, password, email_confirm: true },
  });
  const body: { id?: string; error?: string } = await res.json();
  if (!body.id) throw new Error(`Failed to create test user: ${JSON.stringify(body)}`);
  return body.id;
}

/** Deletes a test user by UUID via Supabase Admin API. Best-effort (swallows errors). */
export async function deleteUserById(
  request: APIRequestContext,
  userId: string,
  serviceKey: string,
): Promise<void> {
  await request
    .delete(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    })
    .catch(() => {});
}

/**
 * Finds a user by email via admin list, then deletes by UUID.
 * Use when you don't have the UUID upfront (e.g. user created via UI signup).
 */
export async function deleteUserByEmail(
  request: APIRequestContext,
  email: string,
  serviceKey: string,
): Promise<void> {
  const listRes = await request.get(`${SUPABASE_URL}/auth/v1/admin/users`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  const listData: { users?: Array<{ id: string; email: string }> } = await listRes.json();
  const userId = listData.users?.find((u) => u.email === email)?.id;
  if (userId) {
    await deleteUserById(request, userId, serviceKey);
  }
}
