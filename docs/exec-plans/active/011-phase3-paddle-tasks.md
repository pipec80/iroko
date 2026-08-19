# Phase 3 (PR-6) — Paddle adapter: task-by-task implementation plan

> For agentic workers: REQUIRED SUB-SKILL: use `superpowers:subagent-driven-development`
> (recommended) or `superpowers:executing-plans` to implement this plan
> task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> Detailed breakdown of **Phase 3** from
> [`011-billing-correctness.md`](011-billing-correctness.md). Corresponds
> to PR-6 (depends on PR-4, Stripe certification). **New adapter — no
> existing Paddle code in the repo.** Every field name/endpoint below must
> be re-verified against the live Paddle API docs before implementing; this
> plan follows the design spec's own instruction (section 16) because
> billing APIs evolve and this was drafted from documentation, not from
> reading existing Iroko code the way the Stripe/MercadoPago plans were.

**Goal:** Paddle implements the Billing Core v2 contract
(`PaymentProvider`, `NormalizedBillingEvent`, `ProviderCapabilities`) with
zero special cases added to the core reducer — if this adapter needs the
reducer to change, that is itself a signal the contract from Fase 1 is
incomplete and should be revisited before continuing.

**Spec:** [`docs/architecture/billing-platform-v2-design.md`](../../architecture/billing-platform-v2-design.md),
section 7.2. **Re-open before implementing** (last checked 2026-08-18):

- Verify webhook signatures: https://developer.paddle.com/webhooks/about/signature-verification/
- Cancel subscription: https://developer.paddle.com/api-reference/subscriptions/cancel-subscription/
- Customer portal sessions: https://developer.paddle.com/api-reference/customer-portals/create-customer-portal-session/
- Subscription past due/recovery: https://developer.paddle.com/webhooks/subscriptions/subscription-past-due/

## Global Constraints

Same as Phase 1 — SOLID/DRY/KISS/YAGNI, early returns, no
`any`/`console.log`, manual migrations mirrored in `supabase/schemas/*.sql`,
`(select auth.uid())`, `SECURITY DEFINER` + `search_path=''` + explicit
grants, `pnpm typecheck && pnpm lint` before every commit, squash merge,
fix bugs found in-branch. **Do not run this suite's tests in parallel with
Lemon Squeezy's (Phase 4) on this machine** — constrained local RAM (see
Plan 011 Global execution rules).

## Design constraints specific to this adapter

- Paddle is Merchant of Record — it handles tax/invoicing legally itself.
  Do not build any tax logic in Iroko for Paddle transactions (design spec
  section 2, Non-goals).
- Paddle natively supports `cancel_at_period_end`-equivalent
  (`effective_from: 'next_billing_period'`) — set
  `capabilities.cancelAtPeriodEnd: true`, unlike MercadoPago.
- Customer portal sessions must be created on demand, never cached (design
  spec section 7.2) — a cached/reused portal URL is a security issue
  (session tokens with a lifetime).

---

## File map

**New**

- `src/lib/billing/providers/paddle.ts`
- `src/lib/billing/providers/__tests__/paddle.test.ts`
- `src/lib/billing/providers/__tests__/paddle.contract.test.ts`

**Modified**

- `src/lib/billing/registry.ts` — register `paddleProvider` when
  `PADDLE_API_KEY`/`PADDLE_WEBHOOK_SECRET` are set (same conditional
  pattern as `stripe`/`mercadopago` in the current registry).
- `src/env.ts` — add `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET`,
  `PADDLE_ENVIRONMENT` (`sandbox` | `production` — Paddle's own
  distinction, separate from Iroko's `NODE_ENV`).
- `.env.example` — document the new vars (empty/commented, same pattern as
  Fase 1 Task 9 fixed for Stripe/MercadoPago).
- `billing.provider_prices` — no schema change (Fase 1 table is already
  provider-neutral); this task only inserts rows for `provider='paddle'`.

---

## Task 1: Env validation and registry entry

**Files:**

- Modify: `src/env.ts`, `.env.example`, `src/lib/billing/registry.ts`
- Create: `src/lib/billing/__tests__/registry.test.ts` additions

- [ ] **Step 1: Test**

```ts
it('registers paddle only when both PADDLE_API_KEY and PADDLE_WEBHOOK_SECRET are set', () => {
  withEnv({ PADDLE_API_KEY: 'pdl_test', PADDLE_WEBHOOK_SECRET: 'whs_test' }, () => {
    expect(availableProviders()).toContain('paddle');
  });
});

it('does not register paddle with only one of the two required vars', () => {
  withEnv({ PADDLE_API_KEY: 'pdl_test' }, () => {
    expect(availableProviders()).not.toContain('paddle');
  });
});
```

- [ ] **Step 2: Implement**

```ts
// src/env.ts additions
PADDLE_API_KEY: z.string().min(1).optional(),
PADDLE_WEBHOOK_SECRET: z.string().min(1).optional(),
PADDLE_ENVIRONMENT: z.enum(['sandbox', 'production']).default('sandbox'),
```

```ts
// registry.ts
if (env.PADDLE_API_KEY && env.PADDLE_WEBHOOK_SECRET) {
  registry.set(paddleProvider.name, paddleProvider);
}
```

- [ ] **Step 3: Verify and commit**

```bash
pnpm test -- src/lib/billing/__tests__/registry.test.ts
pnpm typecheck && pnpm lint

git add src/env.ts .env.example src/lib/billing/registry.ts src/lib/billing/__tests__/registry.test.ts
git commit -m "chore: add Paddle provider configuration"
```

---

## Task 2: Provider prices for Paddle

**Files:**

- No code — data task. Document the manual/seed process.

- [ ] **Step 1: Insert `billing.provider_prices` rows for `provider='paddle'`**

Same shape as any other provider row (Fase 1, section 6.1) —
`external_price_id` is the Paddle Price ID (`pri_...`), one row per
`(plan_id, currency)`. Do via Supabase Studio or a one-off seed script for
sandbox; do not hardcode Paddle Price IDs in application code.

- [ ] **Step 2: Add a pgTAP assertion (extends Fase 1's `11_billing.test.sql`)**

```sql
-- provider_prices reverse lookup resolves for a known paddle external_price_id
```

---

## Task 3: Checkout — transaction with recurring price + custom data

**Files:**

- Create: `src/lib/billing/providers/paddle.ts` (checkout portion)
- Create: `src/lib/billing/providers/__tests__/paddle.test.ts`

**Interfaces:** implements `PaymentProvider.createCheckout` from Fase 1
(`src/lib/billing/types.ts`).

- [ ] **Step 1: Test**

```ts
it('creates a Paddle checkout transaction with the resolved recurring price and account custom data', async () => {
  getProviderPrice.mockResolvedValue({ externalPriceId: 'pri_pro_month' /* ... */ });

  const result = await paddleProvider.createCheckout({
    accountId: ACCOUNT_ID,
    customerEmail: 'a@iroko.app',
    planSlug: 'pro',
    interval: 'month',
    successUrl: SUCCESS_URL,
    cancelUrl: CANCEL_URL,
  });

  expect(fetchMock).toHaveBeenCalledWith(
    expect.stringContaining('/transactions'),
    expect.objectContaining({
      body: expect.stringContaining('"price_id":"pri_pro_month"'),
    }),
  );
  expect(result.url).toEqual(expect.stringContaining('https://'));
});

it('throws plan_provider_price_not_configured before calling Paddle when no mapping exists', async () => {
  getProviderPrice.mockRejectedValue(new Error('plan_provider_price_not_configured'));
  await expect(paddleProvider.createCheckout({ /* ... */ planSlug: 'unmapped' })).rejects.toThrow(
    'plan_provider_price_not_configured',
  );
});
```

- [ ] **Step 2: Implement**

Confirm against the live Paddle API (checkout via transaction endpoint,
`custom_data: { accountId }`, `items: [{ price_id, quantity: 1 }]`) —
mirror the auth header pattern (`Authorization: Bearer ${PADDLE_API_KEY}`)
and base URL split by `PADDLE_ENVIRONMENT` (`sandbox-api.paddle.com` vs
`api.paddle.com`). Use `getProviderPrice()` (Fase 1 catalog) for price
resolution — same pattern as Stripe (Fase 2, Task 3), never a hardcoded
lookup.

- [ ] **Step 3: Verify and commit**

```bash
pnpm test -- src/lib/billing/providers/__tests__/paddle.test.ts
pnpm typecheck && pnpm lint

git add src/lib/billing/providers/paddle.ts src/lib/billing/providers/__tests__/paddle.test.ts
git commit -m "feat: add Paddle checkout via provider price catalog"
```

---

## Task 4: Webhook signature verification

**Files:**

- Modify: `src/lib/billing/providers/paddle.ts` (`verifyWebhook`)
- Create: `src/lib/billing/providers/__tests__/paddle.contract.test.ts`

- [ ] **Step 1: Test with a real (test-mode) signature, not a hand-computed one**

```ts
it('accepts a Paddle-Signature computed the same way Paddle computes it', async () => {
  const rawBody = JSON.stringify(FIXTURE_SUBSCRIPTION_CREATED);
  const signature = computeRealPaddleSignature(rawBody, TEST_WEBHOOK_SECRET); // ts=...;h1=...
  const event = await paddleProvider.verifyWebhook(rawBody, signature);
  expect(event).not.toBeNull();
});

it('rejects a tampered body even with a structurally valid signature header', async () => {
  const rawBody = JSON.stringify(FIXTURE_SUBSCRIPTION_CREATED);
  const signature = computeRealPaddleSignature(rawBody, TEST_WEBHOOK_SECRET);
  const tamperedBody = rawBody.replace('"status":"active"', '"status":"canceled"');
  const event = await paddleProvider.verifyWebhook(tamperedBody, signature);
  expect(event).toBeNull();
});
```

- [ ] **Step 2: Implement**

Prefer the official Paddle Node SDK's webhook verification helper if it
keeps the adapter smaller and typed (design spec section 7.2) — check
current SDK availability/API shape before hand-rolling HMAC parsing
(`ts=...;h1=...` format, verify against the raw body exactly as received,
same "raw body before JSON.parse" discipline the project already applies
for Stripe/MercadoPago).

- [ ] **Step 3: Verify and commit**

```bash
pnpm test -- src/lib/billing/providers/__tests__/paddle.contract.test.ts
pnpm typecheck && pnpm lint

git add src/lib/billing/providers/paddle.ts src/lib/billing/providers/__tests__/paddle.contract.test.ts
git commit -m "feat: verify Paddle webhook signatures against raw body"
```

---

## Task 5: Normalize subscription lifecycle + payment signals

**Files:**

- Modify: `src/lib/billing/providers/paddle.ts` (`verifyWebhook` event
  routing)

- [ ] **Step 1: Test**

```ts
it('normalizes subscription.created with externalPriceId from the first item', async () => {
  const event = await paddleProvider.verifyWebhook(FIXTURE_SUB_CREATED_RAW, VALID_SIG);
  expect(event).toMatchObject({ type: 'subscription_created', externalPriceId: 'pri_pro_month' });
});

it('normalizes subscription.past_due without changing plan', async () => {
  const event = await paddleProvider.verifyWebhook(FIXTURE_SUB_PAST_DUE_RAW, VALID_SIG);
  expect(event).toMatchObject({ type: 'subscription_updated', status: 'past_due' });
});

it('normalizes transaction.completed as invoice_paid', async () => {
  const event = await paddleProvider.verifyWebhook(FIXTURE_TXN_COMPLETED_RAW, VALID_SIG);
  expect(event).toMatchObject({ type: 'invoice_paid', externalInvoiceId: expect.any(String) });
});

it('normalizes a failed transaction as invoice_payment_failed', async () => {
  const event = await paddleProvider.verifyWebhook(FIXTURE_TXN_PAYMENT_FAILED_RAW, VALID_SIG);
  expect(event).toMatchObject({ type: 'invoice_payment_failed' });
});
```

- [ ] **Step 2: Implement**

Map `subscription.created`/`subscription.updated`/`subscription.canceled`/
`subscription.past_due` to the Fase 1 discriminated union
(`SubscriptionCreatedEvent`/`Updated`/`Canceled` — `past_due` is a
`status` value on `SubscriptionUpdatedEvent`, not a separate event type,
matching the design spec's mutation rules table). Map
`transaction.completed` → `InvoicePaidEvent`, transaction payment-failure
event (confirm exact Paddle event name against current docs — this plan
was drafted before final verification) → `InvoicePaymentFailedEvent`.

- [ ] **Step 3: Verify and commit**

```bash
pnpm test -- src/lib/billing/providers/__tests__/paddle.test.ts
pnpm typecheck && pnpm lint

git add src/lib/billing/providers/paddle.ts
git commit -m "feat: normalize Paddle subscription and transaction events"
```

---

## Task 6: Customer portal — fresh session on demand, never cached

**Files:**

- Modify: `src/lib/billing/providers/paddle.ts` (`createPortalSession`)

- [ ] **Step 1: Test**

```ts
it('creates a fresh customer portal session per call, never reusing a cached url', async () => {
  await paddleProvider.createPortalSession({
    externalCustomerId: 'ctm_123',
    returnUrl: RETURN_URL,
  });
  await paddleProvider.createPortalSession({
    externalCustomerId: 'ctm_123',
    returnUrl: RETURN_URL,
  });
  expect(fetchMock).toHaveBeenCalledTimes(2); // no cache short-circuit
});
```

- [ ] **Step 2: Implement**

Call the Paddle customer portal sessions endpoint with
`externalCustomerId` — set `capabilities.customerPortal: true`.

- [ ] **Step 3: Verify and commit**

```bash
pnpm test -- src/lib/billing/providers/__tests__/paddle.test.ts
pnpm typecheck && pnpm lint

git add src/lib/billing/providers/paddle.ts
git commit -m "feat: add Paddle customer portal sessions"
```

---

## Task 7: Cancellation — immediate and next-billing-period

**Files:**

- Modify: `src/lib/billing/providers/paddle.ts` (`cancelSubscription`)

- [ ] **Step 1: Test**

```ts
it('cancels immediately with effective_from: immediately', async () => {
  await paddleProvider.cancelSubscription({
    externalSubscriptionId: 'sub_123',
    timing: 'immediate',
  });
  expect(fetchMock).toHaveBeenCalledWith(
    expect.stringContaining('/subscriptions/sub_123/cancel'),
    expect.objectContaining({ body: expect.stringContaining('"effective_from":"immediately"') }),
  );
});

it('cancels at next billing period with effective_from: next_billing_period', async () => {
  await paddleProvider.cancelSubscription({
    externalSubscriptionId: 'sub_123',
    timing: 'period_end',
  });
  expect(fetchMock).toHaveBeenCalledWith(
    expect.stringContaining('/subscriptions/sub_123/cancel'),
    expect.objectContaining({
      body: expect.stringContaining('"effective_from":"next_billing_period"'),
    }),
  );
});
```

- [ ] **Step 2: Implement**

Set `capabilities: { cancelImmediately: true, cancelAtPeriodEnd: true, ... }`
— unlike MercadoPago, Paddle's cancel API natively supports both timings in
one endpoint via `effective_from`, no synthetic-event workaround needed
(the exact bug this whole program exists to eliminate — see Plan 011
BILL-002).

- [ ] **Step 3: Verify and commit**

```bash
pnpm test -- src/lib/billing/providers/__tests__/paddle.test.ts
pnpm typecheck && pnpm lint

git add src/lib/billing/providers/paddle.ts
git commit -m "feat: implement Paddle immediate and period-end cancellation"
```

---

## Task 8: Sandbox E2E and PR gate

**Files:** none (manual verification + PR evidence)

- [ ] **Step 1: Confirm Paddle sandbox credentials exist** — hard blocker
      if not, same as Stripe/MercadoPago sandbox gates.

- [ ] **Step 2: Run the full lifecycle against Paddle sandbox**

Checkout → webhook → active subscription with correct plan → simulate
failed transaction → `payment_attempts` row → cancel immediate and cancel
at period end (both paths) → webhook replay idempotent.

- [ ] **Step 3: Document event IDs/results in the PR** — same evidence
      requirement as Phase 2 (Stripe), design spec section 14.

## Completion criteria for Phase 3

- `paddleProvider` satisfies `PaymentProvider` with zero core reducer
  changes.
- `capabilities` accurately reflects native immediate + period-end
  cancellation and portal support.
- Webhook signature verification tested against a real
  Paddle-computed signature, not a synthetic one.
- Sandbox E2E evidence recorded in the merged PR.
- `pnpm typecheck && pnpm lint`, relevant Vitest pass; do not run this
  suite's tests concurrently with Phase 4's on this machine.
