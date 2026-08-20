# Plan 007 — Cloud Smoke Check for the Sentry Tunnel

- Priority: P1
- Status: Completed (2026-08-11) — PR #113 (`feat/sentry-tunnel-cloud-smoke-check`)
- Scope: AUD-024 only. Two related but independent items from the same audit
  paragraph ("add a Cloud smoke check for Sentry tunnel, Supabase workers and
  provider callbacks") are deliberately out of scope:
  - the email worker already has `private.email_worker_health()` (Plan 002);
    wiring it into an automated nightly gate is a smaller follow-up (AUD-025),
    not done here;
  - Stripe/MercadoPago webhook callbacks require touching real payment
    providers and their own explicit approval (AUD-026), not done here.

## Objective

Add an automated, low-noise Cloud check that proves `/sentry-tunnel` still
delivers events to Sentry's real ingest in production — closing the class of
failure that let AUD-005 stay silent (a locale-proxy regression dropped every
client-side Sentry event with nothing surfacing it automatically) until a
manual check found it weeks later.

## Problem

`src/test/e2e/sentry-tunnel.spec.ts` only asserted that `/sentry-tunnel` is
not 307-redirected by the proxy. That proves the regression from AUD-005
specifically doesn't recur, but nothing proves an event actually survives the
full round trip to Sentry's ingest — a different failure (DSN misconfigured,
Sentry-side rejection, a future change to the tunnel/proxy interaction) could
still silently drop every browser-side event with no automated signal.

## Design decisions

- **Real envelope over a hand-waved probe.** Sending a real, minimal, valid
  envelope and checking for Sentry's own `200` is a faithful confirmation
  that Sentry itself accepted the event, not an artifact of our own code.
- **No production code change.** An earlier design considered exposing
  `window.Sentry` globally to trigger `captureMessage()` from a browser
  context in Playwright. Discarded: it adds a line to
  `src/instrumentation-client.ts` solely to make it testable, and requires a
  second verification layer (Sentry's REST API, with uncertain
  `SENTRY_AUTH_TOKEN` scope and search-index lag risk). Building the
  envelope directly from the test's own Node context needs neither.
- **The tunnel URL must carry `?o=<orgId>&p=<projectId>[&r=<region>]`.**
  The first implementation wrongly assumed the tunnel route
  `withSentryConfig` injects is a generic relay that reads `dsn` from the
  envelope's own first line. It is not: reading the exact installed
  `@sentry/nextjs` version's source
  (`config/withSentryConfig/tunnel.ts`, fetched from
  `getsentry/sentry-javascript` at tag `10.67.0`) showed the injected
  rewrite only matches requests carrying those query params — the browser
  SDK appends them itself, derived from the DSN, when building the tunnel
  URL. The first version's bare `POST /sentry-tunnel` matched no route at
  all and got Next.js's own 404. This was caught and root-caused, not
  worked around: reproduced the same 404 in a fully local
  `pnpm build && pnpm start` (ruling out anything Vercel-specific), then
  isolated it to the Sentry rewrite specifically by checking a sibling
  rewrite in the same `next.config.ts` (PostHog's `/ingest/static/*`, added
  by PR #109), which returned a healthy `200` both locally and in
  production — proving the app's own `rewrites()` composition works and the
  gap was specific to how the smoke check itself hit the Sentry tunnel.
  Fixed by parsing the DSN in the test and building the URL exactly like
  the SDK does. **No application code changed** — the bug was entirely in
  the check's own request shape, confirmed by a real, successful `200` and
  a real Sentry issue (`IROKO-B`) after the fix.
- **Cloud/nightly-only.** Guarded by
  `test.skip(!process.env.PLAYWRIGHT_BASE_URL, ...)` (the same pattern
  `analytics.spec.ts`/`onboarding.spec.ts` already use, inverted) so it runs
  only in `nightly.yml` against production, never in `ci.yml`'s per-PR `e2e`/
  `e2e-webkit` jobs. Running it on every PR would spend Sentry's free-tier
  error quota (~5k events/month) for no added signal — the tunnel/proxy code
  path doesn't change per PR in a way this check would catch differently
  than the existing local regression test already does.
- **Stable fingerprint, no cleanup step.** The event sets
  `fingerprint: ['sentry-tunnel-cloud-smoke-check']`, so every nightly run
  folds into the same Sentry issue instead of creating a new one per night.
  No auto-resolve/cleanup automation was needed.

## Execution

1. Extended `src/test/e2e/sentry-tunnel.spec.ts` with a second, `@smoke`-
   tagged test in the same `describe` block.
2. Added `NEXT_PUBLIC_SENTRY_DSN` (already a repo-level secret, public value
   by design) to `nightly.yml`'s "Run smoke tests against production" step.
3. Documented the check in `docs/runbooks/sentry-tunnel-smoke.md`.
4. Updated the audit (`docs/audits/2026-08-02-full-platform-audit.md`):
   new AUD-024 finding row, partial closure of the "Cloud smoke check"
   hardening bullet (Sentry tunnel done; worker/webhook checks remain
   AUD-025/AUD-026), new reverification row.

## Acceptance criteria

- The new test sends a real envelope and asserts Sentry's own `200`.
- The test never runs against local Supabase (`ci.yml`), only against
  production (`nightly.yml`).
- No change to `src/proxy.ts`, `next.config.ts`, or any client-side
  instrumentation.
- The runbook documents how to read a failure without guessing.
- A manual `workflow_dispatch` run of `nightly.yml` on the branch is used to
  prove the check works before merge (see reverification below).

## Required validation

- `pnpm typecheck && pnpm lint && pnpm format:check` clean.
- `pnpm test:e2e` locally confirms the new test is skipped (no
  `PLAYWRIGHT_BASE_URL`).
- Manual `nightly.yml` dispatch on the branch: first attempt (bare POST,
  no query params) failed with a real `404` — root-caused as above, not
  dismissed. After the fix, a second dispatch
  (run `31514594343`) passed 17/17, and `search_issues` confirmed
  `IROKO-B` ("Cloud smoke check — /sentry-tunnel round trip") landed in
  Sentry with `firstSeen`/`lastSeen` matching the run.

## Rollback

- Revert the two file changes (test + workflow); the pre-existing
  proxy-redirect regression test is unaffected and keeps its own coverage.
- No schema, secret, or provider-side change to roll back.
