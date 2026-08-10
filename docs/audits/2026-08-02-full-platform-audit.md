# Full Platform Audit — 2026-08-02

## Purpose

Record the verified state of Iroko before adding product analytics or other new platform capabilities. This document is a living audit: every finding must be revalidated before implementation and updated with pull-request and verification evidence.

## Scope inspected

- GitHub repository `pipec80/iroko`, default branch `main`
- Base commit inspected: `1e814a66ff941a7efb769152b03285e226adbd31`
- Open pull requests and GitHub Actions
- Vercel project, production/preview deployments and recent runtime errors
- Supabase Cloud project, migration tracking, database advisors, grants, RLS, cron, PGMQ, pg_net and Edge Functions
- Next.js, React, TypeScript, pnpm, test and lint configuration
- Sentry integration and PR #91
- Existing consent model and readiness for PostHog

No production writes, deployments, migrations, emails or destructive actions were performed during the audit.

## Executive verdict

Iroko has a strong foundation: multi-tenant authorization, MFA, typed Server Actions, RLS/RPC design, extensive CI, unit/E2E/pgTAP tests, CSP, audit logging and automated deployments.

PostHog should not be added yet. One P0 item must be closed first:

1. Deploy and correctly invoke the email queue worker in Cloud.

> **Revalidated 2026-08-10:** the email queue worker (item 1, the last open P0) is closed — see AUD-002 to AUD-004 below. All P0 items from this audit are now resolved.

> **Revalidated 2026-08-04:** the Next.js version alignment (originally P0 item 2) is closed — see AUD-006 below. The Sentry browser tunnel correction (originally P0 item 2 in the previous revalidation, PR #91) is also closed — see AUD-005 below.

> **Revalidated 2026-08-03:** recovering and versioning the Supabase Cloud migrations (originally P0 item 1) is closed — see AUD-001 below. The remaining three P0 items are unaffected.

## Current stack confirmed

- Next.js 16.2.x, App Router and Turbopack
- React 19.2.x
- TypeScript 6 with strict options
- Tailwind CSS 4
- pnpm 11 / Node.js 24 in CI and Vercel
- Supabase Auth, PostgreSQL 17, Storage, Realtime, pgvector-related extensions, PGMQ, pg_cron and pg_net
- Vercel deployment
- Sentry
- Stripe and Mercado Pago modules
- Resend worker source code
- next-intl with four locales

`cacheComponents` is intentionally disabled in the inspected configuration because of the project's documented next-intl compatibility decision. Do not re-enable it without a separate compatibility investigation.

## Finding matrix

| ID      | Finding                                                                      | Priority | Verified state                     | Plan | Status    |
| ------- | ---------------------------------------------------------------------------- | -------- | ---------------------------------- | ---- | --------- |
| AUD-001 | Two Supabase Cloud migrations are missing from `main`                        | P0       | Resolved by PR #100 (2026-08-03)   | 001  | Completed |
| AUD-002 | Cloud email cron calls `host.docker.internal`                                | P0       | Resolved by PR #110 (2026-08-10)   | 002  | Completed |
| AUD-003 | Email Edge Function source exists but no Edge Function is deployed           | P0       | Resolved by PR #110 (2026-08-10)   | 002  | Completed |
| AUD-004 | pg_net reports DNS failures although cron executions show succeeded          | P0       | Resolved by PR #110 (2026-08-10)   | 002  | Completed |
| AUD-005 | Sentry browser tunnel is intercepted by locale proxy                         | P0       | Resolved by PR #91 (2026-08-04)    | 003  | Completed |
| AUD-006 | Next.js declared/resolved versions disagree                                  | P0       | Resolved (2026-08-04)              | 004  | Completed |
| AUD-007 | `docs/` was globally ignored                                                 | P1       | Resolved by PR #92 (2026-08-04)    | 005  | Completed |
| AUD-018 | CSP blocks `vercel.live` feedback widget script on preview deployments       | P2       | Resolved (2026-08-04)              | 005  | Completed |
| AUD-019 | ESLint had no `ignores` for local Supabase Edge Runtime build artifacts      | P2       | Resolved by PR #91 (2026-08-04)    | 005  | Completed |
| AUD-008 | Public responses may inherit `private, no-store` from session middleware     | P1       | Resolved (2026-08-04)              | 005  | Completed |
| AUD-009 | Knip is non-blocking in CI                                                   | P1       | Resolved (2026-08-04)              | 005  | Completed |
| AUD-010 | Gitleaks script exists but is not part of the main CI gate                   | P1       | Resolved (2026-08-04)              | 005  | Completed |
| AUD-011 | Supabase type job can commit/push from CI instead of only detecting drift    | P1       | Resolved (2026-08-04)              | 005  | Completed |
| AUD-012 | CI uploads `.next/standalone` although standalone output is not enabled      | P1       | Resolved (2026-08-04)              | 005  | Completed |
| AUD-013 | E2E impersonation suite is skipped pending an admin/MFA fixture              | P1       | Resolved by PR #105 (2026-08-05)   | 005  | Completed |
| AUD-014 | Browser matrix is primarily Chromium and lacks automated Axe coverage        | P1       | Resolved by PR #105 (2026-08-05)   | 005  | Completed |
| AUD-015 | README/runtime tooling versions and some env documentation are stale         | P1       | Resolved (2026-08-05)              | 005  | Completed |
| AUD-016 | Vercel Analytics and Speed Insights mount independently of analytics consent | P1       | Confirmed                          | 006  | Open      |
| AUD-017 | No PostHog package, provider, taxonomy or privacy implementation exists      | P2       | Confirmed                          | 006  | Blocked   |
| AUD-020 | CSP blocked the local Supabase origin in production-mode builds (E2E)        | P1       | Resolved by PR #105 (2026-08-05)   | 005  | Completed |
| AUD-021 | `notFound()` in `dashboard/admin/*` returns HTTP 200, not 404 (streaming)    | P2       | Documented by PR #105 (2026-08-05) | 005  | Deferred  |

## P0 evidence

### AUD-001 — Supabase migration drift (Resolved 2026-08-03)

Supabase Cloud migration tracking contained these versions that were not found in the inspected `main` branch at audit time:

- `20260729014652_harden_webhook_rpcs_and_subscription_lookup`
- `20260729014653_relocate_pg_net_extension`

Risk (historical):

- production cannot be reconstructed solely from Git;
- a linked `db push` may behave unexpectedly;
- disaster recovery and new-environment provisioning are not deterministic.

**Closure evidence (2026-08-03):** both migrations landed on `main` via PR #100 (`fix(security): harden webhook RPCs against SSRF and relocate pg_net`), merged before this revalidation. Verified:

- `git ls-files supabase/migrations/*.sql` on `main` (`9ffce8e`) returns 119 files, ending in `20260729014653_relocate_pg_net_extension.sql`;
- `mcp__supabase__list_migrations` against the linked Cloud project returns 119 migrations, same last version;
- local and linked lists are in exact parity — no drift remains.

No SQL was recovered or reconstructed as part of this closure; the migrations were already present in `main` when the audit's base commit (`1e814a6`) was inspected against a stale local checkout.

### AUD-002 to AUD-004 — email worker Cloud failure (Resolved 2026-08-10)

PR #110 deployed the function to the linked Cloud project (`supabase functions list` confirms `process-email-queue` `ACTIVE`, version 1, `verify_jwt: false`), replaced the cron URL with `private.project_url()` (Vault-backed, resolved per environment instead of hardcoded), and added `X-Cron-Secret` invocation auth (`private.email_worker_secret()`, also Vault-backed) checked in `handler.ts` before the queue is ever opened. `private.email_worker_health()` now exposes the real HTTP status of the last invocation, closing the "cron succeeded but delivery failed silently" gap directly. Verified end-to-end on Cloud itself, twice: a normal test message was processed and delivered exactly once (confirmed in Resend), and a deliberately invalid-address message was left in the queue undeleted (confirmed provider failure keeps a message retryable) rather than silently dropped.

The repository contains `supabase/functions/process-email-queue/index.ts`, but the connected Supabase Cloud project reported no deployed Edge Functions.

The active cron command calls:

```text
http://host.docker.internal:54321/functions/v1/process-email-queue
```

That hostname is a local Docker target and is not a valid Cloud endpoint. pg_net response records showed repeated `Couldn't resolve host name` failures. The cron history still reported `succeeded` because PostgreSQL successfully queued the HTTP request; it did not prove successful delivery.

Risk:

- queued transactional/broadcast emails can fail silently;
- operational dashboards can report false success;
- PostHog or other analytics could record actions that never completed.

Required response:

- deploy the worker reproducibly;
- configure required secrets outside Git;
- use environment-specific worker URLs;
- authenticate invocation appropriately;
- evaluate the actual pg_net HTTP result;
- surface delivery errors and retry exhaustion;
- perform a safe end-to-end delivery test.

### AUD-005 — Sentry browser observability (Resolved 2026-08-04)

`next.config.ts` uses the `/sentry-tunnel` tunnel route. In the inspected `main`, the locale proxy matcher did not exclude that route, so next-intl could redirect the browser POST to a localized path where the tunnel rewrite did not apply.

PR #91 addresses the problem by excluding the route and migrating the client initialization to `src/instrumentation-client.ts` with App Router transition instrumentation, plus two new regression tests (`src/proxy.test.ts`, `src/test/e2e/sentry-tunnel.spec.ts`) that fail against the original bug and pass with the fix.

**Closure evidence (2026-08-04):** rebased on current `main`, full CI green (11/11 checks), Vercel preview reachable without protection. A controlled browser exception thrown on the preview (`https://iroko-git-claude-sentry-best-practices-xdwce0-pipec80-labs.vercel.app/es/login`) was captured end-to-end and landed in Sentry as issue `IROKO-7`, with full metadata (browser, OS, geo, an attached Session Replay, and a trace/span) — proof the tunnel delivers events correctly; the original bug would have produced a 307/404 and dropped the event silently. `IROKO-8` (a CSP report for `vercel.live`, unrelated to this fix) further confirms the reporting pipeline through `/sentry-tunnel` is intact. Server-side exception capture was not independently re-verified in this pass — it isn't touched by this PR (`sentry.server.config.ts`/`instrumentation.ts` are unchanged) and was already unaffected by the original bug (Node sends directly to ingest, bypassing the tunnel).

A manual `fetch('/sentry-tunnel', ...)` with a hand-built envelope returned 404 both locally and on the preview — a false lead from a malformed test envelope (likely missing the `Content-Type` the tunnel handler expects), not a real regression; the real SDK-generated request succeeded, as `IROKO-7` proves.

### AUD-006 — Next.js version mismatch (Resolved 2026-08-04)

The inspected repository declared Next.js 16.2.12 in `package.json`, while workspace override/lock resolution kept the effective installed version at 16.2.11.

Risk (historical):

- developers and Dependabot reason about a version different from the deployed version;
- security and regression fixes may not actually be active;
- builds become harder to reproduce.

**Root cause (found via `git log -S` on both files):** the `pnpm-workspace.yaml` override was introduced at `16.2.11` in PR #71, together with `package.json` at the same version — a deliberate single-version pin so `@react-email/ui` (which fixes `next@16.2.6` as a direct dependency) couldn't pull a second, older copy into the tree. Nine days later, Dependabot's PR #82 bumped `next` in `package.json` to `16.2.12` (a docs/TypeScript-7-compat backport per the official changelog, no breaking changes) but never touched the override — Dependabot doesn't track `pnpm.overrides`. The override wasn't a deliberate downgrade; it just silently fell behind a routine bump.

**Closure evidence (2026-08-04):** raised the override to `next: 16.2.12` in `pnpm-workspace.yaml`, regenerated `pnpm-lock.yaml`. `pnpm why next` reports `Found 1 version of next` at `16.2.12`, with `@react-email/ui` still correctly forced onto that single instance. `pnpm validate` (typecheck, lint, 590 unit tests), `pnpm knip`, and a production build all pass clean.

### AUD-018 — CSP blocks the Vercel Live feedback widget on previews

Discovered while manually verifying AUD-005 on the PR #91 preview: a controlled client error was thrown to confirm the Sentry tunnel, and Sentry's own CSP `report-uri` captured a second, unrelated event — `IROKO-8`, a `script-src-elem` violation for `https://vercel.live/_next-live/feedback/feedback.js`, blocked by the current policy (`src/proxy.ts`'s `buildCspHeader`, which does not include `vercel.live` in `script-src`).

Risk: low — `vercel.live`'s feedback widget only loads on Vercel preview deployments, not production, and CSP is doing exactly its job by blocking an origin the policy doesn't allowlist. It does mean the widget is silently non-functional on every preview, and generates one CSP report per page load, consuming Sentry's error quota on the free plan.

Required response (Plan 005, config-consistency workstream): decide whether to allowlist `vercel.live` in `script-src`/`connect-src` for preview environments only (`process.env.VERCEL_ENV === 'preview'`), or accept the widget staying disabled. Either way, add `ignoreErrors`/`beforeSend` filtering for this specific CSP report so it doesn't keep consuming error quota once the decision is made.

### AUD-019 — ESLint missing `ignores` for local Supabase runtime artifacts (Resolved 2026-08-04)

`eslint.config.mjs`'s `globalIgnores` list did not include `supabase/.temp/**`, which the local Supabase Edge Runtime regenerates on `supabase start` (already covered by `.gitignore`, but ESLint's flat config does not inherit `.gitignore` automatically). Running `pnpm lint` locally with Supabase running surfaced 24 errors from that generated bundle, all unrelated to application code — a false-positive lint failure that CI never sees (`supabase/.temp/` is never present in a clean checkout) but blocks local `pnpm validate` runs.

**Closure evidence:** `supabase/.temp/**` added to `globalIgnores` in PR #91. `pnpm lint` now returns clean (one pre-existing, unrelated warning in `src/app/layout.tsx` about custom fonts).

### AUD-020 — CSP blocked the local Supabase origin outside dev builds (Resolved 2026-08-05)

Discovered while investigating an intermittent E2E failure on `settings.spec.ts`. `buildCspHeader()` in `src/proxy.ts` only added `http://127.0.0.1:54321` to `connect-src`/`img-src` when `NODE_ENV === 'development'`. The full E2E suite runs the app with `next build && next start` (production mode) against local Supabase, so this condition was never true during E2E — every client-side call to Supabase local (notifications, announcements, realtime websocket) was silently blocked by CSP for the entire suite, not just the one flaky test. The retries and re-renders those blocked calls triggered were the actual cause of the intermittent failure, not a `useActionState` race as first suspected.

**Fix:** the local origin is now derived from the actually configured `NEXT_PUBLIC_SUPABASE_URL` — if its hostname is `127.0.0.1` or `localhost`, it's allowed regardless of `NODE_ENV`. Real production deployments never set a loopback URL there, so this doesn't weaken production CSP.

**Closure evidence:** two new `buildCspHeader` test cases in `src/proxy.test.ts` (loopback URL allowed outside dev; Cloud URL never allows a loopback origin). `settings.spec.ts`'s previously-flaky test run clean across multiple isolated repeats after the fix.

### AUD-021 — `notFound()` in `dashboard/admin/*` returns HTTP 200, not 404 (Documented 2026-08-05, deferred)

Found while building the impersonation E2E fixture (AUD-013): as a non-admin (impersonated) session, `/dashboard/admin/*` correctly renders the app's 404 page — no account data is exposed — but the actual HTTP response status is `200`, not `404`. Root cause: `notFound()` is thrown from an async Server Component (`getAdminAccounts()` is awaited first) inside a tree that has already started streaming its shell with a `200` status; Next.js cannot retroactively change the status code once streaming has begun. The comment in `src/lib/supabase/middleware.ts` claiming `AdminLayout`'s `notFound()` "produces a genuine 404 status" is stale.

Risk: low — the content-level boundary (no data leak) holds, which is the property that actually matters for this route's security. The wrong status code only affects automated tooling that checks HTTP status rather than rendered content (e.g. a status-code-based scanner would not recognize this route as gated).

Deferred: fixing this requires either restructuring the route to resolve the admin check before any streaming begins, or accepting the framework limitation. Out of scope for the testing-maturity work that surfaced it; a future pass should re-evaluate once a concrete need (e.g. compliance scanning) makes it worth the restructuring cost.

## Security assessment

### Strong controls confirmed

- `SECURITY DEFINER` functions sampled use an empty `search_path`.
- Grants are explicit rather than relying on broad default `PUBLIC` execute rights.
- Administrative RPCs sampled call platform-admin assertions.
- Account-scoped API-key and webhook RPCs sampled call account-admin assertions.
- internal billing/API-key verification functions are restricted to service roles where expected.
- Supabase session middleware enforces authentication, MFA elevation, onboarding, admin rules and impersonation expiry.
- strict TypeScript, Zod boundaries, CSP, audit logging and RLS are present.

### Advisor warnings requiring interpretation

Supabase reported RLS enabled without policies for:

- `public.api_keys`
- `public.webhook_endpoints`
- `public.webhook_deliveries`

The sampled grants indicate this is an intentional RPC-only design: `anon` and `authenticated` lack direct DML while service/internal paths retain required access. Keep the warning documented and add tests that prove direct access remains denied.

Supabase also reported authenticated access to many `SECURITY DEFINER` RPCs. This is not automatically a vulnerability because these functions are the application's API. Every privileged RPC must nevertheless have pgTAP authorization tests covering unauthenticated, cross-tenant, member, account-admin and platform-admin behavior as applicable.

Leaked-password protection remains disabled in the connected Auth project. Treat this as a documented plan/tier decision and re-evaluate before enterprise or higher-risk use.

Performance advisors reported many unused indexes. The project has limited production traffic and several recent modules, so no index should be removed until representative query statistics and execution plans justify it.

## CI/CD assessment

Strengths:

- typecheck, lint, format and dependency hygiene;
- production dependency audit;
- unit tests and coverage thresholds;
- pgTAP database tests;
- Playwright E2E;
- build validation;
- CodeQL;
- Vercel preview deployments;
- Dependabot and CODEOWNERS.

Hardening work — done (2026-08-04, AUD-009/010/011/012):

- ~~make Knip fail the job when actionable findings exist~~ — done, `continue-on-error` removed;
- ~~add Gitleaks as a required gate~~ — done, `gitleaks` job required by `build`;
- ~~change database type generation to `generate + diff --exit-code` rather than CI-authored commits~~ — done, `db-types` now fails instead of committing;
- ~~remove the standalone artifact or explicitly enable and test standalone output~~ — done, removed (nothing consumed it, `output: 'standalone'` was never enabled).

Hardening work — done (2026-08-05, AUD-013/014/020, Plan 005 workstream E):

- ~~add WebKit and automated accessibility (Axe) coverage~~ — done: a `webkit` project scoped to `@smoke` specs (new `e2e-webkit` CI job), and `runAxeCheck()` wired into login/settings/billing/dashboard specs. Found and fixed 4 real WCAG issues (decorative flag icon missing `aria-hidden`, two unlabeled filter `<select>`s, two contrast tokens below AA — see commit history on the `test/plan-005-e-testing-maturity` branch);
- ~~add an admin/MFA impersonation fixture and enable the E2E suite~~ — done: `fixtures/platform-admin.ts` enrolls a real TOTP factor and completes the actual MFA challenge via the UI to reach a genuine aal2 session (`private.assert_platform_admin()` checks GoTrue's real `aal` claim, not just `mfa_enrolled`);
- ~~make `process-email-queue` testable~~ — done: split into `handler.ts` (pure, dependency-injected) + `pgmq-queue.ts`, 8 new Deno tests, new `edge-functions` CI job;
- ~~add contract tests that exercise real provider SDKs/algorithms instead of fully-mocked ones~~ — done for Stripe (real `webhooks.constructEvent` against a signed fixture) and MercadoPago (HMAC vector computed independently with `node:crypto`, not reusing the app's own algorithm);
- found and fixed AUD-020 (CSP blocking local Supabase during E2E) along the way — see below.

Hardening work — still open:

- add a Cloud smoke check for Sentry tunnel, Supabase workers and provider callbacks;
- ensure Vercel automation bypass is correctly configured for protected previews;
- AUD-021 (`notFound()` returning 200 instead of 404 in `dashboard/admin/*`) — documented, deferred, not blocking.

## Caching and runtime behavior (Resolved 2026-08-04, AUD-008)

The Supabase middleware used to set `Cache-Control: private, no-store` on every response passing through its path, regardless of whether there was a session to protect — public marketing pages lost CDN/static-cache benefits for no reason. Fixed by scoping the header to `claims != null` (authenticated response) or an actual cookie refresh, matching the original intent. Covered by a new test case in `middleware.test.ts`.

## PostHog readiness

The project already has a consent cookie model with `analytics` and `marketing` categories. PostHog is not installed and no event taxonomy exists.

Before implementation:

- all P0 plans must be complete;
- analytics consent must control every optional analytics integration, including existing Vercel Analytics where legally/technically appropriate;
- define typed event names and an allowlist of properties;
- use internal user UUID as identity and account UUID for grouping;
- reset identity on logout and impersonation transitions;
- start with autocapture restricted and Session Replay disabled;
- never capture passwords, tokens, API keys, document contents, signed URLs, payment details or sensitive form data;
- document deletion/export behavior and privacy policy impact.

## Reverification record

Update this table after each remediation.

| Finding     | PR   | Environment checked         | Evidence                                                                                                                                                                                                                                                                              | Verified by | Date       | Result    |
| ----------- | ---- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ---------- | --------- |
| AUD-001     | #100 | local `main` / linked Cloud | 119/119 migrations, identical last version                                                                                                                                                                                                                                            | Claude Code | 2026-08-03 | Completed |
| AUD-002–004 | #110 | local `main` / linked Cloud | `supabase functions list` → `process-email-queue` ACTIVE v1; test message delivered exactly once (Resend `delivered`, confirmed); invalid-address message left in queue undeleted (`read_ct` incremented, not deleted) — provider failure proven retryable live, not just unit-tested | Claude Code | 2026-08-10 | Completed |
| AUD-005     | #91  | Vercel preview (deployed)   | Controlled browser exception landed as Sentry issue IROKO-7 with replay+trace                                                                                                                                                                                                         | Claude Code | 2026-08-04 | Completed |
| AUD-006     | —    | local `main`                | `pnpm why next` → Found 1 version at 16.2.12; validate+knip+build clean                                                                                                                                                                                                               | Claude Code | 2026-08-04 | Completed |
| AUD-007     | #92  | local `main`                | `.gitignore` allowlists `docs/{local,private,drafts,generated,exports}` only                                                                                                                                                                                                          | Claude Code | 2026-08-04 | Completed |
| AUD-018     | —    | Vercel preview (deployed)   | CSP report landed as Sentry issue IROKO-8, `script-src-elem` for vercel.live                                                                                                                                                                                                          | Claude Code | 2026-08-04 | Completed |
| AUD-019     | #91  | local `main`                | `pnpm lint` clean (1 pre-existing unrelated warning)                                                                                                                                                                                                                                  | Claude Code | 2026-08-04 | Completed |
| AUD-008     | —    | local `main`                | `middleware.test.ts` new case: anon request to `/es/pricing` has no `Cache-Control` header (594/594 unit tests pass)                                                                                                                                                                  | Claude Code | 2026-08-04 | Completed |
| AUD-009     | —    | local `main`                | `pnpm knip` exit 0 without `continue-on-error`; verified before removing it                                                                                                                                                                                                           | Claude Code | 2026-08-04 | Completed |
| AUD-010     | —    | local `main`                | `gitleaks` job added to CI, required by `build`'s `needs:`                                                                                                                                                                                                                            | Claude Code | 2026-08-04 | Completed |
| AUD-011     | —    | local `main`                | `db-types` job now `exit 1` on drift instead of `git commit && push`                                                                                                                                                                                                                  | Claude Code | 2026-08-04 | Completed |
| AUD-012     | —    | local `main`                | Removed the `.next/standalone` upload step; nothing downloaded the artifact                                                                                                                                                                                                           | Claude Code | 2026-08-04 | Completed |
| AUD-015     | —    | local `main`                | README Node/pnpm/org fixed, `.nvmrc`+`engines` added, `.env.example` Google OAuth documented; `supportEmail` pointed at an unreceivable `vercel.app` address (fixed), 4 dead `appConfig.urls.*` fields removed (zero real consumers, confirmed by grep)                               | Claude Code | 2026-08-05 | Completed |
| AUD-013     | #105 | local `main`                | `impersonation.spec.ts` un-skipped, 3/3 clean isolated runs — real TOTP enrolled + real UI MFA challenge reaches a genuine aal2 session                                                                                                                                               | Claude Code | 2026-08-05 | Completed |
| AUD-014     | #105 | local `main`                | `pnpm test:e2e:webkit` 16/16 green; `runAxeCheck()` in 4 specs found and fixed 4 real WCAG issues, verified clean single-worker after fixing                                                                                                                                          | Claude Code | 2026-08-05 | Completed |
| AUD-020     | #105 | local `main`                | New `buildCspHeader` cases in `proxy.test.ts`; `settings.spec.ts`'s previously-flaky test clean across repeated isolated runs after the fix                                                                                                                                           | Claude Code | 2026-08-05 | Completed |
| AUD-021     | #105 | local `main`                | Confirmed via trace: rendered content is the real 404 (no data leak), HTTP status is 200 — documented inline, deferred (not blocking)                                                                                                                                                 | Claude Code | 2026-08-05 | Deferred  |
| —           | #105 | linked Cloud                | Post-merge: `supabase migration list --linked` → 119/119 migrations in parity, no local-only/Cloud-only drift (PR touched no schema)                                                                                                                                                  | Claude Code | 2026-08-05 | Completed |
