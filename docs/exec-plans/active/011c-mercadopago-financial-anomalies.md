# Mercado Pago financial anomaly detail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:subagent-driven-development` (recommended) or
> `superpowers:executing-plans` to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Distinguish partial from full refunds and persist bounded financial
evidence for manual resolution without changing subscription access.

**Architecture:** Enrich the provider recovery result with normalized monetary
fields, extend the existing deduplicated anomaly table/RPC, and keep all
financial anomaly outcomes outside the subscription reducer.

**Tech Stack:** strict TypeScript, Mercado Pago REST adapter, Vitest,
PostgreSQL/Supabase migrations and pgTAP.

**Spec:**
[`docs/architecture/mercadopago-reliability-design.md`](../../architecture/mercadopago-reliability-design.md#delivery-f--financial-anomaly-detail)

## Global Constraints

- Fresh provider evidence is required; payment status alone cannot identify a
  partial refund.
- Monetary values are stored as non-negative integer minor units with an
  uppercase three-letter currency.
- Store no raw provider payload, payer information or credentials.
- Repeated observations update one open anomaly and preserve first-seen time.
- Refund, partial refund, chargeback and mediation never mutate subscription
  status, period or entitlements automatically.
- Iroko does not initiate refunds in v1.

---

### Task 1: Extend the normalized provider anomaly contract

**Files:**

- Modify: `src/lib/billing/types.ts`
- Modify: `src/lib/billing/providers/mercadopago.ts`
- Modify: `src/lib/billing/providers/__tests__/mercadopago.test.ts`
- Modify: `src/lib/billing/recovery.ts`
- Modify: `src/lib/billing/__tests__/recovery.test.ts`

**Interfaces:**

- Produces:

```ts
export type BillingAnomalyType =
  | 'refund'
  | 'partial_refund'
  | 'chargeback'
  | 'mediation'
  | 'status_divergence'
  | 'unresolved_payment';

export interface FinancialAnomalyObservation {
  anomalyType: BillingAnomalyType;
  externalResourceId: string;
  observedStatus?: string;
  originalAmount?: number;
  affectedAmount?: number;
  currency?: string;
}
```

`ProviderRecoveryResult` uses
`{ kind: 'anomaly'; observation: FinancialAnomalyObservation }`.

- [ ] **Step 1: Write failing adapter cases**

Add payment-resource fixtures with `transaction_amount`,
`transaction_amount_refunded` and `currency_id`. Assert:

```ts
expect(await provider.recoverResource(input)).toEqual({
  kind: 'anomaly',
  observation: {
    anomalyType: 'partial_refund',
    externalResourceId: 'pay-partial',
    observedStatus: 'approved',
    originalAmount: 19990,
    affectedAmount: 5000,
    currency: 'CLP',
  },
});
```

Cover `0 < refunded < original`, `refunded === original`, chargeback,
mediation, zero refunded, invalid decimals for CLP, negative values and missing
currency. For invalid monetary evidence, retain the adverse anomaly type when
the status proves it, but omit amounts; never guess `partial_refund`.

- [ ] **Step 2: Run provider/recovery tests and observe RED**

Run:

```bash
pnpm test src/lib/billing/providers/__tests__/mercadopago.test.ts
pnpm test src/lib/billing/__tests__/recovery.test.ts
```

Expected: FAIL because `partial_refund` and `observation` do not exist.

- [ ] **Step 3: Implement strict normalization**

Validate `transaction_amount`, `transaction_amount_refunded` and `currency_id`
from the fresh `/v1/payments/{id}` response. Classify:

```ts
if (refunded > 0 && refunded < original) return 'partial_refund';
if (refunded >= original && original > 0) return 'refund';
```

Then fall back to proven adverse statuses `refunded`, `charged_back` and
`in_mediation`. Populate `externalResourceId` from the exact requested/verified
payment ID. The official provider evidence to recheck is
[Obtener pago](https://www.mercadopago.cl/developers/en/reference/online-payments/checkout-api-payments/get-payment/get),
which includes `transaction_amount_refunded`, and
[Obtener lista de reembolsos](https://www.mercadopago.cl/developers/es/reference/online-payments/checkout-pro-preferences/get-refunds/get),
whose entries include refund amount.

- [ ] **Step 4: Adapt recovery without changing access**

In `recovery.ts`, pass the observation's normalized fields to the anomaly RPC.
Update tests to assert `reduceBillingEvent` is never called for any anomaly and
that a partial refund increments `anomalous` and `resolved` exactly once.

- [ ] **Step 5: Run focused tests and observe GREEN**

Run:

```bash
pnpm test src/lib/billing/providers/__tests__/mercadopago.test.ts
pnpm test src/lib/billing/__tests__/recovery.test.ts
pnpm typecheck
```

Expected: all commands pass.

- [ ] **Step 6: Commit the typed provider contract**

```bash
git add src/lib/billing/types.ts src/lib/billing/providers/mercadopago.ts src/lib/billing/providers/__tests__/mercadopago.test.ts src/lib/billing/__tests__/recovery.test.ts src/lib/billing/recovery.ts
git commit -m "feat: classify partial Mercado Pago refunds"
```

### Task 2: Persist normalized anomaly amounts idempotently

**Files:**

- Create: `supabase/migrations/20260911120000_billing_financial_anomaly_detail.sql`
- Modify: `supabase/schemas/billing.sql`
- Modify: `supabase/schemas/public.sql`
- Test: `supabase/tests/database/41_billing_financial_anomaly_detail.test.sql`
- Regenerate: `src/types/database.ts`
- Modify: `src/lib/billing/recovery.ts`
- Modify: `src/lib/billing/reconciliation.ts`
- Modify: `src/lib/billing/webhook-handler.ts`
- Test: `src/lib/billing/__tests__/recovery.test.ts`
- Test: `src/lib/billing/__tests__/reconciliation.test.ts`
- Test: `src/lib/billing/__tests__/webhook-handler.test.ts`

**Interfaces:**

- Replaces the RPC signature with:

```sql
public.upsert_billing_financial_anomaly(
  p_provider text,
  p_anomaly_type text,
  p_external_resource_id text,
  p_observed_status text,
  p_account_id uuid,
  p_subscription_id uuid,
  p_original_amount integer,
  p_affected_amount integer,
  p_currency text
) RETURNS uuid
```

- [ ] **Step 1: Write failing pgTAP coverage**

Test `partial_refund` is allowed, normalized amounts persist, repeat upserts
increase `occurrence_count` while retaining `first_seen_at`, and newer non-null
amounts replace older normalized amounts. Assert negative amounts, affected
amount greater than original, malformed currency and client-role execution all
fail. Assert the linked subscription remains unchanged.

- [ ] **Step 2: Run test 41 and observe RED**

Run:
`supabase test db --local supabase/tests/database/41_billing_financial_anomaly_detail.test.sql`

Expected: FAIL on the current anomaly check constraint and old RPC signature.

- [ ] **Step 3: Add columns, constraints and atomic upsert**

Add:

```sql
original_amount integer CHECK (original_amount IS NULL OR original_amount >= 0),
affected_amount integer CHECK (affected_amount IS NULL OR affected_amount >= 0),
currency text CHECK (currency IS NULL OR currency ~ '^[A-Z]{3}$'),
CONSTRAINT financial_anomaly_amount_bounds CHECK (
  original_amount IS NULL OR affected_amount IS NULL OR affected_amount <= original_amount
)
```

Replace the anomaly type check to include `partial_refund`. Update the
`SECURITY DEFINER SET search_path = ''` upsert so `ON CONFLICT` retains identity
and `first_seen_at`, increments the count, updates `last_seen_at`, and uses
`COALESCE(EXCLUDED.field, existing.field)` for optional normalized evidence.
Drop the exact old six-argument function before creating the nine-argument
replacement so no stale overload remains. Revoke default access and grant the
replacement to `service_role` only.

- [ ] **Step 4: Update all RPC callers atomically**

Update `recovery.ts`, `reconciliation.ts`, `webhook-handler.ts` and their tests
to supply the three new optional arguments as `undefined` when unavailable.
Search for stale six-argument RPC mocks:

Run: `rg -n "upsert_billing_financial_anomaly" src supabase`

Expected: every call matches the new nine-argument contract or its generated
named-argument shape.

- [ ] **Step 5: Regenerate and run GREEN**

Run:

```bash
pnpm supa:reset
pnpm supa:gen:types
supabase test db --local supabase/tests/database/37_billing_recovery.test.sql
supabase test db --local supabase/tests/database/41_billing_financial_anomaly_detail.test.sql
pnpm test src/lib/billing/__tests__/recovery.test.ts src/lib/billing/__tests__/reconciliation.test.ts src/lib/billing/__tests__/webhook-handler.test.ts
pnpm typecheck
```

Expected: all commands pass.

- [ ] **Step 6: Commit persistence**

```bash
git add supabase/migrations/20260911120000_billing_financial_anomaly_detail.sql supabase/schemas/billing.sql supabase/schemas/public.sql supabase/tests/database/41_billing_financial_anomaly_detail.test.sql src/types/database.ts src/lib/billing/recovery.ts src/lib/billing/reconciliation.ts src/lib/billing/webhook-handler.ts src/lib/billing/__tests__/recovery.test.ts src/lib/billing/__tests__/reconciliation.test.ts src/lib/billing/__tests__/webhook-handler.test.ts
git commit -m "feat: persist billing anomaly amounts"
```

### Task 3: Verify and document MP-09/10 local evidence

**Files:**

- Modify: `docs/runbooks/billing-reconciliation.md`
- Modify: `docs/exec-plans/active/011-mercadopago-v1-chile-acceptance.md`

**Interfaces:**

- Consumes: typed and persisted observations from Tasks 1–2.
- Produces: operator-readable anomaly evidence; provider scenarios remain open.

- [ ] **Step 1: Extend the anomaly inspection procedure**

Document queries showing anomaly type, bounded amounts, currency,
occurrence/first/last seen and resolution fields. Explicitly state that the
operator compares sanitized values with Mercado Pago before calling the
existing private manual resolver.

- [ ] **Step 2: Run the complete local gate**

Run:

```bash
pnpm supa:test
pnpm test src/lib/billing
pnpm typecheck
pnpm lint
pnpm docs:check
git diff --check
```

Expected: every command exits 0.

- [ ] **Step 3: Update MP-09 and MP-10 precisely**

Record code/test evidence for full refund, partial refund, chargeback and
mediation. Keep all real provider observations, alert handling and manual
resolution executions `[NO VERIFICADO]` until the acceptance plan runs.

- [ ] **Step 4: Commit the handoff**

```bash
git add docs/runbooks/billing-reconciliation.md docs/exec-plans/active/011-mercadopago-v1-chile-acceptance.md
git commit -m "docs: record financial anomaly coverage"
```
