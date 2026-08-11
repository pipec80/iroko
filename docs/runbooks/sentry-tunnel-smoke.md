# Runbook — Sentry Tunnel Cloud Smoke Check

## Purpose

Operate and interpret the automated Cloud check that confirms `/sentry-tunnel`
still delivers events to Sentry's real ingest in production. This runbook
records the design from AUD-024; it does not authorize changes to Sentry
configuration, CSP, or the proxy matcher without separate approval.

## Why this exists

AUD-005 (`docs/audits/2026-08-02-full-platform-audit.md`) found that
next-intl's locale proxy silently redirected `/sentry-tunnel` POSTs to a
localized path where the tunnel rewrite doesn't exist — every client-side
Sentry event (errors, replays, traces) was lost for as long as the bug was
live, with nothing surfacing the failure automatically. The fix (PR #91)
excluded `sentry-tunnel` from `src/proxy.ts`'s matcher, but nothing kept
checking that the exclusion — or the tunnel's forwarding to Sentry — kept
working after that. This check closes that gap.

## How the check works

`src/test/e2e/sentry-tunnel.spec.ts` has a second test, tagged `@smoke`, that:

1. Hand-builds a minimal, valid Sentry envelope (event id, a stable
   `fingerprint`, and a `smoke_check` tag) using the public
   `NEXT_PUBLIC_SENTRY_DSN`.
2. POSTs it to `/sentry-tunnel` on the real deployed app.
3. Asserts the response is `200`.

The tunnel route `withSentryConfig` injects is a pure relay: it reads the
`dsn` from the envelope's first line and forwards the body verbatim to
Sentry's real ingest, returning Sentry's own response unmodified. A `200`
here is Sentry's own confirmation the event was accepted — not something our
own code fabricates.

The test is guarded to run **only** against a deployed target
(`test.skip(!process.env.PLAYWRIGHT_BASE_URL, ...)`), so it runs exclusively
in `nightly.yml`'s `smoke` job against production. It never runs in `ci.yml`
(`e2e`/`e2e-webkit` build and test against local Supabase) — running it on
every PR would needlessly spend Sentry's free-tier error quota (~5k
events/month).

The event uses a **stable fingerprint**
(`sentry-tunnel-cloud-smoke-check`), so every nightly run folds into the same
Sentry issue instead of creating a new one each night. No cleanup step is
required.

## Safety boundaries

- Never widen the proxy matcher, disable the tunnel exclusion, or change CSP
  just to make this check pass — investigate the real regression first.
- `NEXT_PUBLIC_SENTRY_DSN` is public by design (it ships in every client
  bundle); it is not a secret to protect, but treat any other Sentry
  credential (`SENTRY_AUTH_TOKEN`) as one regardless.
- This check sends one real, low-noise, tagged event to Sentry per nightly
  run. Do not add more frequent triggers without checking quota impact.

## Routine read-only interpretation

From `nightly.yml`'s `smoke` job logs:

- **Pass** (`200`): the tunnel is exclude from the proxy matcher and Sentry's
  ingest accepted the event — the full path from browser SDK to Sentry is
  intact.
- **404/307**: the proxy is intercepting/redirecting `/sentry-tunnel` again
  — the exact AUD-005 regression. Check `src/proxy.ts`'s matcher first.
- **Any other non-200** (401/403/429): Sentry rejected the envelope —
  check `NEXT_PUBLIC_SENTRY_DSN` validity, org/project status, or rate
  limiting before assuming a code regression.

To confirm delivery independently, search Sentry for the issue with
fingerprint `sentry-tunnel-cloud-smoke-check` and check its `lastSeen`
timestamp against the latest nightly run.

## Incident response

1. Record the failing HTTP status and response body without secrets.
2. If it's a 404/307, treat it as a P0 regression of AUD-005 — client-side
   observability is silently broken in production.
3. Do not weaken the proxy matcher or CSP to force a pass.
4. Any fix must add or keep this test passing before closing the incident.

## Related records

- `docs/audits/2026-08-02-full-platform-audit.md` (AUD-005, AUD-024)
- `docs/exec-plans/completed/003-sentry-observability.md`
- `docs/exec-plans/completed/007-cloud-smoke-sentry-tunnel.md`
- `src/test/e2e/sentry-tunnel.spec.ts`
- `.github/workflows/nightly.yml`
