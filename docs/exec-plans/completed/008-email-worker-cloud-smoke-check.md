# Plan 008 — Automated Cloud Health Check for the Email Worker

- Priority: P1
- Status: Completed (2026-08-11) — [PR TBD](about:blank) (`feat/email-worker-cloud-smoke-check`)
- Scope: AUD-025 only. Related items from the same audit hardening bullet
  (Sentry tunnel: AUD-024, its own branch/PR; provider webhooks: AUD-026,
  blocked — no real Stripe/MercadoPago account exists, only the `mock`
  provider, so there's nothing to smoke-test yet) are deliberately out of
  scope here.

## Objective

Automate the manual health check `docs/runbooks/email-queue.md` already
documented for `private.email_worker_health()` (Plan 002), so a broken
worker surfaces on its own instead of depending on someone remembering to
run a query.

## Problem

`private.email_worker_health()` already exposes the real HTTP status of the
worker's last invocation — Plan 002 built it specifically to close the
"cron reports success but the worker never actually answered" gap. Nothing
called it automatically. It was pure manual-check tribal knowledge, the
exact failure mode the audit's own "Hardening work — still open" section
warns about for the _other_ two async integrations (Sentry tunnel, provider
webhooks) — except here the detection function already existed and simply
wasn't wired to anything periodic.

## Design decisions

- **No new secret.** `private` is not in PostgREST's exposed schema list
  (`supabase/config.toml`: `[api] schemas = ["public"]`), so
  `private.email_worker_health()` can't be called directly over REST. The
  two realistic options were: (a) add `SUPABASE_ACCESS_TOKEN` to CI so
  `supabase db query --linked` works the same way it does when run by hand,
  or (b) add a narrow `SECURITY DEFINER` wrapper in `public`, gated to
  `service_role`, called via the `SUPABASE_SECRET_KEY` CI already has.
  Chose (b): a management-scoped access token is a broader, more sensitive
  credential than this read-only check needs, and this repo already has an
  established, narrower pattern for exactly this shape of problem
  (`admin_list_accounts`, `get_platform_audit_logs` — `public` wrappers over
  otherwise-hidden schemas, gated by role).
- **`service_role` only, not a new `authenticated`-facing RPC.** This is
  operational detail (worker health), not something any signed-in app user
  should be able to query — matches the same reasoning already applied to
  every other `private.*` wrapper in this codebase.
- **300s freshness threshold.** The cron runs every minute
  (`supabase/migrations/20260810190000_email_worker_url_and_auth.sql`), so
  `invoked_at` should always be seconds old at check time. 300s is a
  generous margin against transient pg_net delay, not a tight one — if the
  cron actually stopped, this would still catch it well within one nightly
  run.

## Execution

1. New migration `supabase/migrations/20260811200000_email_worker_health_rpc.sql`:
   `public.get_email_worker_health()`, `SECURITY DEFINER`,
   `SET search_path = ''`, `REVOKE ALL FROM PUBLIC` + `GRANT EXECUTE TO
service_role`.
2. `pnpm supa:reset` (188/188 pgTAP tests pass, no regression) +
   `pnpm supa:gen:types` (`src/types/database.ts` updated).
3. Verified the gate directly against the local instance: `anon` →
   `401 permission denied`; `service_role` → the real health row.
4. New `nightly.yml` job `email-worker-health`: calls the RPC, fails on
   non-2xx `status_code`, `timed_out = true`, or `invoked_at` older than
   300s.
5. Updated `docs/runbooks/email-queue.md` (new "Automated nightly health
   check" section) and the audit (`docs/audits/2026-08-02-full-platform-audit.md`):
   new AUD-025 finding, partial closure of the "Cloud smoke check" hardening
   bullet, new reverification row.

## Acceptance criteria

- The RPC returns real health data to `service_role` and denies `anon`.
- No new secret added.
- `nightly.yml`'s new job fails loudly and specifically (wrong status vs.
  timeout vs. stale invocation) rather than a generic non-2xx.
- pgTAP suite stays green; no existing RLS/grant test broke.
- The runbook documents the automated check alongside the existing manual
  one, not as a replacement for understanding what a failure means.

## Required validation

- `pnpm typecheck && pnpm lint && pnpm format:check` clean.
- `pnpm test` unaffected (708/708, no test touches this migration).
- `supabase test db` — 188/188 pgTAP tests pass post-migration.
- Manual REST calls against the local instance confirm the `anon`/`service_role`
  gate.
- Migration pushed to the linked Cloud project (approved explicitly) and
  confirmed in parity via `supabase migration list --linked`.
- Manual `workflow_dispatch` of `nightly.yml` on the branch, twice:
  1. First attempt failed with a real `curl` exit 7 (connection-level, not
     an HTTP error) — root-caused, not patched around: `secrets.NEXT_PUBLIC_SUPABASE_URL`
     resolves to the local-dev placeholder (`http://127.0.0.1:54321`) at the
     repository-secret level; the real Cloud value only lives in the
     `production` GitHub Environment. Fixed by adding `environment: production`
     to the job (same construct `ci.yml`'s `build` job already uses).
  2. Second attempt failed differently — the job never started at all (empty
     steps, no logs). The `production` environment has a branch-protection
     deployment rule restricting it to protected branches (effectively
     `main`); a feature-branch `workflow_dispatch` cannot resolve it, by
     GitHub's own design. **End-to-end Cloud confirmation for this specific
     job is therefore deferred to the first run on `main` after merge** —
     documented here rather than skipped silently or claimed without
     evidence.

## Rollback

- Revert the migration (drop the function) and the `nightly.yml` job.
- `private.email_worker_health()` itself (Plan 002) is untouched — the
  manual check in the runbook keeps working regardless.
