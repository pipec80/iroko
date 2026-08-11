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

## Routine read-only health check

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
- `docs/audits/2026-08-02-full-platform-audit.md` (AUD-002 to AUD-004)
- `supabase/migrations/20260810190000_email_worker_url_and_auth.sql`
