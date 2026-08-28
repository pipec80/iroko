# Phase 2 (PR-4) — Mercado Pago reference certification: task-by-task implementation plan

Detailed breakdown of **Phase 2** from
[`011-billing-correctness.md`](011-billing-correctness.md). Corresponds to
PR-4 and depends on merged Fase 1 (`BillingService` + capabilities + UI
guard), not on Stripe. It is the first provider certification and the **P0
gate before enabling Mercado Pago in production**.

## Goal

Make Mercado Pago the LATAM reference implementation of Billing Core v2 using
the hosted pending-preapproval flow without an associated plan. The provider
supports **immediate cancellation only** in this phase: a local subscription
must never become `canceled` until the Mercado Pago `PUT /preapproval/{id}`
response confirms cancellation.

This plan records implementation progress in the current branch and the
verified linked-Cloud schema deployment. It is not sandbox, provider-enablement,
or production-certification evidence.

## Authoritative policy and constraints

- `period_end` cancellation is unsupported for Mercado Pago in this MVP;
  `cancelAtPeriodEnd` remains `false`.
- There is no Mercado Pago cancellation Edge Function or deferred-cancellation
  scheduler in scope. The former DB-only cron and private function were
  retired because they could change local state without calling Mercado Pago.
- An immediate cancellation calls Mercado Pago first. The returned resource
  must report `status: 'cancelled'` before Billing Core changes local state.
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
- All DB mutations remain service-role-only through the bounded provisional
  subscription RPC. Manual migrations and `supabase/schemas/*.sql` mirrors
  remain paired when schema work is required.

**Spec:** [`docs/architecture/billing-platform-v2-design.md`](../../architecture/billing-platform-v2-design.md),
section 7.4. Re-open the Chile-specific Mercado Pago documentation immediately
before provider-facing work:

- Subscriptions overview/retries: https://www.mercadopago.cl/developers/en/reference/online-payments/subscriptions/overview
- Pending payment without associated plan: https://www.mercadopago.cl/developers/en/docs/subscriptions/integration-configuration/subscription-no-associated-plan/pending-payments
- Subscription management: https://www.mercadopago.cl/developers/en/docs/subscriptions/subscription-management

## Current branch progress

The following work is implemented on this branch. Completion here means the
bounded code/migration task is present; it does **not** certify an external
provider or runtime.

- [x] **Task 1 — Checkout and webhook normalization.** Checkout uses the
  active `mercadopago` catalog price and inline pending preapproval flow;
  it returns the preapproval ID and omits `preapproval_plan_id`. Price amounts
  convert to provider minor units correctly for zero-decimal CLP and
  two-decimal USD. Preapproval and authorized-payment webhook normalization
  retain the local-plan path and distinguish invoice from nested payment data.
- [x] **Task 2 — Retire deferred cancellation.** `period_end` is rejected as
  unsupported, the DB-only cancellation cron/private function is retired, and
  no cancellation Edge Function was added. Immediate cancellation validates
  the provider response before the local cancellation path proceeds.
- [x] **Task 3 — Persist the provisional subscription safely.**
  `BillingService` persists the selected local plan as `incomplete` after a
  preapproval is created and before redirect. If that persistence fails, it
  immediately compensates by canceling the remote preapproval, logs safe
  incident metadata, and preserves the original error.
- [x] **Chilean catalog and checkout surface.** A versioned
  Mercado Pago `CLP` provider-price catalog maps Free / Plus / Pro to `0` /
  `19.990` / `102.990` monthly. The checkout surface displays zero-decimal CLP
  correctly and does not offer a yearly Mercado Pago flow.

## Remaining certification tasks

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
  application environment remain **[NO VERIFICADO]**.
- [ ] Exercise the full lifecycle: pending preapproval creation; provisional
  `incomplete` local row with the selected plan; preapproval authorization
  webhook; authorized-payment invoice/payment event; and immediate
  cancellation.
- [ ] Record provider event IDs and evidence that Mercado Pago itself reports
  `cancelled` before local cancellation. Webhook delivery, a sandbox payment,
  a linked-Cloud checkout run, and real-payment evidence remain
  **[NO VERIFICADO]** until captured in approved PR evidence.

## Completion criteria for Phase 2

- Immediate cancellation receives and validates a confirmed Mercado Pago
  cancellation response before local state changes; no deferred or DB-only
  cancellation path exists.
- Checkout uses the active Mercado Pago CLP catalog price, correct minor-unit
  conversion, no associated-plan ID, and the returned preapproval ID.
- The provisional local subscription is `incomplete`, retains the selected
  Iroko plan, and is compensated safely if persistence fails.
- Webhook processing preserves the selected-plan path and keeps authorized
  payment invoice identity separate from nested payment identity/status.
- Focused tests, pgTAP, formatting, typecheck, and lint have recorded passing
  evidence; local Docker/type generation evidence is not substituted by
  static review.
- A documented sandbox lifecycle proves the provider-side cancellation and is
  reviewed before any Mercado Pago enablement. Production enablement remains a
  separate explicit approval.
