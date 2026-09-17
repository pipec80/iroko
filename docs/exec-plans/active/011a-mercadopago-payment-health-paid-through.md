# Mercado Pago payment health and paid-through access Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:subagent-driven-development` (recommended) or
> `superpowers:executing-plans` to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show rejected/recovered payments truthfully and preserve access for a
canceled subscription only through a verified paid period.

**Architecture:** Keep subscription lifecycle and payment health separate. A
new owner/admin RPC derives health from provider-scoped payment attempts, while
the existing read/entitlement RPCs include canceled subscriptions only when
`current_period_end > now()`.

**Tech Stack:** PostgreSQL/Supabase migrations and pgTAP, strict TypeScript,
Vitest, Next.js 16 server actions, React 19, next-intl.

**Spec:**
[`docs/architecture/mercadopago-reliability-design.md`](../../architecture/mercadopago-reliability-design.md#delivery-d--payment-health-and-paid-through-access)

## Global Constraints

- Payment failure never changes subscription status or entitlements.
- `next_payment_date` is not proof of a paid-through period.
- Health is `healthy`, `attention_required` or `unknown`; missing evidence is
  never success.
- Do not expose provider messages, raw metadata, retry dates, card management or
  invented access cutoffs.
- Keep Free / Plus / Pro, CLP 0 / 19.990 / 102.990 and slugs
  `free` / `pro` / `scale` unchanged.
- Every schema change has a versioned migration, schema mirror, pgTAP coverage
  and regenerated `src/types/database.ts`.
- Do not apply linked Cloud migrations in this implementation plan.

---

### Task 1: Define payment-health and paid-through SQL contracts

**Files:**

- Create: `supabase/migrations/20260911100000_billing_payment_health_paid_through.sql`
- Modify: `supabase/schemas/public.sql`
- Modify: `supabase/schemas/private.sql`
- Test: `supabase/tests/database/39_billing_payment_health_paid_through.test.sql`
- Regenerate: `src/types/database.ts`

**Interfaces:**

- Produces:
  `public.get_billing_payment_health(p_account_id uuid) RETURNS TABLE(state text, last_attempt_at timestamptz, last_failure_code text)`.
- Preserves: signatures of `public.get_account_subscription(uuid)`,
  `public.get_billing_overview(uuid)` and
  `private.get_account_plan_row(uuid)`.

- [ ] **Step 1: Write the failing pgTAP contract**

Create test 39 with fixtures for one owner account, one Mercado Pago customer,
one paid invoice, payment attempts and a canceled subscription. Include these
assertions:

```sql
SELECT has_function(
  'public', 'get_billing_payment_health', ARRAY['uuid'],
  'payment-health RPC exists'
);
SELECT results_eq(
  $$ SELECT state, last_failure_code
     FROM public.get_billing_payment_health('00000000-0000-0000-0000-000000003910') $$,
  $$ VALUES ('attention_required'::text, 'cc_rejected_other_reason'::text) $$,
  'latest failed payment requires attention without changing subscription status'
);
SELECT results_eq(
  $$ SELECT state, last_failure_code
     FROM public.get_billing_payment_health('00000000-0000-0000-0000-000000003910') $$,
  $$ VALUES ('healthy'::text, NULL::text) $$,
  'equal-or-newer recovered payment clears the warning'
);
SELECT is(
  (SELECT slug FROM private.get_account_plan_row(
    '00000000-0000-0000-0000-000000003910')),
  'pro',
  'canceled subscription retains its plan before verified period end'
);
SELECT is(
  (SELECT slug FROM private.get_account_plan_row(
    '00000000-0000-0000-0000-000000003920')),
  'free',
  'canceled subscription without a future verified period falls back to free'
);
```

Also assert `authenticated` owner/admin access, member rejection matching
`get_billing_overview`, `anon` rejection, no raw metadata column, and unchanged
subscription status after inserting a failed attempt.

- [ ] **Step 2: Run the database test and observe RED**

Run:
`supabase test db --local supabase/tests/database/39_billing_payment_health_paid_through.test.sql`

Expected: FAIL because `get_billing_payment_health(uuid)` does not exist and
canceled paid-through rows are excluded by the current read helpers.

- [ ] **Step 3: Write the migration and schema mirrors**

Implement the new RPC with the same owner/admin membership guard used by
`get_billing_overview`. Select the current provider subscription first, then
derive the latest attempt using deterministic ordering:

```sql
ORDER BY attempt.attempted_at DESC, attempt.updated_at DESC, attempt.id DESC
LIMIT 1
```

Return `attention_required` only for latest status `failed`, `healthy` for
`paid` or `recovered`, and `unknown` when no attempt exists. Expose the bounded
`failure_code`, never `metadata`. For an authorized account the RPC returns
exactly one row, including `unknown` when there is no subscription or payment
attempt; unauthorized callers fail with the existing `not_authorized`
contract.

Amend each existing read helper with this exact eligibility predicate:

```sql
subscription.status IN ('active', 'trialing')
OR (
  subscription.status = 'canceled'
  AND subscription.current_period_end IS NOT NULL
  AND subscription.current_period_end > now()
)
```

Keep the existing membership rules and output columns. Copy the authoritative
function bodies into `supabase/schemas/public.sql` and
`supabase/schemas/private.sql` according to their schema ownership.

- [ ] **Step 4: Regenerate types and run GREEN**

Run:

```bash
pnpm supa:reset
pnpm supa:gen:types
supabase test db --local supabase/tests/database/39_billing_payment_health_paid_through.test.sql
```

Expected: test 39 passes and `src/types/database.ts` includes the new RPC
without unrelated generated drift.

- [ ] **Step 5: Commit the SQL contract**

```bash
git add supabase/migrations/20260911100000_billing_payment_health_paid_through.sql supabase/schemas/public.sql supabase/schemas/private.sql supabase/tests/database/39_billing_payment_health_paid_through.test.sql src/types/database.ts
git commit -m "feat: expose billing payment health"
```

### Task 2: Replace scheduled-date inference with invoice-backed paid periods

**Files:**

- Modify: `src/lib/billing/providers/mercadopago.ts`
- Modify: `src/lib/billing/providers/__tests__/mercadopago.test.ts`
- Modify: `src/lib/billing/providers/__tests__/mercadopago.contract.test.ts`

**Interfaces:**

- Consumes: Mercado Pago authorized-payment fields `preapproval_id`,
  `debit_date`, `payment.status` and the v1 monthly-only provider contract.
- Produces: `InvoicePaidEvent.periodStart` and `.periodEnd` derived only after
  an approved authorized payment; subscription snapshots and cancellation
  events carry no period inferred from `next_payment_date`.

- [ ] **Step 1: Write failing provider regressions**

Extend provider tests with an approved authorized-payment fixture whose
`debit_date` is `2026-01-31T12:00:00-03:00`. Assert the event contains
`periodStart` at that instant and `periodEnd` one calendar month later, clamped
to the last valid February day. Add cancellation and snapshot assertions:

```ts
expect(canceledEvent).not.toHaveProperty('accessUntil');
expect(snapshot).not.toHaveProperty('currentPeriodEnd');
```

Add invalid/missing `debit_date` coverage: the payment event remains valid but
omits both period fields, preserving unknown evidence.

- [ ] **Step 2: Run the provider tests and observe RED**

Run:

```bash
pnpm test src/lib/billing/providers/__tests__/mercadopago.test.ts
pnpm test src/lib/billing/providers/__tests__/mercadopago.contract.test.ts
```

Expected: FAIL because current code maps `next_payment_date` into subscription
periods and does not emit an invoice-backed paid interval.

- [ ] **Step 3: Implement calendar-month paid-period normalization**

Add a private pure helper that validates `debit_date` and advances one UTC
calendar month with end-of-month clamping. Use it only when the authorized
payment normalizes to `invoice_paid`. Populate `periodStart` and `periodEnd`
from that helper. Remove `accessUntil: preapproval.next_payment_date`,
`currentPeriodEnd: preapproval.next_payment_date` and the snapshot equivalent.
Do not substitute `last_modified`, the worker clock or a fixed 30-day duration.

The official contract to recheck during implementation is
[Buscar en facturas](https://www.mercadopago.cl/developers/es/reference/online-payments/subscriptions/authorized-payment-search/get),
which exposes `preapproval_id`, `debit_date` and paginated results.

- [ ] **Step 4: Run provider and reducer tests and observe GREEN**

Run:

```bash
pnpm test src/lib/billing/providers/__tests__/mercadopago.test.ts
pnpm test src/lib/billing/providers/__tests__/mercadopago.contract.test.ts
pnpm test src/lib/billing/__tests__/reducer.test.ts
```

Expected: all targets pass and only an approved invoice can extend the stored
period.

- [ ] **Step 5: Commit the provider-period correction**

```bash
git add src/lib/billing/providers/mercadopago.ts src/lib/billing/providers/__tests__/mercadopago.test.ts src/lib/billing/providers/__tests__/mercadopago.contract.test.ts
git commit -m "fix: derive Mercado Pago access from paid invoices"
```

### Task 3: Map health into the billing action and visible UI

**Files:**

- Modify: `src/app/[locale]/dashboard/billing/actions.ts`
- Modify: `src/app/[locale]/dashboard/billing/__tests__/actions.test.ts`
- Create: `src/lib/billing/payment-health.ts`
- Test: `src/lib/billing/__tests__/payment-health.test.ts`
- Create: `src/components/dashboard/org/billing-payment-health-notice.tsx`
- Test: `src/components/dashboard/org/__tests__/billing-payment-health-notice.test.tsx`
- Modify: `src/components/dashboard/org/billing-tab.tsx`
- Modify: `messages/en.json`
- Modify: `messages/es.json`
- Modify: `messages/pt.json`
- Modify: `messages/fr.json`

**Interfaces:**

- Consumes: `public.get_billing_payment_health(uuid)` from Task 1 and
  invoice-backed periods from Task 2.
- Produces:

```ts
export type PaymentHealthState = 'healthy' | 'attention_required' | 'unknown';

export interface BillingPaymentHealth {
  state: PaymentHealthState;
  lastAttemptAt: string | null;
  lastFailureCode: string | null;
}
```

- [ ] **Step 1: Write failing unit tests for mapping and action behavior**

In `payment-health.test.ts`, assert that only the three known database states
map successfully and malformed/null rows map to `unknown` with null detail.
In `actions.test.ts`, extend the RPC mock and assert:

```ts
expect(result.data?.paymentHealth).toEqual({
  state: 'attention_required',
  lastAttemptAt: '2026-09-11T10:00:00Z',
  lastFailureCode: 'cc_rejected_other_reason',
});
expect(result.data?.overview?.status).toBe('active');
```

Add an owner/admin RPC error case that returns `fetch_failed`; retain the
existing read-only-member behavior by mapping permission denial to `unknown`.
In the notice component test, mock `useTranslations` as an identity function
and assert `attention_required` renders one `role="alert"`, while `healthy` and
`unknown` render nothing.

- [ ] **Step 2: Run focused tests and observe RED**

Run:

```bash
pnpm test src/lib/billing/__tests__/payment-health.test.ts
pnpm test "dashboard/billing/__tests__/actions"
pnpm test src/components/dashboard/org/__tests__/billing-payment-health-notice.test.tsx
```

Expected: FAIL because the mapper and `paymentHealth` result do not exist.

- [ ] **Step 3: Implement the typed mapping and RPC read**

Export the types and a pure `mapBillingPaymentHealth(row: unknown)` helper from
`payment-health.ts`. In `getBillingData`, request the health RPC alongside the
catalog and overview, then return:

```ts
{
  plans: PlanRow[];
  overview: BillingOverview | null;
  paymentHealth: BillingPaymentHealth;
  checkoutAvailable: boolean;
}
```

Permission denial maps to `unknown`; other database errors remain
`fetch_failed`. Do not add health fields to `BillingOverview`.

- [ ] **Step 4: Render the truthful localized signal**

Implement `BillingPaymentHealthNotice` as the only component that owns this
conditional copy. When `paymentHealth.state === 'attention_required'`, render a
`role="alert"` above the current-plan panel. Add the following semantic keys to
all locales:

```json
{
  "payment_attention_title": "Payment needs attention",
  "payment_attention_body": "Mercado Pago reported a rejected payment. Your subscription status and access period have not been changed by this notice.",
  "payment_attention_action": "Review the payment in Mercado Pago"
}
```

Translate the values for `es`, `pt` and `fr`. The action is explanatory text,
not an unverified portal link. Render no success banner for `healthy` or
`unknown`.

- [ ] **Step 5: Run focused tests and observe GREEN**

Run:

```bash
pnpm test src/lib/billing/__tests__/payment-health.test.ts
pnpm test "dashboard/billing/__tests__/actions"
pnpm test src/components/dashboard/org/__tests__/billing-payment-health-notice.test.tsx
pnpm typecheck
```

Expected: both Vitest targets and typecheck pass.

- [ ] **Step 6: Commit the application slice**

```bash
git add src/lib/billing/payment-health.ts src/lib/billing/__tests__/payment-health.test.ts src/app/[locale]/dashboard/billing/actions.ts src/app/[locale]/dashboard/billing/__tests__/actions.test.ts src/components/dashboard/org/billing-payment-health-notice.tsx src/components/dashboard/org/__tests__/billing-payment-health-notice.test.tsx src/components/dashboard/org/billing-tab.tsx messages/en.json messages/es.json messages/pt.json messages/fr.json
git commit -m "feat: show Mercado Pago payment health"
```

### Task 4: Prove access and UI regression boundaries

**Files:**

- Modify: `src/lib/billing/__tests__/entitlements.test.ts`
- Modify: `src/lib/billing/__tests__/reducer.test.ts`
- Modify: `docs/exec-plans/active/011-mercadopago-v1-chile-acceptance.md`

**Interfaces:**

- Consumes: payment health and paid-through contracts from Tasks 1–3.
- Produces: local evidence for MP-06 and the code portion of MP-07.

- [ ] **Step 1: Add failing regression cases**

Add reducer assertions that `invoice_payment_failed` followed by
`payment_recovered` only calls invoice/payment RPCs and never a subscription
status mutation. Add entitlement fixtures for canceled/future,
canceled/expired and canceled/null periods.

- [ ] **Step 2: Run the focused regression set**

Run:

```bash
pnpm test src/lib/billing/__tests__/reducer.test.ts src/lib/billing/__tests__/entitlements.test.ts
```

Expected before any necessary correction: at least the new canceled-period
expectation fails; after Tasks 1–2 and minimal fixture updates, all pass.

- [ ] **Step 3: Run the full local gate**

Run:

```bash
pnpm supa:test
pnpm test src/lib/billing
pnpm test "dashboard/billing/__tests__/actions"
pnpm typecheck
pnpm lint
pnpm docs:check
git diff --check
```

Expected: every command exits 0. Record exact counts and mark provider/Cloud
evidence `[NO VERIFICADO]`.

- [ ] **Step 4: Update the matrix without overstating acceptance**

Change MP-06 implementation to include the visible health signal and MP-07 to
include the paid-through predicate. Mark only the executed local tests as
`Probado localmente`; leave provider rejection, recovery and real period-boundary
evidence pending.

- [ ] **Step 5: Commit the verified slice**

```bash
git add src/lib/billing/__tests__/entitlements.test.ts src/lib/billing/__tests__/reducer.test.ts docs/exec-plans/active/011-mercadopago-v1-chile-acceptance.md
git commit -m "test: verify Mercado Pago payment access boundaries"
```
