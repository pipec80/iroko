# Billing recovery and reconciliation

**Scope:** Mercado Pago durable recovery and reconciliation. Production remains **[NO VERIFICADO]** until an authorized rollout and smoke test.

## Health and inspection

Run with an audited database role; never copy provider payloads or secrets into tickets.

```sql
select h.*, r.status_code as net_status, r.error_msg, r.timed_out
from private.billing_worker_health h
left join net._http_response r on r.id = h.last_net_request_id;

select status, count(*), min(next_attempt_at) from billing.recovery_jobs group by status;
select * from billing.financial_anomalies where status = 'open' order by last_seen_at desc;
select c.account_id, s.provider, s.external_subscription_id, s.status, s.current_period_end, s.updated_at
from billing.subscriptions s join billing.customers c on c.id=s.customer_id
where c.account_id = '<account-uuid>';
```

Resolve an investigated anomaly only from a privileged SQL session:

```sql
select private.resolve_billing_financial_anomaly('<anomaly-uuid>', 'verified_and_closed');
```

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

If the target is not `needs_review`, or a `pending` target does not have an
expired non-null lease, stop and investigate. The resolver intentionally
rejects those rows and any row that already has an external subscription ID.

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

Use the stable production URL (never a protected Preview URL). Store `billing_worker_url` and `billing_reconciliation_secret` in Vault through an authorized operation; set the same secret as `BILLING_RECONCILIATION_SECRET` in Vercel. Verify the route manually before scheduling.

```sql
select cron.schedule('billing-recovery-worker', '*/5 * * * *', $$select private.invoke_billing_worker('recovery')$$);
select cron.schedule('billing-reconciliation-worker', '0 * * * *', $$select private.invoke_billing_worker('reconciliation')$$);
```

Pause with `cron.unschedule(jobid)` after recording the current definitions. Recreate them with the statements above after the incident is resolved. To rotate the secret, update Vercel and Vault in one maintenance window, verify a manual invocation, then inspect health.

## Incidents

- Mercado Pago outage: pause both schedules if retries would amplify the outage; do not delete jobs. Resume recovery first.
- Vercel outage: leave durable jobs intact, verify the stable URL and secret, then invoke one batch manually before re-enabling cron.
- Exhausted jobs: inspect the matching open `unresolved_payment` anomaly. Never change access merely because a refund, chargeback or mediation exists.
- Ambiguous identity or plan: keep the anomaly open and investigate; never guess a plan or attach a resource to another account.
