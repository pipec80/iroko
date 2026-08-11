# Runbook — Email Queue Worker

## Purpose

Operate and verify `process-email-queue`, the Supabase Edge Function that
consumes the `email_queue` PGMQ queue. This runbook records the deployed
design from Plan 002; it does not authorize Cloud writes, secret rotation or
test-email delivery.

## Safety boundaries

- Treat `RESEND_API_KEY`, `CRON_SECRET`, Vault values and recipient addresses
  as secrets. Do not print them in a terminal, ticket or pull request.
- Do not run `supabase secrets set`, `supabase functions deploy`, migration
  pushes or queue writes without explicit human approval.
- The function intentionally has `verify_jwt: false`; access is protected by
  the Vault-backed `X-Cron-Secret` checked before the queue is opened.

## Automated nightly health check (AUD-025)

`nightly.yml`'s `email-worker-health` job automates the manual check below —
it calls `private.email_worker_health()` through a `service_role`-only REST
wrapper (`public.get_email_worker_health()`,
`supabase/migrations/20260811200000_email_worker_health_rpc.sql`) and fails
the workflow if the status code isn't 2xx, the last invocation timed out, or
`invoked_at` is older than 300 seconds (the cron runs every minute, so this
is a generous margin, not a tight one).

`private` isn't in PostgREST's exposed schema list
(`supabase/config.toml`: `[api] schemas = ["public"]`), so it can't be called
directly. Rather than adding a new, broad-scoped secret (e.g. a Supabase
management access token) just to run `supabase db query --linked` from CI,
the check reuses the existing `SUPABASE_SECRET_KEY` against a narrow
`SECURITY DEFINER` wrapper — the same pattern this repo already uses for
`admin_list_accounts`/`get_platform_audit_logs`.

A failure here means the same "cron succeeded but delivery didn't" gap
AUD-002–004 originally found, or the cron itself has stopped running —
treat it as a real incident, not flaky CI.

## Routine read-only health check (manual)

From the repository root:

```powershell
supabase functions list --output json
supabase db query --linked "select * from private.email_worker_health()"
```

Expected state:

- `process-email-queue` is `ACTIVE`.
- The health query has a recent `invoked_at`, `status_code` in the 2xx range,
  `timed_out = false` and no error message.

The health query is authoritative for the HTTP response. `cron.job_run_details`
alone only proves that pg_net queued the request, not that the worker answered.

## Local code verification

Run the isolated function suite:

```powershell
pnpm test:functions
```

The suite covers missing configuration, missing or invalid cron authentication,
empty queues, successful delivery, retryable provider errors, exhaustion/archive
behavior and connection cleanup.

To confirm version history without applying migrations:

```powershell
supabase migration list --local
supabase migration list --linked
```

The local and linked lists must contain the same versions before any approved
Cloud migration action.

## Incident response

1. Record the health-query output without secrets or recipient data.
2. If the function is inactive, the response is non-2xx, times out, or carries
   an error, stop automatic remediation and request human review.
3. Preserve queued messages. Do not delete the queue as a rollback step.
4. Any rollback must restore the previous cron command or function version only
   after approval; verify the worker health again afterward.

## Related records

- `docs/exec-plans/completed/002-email-worker-cloud.md`
- `docs/exec-plans/completed/008-email-worker-cloud-smoke-check.md`
- `docs/audits/2026-08-02-full-platform-audit.md` (AUD-002 to AUD-004, AUD-025)
- `supabase/migrations/20260810190000_email_worker_url_and_auth.sql`
- `supabase/migrations/20260811200000_email_worker_health_rpc.sql`
