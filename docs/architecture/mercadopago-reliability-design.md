# Mercado Pago reliability — accepted design

Date: 2026-09-09. Status update 2026-09-11: **Accepted — coordination,
recovery/anomaly and worker foundation implemented; acceptance/operations
pending**. Current code evidence and remaining gaps are in the
[v1 Chile matrix](../exec-plans/active/011-mercadopago-v1-chile-acceptance.md).

This is a bounded supplement to
[Billing Platform v2](billing-platform-v2-design.md), not a replacement billing
architecture. Work belongs to [Plan 011](../exec-plans/active/011-billing-correctness.md).
The [delivery sequence](../exec-plans/active/011-mercadopago-reliability-roadmap.md)
owns the review gates and subsequent task-plan boundaries.

## Evidence boundary

The original 2026-09-09 planning inspection used the refreshed `origin/main` at `954e5d5`, whose
billing implementation matches the inspected post-PR-161 code. The open
checkout is `docs/close-phase1-mercadopago-reference` at `59c1033`, an older
baseline. This package is integrated onto that refreshed main; implementation
continued after that integration. The current targeted static inspection
uses `main` at `66bc9b2`; do not treat the older branch description as the
current execution checkout.

No fresh GitHub, Vercel, Supabase Cloud or Mercado Pago runtime verification
was performed for this document. Current operational health, migration parity,
and sandbox certification remain **[NO VERIFICADO]** in this pass. Historical
chat transcripts are leads, not replacement evidence. A delivered HTTP 200
does not prove that a subscription or invoice was applied locally.

## Agreed product constraints

- Keep subscriptions **without an associated plan, created pending**, with
  hosted checkout. Do not migrate to card collection or remote plan management.
- Mercado Pago offers **no trial for now**. Remove the trial promise for this
  provider; preserve the provider-neutral catalogue for other providers.
- Keep current prices, currencies and internal plan slugs. This work does not
  perform the pricing rename described in Plan 012.
- Refunds, chargebacks and mediation create durable, actionable anomalies.
  They do not automatically revoke access or manufacture a `past_due` state.
- Preserve the existing paid-through cancellation/access policy. Subscription
  state, payment state and access entitlement are distinct concepts.
- Do not rotate secrets, cancel subscriptions, modify provider settings or
  write to Cloud as part of documentation preparation.

## Alternatives and recommendation

1. **Extend existing billing services and Plan 011 (recommended).** Keep the
   adapter/reducer boundary, add checkout coordination and resource recovery.
   This addresses the failures without changing the payment experience.
2. **Move the billing runtime to Supabase Edge Functions.** This could colocate
   workers and scheduling, but requires resolving Next.js/Deno dependencies and
   migrating more than the failing paths. Not included in this change.
3. **Adopt remote subscription plans.** Useful if shared provider-side plan
   features become a product requirement, but changes catalogue ownership and
   correlation. It does not itself fix local concurrency or missed events.

Option 1 is the accepted architectural direction, recorded in
[ADR 0003](../adr/0003-mercadopago-reliability-boundaries.md). The product choices
above and the design were approved for implementation on 2026-09-09.

## Delivery A — truthful checkout and dashboard

The billing response must suppress Mercado Pago trial days without changing
the underlying catalogue. Both a successful empty result and a failed query
must have distinct outcomes. A database error must never render the account
as unsubscribed, and must not enable a new checkout as a fallback.

After the hosted checkout returns, `preapproval_id` is only a correlation
hint. The authenticated account must own the local subscription being
confirmed. Do not activate from URL parameters, a successful redirect, or an
unrelated active overview. Use bounded polling (3 seconds, at most 60 seconds
per return visit), then show a recoverable pending state rather than a false
failure or an infinite spinner. Stop when the matching subscription has a
confirmed state; changing account must not reuse another account's cached
billing data. Keep the subscribe button disabled with an accessible loading
label during submission.

The return flow reads state in this slice; it does not introduce an alternate
provider-to-database write path. Delivery C supplies recovery for delayed or
missed notifications. All four locales retain equivalent messages.

## Delivery B — one recoverable checkout intent

Reserve a checkout intent in PostgreSQL **before** calling `/preapproval`.
The reservation is account-scoped, authorized server-side and atomic across
processes. An intent carries the selected provider/price and correlation ID;
an unexpired local lease is not evidence of remote success or failure.

Concurrent calls must return or await the same intent. Once a pending remote
subscription is known, resume its checkout instead of creating another. A
different selection cannot silently replace an unresolved intent: require an
explicit replacement after the earlier remote subscription is confirmed
canceled, or an operator resolves the ambiguity.

A POST timeout is an **unknown outcome**, not permission to POST again. Keep
that intent unresolved and recover via provider lookup/correlation. Expiring
a processing lease permits another worker to investigate, not another charge
creation. If recovery cannot unambiguously identify the remote resource,
record an anomaly for human resolution. Do not assume an undocumented
idempotency header makes `/preapproval` safe to retry.

The task plan must define the SQL state machine, reservation uniqueness,
lease/claim RPCs and typed service result before code work begins. It must
also cover the existing external-reference/account mapping: do not overwrite
that contract without updating and testing both lookup paths. Existing
incomplete subscriptions need read-only classification before enabling the
new uniqueness rule; do not delete or auto-cancel them to make a migration pass.

## Delivery C — durable recovery and financial anomalies

Extend [Phase 6](../exec-plans/active/011-phase6-reconciliation-tasks.md) with
Mercado Pago first. Other providers do not block this slice.

- Keep signature verification at webhook ingress. Persist validated recovery
  work before acknowledging a deferred event. A failed persistence attempt
  remains retriable; logging alone is not durable acceptance.
- Store minimal identifiers and processing metadata, not secrets, complete
  request URLs or raw provider payloads. A queued validated event is not
  rejected later merely because the original signature timestamp has aged.
- Retrieve fresh resources from the provider and normalize them through the
  same billing reducer. Adapters do not write to PostgreSQL or recursively
  invoke the HTTP webhook handler.
- Unlinked payments are not automatically subscriptions: defer correlation
  with bounded retries, classify unrelated payments, and escalate unresolved
  cases. Do not acknowledge them as successfully applied or retry forever.
- Preserve subscription/payment identity and account ownership checks.
  Provider-state repairs must not change a plan based on an invoice, guess
  ownership, or overwrite a newer result using an older event.
- Record refund/chargeback/mediation anomalies durably and deduplicate repeat
  alerts. Track first/last observation and manual resolution. Retain existing
  access; manual financial action requires separate authorization.
- Derive payment approval time from actual approval evidence, not invoice
  creation. Do not call subscription creation time its cancellation time.
  Preserve an unknown timestamp as unknown when evidence is absent.

Scheduling belongs to Phase 6. The implemented boundary is `pg_cron` and
`pg_net` invoking the existing internal Vercel Node route authenticated by
`X-Billing-Worker-Secret`. Node retains Supabase admin access, reducer, Sentry
and PostHog ownership; no reducer logic is copied to Deno and no Vercel Cron
dependency is introduced. Recovery and reconciliation remain callable without
a scheduler for bounded tests. Enabling the schedule requires the separately
authorized operational contract below.

## V1 Chile closeout extension — accepted 2026-09-11

The owner approved this extension after the 2026-09-11 code-grounded closeout
review. It keeps ADR 0003's boundaries and supplies the missing design contract
for MP-06–MP-15 in the
[v1 Chile acceptance matrix](../exec-plans/active/011-mercadopago-v1-chile-acceptance.md).
The implementation work is split by independently testable responsibility;
Cloud rollout and provider acceptance remain separate from code delivery.

### Alternatives for the remaining work

1. **Extend the provider-neutral billing core and current worker (selected).**
   Reuse provider adapters, normalized events, reducer RPCs, checkout intents,
   recovery jobs and the Node worker. Add only the state needed to make current
   behavior observable, fair and recoverable.
2. **Add a second Mercado Pago-specific worker.** This shortens the first
   implementation but duplicates identity, retry and reducer rules and creates
   two competing scans. Rejected.
3. **Leave the gaps to operator checklists.** Manual procedures remain necessary
   for ambiguous financial decisions, but cannot guarantee invoice discovery,
   bounded concurrency or durable progress. Rejected as the implementation.

### Delivery D — payment health and paid-through access

Payment health is derived from the latest provider-scoped payment attempts for
the current subscription; it is not stored as another subscription lifecycle
column. A separate owner/admin RPC,
`public.get_billing_payment_health(p_account_id)`, exposes the account-scoped
read contract; do not overload `get_billing_overview` with payment-attempt
semantics:

```ts
export type PaymentHealthState = 'healthy' | 'attention_required' | 'unknown';

export interface BillingPaymentHealth {
  state: PaymentHealthState;
  lastAttemptAt: string | null;
  lastFailureCode: string | null;
}
```

The latest failed attempt is `attention_required` until an equal-or-newer paid
or recovered attempt exists. The latter yields `healthy`. Absence of evidence
yields `unknown`; it must not be rendered as success. Provider failure messages
and raw metadata stay server-side. The billing dashboard gives a truthful,
localized explanation and directs the subscriber to Mercado Pago without
claiming an in-app card portal, a provider retry date, or an access cutoff.

Paid-through access continues to use the provider-neutral subscription period.
`private.get_account_plan_row`, `get_account_subscription` and billing overview
must treat a canceled subscription as entitled only while its verified
`current_period_end` is in the future. A canceled subscription without a
verified future end falls back to Free. A payment failure alone does not change
subscription status or entitlements. Cancellation must preserve the existing
period; it may replace it only with stronger provider evidence carried as
`accessUntil`. For Mercado Pago, `next_payment_date` is not accepted as proof of
a paid-through period. In the monthly-only v1 contract, an approved authorized
payment with a valid `debit_date` establishes the period start; one UTC calendar
month with end-of-month clamping establishes its end. Missing or invalid debit
evidence leaves the period unknown.

### Delivery E — abandoned and ambiguous checkout resolution

`reserved`, `pending` and `needs_review` remain blocking states for a new
provider POST. Time and lease expiry authorize investigation only. Known
pending remote checkout URLs remain resumable.

Add a privileged, audit-preserving resolution operation for an operator who has
checked the provider resource. It records a bounded resolution code, resolver
and timestamp, then transitions `needs_review` or stale `pending` to `canceled`
or `failed`. It never deletes the intent, changes subscription access, or
creates/cancels a provider subscription. If a remote subscription exists, its
external ID must first be attached and then converged through the normal
provider/reducer path. The resolver has no `anon`, `authenticated` or
`service_role` application grant and is documented as a separately authorized
operator action.

### Delivery F — financial anomaly detail

Provider recovery distinguishes `partial_refund` from `refund`. Mercado Pago
classification uses fresh payment/refund evidence, including original amount,
refunded amount and currency; a payment status alone is insufficient for a
partial refund because the payment may remain otherwise approved.

The anomaly record stores bounded normalized fields, not raw payloads:

```ts
export interface FinancialAnomalyObservation {
  anomalyType:
    | 'refund'
    | 'partial_refund'
    | 'chargeback'
    | 'mediation'
    | 'status_divergence'
    | 'unresolved_payment';
  externalResourceId: string;
  observedStatus?: string;
  originalAmount?: number;
  affectedAmount?: number;
  currency?: string;
}
```

Repeated observations update the same open anomaly and retain the latest
normalized amounts. Resolution stays manual and auditable. Full refund,
partial refund, chargeback and mediation never mutate subscription status,
period or entitlements automatically.

### Delivery G — omitted-invoice discovery

The provider boundary gains a bounded optional operation instead of exposing a
Mercado Pago response shape to the worker:

```ts
export interface InvoiceDiscoveryInput {
  externalSubscriptionId: string;
  modifiedSince: string;
  pageSize: number;
  cursor?: string;
}

export interface InvoiceDiscoveryPage {
  events: NormalizedBillingEvent[];
  nextCursor: string | null;
  providerWatermark: string | null;
}
```

`PaymentProvider.discoverSubscriptionInvoices?()` searches provider invoices
for one exact subscription and returns only normalized events plus opaque
paging state. Mercado Pago uses its paginated authorized-payment search by
preapproval ID. Every event still passes through `reduceBillingEvent`, so
`(provider, externalEventId)` prevents duplicate ledger effects.

Discovery uses a persisted successful watermark with a bounded overlap window.
`providerWatermark` is the greatest stable provider modification timestamp
observed in the page; absence of such evidence is `null`, never the worker's
clock. A completed scan with a null watermark preserves the previous successful
watermark.
The cursor is valid only within the current scan and is not treated as a
permanent provider offset: later inserts could otherwise shift pages and hide
an invoice. The watermark advances only after every page up to the bounded scan
limit has succeeded. An incomplete scan retains its cursor/lease for another
invocation; a failed page does not advance the successful watermark.

### Delivery H — fair and failure-isolated reconciliation

Create one provider-neutral `billing.reconciliation_state` row per
subscription. It owns
`next_scan_at`, lease owner/expiry, successful invoice watermark, current scan
cursor, bounded failure count, last safe error code and last completed time.
This state remains inaccessible to client roles.

A service-only claim RPC selects due rows with `FOR UPDATE SKIP LOCKED`, marks
the lease and returns at most 20 candidates. Claim order uses `next_scan_at`
plus a stable identifier, which prevents unchanged or unsupported rows from
occupying the head forever. Completion moves every candidate forward whether
it was unchanged, safely repaired, skipped or failed; failures use bounded
backoff and retain a sanitized error code. Lease expiry makes interrupted work
claimable again.

The Node worker isolates each candidate with its own error boundary and
continues the remaining group. At most five provider calls run concurrently and
the invocation retains the 45-second budget. The summary adds `failed` and
`deferred` counts. Snapshot reconciliation executes before invoice discovery
for a candidate, but failure of one stage is recorded explicitly and does not
silently claim the other completed. All safe mutations still use the reducer;
ambiguous identity, plan or missing-provider-resource results remain anomalies.

### Delivery I — rollout and internal acceptance

The operational handoff is not an implementation PR. It begins with read-only
checks of current migration parity, Vercel environment inventory, Supabase
Vault names, firewall rules, cron definitions, worker health and provider
application/seller coherence. Every Cloud mutation requires explicit
authorization and records its before/after state without secrets.

Rollout order is: configure the shared secret and stable URL; redeploy; allow
the internal route; manually invoke recovery then reconciliation; inspect HTTP
response and ledger/job effects; schedule recovery then reconciliation; observe
at least two invocations of each; exercise a controlled failure and recovery;
then execute the MP-01–MP-15 acceptance scenarios. Rollback unschedules jobs and
removes the route allowance if needed, but retains durable jobs, anomalies and
health evidence.

Internal acceptance records revision, deployment, UTC time, provider
application/seller environment, sanitized correlated aliases, remote/local/UI
outcomes and reviewer. First payment, later renewal, rejected payment,
recovery, cancellation with paid-through access, abandoned checkout, full and
partial refund, chargeback, mediation, missing known payment, wholly omitted
invoice, multi-batch progress and interruption recovery are distinct scenarios.
No single green run substitutes for another.

### Plan decomposition and dependency order

The six executable handoffs under Plan 011 are:

1. [payment health and paid-through access](../exec-plans/active/011a-mercadopago-payment-health-paid-through.md)
   (Delivery D);
2. [abandoned/ambiguous checkout resolution](../exec-plans/active/011b-mercadopago-checkout-resolution.md)
   (Delivery E);
3. [financial anomaly detail](../exec-plans/active/011c-mercadopago-financial-anomalies.md)
   (Delivery F);
4. [reconciliation state, invoice discovery and worker resilience](../exec-plans/active/011d-mercadopago-invoice-discovery-reconciliation.md)
   (Deliveries G/H, one subsystem because they share claim/lease/watermark
   state);
5. [authorized worker rollout](../exec-plans/active/011e-mercadopago-worker-rollout.md)
   (first half of Delivery I);
6. [internal Mercado Pago acceptance](../exec-plans/active/011f-mercadopago-internal-acceptance.md)
   (second half of Delivery I).

The first three code plans are independent after their schema contracts are
settled and may be reviewed separately. The reconciliation plan depends on the
normalized partial-refund contract from Delivery F only if discovered invoices
can surface that anomaly; otherwise it consumes the existing normalized event
union. Rollout depends on all code plans and their full local gates. Internal
acceptance depends on successful rollout. Plan 012 and other providers remain
outside these handoffs.

## Acceptance and safety

Each delivery needs observed failing regression tests followed by passing
tests, plus review at its boundary. Read `TESTING-PLAN.md` before test changes.
Required scenarios include: no false trial, DB failure versus empty billing,
return for another account, unresolved return timeout, concurrent checkout,
remote success followed by lost response, duplicate/out-of-order notification,
unlinked payment later correlated, canceled subscription, and repeated
financial anomaly without access changes.

Schema changes require versioned migrations, schema mirrors, generated types,
pgTAP for authorization/concurrency and a disposable local reset. Cloud
application is a separate authorized operation. A sandbox acceptance record
must correlate the provider subscription/payment, local state, event outcome,
dashboard and replay result, with sanitized identifiers and timestamps.

No claim of PCI certification, production readiness or a complete provider
lifecycle follows from this design or from a successful focused test.

## Reference entry points

Recheck these official references during each implementation slice; do not
treat older chat interpretations or forum examples as API contracts.

- [Create subscription](https://www.mercadopago.cl/developers/es/reference/online-payments/subscriptions/create-preapproval/post)
- [Get subscription](https://www.mercadopago.cl/developers/es/reference/online-payments/subscriptions/get-preapproval/get)
- [Subscription webhooks](https://www.mercadopago.cl/developers/es/docs/subscriptions/additional-content/your-integrations/notifications/webhooks)
- [Get authorized payment](https://www.mercadopago.cl/developers/es/reference/online-payments/subscriptions/get-authorized-payment/get)
- [Search authorized payments](https://www.mercadopago.cl/developers/es/reference/online-payments/subscriptions/authorized-payment-search/get)
- [Get payment](https://www.mercadopago.cl/developers/es/reference/online-payments/subscriptions/get-payment/get)
- [List payment refunds](https://www.mercadopago.cl/developers/es/reference/online-payments/checkout-pro-preferences/get-refunds/get)
