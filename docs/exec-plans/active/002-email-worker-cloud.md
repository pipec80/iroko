# Plan 002 — Deploy and Verify the Cloud Email Worker

- Priority: P0
- Status: Open
- Depends on: Plan 001 when a migration change is required
- Production deployment/write: requires explicit human approval

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
