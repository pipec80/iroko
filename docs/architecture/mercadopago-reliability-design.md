# Mercado Pago reliability — accepted design

Date: 2026-09-09. Status: **Accepted — implementation pending**.

This is a bounded supplement to
[Billing Platform v2](billing-platform-v2-design.md), not a replacement billing
architecture. Work belongs to [Plan 011](../exec-plans/active/011-billing-correctness.md).
The [delivery sequence](../exec-plans/active/011-mercadopago-reliability-roadmap.md)
owns the review gates and subsequent task-plan boundaries.

## Evidence boundary

Static inspection used the refreshed `origin/main` at `954e5d5`, whose
billing implementation matches the inspected post-PR-161 code. The open
checkout is `docs/close-phase1-mercadopago-reference` at `59c1033`, an older
baseline. This package is integrated onto that refreshed main; implementation
must continue from the resulting sequential reliability branches, not from the
older checkout.

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

Scheduling belongs to Phase 6. Its current default is the project's
`pg_cron`/Edge Function pattern, but the task plan must explicitly settle the
Node/Deno execution boundary and authentication before scheduling is enabled.
No new Vercel Cron dependency or copied reducer is authorized by this design.
The first recovery service must be callable without a scheduler for bounded
tests; a production schedule requires a reviewed operational contract.

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
- [Get payment](https://www.mercadopago.cl/developers/es/reference/online-payments/subscriptions/get-payment/get)
