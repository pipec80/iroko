# Mercado Pago refund ingress Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:subagent-driven-development` (recommended) or
> `superpowers:executing-plans` to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route a Mercado Pago payment notification or reconciliation discovery
that carries fresh full- or partial-refund evidence through the durable
financial-anomaly path, never as a new `invoice_paid` reduction.

**Architecture:** The Mercado Pago adapter already obtains a fresh
`/v1/payments/{id}` resource for a `payment` webhook and knows how to classify
its normalized refund evidence in recovery. Extract that classifier into a
shared observation factory, return a typed non-reducer result with the exact
checkout/subscription correlation, and persist it through the existing
idempotent anomaly RPC after resolving the local subscription. Invoice
discovery performs the same fresh-payment check in bounded groups and returns
anomalies separately from reducer events; reconciliation persists each one
using its already claimed account/subscription context.

**Tech Stack:** strict TypeScript, Mercado Pago REST adapter, Next.js webhook
handler, PostgreSQL/Supabase migrations and pgTAP, Vitest.

**Spec:**
[`docs/exec-plans/active/011c-mercadopago-financial-anomalies.md`](011c-mercadopago-financial-anomalies.md),
[`docs/architecture/mercadopago-reliability-design.md`](../../architecture/mercadopago-reliability-design.md#delivery-f--financial-anomaly-detail),
and [MP-10 in the v1 Chile matrix](011-mercadopago-v1-chile-acceptance.md#matrix-de-cierre).

## Global Constraints

- Scope is own-use Chile, monthly CLP, hosted checkout and pending preapproval
  without an associated plan.
- Use fresh provider payment evidence. An authorized-payment row by itself
  never proves a refund and must not be guessed as `partial_refund`.
- A partial refund is only `0 < transaction_amount_refunded <
transaction_amount` after both values normalize as non-negative integer minor
  units in a valid uppercase three-letter currency. A full refund is
  `transaction_amount_refunded >= transaction_amount > 0`; a provider status
  of `refunded`, `charged_back`, or `in_mediation` remains adverse evidence even
  if amounts are invalid or absent.
- An over-refund (`transaction_amount_refunded > transaction_amount`) is still
  classified as `refund`, but its incompatible amount pair is unavailable:
  never clamp it, never persist either amount, and never silently turn it into
  a partial refund. The adverse provider status or normalized `refund` type is
  the only retained evidence in that case.
- Preserve provider identity: the returned payment ID must equal the signed
  notification `data.id`; the authorized-payment row must carry that same
  nested payment ID and its exact preapproval ID.
- For a linked `payment` webhook, establish both of those identities first,
  then inspect the fresh payment for a financial anomaly, and only then take
  the existing ordinary divergence/normalization path. A fresh `refunded`,
  `charged_back`, or `in_mediation` payment must therefore win over an
  otherwise `approved` authorized-payment row. An ordinary state divergence
  without fresh financial evidence retains its existing non-financial path.
- Anomaly routing never calls `reduceBillingEvent`, never changes subscription
  status/current period/entitlements, never creates an invoice or payment
  attempt, and never initiates a refund, chargeback, mediation, or provider
  mutation.
- The existing open-anomaly key `(provider, anomaly_type,
external_resource_id)` remains the deduplication key. Replays increment its
  occurrence count and preserve `first_seen_at`; they do not create a second
  access effect.
- Resolve a webhook correlation only through a service-only RPC. A missing,
  foreign, or mismatched account/subscription context is retriable and must
  persist neither an anomaly nor a reducer event.
- Invoice discovery fetches no more than five payment resources concurrently;
  its existing 45-second worker deadline and durable cursor/watermark rules
  remain authoritative.
- Store only normalized type, external IDs, status, integer amounts and
  currency. Do not persist or log raw provider payloads, payer data,
  credentials, signatures, card data, or refund API responses.
- This plan is local-only. No provider API writes, refund, Cloud mutation,
  deployment, worker activation, credential inspection, push, or acceptance
  scenario belongs to it. Each remains **[NO VERIFICADO]** until Plans 011e and
  011f execute under their separate authorization.

---

## File map

| File                                                                       | Responsibility                                                                                             |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `src/lib/billing/types.ts`                                                 | Typed non-reducer webhook result and optional discovery anomaly collection.                                |
| `src/lib/billing/providers/mercadopago.ts`                                 | Fresh-payment classification shared by recovery, webhook ingress, and invoice discovery.                   |
| `src/lib/billing/providers/__tests__/mercadopago.test.ts`                  | Adapter-level identity, amount/currency, full/partial, ordinary-paid, and bounded-discovery tests.         |
| `supabase/migrations/20260911140000_billing_financial_anomaly_ingress.sql` | Extends the service-only checkout-reference result with the exact local subscription ID.                   |
| `supabase/schemas/public.sql`                                              | Human-readable mirror of the changed reference resolver and grants.                                        |
| `supabase/tests/database/36_billing_checkout_intents.test.sql`             | pgTAP proof that resolver output binds account, intent and subscription without relaxing grants.           |
| `supabase/tests/database/41_billing_financial_anomaly_detail.test.sql`     | pgTAP proof that the anomaly key distinguishes provider/type/payment and counts same-key replays.          |
| `src/types/database.ts`                                                    | Generated TypeScript definition for the expanded resolver result.                                          |
| `src/lib/billing/webhook-handler.ts`                                       | Resolves and persists a typed financial anomaly without entering the reducer.                              |
| `src/lib/billing/__tests__/webhook-handler.test.ts`                        | Handler-level persistence, replay, no-reducer, no-raw-log, and failed-correlation tests.                   |
| `src/lib/billing/reconciliation.ts`                                        | Persists discovery anomalies with a claimed account/subscription before reducing unrelated invoice events. |
| `src/lib/billing/__tests__/reconciliation.test.ts`                         | Worker-level anomaly/no-access, failure-isolation and deadline/cursor regression tests.                    |
| `docs/exec-plans/active/011c-mercadopago-financial-anomalies.md`           | Records the completed ingress evidence without rewriting its historical execution record.                  |
| `docs/exec-plans/active/011-mercadopago-v1-chile-acceptance.md`            | Replaces MP-10's local ingress gap with exact local evidence while retaining provider/manual gates.        |
| `docs/exec-plans/active/011-mercadopago-reliability-roadmap.md`            | Keeps the reliability dependency ordering aligned with the completed local ingress path.                   |
| `docs/current-state.md`                                                    | States the local code status and preserves operational/acceptance evidence as **[NO VERIFICADO]**.         |

---

### Task 1: Return a typed fresh-payment anomaly before invoice normalization

**Files:**

- Modify: `src/lib/billing/types.ts`
- Modify: `src/lib/billing/providers/mercadopago.ts`
- Test: `src/lib/billing/providers/__tests__/mercadopago.test.ts`

**Interfaces:**

- Produces the following provider result in addition to the existing
  `NormalizedBillingEvent` and `AcknowledgedWebhook` results:

```ts
export interface FinancialAnomalyWebhook {
  provider: 'mercadopago';
  type: 'financial_anomaly_observed';
  externalEventId: string;
  accountReference: string;
  externalSubscriptionId: string;
  observation: FinancialAnomalyObservation;
  raw: unknown;
}

export type ProviderWebhookResult =
  NormalizedBillingEvent | AcknowledgedWebhook | FinancialAnomalyWebhook;

export interface InvoiceDiscoveryPage {
  events: NormalizedBillingEvent[];
  financialAnomalies?: FinancialAnomalyObservation[];
  nextCursor: string | null;
  providerWatermark: string | null;
}
```

- The private adapter helper has this semantic contract:

```ts
financialAnomalyObservationForPayment(
  payment: PaymentResource,
  externalResourceId: string,
): FinancialAnomalyObservation | null;
```

It returns the existing normalized `refund`, `partial_refund`, `chargeback`,
`mediation`, or `status_divergence` observation; it returns `null` for an
ordinary approved payment with zero/no refund evidence. `recoverResource`
continues to wrap this helper as `{ kind: 'anomaly', observation }`.

- [ ] **Step 1: Write failing adapter tests for ordinary approved payment-webhook ingress**

In the Mercado Pago provider test file, add signed `type: 'payment'` fixtures
whose first fetch is `/v1/payments/{paymentId}` and whose second fetch is
`/authorized_payments/search?payment_id={paymentId}`. The linked authorized
payment must have the same `payment.id`, an `external_reference`, and a
`preapproval_id`.

Assert a partial refund returns this exact typed result rather than
`invoice_paid`:

```ts
expect(result).toEqual({
  provider: 'mercadopago',
  type: 'financial_anomaly_observed',
  externalEventId: 'mercadopago:webhook:notification-partial',
  accountReference: '00000000-0000-0000-0000-00000000a111',
  externalSubscriptionId: 'preapproval-partial',
  observation: {
    anomalyType: 'partial_refund',
    externalResourceId: 'payment-partial',
    observedStatus: 'approved',
    originalAmount: 19_990,
    affectedAmount: 5_000,
    currency: 'CLP',
  },
  raw: expect.any(Object),
});
```

Add separate assertions for:

1. `transaction_amount_refunded === transaction_amount` producing `refund`;
2. `status: 'refunded'` with invalid monetary values producing `refund` with
   no invented amounts;
3. `transaction_amount_refunded > transaction_amount` producing `refund` with
   both persisted amount fields absent (no clamping or truncated amount);
4. three linked fixtures where the authorized-payment row is `approved` but
   the fresh payment is respectively `refunded`, `charged_back`, and
   `in_mediation`; each must return its financial anomaly result and never an
   `invoice_paid` event;
5. a normal ordinary state-divergence fixture with no fresh refund, chargeback,
   or mediation evidence; it must retain the existing non-financial divergence
   behavior rather than being turned into a financial anomaly;
6. zero refunded amount producing the existing `invoice_paid` event;
7. decimal CLP, negative amount, missing/malformed currency and mismatched
   payment IDs never producing `partial_refund`;
8. a linked ordinary `approved` payment with no anomaly retaining its existing
   event ID and paid fields; and
9. recovery still returning `{ kind: 'anomaly', observation }` from the same
   helper for the existing recovery fixtures.

- [ ] **Step 2: Run the adapter tests and observe RED**

Run:

```bash
pnpm test src/lib/billing/providers/__tests__/mercadopago.test.ts
```

Expected: the new partial/full ingress assertions fail because `verifyWebhook`
currently passes the linked authorized-payment row to
`normalizeAuthorizedPaymentEvent`, returning `invoice_paid` for an approved
payment regardless of `transaction_amount_refunded`.

- [ ] **Step 3: Add the shared observation factory and webhook branch**

In `mercadopago.ts`, refactor `recoveryAnomalyForPayment` so its monetary and
adverse-status logic is implemented once by
`financialAnomalyObservationForPayment`. Keep its strict parsing rules:

```ts
if (
  hasNormalizedAmounts &&
  originalAmount > 0 &&
  affectedAmount > 0 &&
  affectedAmount < originalAmount
) {
  return { anomalyType: 'partial_refund' /* exact payment ID and evidence */ };
}
if (hasNormalizedAmounts && originalAmount > 0 && affectedAmount >= originalAmount) {
  return { anomalyType: 'refund' /* exact payment ID and evidence */ };
}
```

When `affectedAmount > originalAmount`, return that same `refund` type without
`originalAmount` or `affectedAmount`. Do not cap the affected amount at the
original amount and do not pass an incompatible pair to the anomaly RPC.

After the `payment` webhook has verified that the fetched payment ID and linked
authorized-payment nested ID equal `data.id`, call that helper **before both**
the existing ordinary state-divergence handling and
`normalizeAuthorizedPaymentEvent`. If it returns an observation, return
`FinancialAnomalyWebhook` with the signed notification event ID,
authorized-payment `external_reference`, and exact `preapproval_id`. Do not
call the divergence handler or normalizer in this branch. The test order must
prove identity failures short-circuit before any classification, while fresh
`refunded`, `charged_back`, and `in_mediation` evidence wins even if the linked
authorized-payment row says `approved`. Retain the existing unlinked,
ordinary-state-divergence, invalid-resource, and ordinary-approved behavior.

Do not add a branch to `subscription_authorized_payment` that guesses a refund:
that resource does not contain the fresh payment refund field. Its existing
ordinary normalization remains unchanged until a matching `payment` webhook or
discovery fetch supplies evidence.

- [ ] **Step 4: Run adapter tests and observe GREEN**

Run:

```bash
pnpm test src/lib/billing/providers/__tests__/mercadopago.test.ts
pnpm typecheck
```

Expected: all provider tests and typecheck pass. The recovery cases still prove
full/partial classification, while the new webhook cases prove a fresh adverse
payment cannot be normalized as a paid invoice.

- [ ] **Step 5: Commit the typed ingress contract**

```bash
git add src/lib/billing/types.ts src/lib/billing/providers/mercadopago.ts src/lib/billing/providers/__tests__/mercadopago.test.ts
git commit -m "feat: route Mercado Pago refund webhooks"
```

### Task 2: Correlate and persist webhook anomalies without a reducer call

**Files:**

- Create: `supabase/migrations/20260911140000_billing_financial_anomaly_ingress.sql`
- Modify: `supabase/schemas/public.sql`
- Modify: `supabase/tests/database/36_billing_checkout_intents.test.sql`
- Modify: `supabase/tests/database/41_billing_financial_anomaly_detail.test.sql`
- Regenerate: `src/types/database.ts`
- Modify: `src/lib/billing/webhook-handler.ts`
- Test: `src/lib/billing/__tests__/webhook-handler.test.ts`

**Interfaces:**

- Extends, without adding a public/client grant, the existing resolver:

```sql
public.resolve_billing_checkout_reference(
  p_external_reference uuid,
  p_external_subscription_id text
) RETURNS TABLE(
  account_id uuid,
  checkout_intent_id uuid,
  subscription_id uuid
)
```

The resolver returns `subscription_id` only for the exact Mercado Pago
provider/account/external-subscription match that it has either already found
or safely attached. It returns no row for a foreign/missing match; it never
creates an entitlement or applies an invoice.

- Consumes `FinancialAnomalyWebhook` from Task 1 and produces exactly one call:

```ts
admin.rpc('upsert_billing_financial_anomaly', {
  p_provider: event.provider,
  p_anomaly_type: event.observation.anomalyType,
  p_external_resource_id: event.observation.externalResourceId,
  p_observed_status: event.observation.observedStatus,
  p_account_id: resolved.account_id,
  p_subscription_id: resolved.subscription_id,
  p_original_amount: event.observation.originalAmount,
  p_affected_amount: event.observation.affectedAmount,
  p_currency: event.observation.currency,
});
```

- [ ] **Step 1: Write failing pgTAP and handler tests**

In test 36, extend the existing intent and legacy-reference assertions to
select `subscription_id` too. Assert all of the following:

1. an intent reference returns the same account, checkout intent and the exact
   locally attached Mercado Pago subscription ID;
2. a legacy account reference returns the exact already-linked subscription;
3. an intent reference whose exact Mercado Pago preapproval was attached after
   checkout creation returns that newly attached local subscription ID;
4. a reference in account A paired with a preapproval belonging to account B
   returns no row and does not attach or return B's subscription;
5. a foreign preapproval returns no row; and
6. there is exactly one resolver with `(uuid, text)` inputs, its result is the
   expanded three-column table (not the prior two-column contract), and
   `PUBLIC`, `anon`, and `authenticated` cannot execute it while only
   `service_role` retains execute permission.

In test 41, prove durable replay semantics at database level rather than only
mock call counts: a Mercado Pago `partial_refund` and `refund` for the same
payment resource create distinct open anomalies; identical provider/type/payment
upserts leave one row and increase its occurrence count while preserving
`first_seen_at`; and an otherwise identical key under a second supported
provider is separate. Assert the persisted over-refund case has `refund` type
and null original/affected amounts, never a truncated value.

In the webhook-handler test file, add a verified
`financial_anomaly_observed` fixture and assert:

```ts
expect(mocks.adminRpc).toHaveBeenCalledWith('upsert_billing_financial_anomaly', {
  p_provider: 'mercadopago',
  p_anomaly_type: 'partial_refund',
  p_external_resource_id: 'payment-partial',
  p_observed_status: 'approved',
  p_account_id: '00000000-0000-0000-0000-00000000a001',
  p_subscription_id: '00000000-0000-0000-0000-00000000a002',
  p_original_amount: 19_990,
  p_affected_amount: 5_000,
  p_currency: 'CLP',
});
expect(mocks.reduceBillingEvent).not.toHaveBeenCalled();
```

Call the handler twice with the same event and assert the same anomaly identity
arguments are used twice, no recovery job is enqueued, no raw fixture text is
present in logs/RPC arguments, and no reducer is called. Pair this with the
test-41 database assertions above: mocked duplicate calls are not evidence of
deduplication. Make resolver empty or error in separate cases and assert HTTP
500, no anomaly RPC and no reducer.

- [ ] **Step 2: Run focused tests and observe RED**

Run:

```bash
supabase test db --local supabase/tests/database/36_billing_checkout_intents.test.sql
pnpm test src/lib/billing/__tests__/webhook-handler.test.ts
```

Expected: pgTAP fails because the resolver has no `subscription_id` result;
the handler test fails because `financial_anomaly_observed` is neither
correlated nor persisted and currently reaches no dedicated branch.

- [ ] **Step 3: Add the service-only correlation result and handler path**

Create the versioned migration and update the public-schema mirror. The
migration must first execute
`DROP FUNCTION IF EXISTS public.resolve_billing_checkout_reference(uuid, text)`
before recreating it with the expanded return table; PostgreSQL cannot safely
replace this return shape in place. Restore the function comment, revoke
default/PUBLIC execution and explicit `anon`/`authenticated` execution, then
grant execute only to `service_role`. Replace the resolver's return definition
with the three columns above. After it finds
or attaches an intent reference, select the `billing.subscriptions.id` joined
to the resolved account for the exact `provider = 'mercadopago'` and trimmed
external subscription ID. Apply the same exact lookup on the legacy path.
Return no row when the subscription context is absent. Keep `SECURITY DEFINER
SET search_path = ''`, revoke default execution, and grant only
`service_role`; do not create an application-facing lookup RPC.

In `webhook-handler.ts`, handle `financial_anomaly_observed` before the normal
event reducer. Resolve its `accountReference` and `externalSubscriptionId`
through the expanded resolver, require non-null account and subscription IDs,
then upsert its normalized observation. A resolver or anomaly-persistence
failure returns a retriable 500 and emits no local state transition. On success
return a 200 acknowledged result and log only provider, webhook ID, type and
bounded anomaly type; omit raw data and amounts from logs. Do not enqueue a
recovery job for a verified financial anomaly.

- [ ] **Step 4: Regenerate types and run the Task 2 GREEN gate**

Run:

```bash
pnpm supa:reset
pnpm supa:gen:types
supabase test db --local supabase/tests/database/36_billing_checkout_intents.test.sql
supabase test db --local supabase/tests/database/41_billing_financial_anomaly_detail.test.sql
pnpm test src/lib/billing/__tests__/webhook-handler.test.ts
pnpm typecheck
```

Expected: both pgTAP files pass, the generated resolver type includes
`subscription_id`, and the handler proves an idempotent anomaly route with no
invoice/payment/subscription reducer call.

- [ ] **Step 5: Commit the correlated webhook route**

```bash
git add supabase/migrations/20260911140000_billing_financial_anomaly_ingress.sql supabase/schemas/public.sql supabase/tests/database/36_billing_checkout_intents.test.sql supabase/tests/database/41_billing_financial_anomaly_detail.test.sql src/types/database.ts src/lib/billing/webhook-handler.ts src/lib/billing/__tests__/webhook-handler.test.ts
git commit -m "feat: persist Mercado Pago refund webhook anomalies"
```

### Task 3: Make invoice discovery take the same anomaly path

**Files:**

- Modify: `src/lib/billing/providers/mercadopago.ts`
- Modify: `src/lib/billing/providers/__tests__/mercadopago.test.ts`
- Modify: `src/lib/billing/reconciliation.ts`
- Test: `src/lib/billing/__tests__/reconciliation.test.ts`

**Interfaces:**

- Consumes `InvoiceDiscoveryPage.financialAnomalies` from Task 1. Every item
  uses the authorized-payment nested ID as `externalResourceId` only after the
  fetched `/v1/payments/{id}` body verifies that same ID.
- Produces one `upsert_billing_financial_anomaly` invocation per returned
  observation, with `candidate.account_id` and `candidate.subscription_id`.
  This is separate from all calls to `reduceBillingEvent`.

- [ ] **Step 1: Write failing adapter and reconciliation tests**

Add a one-item discovery fixture whose `/authorized_payments/search` response
contains an approved authorized payment and whose fresh `/v1/payments/{id}`
response contains a CLP partial refund. Assert:

```ts
expect(page).toMatchObject({
  events: [],
  financialAnomalies: [
    {
      anomalyType: 'partial_refund',
      externalResourceId: 'payment-discovery-partial',
      originalAmount: 19_990,
      affectedAmount: 5_000,
      currency: 'CLP',
    },
  ],
});
```

Add full-refund and ordinary-zero-refund variants. The ordinary variant must
remain one `invoice_paid` event with an empty anomaly list. Add a deferred
fetch fixture for six payment resources and assert no more than five payment
fetches are active before one settles.

Add three identity/atomicity fixtures for a page with more than one eligible
candidate: (1) a fetched payment body that is invalid, (2) a valid fetched body
whose ID differs from the candidate payment ID, and (3) a payment-fetch failure
after another candidate could otherwise yield an event or anomaly. In all three
cases assert that discovery returns no partial `events` or
`financialAnomalies`, does not expose a reduced candidate, and preserves the
input cursor and watermark for a safe retry. The reconciliation test must map
each page failure to its existing safe failed/deferred completion outcome, make
zero anomaly-upsert and reducer calls for that page, and retain the claimed
cursor/watermark rather than advancing across an unverified page.

In the reconciliation test file, return a page with one partial-refund
observation and one unrelated ordinary invoice event. Assert the anomaly RPC
uses the candidate account/subscription and normalized values, `summary.anomalous`
increments once, and only the unrelated invoice reaches `reduceBillingEvent`.
Add cases where the anomaly RPC fails (candidate completes `failed`, does not
reduce page events), where the same discovery replay repeats the same upsert
identity without an access reducer call for the refunded payment, and where a
deadline after anomaly persistence saves the existing cursor/watermark as
deferred.

- [ ] **Step 2: Run focused tests and observe RED**

Run:

```bash
pnpm test src/lib/billing/providers/__tests__/mercadopago.test.ts
pnpm test src/lib/billing/__tests__/reconciliation.test.ts
```

Expected: discovery currently emits an `invoice_paid` event from the authorized
payment without fetching its payment refund state, and reconciliation has no
anomaly collection to persist. The new invalid-body, mismatched-ID, and
multi-candidate fetch-failure cases must also fail until discovery is made
atomic for a page.

- [ ] **Step 3: Fetch payment evidence in bounded discovery groups**

For each valid, in-window authorized-payment candidate, fetch
`/v1/payments/{encodeURIComponent(paymentId)}` in groups of at most five.
Treat the complete page as unverified if any fetched body is invalid, any body
ID differs from its candidate payment ID, or any group fetch fails. Discard all
staged events and anomalies for that page; return a typed provider
identity/fetch failure which retains the input cursor and watermark. Never emit
the successes collected before that failure as a partial page. Apply the shared
observation factory only after every required identity check succeeds, before
invoice normalization:

```ts
const observation = financialAnomalyObservationForPayment(providerPayment, paymentId);
if (observation) {
  financialAnomalies.push(observation);
  continue;
}
events.push(normalizeAuthorizedPaymentEvent(/* existing exact values */));
```

Preserve the existing exact-preapproval validation, stale-modification filter,
cursor, and watermark calculation. A successful page can calculate and return
its next cursor/watermark only after its full group set is verified. Do not
include an acknowledged result in `events`; discovery only returns reducer
events and normalized anomalies.

In `reconciliation.ts`, persist `page.financialAnomalies ?? []` before reducing
`page.events`. On any anomaly persistence error, classify the candidate as
`anomaly_persistence_failed`, retain the durable cursor/watermark according to
the existing completion protocol, and do not reduce events from that page.
Increment `summary.anomalous` only after each successful upsert. Existing page
mocks may omit the optional collection and therefore continue to behave as an
empty anomaly list. A typed discovery identity/fetch failure must likewise use
the existing safe failed/deferred completion protocol, preserve its scan state,
and make zero anomaly-upsert or reducer calls.

- [ ] **Step 4: Run Task 3 GREEN verification**

Run:

```bash
pnpm test src/lib/billing/providers/__tests__/mercadopago.test.ts
pnpm test src/lib/billing/__tests__/reconciliation.test.ts
pnpm test src/lib/billing/__tests__/recovery.test.ts
pnpm typecheck
```

Expected: the adapter and worker distinguish partial/full/ordinary payment
states, recovery retains its prior behavior, discovery never reduces a
freshly-refunded payment, and all worker progress rules still pass.

- [ ] **Step 5: Commit discovery anomaly routing**

```bash
git add src/lib/billing/providers/mercadopago.ts src/lib/billing/providers/__tests__/mercadopago.test.ts src/lib/billing/reconciliation.ts src/lib/billing/__tests__/reconciliation.test.ts
git commit -m "feat: reconcile Mercado Pago refund anomalies"
```

### Task 4: Run the local gate and record the remaining evidence boundary

**Files:**

- Modify: `docs/exec-plans/active/011c-mercadopago-financial-anomalies.md`
- Modify: `docs/exec-plans/active/011-mercadopago-v1-chile-acceptance.md`
- Modify: `docs/exec-plans/active/011-mercadopago-reliability-roadmap.md`
- Modify: `docs/current-state.md`

**Interfaces:**

- Consumes the completed local evidence from Tasks 1–3.
- Produces a precise code/test status for MP-09/MP-10. It does not produce a
  provider verification, worker rollout, manual anomaly resolution, or v1
  acceptance decision.

- [x] **Step 1: Run the complete local regression gate**

Run:

```bash
pnpm supa:reset
pnpm supa:gen:types
pnpm supa:gen:types:check
supabase test db --local supabase/tests/database/36_billing_checkout_intents.test.sql
supabase test db --local supabase/tests/database/37_billing_recovery.test.sql
supabase test db --local supabase/tests/database/41_billing_financial_anomaly_detail.test.sql
pnpm test src/lib/billing/providers/__tests__/mercadopago.test.ts
pnpm test src/lib/billing/__tests__/webhook-handler.test.ts
pnpm test src/lib/billing/__tests__/recovery.test.ts
pnpm test src/lib/billing/__tests__/reconciliation.test.ts
pnpm test src/lib/billing
pnpm typecheck
pnpm lint
pnpm supa:lint
```

Expected: every command exits 0. Record actual command results and test counts
only after observing them; a passing local gate does not establish provider or
Cloud behavior.

- [x] **Step 2: Update the four status documents without overstating evidence**

In the 011c execution record, replace the pending ordinary-webhook/discovery
code-integration statement with the exact commits and observed local commands.
In MP-10, state that a linked `payment` webhook and reconciliation discovery
both fetch fresh payment evidence, persist a deduplicated partial/full anomaly,
and bypass the reducer. Keep real partial/full refunds, alert handling, manual
resolver execution, provider configuration, deployed workers and every Cloud
result **[NO VERIFICADO]**.

Update the reliability roadmap and current state to place this completed local
code gap before the still-pending 011e worker rollout and 011f internal
acceptance. Do not mark Plan 011e closed, do not call this Mercado Pago official
certification, and do not declare v1 ready for real users.

- [x] **Step 3: Validate the Markdown and diff**

Run:

```bash
pnpm docs:check
pnpm test:docs-check
pnpm exec prettier --ignore-path NUL --check docs/exec-plans/active/011g-mercadopago-refund-ingress.md docs/exec-plans/active/011c-mercadopago-financial-anomalies.md docs/exec-plans/active/011-mercadopago-v1-chile-acceptance.md docs/exec-plans/active/011-mercadopago-reliability-roadmap.md docs/current-state.md
git diff --check
```

Expected: every command exits 0.

- [x] **Step 4: Commit verified local evidence**

```bash
git add docs/exec-plans/active/011g-mercadopago-refund-ingress.md docs/exec-plans/active/011c-mercadopago-financial-anomalies.md docs/exec-plans/active/011-mercadopago-v1-chile-acceptance.md docs/exec-plans/active/011-mercadopago-reliability-roadmap.md docs/current-state.md
git commit -m "docs: record Mercado Pago refund ingress coverage"
```

## Acceptance criteria

- A signed linked Mercado Pago `payment` webhook with verified partial or full
  refund evidence returns the typed anomaly path, persists the exact
  provider/account/subscription correlation, and makes zero reducer calls.
- Fresh payment identity is verified before classification; after that,
  `refunded`, `charged_back`, and `in_mediation` observations take precedence
  over an otherwise `approved` authorized-payment row. Ordinary divergence with
  no financial evidence preserves its existing path.
- A zero/missing/invalid refund amount never fabricates a partial refund;
  ordinary approved payments retain the existing invoice reduction. An
  over-refund is a `refund` with unavailable amounts, never a clamped or
  incompatible persisted pair.
- The anomaly upsert contains only bounded normalized status/amount/currency
  evidence, deduplicates replays by its existing provider/type/payment
  open-anomaly key, and never logs or stores raw provider data. Database
  evidence proves same-key occurrence increments and that partial/full types
  for one payment remain distinct.
- A missing/foreign correlation, a resource-ID mismatch, or failed anomaly
  persistence is retriable and performs no access mutation.
- Discovery performs the same fresh-payment classification in groups no larger
  than five, emits refunds separately from invoice events, preserves cursors and
  watermarks, and cannot reduce a refunded payment. An invalid payment body,
  differing returned ID, or one failed fetch makes the full discovery page safe
  to retry: it emits no partial events/anomalies and does not advance state.
- All listed pgTAP, focused Vitest, local type/lint/database, documentation and
  diff checks pass with observed results.

## Non-goals

- Calling Mercado Pago refund APIs, opening a dispute, accepting a chargeback,
  mediating a payment, or resolving an anomaly automatically.
- Retroactively reversing a previously reduced paid invoice, changing access,
  subtracting paid-through time, or inventing lifecycle states from a refund.
- Changing checkout pricing, plans/slugs, trials, upgrades/downgrades, pause,
  card management, worker scheduling, Cloud configuration, deployment, or
  provider credentials.
- Claiming that local tests or a code review constitute Mercado Pago provider
  certification or completion of Plans 011e, 011f, or 012.
