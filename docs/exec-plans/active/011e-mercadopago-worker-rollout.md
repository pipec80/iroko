# Mercado Pago worker rollout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:executing-plans` to execute this operational plan sequentially.
> Steps use checkbox (`- [ ]`) syntax for tracking. Do not dispatch concurrent
> Cloud mutations.

**Goal:** Activate recovery and reconciliation workers in the authorized v1
environment and prove their HTTP, database and durable-work outcomes.

**Architecture:** Supabase `pg_cron` invokes the private Vault-backed dispatcher,
which calls the stable Vercel Node route with one shared secret. Rollout enables
one mode at a time, observes real effects, and retains durable jobs/anomalies on
rollback.

**Tech Stack:** Supabase CLI/MCP and SQL, Vercel CLI/MCP, `pg_cron`, `pg_net`,
Next.js internal route, Mercado Pago sandbox/test environment.

**Spec:**
[`docs/architecture/mercadopago-reliability-design.md`](../../architecture/mercadopago-reliability-design.md#delivery-i--rollout-and-internal-acceptance)

## Global Constraints

- This plan begins read-only. Each Vercel, Supabase, firewall, Vault, deployment
  or cron mutation requires explicit authorization for the named environment.
- Never print or store access tokens, webhook secrets or worker secrets in
  command output, Markdown, shell history or evidence.
- Use the stable deployment URL; do not schedule a protected Preview URL.
- Configure recovery before reconciliation and observe at least two successful
  invocations of each.
- Cron success alone is insufficient: correlate HTTP response, worker health
  and ledger/job/reconciliation-state effects.
- Rollback unschedules jobs and removes the route allowance when needed; it
  retains durable work and anomaly evidence.

**Status note — 2026-09-22:** the authoritative evidence for this rollout's
current state lives in
[Plan 011e worker rollout](../../quality/operational-evidence.md#plan-011e-worker-rollout--2026-09-22),
not in the checkboxes below (this session did not re-execute each step and
cannot audit that every literal sub-step ran as written). What is confirmed:
both jobs are scheduled and have run unattended for days with zero failures
(recovery 1493/1493, reconciliation 22/22), current worker health correlates
`last_status_code=200` to the latest cron run for both modes, and Cloud
migration parity is exact (159/159). What remains open regardless of checkbox
state: Task 3 Step 3 (controlled recovery failure), Task 4 Step 4 (multi-batch
and interruption recovery), and any real provider-known payment or missed
invoice actually repaired/discovered — `last_summary` has shown `claimed=0`
and `scanned=0` throughout, so neither worker has had a real case to resolve
yet. Do not check remaining boxes from this evidence alone; only check a step
after re-running and recording it per this plan's own instructions.

**Update — 2026-09-23:** the "no real case yet" statement above is superseded.
Recovery repaired a real provider payment on 2026-09-22 (MP-11), and
reconciliation has scanned a real subscription every hour since: it failed
first on a provider `400` (fixed in #205) and then in the reducer (fixed by
PR #208) while the worker kept answering HTTP 200, which is why transport
health alone is not acceptance. That failing candidate is also real evidence of
failure isolation with backoff. A Cloud lease drill covered lease reclaim
(database semantics). Still open for Task 4 Step 4: more than one batch, an
intermediate invoice cursor and a killed process, none of which sandbox can
produce. Details: [operational evidence](../../quality/operational-evidence.md#mercado-pago-sandbox-drills-2026-09-23)
and the [v1 Chile matrix](011-mercadopago-v1-chile-acceptance.md).

---

### Task 1: Capture the read-only rollout preflight

**Files:**

- Modify: `docs/quality/operational-evidence.md`
- Modify: `docs/runbooks/billing-reconciliation.md`

**Interfaces:**

- Consumes: locally verified code plans 011a–011d.
- Produces: a dated preflight record with environment, revisions and explicit
  mutation list; no Cloud state change.

- [ ] **Step 1: Verify installed/authenticated tools without secrets**

Run:

```powershell
Get-Command supabase -All
supabase --version
Get-Command vercel -All
vercel --version
supabase status
vercel whoami
```

Record installed/authenticated status separately. Do not install or update a
tool if any command is unavailable.

- [ ] **Step 2: Verify repository and deployment revisions**

Run:

```bash
git status --short --branch
git rev-parse HEAD
git log -1 --format=%cI
vercel inspect https://project-a89lv.vercel.app --json
```

Record local HEAD, intended deployed revision and the current deployment behind
the documented stable alias. If the alias changes before execution, update the
runbook through review before using another URL. Stop if the deployment does
not contain the verified 011a–011d code.

- [ ] **Step 3: Compare migration state read-only**

Run:

```bash
supabase migration list --local
supabase migration list --linked
```

Record only version identifiers. Stop before rollout if linked state lacks any
required version or contains unexplained remote-only versions. Applying
migrations is a distinct authorized operation outside this step.

- [ ] **Step 4: Inspect configuration presence without values**

Run `vercel env ls` and record only that
`BILLING_RECONCILIATION_SECRET`, `MERCADOPAGO_ACCESS_TOKEN`,
`MERCADOPAGO_WEBHOOK_SECRET` and `MERCADOPAGO_WEBHOOK_URL` are present in the
target environment. In an audited SQL session, run:

```sql
select name
from vault.decrypted_secrets
where name in ('billing_worker_url', 'billing_reconciliation_secret')
order by name;

select jobid, jobname, schedule, active
from cron.job
where jobname in ('billing-recovery-worker', 'billing-reconciliation-worker')
order by jobname;

select mode, last_invoked_at, last_completed_at, last_status_code,
       last_net_request_id
from private.billing_worker_health
order by mode;
```

Never select `decrypted_secret` into captured output.

- [ ] **Step 5: Inspect route reachability and protection**

Send an unauthenticated POST with body `{"mode":"recovery"}` to the stable
route. Expected: application response 401, not Vercel Authentication HTML,
redirect or 404. Do not send the real secret during preflight.

- [ ] **Step 6: Record the exact proposed mutations**

List each missing action separately: Vercel secret create/rotation, deployment,
route protection exception, Vault URL/secret create/rotation, recovery schedule
and reconciliation schedule. Mark every runtime fact not inspected
`[NO VERIFICADO]`.

- [ ] **Step 7: Request one explicit authorization for the concrete list**

Present the preflight record and ask the owner to authorize only the listed
target environment and mutations. Do not continue from a general coding
approval.

- [ ] **Step 8: Commit the read-only preflight**

```bash
git add docs/quality/operational-evidence.md docs/runbooks/billing-reconciliation.md
git commit -m "docs: record billing worker rollout preflight"
```

### Task 2: Configure and manually verify recovery

**Files:**

- Modify: `docs/quality/operational-evidence.md`

**Interfaces:**

- Consumes: explicit authorization from Task 1.
- Produces: stable route, matching secret in Vercel/Vault and two correlated
  manual recovery invocations.

- [ ] **Step 1: Configure the shared secret through secret-safe interfaces**

Use an interactive Vercel environment operation for
`BILLING_RECONCILIATION_SECRET`; enter the value through stdin/UI, never as a
command argument. In the audited SQL console, call `vault.create_secret` or
`vault.update_secret` for `billing_reconciliation_secret` and
`billing_worker_url`. Capture only returned UUID/name and UTC timestamp.

- [ ] **Step 2: Deploy the exact verified revision**

Deploy using the repository's existing production workflow and record the
deployment ID, commit SHA and stable alias. Verify the internal path is allowed
through Vercel protection while other protected paths retain their policy.

- [ ] **Step 3: Invoke recovery manually**

In the audited SQL console:

```sql
select private.invoke_billing_worker('recovery') as net_request_id;
```

After `pg_net` completes, inspect the request ID through the runbook health
query. Expected: HTTP 200 and a JSON summary with bounded numeric
`claimed/resolved/retried/exhausted/anomalous/skipped` fields.

- [ ] **Step 4: Correlate durable effects**

Compare recovery job counts/statuses and related event/invoice/payment/anomaly
IDs from before and after. A zero-work summary is valid route health but does
not prove known-payment recovery; record it as such.

- [ ] **Step 5: Repeat the manual invocation**

Invoke recovery a second time and prove resolved jobs and reducer events are
not duplicated. Record request IDs, status codes and sanitized row aliases.

- [ ] **Step 6: Roll back on mismatch**

If authentication, deployment identity or durable effects disagree, stop. Do
not schedule. Remove the newly added route allowance if it expanded exposure,
restore the previous secret pair if rotation was involved, and retain job and
anomaly rows.

- [ ] **Step 7: Commit manual recovery evidence**

```bash
git add docs/quality/operational-evidence.md
git commit -m "docs: record manual billing recovery evidence"
```

### Task 3: Schedule and observe recovery

**Files:**

- Modify: `docs/quality/operational-evidence.md`

**Interfaces:**

- Consumes: two valid manual recovery invocations.
- Produces: active five-minute recovery schedule with two observed executions.

- [ ] **Step 1: Create or replace only the named recovery schedule**

First query and record any existing job with the same name. Then execute:

```sql
select cron.schedule(
  'billing-recovery-worker',
  '*/5 * * * *',
  $$select private.invoke_billing_worker('recovery')$$
);
```

- [ ] **Step 2: Observe two scheduled executions**

For each invocation, record cron run ID/status, `net_request_id`, HTTP result,
worker health timestamp/status and durable job/ledger effects. The two health
timestamps must be distinct and within the expected schedule windows.

- [ ] **Step 3: Exercise controlled recovery failure**

Use a disposable known test job whose mocked/test provider state produces a
safe failure without changing credentials or real access. Verify retry/backoff,
safe error code, continued processing of another job and later idempotent
resolution. If no safe provider-side scenario exists, retain this gate
`[NO VERIFICADO]`; do not induce a production outage.

- [ ] **Step 4: Commit scheduled recovery evidence**

```bash
git add docs/quality/operational-evidence.md
git commit -m "docs: record scheduled billing recovery evidence"
```

### Task 4: Manually verify, schedule and observe reconciliation

**Files:**

- Modify: `docs/quality/operational-evidence.md`

**Interfaces:**

- Consumes: healthy recovery schedule and code from plan 011d.
- Produces: hourly reconciliation schedule, two observed runs and real
  multi-batch/interruption evidence where safely possible.

- [ ] **Step 1: Invoke reconciliation manually twice**

Run `select private.invoke_billing_worker('reconciliation');`, inspect HTTP and
health results, then compare reconciliation-state leases, cursors, watermarks,
failure counts and ledger IDs. Repeat once to prove replay safety.

- [ ] **Step 2: Create or replace only the named schedule**

```sql
select cron.schedule(
  'billing-reconciliation-worker',
  '0 * * * *',
  $$select private.invoke_billing_worker('reconciliation')$$
);
```

- [ ] **Step 3: Observe two scheduled executions**

Record the same correlated evidence as recovery, including
`scanned/repaired/stale/anomalous/skipped/failed/deferred`.

- [ ] **Step 4: Exercise multi-batch and interruption recovery**

Only in the approved sandbox/test environment, create more than 20 controlled
eligible rows or use an existing sanitized test set. Demonstrate a second
batch, one failed candidate that does not stop others, an expired/reclaimed
lease and no duplicate ledger effect. Do not fabricate production customer
subscriptions for this drill.

- [ ] **Step 5: Commit reconciliation rollout evidence**

```bash
git add docs/quality/operational-evidence.md
git commit -m "docs: record billing reconciliation rollout"
```

### Task 5: Close the rollout record or execute rollback

**Files:**

- Modify: `docs/quality/operational-evidence.md`
- Modify: `docs/exec-plans/active/011-phase6-reconciliation-tasks.md`
- Modify: `docs/exec-plans/active/011-mercadopago-v1-chile-acceptance.md`

**Interfaces:**

- Consumes: Tasks 1–4 evidence.
- Produces: MP-11/13/14 operational status and a reviewable rollout record.

- [ ] **Step 1: Apply the pass/fail rule**

Pass only if both modes have matching deployment/configuration, two manual and
two scheduled correlated results, no unexplained job/ledger differences and a
documented rollback path. Mark every unexecuted failure drill separately
`[NO VERIFICADO]`; do not average evidence across modes.

- [ ] **Step 2: Roll back a failed rollout**

Record job definitions, then call `cron.unschedule(jobid)` for only the two
billing jobs. Remove the internal-route protection exception if it was newly
added. Do not delete recovery jobs, reconciliation state, anomalies, events,
invoices or payment attempts.

- [ ] **Step 3: Validate the documentary record**

Run:

```bash
pnpm docs:check
pnpm test:docs-check
pnpm exec prettier --ignore-path NUL --check docs/quality/operational-evidence.md docs/runbooks/billing-reconciliation.md docs/exec-plans/active/011-phase6-reconciliation-tasks.md docs/exec-plans/active/011-mercadopago-v1-chile-acceptance.md
git diff --check
```

Expected: all commands exit 0.

- [ ] **Step 4: Commit the sanitized rollout evidence**

```bash
git add docs/quality/operational-evidence.md docs/runbooks/billing-reconciliation.md docs/exec-plans/active/011-phase6-reconciliation-tasks.md docs/exec-plans/active/011-mercadopago-v1-chile-acceptance.md
git commit -m "docs: record Mercado Pago worker rollout"
```
