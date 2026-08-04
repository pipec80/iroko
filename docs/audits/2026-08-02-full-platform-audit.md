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

PostHog should not be added yet. Two P0 items must be closed first:

1. Deploy and correctly invoke the email queue worker in Cloud.
2. align the declared and resolved Next.js versions.

> **Revalidated 2026-08-04:** the Sentry browser tunnel correction (originally P0 item 2, PR #91) is closed — see AUD-005 below.

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

| ID      | Finding                                                                      | Priority | Verified state                    | Plan | Status      |
| ------- | ---------------------------------------------------------------------------- | -------- | --------------------------------- | ---- | ----------- |
| AUD-001 | Two Supabase Cloud migrations are missing from `main`                        | P0       | Resolved by PR #100 (2026-08-03)  | 001  | Completed   |
| AUD-002 | Cloud email cron calls `host.docker.internal`                                | P0       | Confirmed                         | 002  | Open        |
| AUD-003 | Email Edge Function source exists but no Edge Function is deployed           | P0       | Confirmed                         | 002  | Open        |
| AUD-004 | pg_net reports DNS failures although cron executions show succeeded          | P0       | Confirmed                         | 002  | Open        |
| AUD-005 | Sentry browser tunnel is intercepted by locale proxy                         | P0       | Resolved by PR #91 (2026-08-04)   | 003  | Completed   |
| AUD-006 | Next.js declared/resolved versions disagree                                  | P0       | Confirmed                         | 004  | Open        |
| AUD-007 | `docs/` was globally ignored                                                 | P1       | Corrected in documentation branch | 005  | In progress |
| AUD-008 | Public responses may inherit `private, no-store` from session middleware     | P1       | Confirmed by code inspection      | 005  | Open        |
| AUD-009 | Knip is non-blocking in CI                                                   | P1       | Confirmed                         | 005  | Open        |
| AUD-010 | Gitleaks script exists but is not part of the main CI gate                   | P1       | Confirmed                         | 005  | Open        |
| AUD-011 | Supabase type job can commit/push from CI instead of only detecting drift    | P1       | Confirmed                         | 005  | Open        |
| AUD-012 | CI uploads `.next/standalone` although standalone output is not enabled      | P1       | Confirmed                         | 005  | Open        |
| AUD-013 | E2E impersonation suite is skipped pending an admin/MFA fixture              | P1       | Confirmed                         | 005  | Open        |
| AUD-014 | Browser matrix is primarily Chromium and lacks automated Axe coverage        | P1       | Confirmed                         | 005  | Open        |
| AUD-015 | README/runtime tooling versions and some env documentation are stale         | P1       | Confirmed                         | 005  | Open        |
| AUD-016 | Vercel Analytics and Speed Insights mount independently of analytics consent | P1       | Confirmed                         | 006  | Open        |
| AUD-017 | No PostHog package, provider, taxonomy or privacy implementation exists      | P2       | Confirmed                         | 006  | Blocked     |

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

### AUD-002 to AUD-004 — email worker Cloud failure

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

### AUD-006 — Next.js version mismatch

The inspected repository declared Next.js 16.2.12 in `package.json`, while workspace override/lock resolution kept the effective installed version at 16.2.11.

Risk:

- developers and Dependabot reason about a version different from the deployed version;
- security and regression fixes may not actually be active;
- builds become harder to reproduce.

Required response:

- select one supported version;
- remove or update the stale override;
- regenerate the lockfile with the repository package manager;
- verify installed version locally and in CI;
- run typecheck, lint, unit, E2E and build checks.

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

Hardening work:

- make Knip fail the job when actionable findings exist;
- add Gitleaks as a required gate;
- change database type generation to `generate + diff --exit-code` rather than CI-authored commits;
- remove the standalone artifact or explicitly enable and test standalone output;
- add WebKit, accessibility scanning and an admin/MFA impersonation fixture;
- add a Cloud smoke check for Sentry tunnel, Supabase workers and provider callbacks;
- ensure Vercel automation bypass is correctly configured for protected previews.

## Caching and runtime behavior

The Supabase middleware sets `Cache-Control: private, no-store` on responses passing through its path. Because the proxy has broad route coverage, public marketing pages may lose CDN/static-cache benefits.

Do not remove private caching protection globally. Refactor only after tests prove that the header is restricted to requests with authentication/session refresh or protected data while public anonymous pages retain safe caching.

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

| Finding     | PR   | Environment checked         | Evidence                                                                      | Verified by | Date       | Result    |
| ----------- | ---- | --------------------------- | ----------------------------------------------------------------------------- | ----------- | ---------- | --------- |
| AUD-001     | #100 | local `main` / linked Cloud | 119/119 migrations, identical last version                                    | Claude Code | 2026-08-03 | Completed |
| AUD-002–004 | —    | —                           | —                                                                             | —           | —          | Open      |
| AUD-005     | #91  | Vercel preview (deployed)   | Controlled browser exception landed as Sentry issue IROKO-7 with replay+trace | Claude Code | 2026-08-04 | Completed |
| AUD-006     | —    | —                           | —                                                                             | —           | —          | Open      |
