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

1. Parses the public `NEXT_PUBLIC_SENTRY_DSN` to extract the org id, project
   id and (optional) region.
2. Hand-builds a minimal, valid Sentry envelope (event id, a stable
   `fingerprint`, and a `smoke_check` tag).
3. POSTs it to `/sentry-tunnel?o=<orgId>&p=<projectId>[&r=<region>]` on the
   real deployed app — the exact URL shape the browser SDK itself builds.
4. Asserts the response is `200`.

**The tunnel rewrite is not a generic relay keyed off the envelope body.**
`withSentryConfig` (`@sentry/nextjs`, `config/withSentryConfig/tunnel.ts`)
injects a Next.js rewrite that only matches requests carrying
`?o=<orgId>&p=<projectId>[&r=<region>]` as query parameters — the browser
SDK appends these itself when it builds the tunnel URL from the DSN. A bare
`POST /sentry-tunnel` with no query params matches no route at all and gets
Next.js's own 404 (`__next_error__` shell), which is exactly what an earlier
version of this check hit before that mechanism was understood (see the
"First version got this wrong" note below). Once the query params are
present and correct, Next.js's rewrite forwards the body to Sentry's real
ingest and returns Sentry's own response — a `200` here is Sentry's own
confirmation the event was accepted, not something our own code fabricates.

### First version got this wrong (2026-08-11)

The first implementation of this check assumed the tunnel route reads `dsn`
from the envelope body and relays based on that alone. It sent a bare POST
with no query string, got a real `404` against production, and — before
concluding the tunnel was broken — the investigation reproduced the same
404 in a fully local build (`pnpm build && pnpm start`), confirmed a sibling
rewrite in the same `next.config.ts` (PostHog's `/ingest/static/*`) worked
fine (ruling out a general rewrites-broken-in-this-build theory), and then
read the exact installed `@sentry/nextjs` version's source
(`config/withSentryConfig/tunnel.ts`) to find the real matching rule. There
was no production regression — the check's own request was shaped wrong.
Fixed by parsing the DSN and building the URL the same way the SDK does.

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

- **Pass** (`200`): the tunnel rewrite is matching and Sentry's ingest
  accepted the event — the full path from browser SDK to Sentry is intact.
- **404 with Next.js's own `__next_error__` shell** (check the response
  body, not just the status): either the proxy is intercepting/redirecting
  `/sentry-tunnel` again (the AUD-005 regression — check `src/proxy.ts`'s
  matcher first), or the tunnel rewrite itself isn't matching (check that
  `next.config.ts` still configures `tunnelRoute: '/sentry-tunnel'` and that
  the test's query params still match what the installed `@sentry/nextjs`
  version's rewrite expects — that shape is not a stable public contract,
  it has changed across SDK versions before).
- **Any other non-200** (401/403/429): Sentry rejected the envelope after a
  successful rewrite match — check `NEXT_PUBLIC_SENTRY_DSN` validity,
  org/project status, or rate limiting before assuming a code regression.

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
