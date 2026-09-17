# Billing recovery and reconciliation

**Scope:** Mercado Pago durable recovery and reconciliation. Production remains **[NO VERIFICADO]** until an authorized rollout and smoke test.

## Health and inspection

Run with an audited database role; never copy provider payloads or secrets into tickets.

```sql
select h.*, r.status_code as net_status, r.error_msg, r.timed_out
from private.billing_worker_health h
left join net._http_response r on r.id = h.last_net_request_id;

select status, count(*), min(next_attempt_at) from billing.recovery_jobs group by status;
select c.account_id, s.provider, s.external_subscription_id, s.status, s.current_period_end, s.updated_at
from billing.subscriptions s join billing.customers c on c.id=s.customer_id
where c.account_id = '<account-uuid>';
```

## Financial anomaly investigation and resolution

This procedure does not authorize access to Mercado Pago or a Cloud database,
and it does not authorize the resolution mutation. Obtain the required access
and mutation approvals separately. Work in audited sessions and keep raw
provider responses out of terminals with recording enabled, tickets and this
repository.

Set the exact anomaly ID in the privileged database session, then inspect only
the fields needed to correlate and decide the case:

```sql
\set anomaly_id 'REPLACE_WITH_TARGET_ANOMALY_UUID'

SELECT
  anomaly.id,
  anomaly.provider,
  anomaly.anomaly_type,
  anomaly.external_resource_id,
  anomaly.observed_status,
  anomaly.original_amount,
  anomaly.affected_amount,
  anomaly.currency,
  (
    (anomaly.original_amount IS NULL OR anomaly.original_amount >= 0)
    AND (anomaly.affected_amount IS NULL OR anomaly.affected_amount >= 0)
    AND (
      anomaly.original_amount IS NULL
      OR anomaly.affected_amount IS NULL
      OR anomaly.affected_amount <= anomaly.original_amount
    )
  ) AS amounts_are_bounded,
  anomaly.occurrence_count,
  anomaly.first_seen_at,
  anomaly.last_seen_at,
  anomaly.status,
  anomaly.resolved_at,
  anomaly.resolution_code,
  anomaly.account_id,
  anomaly.subscription_id,
  anomaly.invoice_id,
  anomaly.payment_id
FROM billing.financial_anomalies AS anomaly
WHERE anomaly.id = :'anomaly_id'::uuid
  AND anomaly.provider = 'mercadopago';
```

Before resolving, compare the exact `external_resource_id`, status, original
amount, affected amount and currency from this row with a fresh Mercado Pago
inspection. A full refund with valid monetary evidence has a positive original
amount and an affected amount equal to it; a partial refund has
`0 < affected_amount < original_amount`. A status-proven refund, chargeback or
mediation may have null amounts when the provider evidence could not be safely
normalized. Any identity, ownership, status, currency or amount mismatch keeps
the anomaly open and requires escalation.

Record only the UTC inspection time, environment alias, sanitized anomaly and
remote-resource aliases, anomaly type, normalized integer amounts and currency,
occurrence/first/last-seen fields, decision, resolution code and sanitized
operator reference. Do not record raw external IDs, account or subscription
UUIDs, payer data, credentials, URLs or full provider payloads.

Only after that comparison and separate authorization, resolve the still-open
row from the same privileged SQL session. The resolver is manual and does not
change subscription status, paid period or entitlements.

```sql
\set resolution_code 'verified_and_closed'
\set ON_ERROR_STOP on

BEGIN;
SELECT private.resolve_billing_financial_anomaly(
  :'anomaly_id'::uuid,
  :'resolution_code'
);
SELECT
  id,
  status,
  occurrence_count,
  first_seen_at,
  last_seen_at,
  resolved_at,
  resolution_code
FROM billing.financial_anomalies
WHERE id = :'anomaly_id'::uuid;
COMMIT;
```

If any statement fails, issue `ROLLBACK;`, keep the anomaly open and end the
session. Do not retry with a different code or update the row directly. A
committed resolution is audit evidence; correct mistakes through a reviewed
follow-up rather than rewriting it.

## Abandoned or ambiguous Mercado Pago checkout

Use this procedure only after reviewing one identified checkout with the
provider. The target environment needs separate authorization for both provider
inspection and the database mutation. This runbook does not authorize a Cloud
connection, a provider action, or a new checkout creation.

`reserved`, `pending`, and `needs_review` block a new provider POST. A stale
lease authorizes investigation only; a known pending checkout URL remains
resumable. Do not use the normal checkout flow to probe the provider or issue a
second preapproval while the intent is blocking.

### Decision tree

1. **Remote resource belongs to the expected seller, account, and plan.** Use
   the existing privileged billing service path to attach it through
   `public.attach_billing_checkout_remote(uuid,text,text)`. Do not invoke that
   RPC manually from this procedure. Retrieve fresh provider state and send it
   through the normal provider/reducer path. Do not call the private resolver.
   This applies even when the resource is terminal: a discovered remote ID must
   attach and converge before any local terminal decision.
2. **Provider proves that no remote resource exists.** A separately authorized
   operator may resolve the eligible local row as `failed` with
   `remote_absent_after_provider_review`.
3. **Provider proves a canceled or expired result with no usable checkout and
   no attachable remote subscription ID.** A separately authorized operator may
   resolve the eligible local row as `canceled` with
   `remote_terminal_after_provider_review`. If the provider returns a remote
   subscription ID, return to decision 1 instead.
4. **Identity, ownership, plan, or provider evidence is ambiguous.** Retain
   `needs_review`, escalate the incident, and release nothing. Do not run SQL
   that could release the reservation.

Proceed only when the target is `needs_review`, or when it is `pending` with an
expired non-null lease. Stop and investigate otherwise. The resolver
intentionally rejects every other state and any row that already has an
external subscription ID.

### Read-only preflight and evidence

From an audited `psql` session, set only the target intent ID. These queries
are read-only. Do not put their raw output into a ticket or this repository.

```sql
\set intent_id 'REPLACE_WITH_TARGET_INTENT_UUID'

SELECT
  intent.id AS intent_id,
  intent.account_id,
  intent.provider,
  plan.slug AS plan_slug,
  customer.id AS customer_id,
  subscription.id AS subscription_id,
  subscription.status AS subscription_status,
  subscription.current_period_end,
  intent.status,
  intent.lease_expires_at,
  intent.external_subscription_id,
  intent.checkout_url IS NOT NULL AS has_checkout_url,
  intent.failure_code,
  intent.resolved_at,
  intent.resolution_code,
  intent.resolved_by
FROM billing.checkout_intents AS intent
JOIN billing.plans AS plan ON plan.id = intent.plan_id
LEFT JOIN billing.customers AS customer
  ON customer.account_id = intent.account_id
  AND customer.provider = intent.provider
LEFT JOIN billing.subscriptions AS subscription
  ON subscription.customer_id = customer.id
  AND subscription.provider = intent.provider
  AND intent.external_subscription_id IS NOT NULL
  AND subscription.external_subscription_id = intent.external_subscription_id
WHERE intent.id = :'intent_id'::uuid;

SELECT
  anomaly.id,
  anomaly.anomaly_type,
  anomaly.observed_status,
  anomaly.occurrence_count,
  anomaly.first_seen_at,
  anomaly.last_seen_at,
  anomaly.subscription_id,
  anomaly.invoice_id,
  anomaly.payment_id
FROM billing.financial_anomalies AS anomaly
WHERE anomaly.status = 'open'
  AND anomaly.provider = 'mercadopago'
  AND (
    anomaly.account_id = (
      SELECT account_id
      FROM billing.checkout_intents
      WHERE id = :'intent_id'::uuid
    )
    OR anomaly.subscription_id IN (
      SELECT subscription.id
      FROM billing.checkout_intents AS intent
      JOIN billing.customers AS customer
        ON customer.account_id = intent.account_id
        AND customer.provider = intent.provider
      JOIN billing.subscriptions AS subscription
        ON subscription.customer_id = customer.id
        AND subscription.provider = intent.provider
        AND intent.external_subscription_id IS NOT NULL
        AND subscription.external_subscription_id = intent.external_subscription_id
      WHERE intent.id = :'intent_id'::uuid
    )
  )
ORDER BY anomaly.last_seen_at DESC;
```

Before choosing a branch of the decision tree, record the UTC observation time,
target environment, sanitized account/intent/remote aliases, the provider
observation, the selected outcome, the resolution code, and a sanitized
operator reference. Do not record tokens, emails, checkout URLs, raw remote
IDs, or full provider payloads. Use the MP-08 record in the operational
evidence register.

### Authorized local resolution

Only after the preflight and provider finding select decision 2 or 3, obtain
separate authorization for this mutation in the target environment. Set the
three bounded values in the same `psql` session. `operator_reference` must be
an approved sanitized case or operator alias; it is stored immutably.

```sql
\set outcome 'failed'
\set resolution_code 'remote_absent_after_provider_review'
\set operator_reference 'operator:SANITIZED_CASE_ALIAS'
\set ON_ERROR_STOP on

BEGIN;
SELECT *
FROM private.resolve_billing_checkout_intent(
  :'intent_id'::uuid,
  :'outcome',
  :'resolution_code',
  :'operator_reference'
);
SELECT status, resolved_at, resolution_code, resolved_by
FROM billing.checkout_intents
WHERE id = :'intent_id'::uuid;
COMMIT;
```

For decision 3, change only `outcome` to `canceled` and `resolution_code` to
`remote_terminal_after_provider_review`. If any statement fails,
`ON_ERROR_STOP` stops the sequence: do not run a later `SELECT` or `COMMIT`, do
not retry with a different outcome, and do not use direct updates. Issue
`ROLLBACK;` and end the session (`\q`) if `psql` remains connected. If it has
already exited, do not reconnect to continue this sequence; the connection
close rolls back its open transaction. Record the failure in the incident and
retain the blocking state until it is reviewed.

### Irreversibility and follow-up

A committed resolution is not overwritten, cleared, or reopened. If the
resolution was erroneous, create a new financial or operational incident and
preserve the audit row as evidence. Repair only through a reviewed follow-up
migration or provider convergence; do not edit the original resolution or
create a blind second provider POST.

## Configure and schedule

### Superseded 011e read-only rollout preflight — 2026-09-16

The historical preflight is recorded in the [operational evidence
register](../quality/operational-evidence.md#superseded-billing-worker-rollout-preflight--2026-09-16).
It identified one proposed Supabase target, `iroko`
(`rgrxlygtmvavqzkjyywg`, `us-east-2`), while the CLI still reported
`linked=false`; the proposed Vercel target is `pipec80-labs/iroko`. The stable
alias `project-a89lv.vercel.app` is `READY` at
`dpl_EE7N9eropjg64w4MDYdqx7QSZ93A` with a worker-route artifact, but its source
SHA was not established. `BILLING_RECONCILIATION_SECRET` was absent from the
inspected Vercel Production and Preview environment names; Vault, cron, health
and worker URL state remain **[NO VERIFICADO]**. Those facts are blockers, not
an authorization to repair them.

Do not send an unauthenticated POST merely to test the route. In this preflight
that request was not made because a misconfigured route could run a worker.
Route reachability therefore remains **[NO VERIFICADO]** until an authorized,
secret-safe rollout step can establish it alongside deployment identity and
durable effects.

It is superseded by release candidate
`611684f2905645f5165d7f0d3a98d6526e442793`, which contains Plan 011g and
local migration `20260911140000_billing_financial_anomaly_ingress`. Before a
mutation, repeat the preflight against that candidate (or a reviewed descendant
containing all Plan 011g changes), including a fresh stable-source inspection
and an exact local-to-linked migration comparison through that migration.

Only after the new preflight, obtain explicit authorization naming Vercel
`pipec80-labs/iroko` and Supabase `iroko` (`rgrxlygtmvavqzkjyywg`,
`us-east-2`). Target identification is already recorded, but mutation remains
prohibited until that authorization is granted. It must first permit read-only
migration parity and stable-source inspection. If the stable alias cannot be
shown to contain the release candidate SHA (or a reviewed descendant containing
Plan 011g), it must expressly permit deploying that candidate to
`pipec80-labs/iroko` before worker configuration. Only after the parity review
may the authorization permit the reviewed missing migrations, followed by a
re-check of parity.

The remaining approved list must be limited and ordered: create Vercel
`BILLING_RECONCILIATION_SECRET` (it is absent, so this is a create rather than a
rotation); inspect the Vault secret name and then create or rotate the paired
Vault secret according to whether it exists; configure Vault
`billing_worker_url` for the verified stable URL; add an allowance only for
`/api/internal/billing/worker` if that exact route is blocked; recovery
activation and observation; then reconciliation activation and observation. Do
not combine the two schedules or use a Preview URL.

### Authorized configuration and schedule

Only after the fresh preflight establishes the release candidate source and
local migration inventory through
`20260911140000_billing_financial_anomaly_ingress`, and the named mutation
authorization is granted, use the verified stable production URL (never a
protected Preview URL). Complete migration parity review before applying any
reviewed missing migrations, then verify parity again before configuring the
worker. Create the absent Vercel `BILLING_RECONCILIATION_SECRET`; inspect the
Vault secret name first and create or rotate its paired secret only as that
inspection requires. Then configure `billing_worker_url` in Vault for the
verified stable URL. Verify the route through the authorized worker procedure
before scheduling.

```sql
select cron.schedule('billing-recovery-worker', '*/5 * * * *', $$select private.invoke_billing_worker('recovery')$$);
select cron.schedule('billing-reconciliation-worker', '0 * * * *', $$select private.invoke_billing_worker('reconciliation')$$);
```

Activate recovery first and observe two correlated manual results before
creating its schedule. Observe two scheduled recovery results before activating
reconciliation. For each invocation correlate HTTP response, worker health and
ledger/job or reconciliation-state effects; cron success alone is insufficient.

Pause with `cron.unschedule(jobid)` after recording the current definitions.
Recreate them with the statements above after the incident is resolved. To
rotate the secret, update Vercel and Vault in one maintenance window, verify a
manual invocation, then inspect health.

## Local-only multi-batch interruption drill

This drill is disposable-local evidence for MP-12 and MP-14. It does not
contact Mercado Pago, invoke a deployed route, create a checkout, or authorize
Cloud configuration. Do not substitute production credentials or provider IDs.

The committed deterministic harness is
`src/lib/billing/__tests__/reconciliation-drill.test.ts`. It runs the real
`reconcileNonTerminalSubscriptions` service against a local provider/RPC/reducer
seam. The seam seeds exactly 25 active Mercado Pago aliases
`drill-011d:subscription:01` through `:25`, claims the first 20, makes `:07`
fail with `provider_fetch_failed`, persists the page-2 cursor for `:01`,
expires and reclaims that lease, and then claims `:01` plus `:21`–`:25`.
It captures invoice, event, and payment aliases before and after replay and
requires every captured alias to occur once. This is an executable local
orchestration harness; SQL durability and true second-session locking remain
covered separately by pgTAP 42.

Run the committed drill from any supported shell at the repository root:

```bash
pnpm test src/lib/billing/__tests__/reconciliation-drill.test.ts
```

It has no Supabase, provider, Cloud, or credential prerequisite. A passing run
does not prove a deployed route, a real process interruption, or provider
acceptance; those remain **[NO VERIFICADO]** for 011e/011f.

The following SQL is the diagnostic query contract for a future
database-backed local drill. It is not a substitute for the committed command
above and must not be run against a linked or production project. A
database-backed fixture must first seed the same 25 aliases and retain the
snapshots before replay.

1. Persist the snapshot after the first invocation and before replay:

   ```sql
   CREATE TEMP TABLE drill_011d_ids_before_replay AS
   SELECT 'invoice'::text AS kind, external_invoice_id AS external_id
   FROM billing.invoices
   WHERE provider = 'mercadopago'
     AND external_invoice_id LIKE 'drill-011d:%'
   UNION ALL
   SELECT 'event'::text, external_event_id
   FROM billing.events
   WHERE provider = 'mercadopago'
     AND external_event_id LIKE 'drill-011d:%'
   UNION ALL
   SELECT 'payment'::text, external_payment_id
   FROM billing.payment_attempts
   WHERE provider = 'mercadopago'
     AND external_payment_id LIKE 'drill-011d:%';

   SELECT kind, count(*) AS rows, count(DISTINCT external_id) AS distinct_ids
   FROM drill_011d_ids_before_replay
   GROUP BY kind
   ORDER BY kind;

   SELECT subscription_id, scan_cursor, scan_watermark, lease_owner, lease_expires_at,
          failure_count, last_error_code, next_scan_at
   FROM billing.reconciliation_state
   WHERE subscription_id IN (
     SELECT id
     FROM billing.subscriptions
     WHERE external_subscription_id LIKE 'drill-011d:subscription:%'
   )
   ORDER BY subscription_id;
   ```

2. After replay, snapshot IDs and compare them to the saved pre-replay set.
   No aliases from the first invocation may be duplicated or removed by replay;
   any addition must be a documented page-2 discovery rather than a repeat of
   page 1.

   ```sql
   CREATE TEMP TABLE drill_011d_ids_after_replay AS
   SELECT 'invoice'::text AS kind, external_invoice_id AS external_id
   FROM billing.invoices
   WHERE provider = 'mercadopago'
     AND external_invoice_id LIKE 'drill-011d:%'
   UNION ALL
   SELECT 'event'::text, external_event_id
   FROM billing.events
   WHERE provider = 'mercadopago'
     AND external_event_id LIKE 'drill-011d:%'
   UNION ALL
   SELECT 'payment'::text, external_payment_id
   FROM billing.payment_attempts
   WHERE provider = 'mercadopago'
     AND external_payment_id LIKE 'drill-011d:%';

   SELECT kind, count(*) AS rows, count(DISTINCT external_id) AS distinct_ids
   FROM drill_011d_ids_after_replay
   GROUP BY kind
   ORDER BY kind;

   SELECT kind, external_id, count(*) AS occurrences
   FROM drill_011d_ids_after_replay
   GROUP BY kind, external_id
   HAVING count(*) <> 1;

   SELECT kind, external_id
   FROM drill_011d_ids_before_replay
   EXCEPT
   SELECT kind, external_id
   FROM drill_011d_ids_after_replay;

   WITH drill_011d_additions AS (
     SELECT kind, external_id
     FROM drill_011d_ids_after_replay
     EXCEPT
     SELECT kind, external_id
     FROM drill_011d_ids_before_replay
   )
   SELECT kind, external_id
   FROM drill_011d_additions
   WHERE external_id NOT LIKE 'drill-011d:invoice:page-2:%'
     AND external_id NOT LIKE 'drill-011d:event:page-2:%'
     AND external_id NOT LIKE 'drill-011d:payment:page-2:%';

   SELECT count(*) AS advanced_rows
   FROM billing.reconciliation_state AS state
   JOIN billing.subscriptions AS subscription ON subscription.id = state.subscription_id
   WHERE subscription.external_subscription_id LIKE 'drill-011d:subscription:%'
     AND state.next_scan_at > now()
     AND state.lease_owner IS NULL
     AND state.lease_expires_at IS NULL;
   ```

3. The database-backed diagnostic passes only when the duplicate query and both
   `EXCEPT` queries return zero rows, each grouped count equals its distinct
   count, and `advanced_rows = 25`. Preserve only the UTC time, commit,
   commands, counts and the `drill-011d:` aliases in the evidence register. A
   missing or different result is a failed local drill, not a reason to retry
   provider actions or modify access.

The accompanying local gates are
`supabase/tests/database/42_billing_reconciliation_state.test.sql` (25 rows,
lease recovery, cursor resume and true second-session `SKIP LOCKED`) and
`src/lib/billing/__tests__/reconciliation.test.ts` (provider failure isolation,
deadline, cursor replay and reducer idempotency). Neither substitutes for Cloud
multi-invocation evidence or provider acceptance.

## Incidents

- Mercado Pago outage: pause both schedules if retries would amplify the outage; do not delete jobs. Resume recovery first.
- Vercel outage: leave durable jobs intact, verify the stable URL and secret, then invoke one batch manually before re-enabling cron.
- Exhausted jobs: inspect the matching open `unresolved_payment` anomaly. Never change access merely because a refund, chargeback or mediation exists.
- Ambiguous identity or plan: keep the anomaly open and investigate; never guess a plan or attach a resource to another account.
