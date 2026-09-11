# Phase 2 (PR-4) — Mercado Pago internal reference certification: task-by-task implementation plan

Detailed breakdown of **Phase 2** from
[`011-billing-correctness.md`](011-billing-correctness.md). Corresponds to
PR-4 and depends on merged Fase 1 (`BillingService` + capabilities + UI
guard), not on Stripe. It owns the first internal provider acceptance and
the **P0 gate before declaring Mercado Pago ready for real users**. The
production deployment used for sandbox QA is not proof of that readiness.

## Reliability follow-up (approved 2026-09-09)

The following deliveries are implemented on `main` at `66bc9b2` (static
inspection 2026-09-11). They replace the older pending coordination and
anomaly checklists; provider acceptance remains open in the
[v1 Chile matrix](011-mercadopago-v1-chile-acceptance.md). Delivery ownership
remains under the
[Mercado Pago reliability roadmap](011-mercadopago-reliability-roadmap.md):

1. **Dashboard and checkout confirmation:** suppress the Mercado Pago trial,
   distinguish catalogue/overview failures from an empty account, add an
   owner/admin account-scoped confirmation RPC, and poll the exact returned
   preapproval for at most 60 seconds. This PR also keys billing data by the
   active account and preserves accessible per-button loading state.
2. **Durable checkout coordination:** reserve one account/provider checkout
   intent before the remote POST, reuse known pending checkout URLs, and move
   unknown outcomes to operator review instead of blindly recreating them.
   Reducer transitions and legacy account-UUID external references remain
   compatible.

Neither follow-up changes prices, catalogue slugs, hosted checkout, the
no-associated-plan model, access policy, or Cloud state. Current evidence is `service.ts`, the checkout confirmation/intent RPCs,
their SQL tests 35/36, and provider/service/UI tests; see the matrix inventory.
Existence of tests is not a fresh passing test run.

## Goal

Make Mercado Pago the LATAM reference implementation of Billing Core v2 using
the hosted pending-preapproval flow without an associated plan. The provider
supports **immediate cancellation only** in this phase: a local subscription
must never become `canceled` until the Mercado Pago `PUT /preapproval/{id}`
response confirms cancellation.

This plan separates implementation, historical local validation, historical
provider observation and pending operations. Current Cloud and provider state
is **[NO VERIFICADO]**; no official Mercado Pago certification is claimed.

## Authoritative policy and constraints

- `period_end` cancellation is unsupported for Mercado Pago in this MVP;
  `cancelAtPeriodEnd` remains `false`.
- There is no Mercado Pago cancellation Edge Function or deferred-cancellation
  scheduler in scope. The former DB-only cron and private function were
  retired because they could change local state without calling Mercado Pago.
- An immediate cancellation calls Mercado Pago first. The returned resource
  must report `status: 'cancelled'` or `'canceled'` before cancellation is
  accepted; the webhook/reconciliation path converges local state.
- Checkout resolves the active `mercadopago` catalog price in `CLP`, sends an
  inline `auto_recurring` amount in provider minor units, and never sends
  `preapproval_plan_id`. CLP is zero-decimal; the conversion remains
  two-decimal for USD.
- The approved Chilean monthly catalog is Free `CLP 0`, Plus `CLP 19.990`, and
  Pro `CLP 102.990`. It preserves durable internal slugs `free` / `pro` /
  `scale`; only the public labels change, and Mercado Pago exposes no annual
  checkout without a separately approved annual CLP price.
- Mercado Pago has no reusable external price in this flow. The returned
  preapproval ID is the external subscription ID; the selected local plan is
  retained by the provisional subscription rather than inferred from an
  external price ID.
- `subscription_authorized_payment` produces invoice/payment events without
  conflating the authorized-payment invoice ID with the nested payment ID or
  payment status.
- Mercado Pago Webhooks must activate `subscription_preapproval`,
  `subscription_authorized_payment`, and `payment`. The receiver validates the
  signed `data.id` URL parameter (including the lower-case manifest rule and
  omission of the `id:` component when the query parameter is absent), uses the
  notification envelope `id` as the delivery idempotency key, and fetches the
  provider resource before a local mutation. A valid generic `payment`
  notification that has no linked authorized-payment invoice is acknowledged and enqueued for durable correlation recovery; it does not
  invent a subscription/invoice transition.
- Billing mutations use the bounded service-role RPCs for intents,
  subscription/invoice events and recovery; anomaly resolution is a privileged
  operator action without application grants. Manual migrations and `supabase/schemas/*.sql` mirrors
  remain paired when schema work is required.

**Spec:** [`docs/architecture/billing-platform-v2-design.md`](../../architecture/billing-platform-v2-design.md),
section 7.4. Re-open the Chile-specific Mercado Pago documentation immediately
before provider-facing work:

- Subscriptions overview/retries: https://www.mercadopago.cl/developers/en/reference/online-payments/subscriptions/overview
- Pending payment without associated plan: https://www.mercadopago.cl/developers/en/docs/subscriptions/integration-configuration/subscription-no-associated-plan/pending-payments
- Subscription management: https://www.mercadopago.cl/developers/en/docs/subscriptions/subscription-management
- Subscription Webhooks: https://www.mercadopago.cl/developers/en/docs/subscriptions/additional-content/your-integrations/notifications/webhooks
- Webhook signing and notification topics: https://www.mercadopago.cl/developers/en/docs/your-integrations/notifications/webhooks

## Implementation present — historical local validation retained

The following work is implemented on the inspected `main`. Completion here means the
bounded code/migration task is present; it does **not** certify an external
provider or runtime.

- [x] **Task 1 — Checkout and webhook normalization.** Checkout uses the
      active `mercadopago` catalog price and inline pending preapproval flow;
      it returns the preapproval ID and omits `preapproval_plan_id`. Price amounts
      convert to provider minor units correctly for zero-decimal CLP and
      two-decimal USD. Preapproval, authorized-payment, and payment webhook
      normalization retain the local-plan path and distinguish invoice from
      nested payment data.
- [x] **Task 2 — Retire deferred cancellation.** `period_end` is rejected as
      unsupported, the DB-only cancellation cron/private function is retired, and
      no cancellation Edge Function was added. Immediate cancellation validates
      the provider response before the local cancellation path proceeds.
- [x] **Task 3 — Persist the provisional subscription safely.**
      Current `BillingService` reserves an intent before POST and attaches the
      remote ID/provisional `incomplete` row atomically before redirect. On
      attach failure it retains `needs_review` for recovery. This replaces the
      historical compensation-by-cancellation implementation; no blind retry
      or automatic compensating cancellation is claimed for the current path.
- [x] **Chilean catalog and checkout surface.** A versioned
      Mercado Pago `CLP` provider-price catalog maps Free / Plus / Pro to `0` /
      `19.990` / `102.990` monthly. The checkout surface displays zero-decimal CLP
      correctly and does not offer a yearly Mercado Pago flow.
- [x] **Sandbox webhook hardening.** Provider resource reads use a bounded
      ten-second timeout so the receiver can fail within Mercado Pago's delivery
      window, non-monthly checkout is rejected before any provider call, and a
      linked payment/invoice status divergence emits a safe warning instead of
      being indistinguishable from an unrelated payment acknowledgement.
      Non-terminal nested payment states are acknowledged without being persisted
      as failed attempts. A signed but unsupported topic is acknowledged with a
      warning so Mercado Pago does not retry it indefinitely, while invalid
      signatures remain rejected. The adapter does not advertise outbound pause
      support until a real pause operation exists.
- [x] **Replay tolerance and outbound timeouts.** Signature verification rejects
      webhooks whose `ts` falls outside a five-minute window (accepting the
      seconds and milliseconds scales the official docs mix), and the outbound
      checkout/cancellation calls share the same bounded ten-second timeout as
      resource reads.

## Remaining internal certification tasks

### Task 4: Review the focused contract and regression evidence

- [x] Focused Mercado Pago provider/BillingService tests and the corresponding
      pgTAP database tests passed locally.
- [x] `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, and the relevant
      documentation checks passed after the catalog/UI change.
- [x] The migration/schema mirror and generated database types passed a local
      Supabase reset. On 2026-08-27, the ten pending billing/Mercado Pago
      migrations were applied to the linked Cloud project; read-only checks
      confirmed all versions, the three CLP catalog entries, and retirement of the
      deferred-cancellation cron/function.

### Task 5: Sandbox lifecycle — release gate

- [x] The approved `mercadopago`/`CLP` catalog is versioned and verified in
      local and linked Cloud Supabase. Sandbox runtime credentials in the
      application environment are not rechecked here: **[NO VERIFICADO]**.
      The informal 2026-09-10 run below is the later historical observation.
- [ ] Formally capture the lifecycle already observed informally on 2026-09-10,
      plus every required scenario in the v1 Chile matrix: pending preapproval creation; provisional
      `incomplete` local row with the selected plan; preapproval authorization
      webhook; authorized-payment invoice/payment event; and immediate
      cancellation.
- [ ] Record provider event IDs and evidence that Mercado Pago itself reports
      `cancelled`/`canceled` before local cancellation. Formal evidence of
      the linked-Cloud sandbox run remains pending; real-payment evidence
      and current runtime are **[NO VERIFICADO]**.

**Historical failed attempt — superseded by the informal 2026-09-10 run:**
The 2026-09-01 sandbox attempt proved that checkout persists the selected
local `incomplete` row, but it did not reach activation: the preapproval
request lacked its required subscription `notification_url`, and the
Preview token could not read the resource created for the test seller.
The adapter now requires and sends `MERCADOPAGO_WEBHOOK_URL`; repeat the
lifecycle with token, signature secret, seller, application and webhook
coherent for the selected test environment. Do not copy real-seller
production credentials to Preview as a generic fix. That attempt alone
was not successful certification evidence.

- [x] **Implemented after that attempt:** durable reservation and resume
      (`service.ts`, migration `20260909160000`, SQL 36) prevent competing
      callers from independently issuing POSTs. Operational acceptance is
      still MP-04 in the matrix.
- [x] **Implemented after that attempt:** persistent anomalies and manual
      resolution (`recovery.ts`, migration `20260909180000`, SQL 37) replace
      warning-only handling. Provider scenarios and partial refunds remain
      open as MP-09/10; no automatic access change is introduced.
- [x] **2026-09-10 sandbox lifecycle (informal, not yet PR evidence):** run
      against production `project-a89lv.vercel.app` with the test-seller
      application in `MERCADOPAGO_*` (Production scope) reached activation and
      cancellation end to end — `billing.subscriptions` `active` → `canceled`,
      `checkout_intents` `confirmed`, invoice `paid`, events `invoice_paid` +
      `subscription_updated` + `subscription_canceled`. Fixed in the same pass:
      Mercado Pago returns the cancelled preapproval as `cancelled` (double L)
      and the adapter only matched `canceled`, so cancellations landed on
      `incomplete` with no `subscription_canceled` event (PR #179). The 4
      Phase 2/6 billing migrations (`20260909*`) were also missing from linked
      Cloud and had to be pushed manually — CI/CD does not apply migrations.
      This still needs to be re-run and captured as approved PR evidence with
      a linked-Cloud checkout, but it is no longer an unverified attempt.

## V1 gaps and explicit exclusions (reviewed 2026-09-11)

The [v1 Chile matrix](011-mercadopago-v1-chile-acceptance.md) is the current
acceptance checklist. These are the bounded remaining concerns:

Executable handoffs for this phase are
[`011a`](011a-mercadopago-payment-health-paid-through.md),
[`011b`](011b-mercadopago-checkout-resolution.md),
[`011c`](011c-mercadopago-financial-anomalies.md) and the Phase 2 scenarios in
[`011f`](011f-mercadopago-internal-acceptance.md). They implement the accepted
[reliability design](../../architecture/mercadopago-reliability-design.md#v1-chile-closeout-extension--accepted-2026-09-11).

- **Phase 2, MP-06:** expose payment failure and recovery separately from
  subscription status. Rejected payments already reach invoices/attempts;
  Iroko does not first learn of them only at cancellation. `applyEvent`
  intentionally leaves subscription status unchanged for invoice events.
  Define a truthful payment-health signal and a viable hosted-flow next action,
  without inventing `past_due`, grace-period access cuts or card-management UI.
- **Phases 2/6, MP-08:** operational treatment for abandoned `incomplete` rows
  and unknown outcomes; a lease or age threshold cannot authorize recreation.
- **Phases 2/6, MP-03/07/09/10:** specific evidence for renewal, paid-through
  access at cancellation, refunds/chargebacks/mediation and partial refunds.
- **Phase 6, MP-11–14:** known-payment recovery, discovery of wholly omitted
  invoices, worker failure isolation, progress across batches and authorized
  activation. Scheduling alone cannot close these code/acceptance gaps.
- **Phase 2, MP-15:** coherent application/seller/credentials by environment
  and formal sanitized evidence for the full circuit.

**Outside v1:** trial, upgrade/downgrade, Iroko-initiated pause/reactivation,
card management/customer portal inside Iroko, annual CLP checkout. Existing
inbound `paused` normalization remains valid; disabled outbound capabilities
are deliberate exclusions, not release blockers. Prices and durable slugs
remain unchanged. No provider-hosted card update link is assumed to work
without explicit verification.

## Completion criteria for Phase 2

- Immediate cancellation receives and validates a confirmed Mercado Pago
  cancellation response before local state changes; no deferred or DB-only
  cancellation path exists.
- Checkout uses the active Mercado Pago CLP catalog price, correct minor-unit
  conversion, no associated-plan ID, and the returned preapproval ID.
- The provisional local subscription is `incomplete`, retains the selected
  Iroko plan, and remains recoverable without a new POST if attach fails.
- Webhook processing preserves the selected-plan path and keeps authorized
  payment invoice identity separate from nested payment identity/status.
- Focused tests, pgTAP, formatting, typecheck, and lint have recorded passing
  evidence; local Docker/type generation evidence is not substituted by
  static review.
- Every Phase 2 row of the v1 Chile matrix has reviewed evidence, including
  renewal, rejection/recovery and paid-through access. Mercado Pago acceptance
  also requires its Phase 6 rows; basic sandbox success is insufficient.
  Provider/Cloud changes and enablement require explicit authorization.
