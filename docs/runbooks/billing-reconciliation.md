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
