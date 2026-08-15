import { execSync } from 'node:child_process';

import type { APIRequestContext } from '@playwright/test';

export const MAILPIT_BASE = 'http://127.0.0.1:54324';
export const SUPABASE_URL = 'http://127.0.0.1:54321';

/**
 * Inserta/actualiza filas directo en Postgres vía el contenedor Docker de Supabase.
 *
 * Necesario porque el hardening de grants deja a service_role sin privilegios de
 * lectura/escritura sobre varias tablas (profiles, accounts_memberships) — toda
 * mutación pasa por RPCs SECURITY DEFINER. Para seeding de tests, psql como
 * postgres dentro del contenedor es la vía soportada que no relaja los grants
 * de producción.
 *
 * IMPORTANTE (Windows): pasar siempre SQL de una sola línea. Un template
 * literal multilínea combinado con paréntesis (ej. `IN (...)`) rompe el
 * parseo de `cmd.exe` — el WHERE se pierde en silencio y la query corre sin
 * filtrar, devolviendo resultados de la tabla completa sin ningún error.
 */
export function execSqlAsPostgres(sql: string): void {
  const container = execSync('docker ps --filter "name=supabase_db" --format "{{.Names}}"')
    .toString()
    .trim()
    .split('\n')[0];
  if (!container) {
    throw new Error('supabase_db container not found — is `supabase start` running?');
  }
  execSync(`docker exec ${container} psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c "${sql}"`);
}

/**
 * Same container/psql plumbing as {@link execSqlAsPostgres}, but returns
 * stdout (`-tAc`: tuples-only, unaligned) so callers can assert on the
 * result instead of just running a mutation. SQL must not contain `"` —
 * it's interpolated inside a double-quoted shell argument; use single quotes.
 */
export function querySqlAsPostgres(sql: string): string {
  const container = execSync('docker ps --filter "name=supabase_db" --format "{{.Names}}"')
    .toString()
    .trim()
    .split('\n')[0];
  if (!container) {
    throw new Error('supabase_db container not found — is `supabase start` running?');
  }
  return execSync(
    `docker exec ${container} psql -U postgres -d postgres -v ON_ERROR_STOP=1 -tAc "${sql}"`,
  )
    .toString()
    .trim();
}

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

/**
 * Polls Mailpit for the team invitation sent to `recipient` and returns its
 * accept URL.
 *
 * Separate from {@link fetchLatestMessageTo}, which looks for Supabase Auth's
 * confirmation links (/auth/confirm, /verify). Invitations are sent by the app
 * itself, not by Auth, and only reach Mailpit when MAILPIT_URL is set — see
 * src/lib/email/index.tsx.
 */
export async function fetchInvitationLinkTo(
  request: APIRequestContext,
  recipient: string,
  maxWaitMs = 15_000,
): Promise<string> {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    const res = await request.get(`${MAILPIT_BASE}/api/v1/search?query=to:${recipient}`);
    if (res.ok()) {
      const data: { messages?: Array<{ ID: string }> } = await res.json();
      const msg = data.messages?.[0];
      if (msg) {
        const detail = await request.get(`${MAILPIT_BASE}/api/v1/message/${msg.ID}`);
        const body: { Text?: string; HTML?: string } = await detail.json();
        const content = `${body.HTML ?? ''}\n${body.Text ?? ''}`.replace(/&amp;/g, '&');
        const link = content
          .match(/https?:\/\/[^\s"<>()]+/g)
          ?.find((url) => url.includes('/auth/accept-invitation?token='));
        if (link) return link;
        throw new Error(`Email delivered to ${recipient} but it carries no invitation link`);
      }
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(
    `No invitation email delivered to ${recipient} within ${maxWaitMs}ms — ` +
      `is MAILPIT_URL set so the app delivers to Mailpit instead of Resend?`,
  );
}

/** Resolves an access token for an already-confirmed user via the password grant. */
export async function passwordGrant(
  request: APIRequestContext,
  email: string,
  password: string,
  apikey: string,
): Promise<string> {
  const res = await request.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    headers: { apikey, 'Content-Type': 'application/json' },
    data: { email, password },
  });
  const body: { access_token?: string; error?: string; msg?: string } = await res.json();
  if (!body.access_token) {
    throw new Error(`Password grant failed: ${JSON.stringify(body)}`);
  }
  return body.access_token;
}

/** Enrolls a TOTP factor for the user identified by `accessToken`. Does not verify it. */
export async function enrollTotpFactor(
  request: APIRequestContext,
  accessToken: string,
  apikey: string,
): Promise<{ factorId: string; secret: string }> {
  const res = await request.post(`${SUPABASE_URL}/auth/v1/factors`, {
    headers: {
      apikey,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    data: { factor_type: 'totp', friendly_name: 'e2e' },
  });
  const body: { id?: string; totp?: { secret?: string }; error?: string; msg?: string } =
    await res.json();
  if (!body.id || !body.totp?.secret) {
    throw new Error(`TOTP enroll failed: ${JSON.stringify(body)}`);
  }
  return { factorId: body.id, secret: body.totp.secret };
}

/**
 * Resolves a challenge for `factorId` and verifies it with `code`.
 * The first verify of a freshly enrolled factor both marks it `verified`
 * and elevates the *current* session to aal2 — irrelevant here, since the
 * fixture discards this session and re-authenticates through the real UI.
 */
export async function verifyTotpFactor(
  request: APIRequestContext,
  accessToken: string,
  apikey: string,
  factorId: string,
  code: string,
): Promise<void> {
  const challengeRes = await request.post(`${SUPABASE_URL}/auth/v1/factors/${factorId}/challenge`, {
    headers: { apikey, Authorization: `Bearer ${accessToken}` },
  });
  const challengeBody: { id?: string; error?: string; msg?: string } = await challengeRes.json();
  if (!challengeBody.id) {
    throw new Error(`TOTP challenge failed: ${JSON.stringify(challengeBody)}`);
  }

  const verifyRes = await request.post(`${SUPABASE_URL}/auth/v1/factors/${factorId}/verify`, {
    headers: {
      apikey,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    data: { challenge_id: challengeBody.id, code },
  });
  if (!verifyRes.ok()) {
    const body: unknown = await verifyRes.json().catch(() => null);
    throw new Error(
      `TOTP verify rejected — check for clock skew between host and the supabase_auth ` +
        `container: ${JSON.stringify(body)}`,
    );
  }
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
