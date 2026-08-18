import { execSync } from 'node:child_process';

import { expect, type APIRequestContext, type Page } from '@playwright/test';

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
 * Crea una organización desde el switcher del sidebar y deja al usuario dentro
 * de ella (create_team la marca como cuenta activa y la app redirige).
 *
 * Necesario en cualquier spec que invite gente: invite_members exige
 * `type='team'`, porque las cuentas personales son 1:1 con su usuario.
 *
 * Selectores verificados contra los componentes reales:
 * - El trigger tiene `aria-label="Cambiar de organización"` fijo, así que su
 *   nombre accesible no cambia con la organización seleccionada.
 * - "Nueva organización" solo se monta con el dropdown abierto
 *   (`{isOpen && ...}` en app-sidebar-client.tsx).
 */
export async function createTeamViaUi(page: Page, teamName: string): Promise<void> {
  const switcher = page.getByRole('button', { name: /cambiar de organización/i });

  await page.goto('/es/dashboard');
  await page.waitForURL(/\/es\/dashboard$/);
  await switcher.click();
  await expect(page.getByRole('listbox')).toBeVisible();
  await page.getByRole('button', { name: /nueva organización/i }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByLabel(/nombre/i).fill(teamName);
  await dialog.getByRole('button', { name: /^crear$/i }).click();

  await page.waitForURL(/\/es\/dashboard$/);
  await expect(switcher).toContainText(teamName);
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

/** Logs in through the real login form and waits for the dashboard redirect. */
export async function loginViaUi(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/es/login');
  await page.locator('input[name="email"][type="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole('button', { name: /iniciar sesión/i }).click();
  await page.waitForURL(/\/es\/dashboard/, { timeout: 20_000 });
}

type ApiResult = { ok: boolean; status: number; body: unknown };

const RATE_LIMIT_STATUS = 429;
const RATE_LIMIT_MAX_ATTEMPTS = 3;
const RATE_LIMIT_BASE_DELAY_MS = 1000;

/**
 * Retries `perform` on HTTP 429 with exponential backoff (1s, 2s). The E2E
 * suite runs every spec's write traffic through one shared local Supabase in
 * a single CI job — this is defense against the full suite's cumulative
 * volume brushing against `check_request()`'s real 100 req/5min limit, not a
 * substitute for it being correct (see the 20260818120000 migration for the
 * actual bug that limit had).
 */
async function withRateLimitRetry(perform: () => Promise<ApiResult>): Promise<ApiResult> {
  let result = await perform();
  for (
    let attempt = 1;
    result.status === RATE_LIMIT_STATUS && attempt < RATE_LIMIT_MAX_ATTEMPTS;
    attempt++
  ) {
    await new Promise((r) => setTimeout(r, RATE_LIMIT_BASE_DELAY_MS * 2 ** (attempt - 1)));
    result = await perform();
  }
  return result;
}

/**
 * Calls a Postgres RPC via PostgREST as the given user — the same enforcement
 * path the app itself uses (RLS + SECURITY DEFINER checks), no service_role
 * bypass. Used to verify RBAC directly against the database instead of
 * reconstructing a full UI flow per role.
 */
export async function callRpc(
  request: APIRequestContext,
  fn: string,
  args: Record<string, unknown>,
  accessToken: string,
  apikey: string,
): Promise<ApiResult> {
  return withRateLimitRetry(async () => {
    const res = await request.post(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
      headers: {
        apikey,
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      data: args,
    });
    return { ok: res.ok(), status: res.status(), body: await res.json().catch(() => null) };
  });
}

/**
 * Direct PostgREST request against a table, as the given user — exercises RLS
 * directly. Always asks for `return=representation`: an UPDATE/DELETE that
 * RLS's USING clause silently excludes still responds 200/204 with 0 rows
 * affected, never an HTTP error — the row COUNT is the real signal of
 * "blocked by RLS", not the status code. Use rowCount() on the result.
 */
export async function restRequest(
  request: APIRequestContext,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  accessToken: string,
  apikey: string,
  data?: Record<string, unknown>,
): Promise<ApiResult> {
  return withRateLimitRetry(async () => {
    const res = await request.fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      method,
      headers: {
        apikey,
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      data,
    });
    return { ok: res.ok(), status: res.status(), body: await res.json().catch(() => null) };
  });
}

/** Rows returned by a restRequest() result — 0 means RLS silently blocked it. */
export function rowCount(result: ApiResult): number {
  return Array.isArray(result.body) ? result.body.length : 0;
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
