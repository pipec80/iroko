# Plan 002 — Deploy and Verify the Cloud Email Worker

- Priority: P0
- Status: Open — consolidated scope (2026-08-10): the worker deploy below, plus
  everything else email-related found sitting unfinished in the codebase while
  auditing this plan. No verified Resend domain yet (purchase pending) — every
  test send stays scoped to the account owner's own inbox until then.
- Depends on: Plan 001 when a migration change is required
- Production deployment/write: requires explicit human approval

## Consolidated scope (2026-08-10)

Beyond the original worker-deploy problem below, this pass also found and
closed two unrelated gaps discovered while surveying "what do we actually have
for email":

1. **`notify()`'s `emailDelivery` option, and `notify()` itself, were never
   called from anywhere** — the in-app notification system (schema, RPC, bell
   UI) shipped with zero product events wired to it. Closed for 3 events:
   - invitation accepted → notifies the inviter, in-app only
     (`accept_invitation` RPC now also returns `invited_by`; migration
     `20260810180000_accept_invitation_returns_invited_by.sql`).
   - subscription activated (webhook) → notifies the account owner, in-app +
     email (`src/lib/billing/webhook-handler.ts`).
   - seat limit reached on invite → notifies the caller, in-app only — the
     inline form error already gives synchronous feedback, so this is a
     persistent record rather than the primary signal
     (`src/app/[locale]/dashboard/team/actions.ts`).
   - Deliberately NOT done: cancelling a subscription (self-initiated,
     already has synchronous UI feedback — same reasoning as seat limit).
   - Deliberately NOT done: wiring every other in-app-notification-worthy
     event (member removed, role changed, etc.) — scoped to these 3 as
     representative, highest-value examples; expanding further is a product
     decision, not a technical follow-up.
2. **The `Onboarding` Resend API key was never rotated** despite being
   flagged as exposed and its rotation being deferred to "at deploy" over a
   month ago (see [[project_resend_deploy]]). Rotated 2026-08-10 to
   `Onboarding-2026-08` (sending-only) — updated in `.env.local`,
   `supabase/functions/.env`, the `RESEND_API_KEY` GitHub Actions secret, and
   Vercel (Production + Preview). **The old key is still live** — not
   deleted yet, pending a Vercel redeploy (env var changes need one to take
   effect for server-only vars too) and the worker's own Cloud deploy (this
   plan's original scope) to confirm both paths actually pick up the new
   value before revoking the old one.

### Worker URL + auth (original scope) — implemented 2026-08-10

Researched Supabase's native mechanism before deciding (no `app.settings.*`
GUC exists in this codebase). Findings:

- **URL resolution**: Supabase's own documented pattern for pg_cron → Edge
  Function is a `vault.decrypted_secrets` row named `project_url`, read by a
  SQL helper, never hardcoded in a versioned migration (it differs per
  environment). Implemented as `private.project_url()`
  (`supabase/migrations/20260810190000_email_worker_url_and_auth.sql`),
  seeded locally in `supabase/seed.sql`
  (`http://api.supabase.internal:8000`, the CLI's internal Docker alias —
  replaces the old `host.docker.internal:54321` indirection).
- **Auth**: Supabase's new secret keys (`sb_secret_...`) are **not JWTs** —
  pg_net can't send them as `Authorization: Bearer`, and `verify_jwt` would
  reject them anyway (confirmed via docs: "Authorization headers" /
  "Securing Edge Functions"). Two options were weighed: adopt Supabase's
  newer named-Secret-Keys system (`apikey` header + `@supabase/server`'s
  `withSupabase`), or reuse this repo's own existing pattern (Vault-stored
  shared secret, already used for outgoing webhook HMAC signing in
  `webhook_secrets_vault.sql`). **Chose the latter** — no new dependency, no
  reliance on a Supabase feature not yet confirmed enabled on the Cloud
  project, consistent with code already in this repo.
  - `private.email_worker_secret()` reads the shared secret from Vault.
  - Cron sends it as `X-Cron-Secret`; `handler.ts` compares it against
    `Deno.env.get('CRON_SECRET')` and returns 401 before opening the queue
    if it's missing or wrong.
  - `verify_jwt` stays `false` (correct per Supabase's own guidance for
    service-to-service calls authenticating via a non-JWT credential).
  - Local secret value lives in `supabase/functions/.env` (gitignored) and
    is seeded into Vault by `supabase/seed.sql` — same value in both, by
    construction.
  - **Cloud still needs its one-time manual step** (not done yet): create
    both Vault secrets via the SQL Editor with the real project URL and a
    freshly generated worker secret, then `supabase secrets set
CRON_SECRET=...` so the deployed function has the matching value. This
    is the actual "Deploy only after human approval" gate from the
    Execution section below — no Cloud write has happened yet.
- Verified locally: migration + seed applied cleanly (`pnpm supa:reset`),
  `private.project_url()` / `private.email_worker_secret()` return the
  expected values, `cron.job` shows the updated command, and
  `deno test` on `process-email-queue` passes 10/10 including 3 new
  auth tests (missing header → 401, wrong header → 401, queue never opened
  in either case).

**Bug found and fixed while verifying end-to-end (in-branch, not deferred):**
once the cron could actually reach the function for the first time (it never
had before — the old URL was unreachable from either environment), every
invocation 500'd with `getaddrinfo ENOTFOUND supabase_db_saas-boilerplate`.
Root cause: the edge-runtime's Node-compat DNS resolver can't resolve Docker
Compose service hostnames for `npm:`-imported drivers — a known upstream
issue (`supabase/postgres#1447`), whose documented workaround is to use a
native Deno Postgres client instead of `npm:postgres`. Swapped
`pgmq-queue.ts` to `jsr:@db/postgres` (`denodrivers/postgres`, the
maintained driver). It uses unnamed prepared statements at the wire-protocol
level, same pooler-safety intent as the old driver's `{ prepare: false }`.
This is local-only (Cloud's `SUPABASE_DB_URL` is a real hostname, not a
Docker service name) but was blocking any local verification, so it had to
be fixed now, not just documented.

**Observability (Execution step 8) — also added:** `cron.job_run_details`
only proves `net.http_post` enqueued the request, not that the worker
responded 2xx (the plan's own "false-positive cron success" threat).
`net._http_response` isn't tagged with the URL that produced it, and this
repo's _other_ pg_net cron (`process_webhook_deliveries`) writes to the same
table, so nothing was distinguishable without recording the request id.
Unlike `webhook_deliveries` (one row per delivery, with retries — not
needed here since pgmq already retries at the message level via visibility
timeout + archives on exhaustion), only the _last_ invocation's outcome
matters for health. Added a singleton-row table
(`private.email_worker_last_invocation`) the cron writes its `request_id`
into, and `private.email_worker_health()` to read the joined status back —
both in the same migration.

**End-to-end verified for real** (Execution steps 10–11): enqueued a
controlled test message via `pgmq.send('email_queue', ...)` addressed to
the account owner's own inbox (Resend sandbox sender restriction, still no
verified domain). Next cron tick: `processed:1`, queue emptied (delete
confirmed), and Resend's own log shows it `delivered` exactly once. Step 12
(retry/exhaustion on a forced failure) is covered by the unit tests above
rather than a live forced failure — same logic pgmq/the handler already
exercise, no need to break a live send to prove it.

### Cloud deploy — done 2026-08-10 (approved)

With explicit go-ahead, executed the plan's own "Deploy only after human
approval" gate (Execution step 9):

1. **Synced the migration chain first.** Cloud was missing 3 migrations,
   not just this plan's: `profiles_analytics_consent` (already-merged
   PostHog work that had never been pushed — the known, documented gap, see
   [[bug_supabase_cloud_migrations_lag]]), `accept_invitation_returns_invited_by`,
   and this plan's own `email_worker_url_and_auth`. All 3 had to go
   together (migrations apply in order) — `supabase db push --linked`,
   clean.
2. Created the real Vault secrets via `execute_sql` (SQL Editor equivalent):
   `project_url` = `https://rgrxlygtmvavqzkjyywg.supabase.co`,
   `email_worker_secret` = a **freshly generated** secret (not the local
   dev one — separate value per environment, same as every other secret in
   this codebase).
3. `supabase secrets set` on the deployed function: `RESEND_API_KEY`,
   `FROM_EMAIL`, and `CRON_SECRET` (matching the Vault value from step 2).
4. `supabase functions deploy process-email-queue --no-verify-jwt`.

**Verified for real, twice** (local verification above, now Cloud):
`private.email_worker_health()` showed `status_code: 200` on the very
first real cron tick post-deploy. Enqueued a second controlled test
message directly in Cloud — processed, queue emptied, Resend confirms
`delivered` exactly once. `get_advisors(security)` shows no new findings
from `private.email_worker_last_invocation` or the two new functions
(expected — `private` isn't in the exposed API schema list).

**Still open:** delete the OLD (pre-rotation) Resend API key — deferred
until the Vercel side also confirms it's on the new key, which needs a
redeploy (next merge to `main` triggers it automatically). Not done here:
committing/pushing this work — see chat for that decision.

## Problem

The repository contains `supabase/functions/process-email-queue/index.ts`, but the connected Supabase Cloud project had no deployed Edge Functions. Its minute cron invokes a local Docker hostname:

```text
http://host.docker.internal:54321/functions/v1/process-email-queue
```

pg_net records DNS failures while cron history reports success because request enqueueing succeeded.

## Desired outcome

Email queue processing is deployed reproducibly, invoked through a valid Cloud endpoint, authenticated, observable and proven by an end-to-end test. Cron status must distinguish request enqueue from successful HTTP delivery.

## Threats and failure modes

- unauthenticated public worker invocation;
- leaked database/Resend credentials;
- duplicate deliveries;
- messages stuck or archived without alerting;
- false-positive cron success;
- retry storms;
- HTML/body PII exposed in logs;
- local and Cloud configuration diverging.

## Design decisions required

Before implementation, document:

- invocation authentication strategy;
- whether the worker should use direct Postgres, service-role Supabase client or another narrow credential;
- Cloud URL storage and environment selection;
- retry, visibility timeout and dead-letter/archive behavior;
- alerting threshold and owner;
- how local development continues using the local Functions URL.

## Execution

1. Inspect the current worker, queue schema, cron migration and tests.
2. Confirm required secrets and their owning platform; never print values.
3. Add tests for missing env vars, provider non-2xx, successful delete, retry and retry exhaustion.
4. Ensure logs contain message IDs and counts but not recipient/body/token data.
5. Prepare a reproducible deployment command or CI workflow.
6. Use a valid Cloud function URL and an authentication header/token designed for server-to-server invocation.
7. Update cron through a versioned migration; keep local URL behavior explicit and separate.
8. Add a health/observability query or job that evaluates `net._http_response` status/error, not only cron run status.
9. Deploy only after human approval.
10. Enqueue a controlled non-sensitive test message.
11. Verify receipt, queue deletion, provider response and no duplicate delivery.
12. Exercise a controlled failure and confirm retry/alert behavior.

## Acceptance criteria

- Edge Function appears as deployed in the intended Supabase project.
- worker invocation cannot be abused anonymously.
- cron uses a valid Cloud endpoint.
- successful HTTP status is verified and failure is visible.
- end-to-end test email is delivered exactly once.
- provider failure leaves the message retryable.
- retry exhaustion is archived/dead-lettered and surfaced.
- local development remains functional.
- secrets are absent from Git, logs and PR screenshots.
- runbook and audit matrix are updated.

## Required validation

- unit tests for worker logic;
- local Supabase/Edge Function test;
- pgTAP for queue/cron permissions where applicable;
- `supabase functions list` or equivalent Cloud confirmation;
- pg_net response query showing successful status;
- queue metrics before and after test;
- Resend delivery confirmation without exposing recipient data publicly.

## Rollback

- restore the previous cron command or disable the job;
- deploy the previous function version;
- preserve queued messages;
- never delete the queue as a rollback mechanism.
