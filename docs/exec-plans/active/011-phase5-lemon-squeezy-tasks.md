# Phase 5 (PR-7) — Lemon Squeezy adapter: task-by-task implementation plan

> For agentic workers: REQUIRED SUB-SKILL: use `superpowers:subagent-driven-development`
> (recommended) or `superpowers:executing-plans` to implement this plan
> task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> Detailed breakdown of **Phase 5** from
> [`011-billing-correctness.md`](011-billing-correctness.md). Corresponds
> to PR-7 (scheduled after PR-4, Mercado Pago reference certification).
> **New adapter — no
> existing Lemon Squeezy code in the repo.** Every field name/endpoint
> below must be re-verified against the live Lemon Squeezy API docs before
> implementing, same caveat as Phase 4 (Paddle).

**Goal:** Lemon Squeezy implements the Billing Core v2 contract while
preserving its own `cancelled`-vs-`expired` lifecycle distinction, which
does not map cleanly onto Stripe/Paddle's simpler cancel semantics.

**Spec:** [`docs/architecture/billing-platform-v2-design.md`](../../architecture/billing-platform-v2-design.md),
section 7.3. **Re-open before implementing** (last checked 2026-08-18):

- Create checkout: https://docs.lemonsqueezy.com/api/checkouts/create-checkout
- Pass custom checkout data: https://docs.lemonsqueezy.com/help/checkout/passing-custom-data
- Sign webhook requests: https://docs.lemonsqueezy.com/help/webhooks/signing-requests
- Webhook event types: https://docs.lemonsqueezy.com/help/webhooks/event-types
- Customer Portal: https://docs.lemonsqueezy.com/guides/developer-guide/customer-portal
- Subscription object / signed URLs: https://docs.lemonsqueezy.com/api/subscriptions/the-subscription-object

## Global Constraints

Same as Phase 1 — SOLID/DRY/KISS/YAGNI, early returns, no
`any`/`console.log`, manual migrations mirrored in `supabase/schemas/*.sql`,
`(select auth.uid())`, `SECURITY DEFINER` + `search_path=''` + explicit
grants, `pnpm typecheck && pnpm lint` before every commit, squash merge,
fix bugs found in-branch. **Do not run this suite's tests in parallel with
Paddle's (Phase 4) on this machine.**

## Design constraints specific to this adapter — read before Task 1

- **Lemon Squeezy is Merchant of Record**, same non-goal as Paddle: no tax
  logic in Iroko.
- **`cancelled` is not loss of access.** The subscription stays valid
  through `ends_at`; `expired` is the true terminal state. This means
  `SubscriptionCanceledEvent.accessUntil` (Fase 1 discriminated union,
  design spec section 5) **must** be set from `ends_at` when Lemon Squeezy
  reports `cancelled` — do not treat `cancelled` as an immediate
  `access_denied` the way MercadoPago's immediate cancel would be. Cross-
  check against the access policy table (design spec section 10):
  "`canceled` with future `access_until`/`current_period_end`: access
  through that time" is exactly this case.
- **Portal URLs come from the subscription object itself** (a signed,
  time-limited `urls.customer_portal` field), not a separate
  "create session" API call like Stripe/Paddle. `createPortalSession`
  still exists as the adapter's public method (to satisfy
  `PaymentProvider`), but internally it re-fetches the subscription to get
  a fresh signed URL — the "never cache" rule (design spec section 7.3)
  applies even more literally here since the URL itself expires.

---

## File map

**New**

- `src/lib/billing/providers/lemonsqueezy.ts`
- `src/lib/billing/providers/__tests__/lemonsqueezy.test.ts`
- `src/lib/billing/providers/__tests__/lemonsqueezy.contract.test.ts`

**Modified**

- `src/lib/billing/registry.ts` — register `lemonSqueezyProvider` when
  `LEMONSQUEEZY_API_KEY`/`LEMONSQUEEZY_WEBHOOK_SECRET`/`LEMONSQUEEZY_STORE_ID`
  are all set.
- `src/env.ts` — add the three vars above.
- `.env.example` — document them (empty/commented).

---

## Task 1: Env validation and registry entry

**Files:**

- Modify: `src/env.ts`, `.env.example`, `src/lib/billing/registry.ts`

- [ ] **Step 1: Test**

```ts
it('registers lemonsqueezy only when api key, webhook secret, and store id are all set', () => {
  withEnv(
    { LEMONSQUEEZY_API_KEY: 'k', LEMONSQUEEZY_WEBHOOK_SECRET: 's', LEMONSQUEEZY_STORE_ID: '123' },
    () => expect(availableProviders()).toContain('lemonsqueezy'),
  );
});

it('does not register lemonsqueezy with a missing store id', () => {
  withEnv({ LEMONSQUEEZY_API_KEY: 'k', LEMONSQUEEZY_WEBHOOK_SECRET: 's' }, () =>
    expect(availableProviders()).not.toContain('lemonsqueezy'),
  );
});
```

- [ ] **Step 2: Implement**

```ts
// env.ts
LEMONSQUEEZY_API_KEY: z.string().min(1).optional(),
LEMONSQUEEZY_WEBHOOK_SECRET: z.string().min(1).optional(),
LEMONSQUEEZY_STORE_ID: z.string().min(1).optional(),
```

- [ ] **Step 3: Verify and commit**

```bash
pnpm test -- src/lib/billing/__tests__/registry.test.ts
pnpm typecheck && pnpm lint

git add src/env.ts .env.example src/lib/billing/registry.ts
git commit -m "chore: add Lemon Squeezy provider configuration"
```

---

## Task 2: Provider prices — map Iroko plans to Lemon Squeezy Variant IDs

**Files:** none — data task, same pattern as Phase 4 Task 2.

- [ ] **Step 1:** Insert `billing.provider_prices` rows,
      `provider='lemonsqueezy'`, `external_price_id` = the Lemon Squeezy
      **Variant ID** (not Product ID — Lemon Squeezy checkouts reference a
      variant, confirm this distinction against current docs before seeding).

---

## Task 3: Hosted checkout with custom account data

**Files:**

- Create: `src/lib/billing/providers/lemonsqueezy.ts` (checkout portion)
- Create: `src/lib/billing/providers/__tests__/lemonsqueezy.test.ts`

- [ ] **Step 1: Test**

```ts
it('creates a hosted checkout carrying the account id in checkout_data.custom', async () => {
  getProviderPrice.mockResolvedValue({ externalPriceId: 'variant_123' /* ... */ });

  const result = await lemonSqueezyProvider.createCheckout({
    accountId: ACCOUNT_ID,
    customerEmail: 'a@iroko.app',
    planSlug: 'pro',
    interval: 'month',
    successUrl: SUCCESS_URL,
    cancelUrl: CANCEL_URL,
  });

  expect(fetchMock).toHaveBeenCalledWith(
    expect.stringContaining('/checkouts'),
    expect.objectContaining({
      body: expect.stringContaining('"custom":{"account_id":"' + ACCOUNT_ID + '"}'),
    }),
  );
  expect(result.url).toEqual(expect.stringContaining('https://'));
});
```

- [ ] **Step 2: Implement**

JSON:API-shaped request body (Lemon Squeezy's API uses the JSON:API spec,
unlike Stripe/Paddle's plain JSON — confirm structure against current docs
before implementing, this is a real structural difference, not a detail to
guess). Include `store: { data: { type: 'stores', id: LEMONSQUEEZY_STORE_ID } }`
and `variant: { data: { type: 'variants', id: externalPriceId } }`
relationships, `checkout_data.custom.account_id`, `checkout_data.email`.

- [ ] **Step 3: Verify and commit**

```bash
pnpm test -- src/lib/billing/providers/__tests__/lemonsqueezy.test.ts
pnpm typecheck && pnpm lint

git add src/lib/billing/providers/lemonsqueezy.ts src/lib/billing/providers/__tests__/lemonsqueezy.test.ts
git commit -m "feat: add Lemon Squeezy hosted checkout"
```

---

## Task 4: Webhook HMAC verification

**Files:**

- Modify: `src/lib/billing/providers/lemonsqueezy.ts` (`verifyWebhook`)
- Create: `src/lib/billing/providers/__tests__/lemonsqueezy.contract.test.ts`

- [ ] **Step 1: Test with a real-shape HMAC-SHA256 signature**

```ts
it('accepts a webhook with a valid X-Signature computed the same way Lemon Squeezy computes it', async () => {
  const rawBody = JSON.stringify(FIXTURE_SUBSCRIPTION_CREATED);
  const signature = computeRealLemonSqueezySignature(rawBody, TEST_WEBHOOK_SECRET);
  const event = await lemonSqueezyProvider.verifyWebhook(rawBody, signature);
  expect(event).not.toBeNull();
});

it('rejects a body/signature mismatch', async () => {
  const rawBody = JSON.stringify(FIXTURE_SUBSCRIPTION_CREATED);
  const wrongSignature = computeRealLemonSqueezySignature('{}', TEST_WEBHOOK_SECRET);
  const event = await lemonSqueezyProvider.verifyWebhook(rawBody, wrongSignature);
  expect(event).toBeNull();
});
```

- [ ] **Step 2: Implement**

HMAC-SHA256 over the exact raw body using `LEMONSQUEEZY_WEBHOOK_SECRET`,
compared against the `X-Signature` header — same "raw body before
`JSON.parse`" discipline as every other adapter in this project. Use
constant-time comparison (`crypto.timingSafeEqual` or the Web Crypto
equivalent already used elsewhere in the codebase — check
`mercadopago.ts`'s `verifyManifest` for the existing pattern before
introducing a new one).

- [ ] **Step 3: Verify and commit**

```bash
pnpm test -- src/lib/billing/providers/__tests__/lemonsqueezy.contract.test.ts
pnpm typecheck && pnpm lint

git add src/lib/billing/providers/lemonsqueezy.ts src/lib/billing/providers/__tests__/lemonsqueezy.contract.test.ts
git commit -m "feat: verify Lemon Squeezy webhook HMAC signatures"
```

---

## Task 5: Normalize subscription lifecycle — preserve `cancelled` vs `expired`

**Files:**

- Modify: `src/lib/billing/providers/lemonsqueezy.ts`

- [ ] **Step 1: Test — this is the task that most needs to get the access
      semantics right, write it carefully**

```ts
it('normalizes subscription_created with externalPriceId from the variant', async () => {
  const event = await lemonSqueezyProvider.verifyWebhook(FIXTURE_SUB_CREATED_RAW, VALID_SIG);
  expect(event).toMatchObject({ type: 'subscription_created', externalPriceId: 'variant_123' });
});

it('normalizes subscription_cancelled with accessUntil set to ends_at, not immediate loss', async () => {
  const event = await lemonSqueezyProvider.verifyWebhook(FIXTURE_SUB_CANCELLED_RAW, VALID_SIG);
  expect(event).toMatchObject({
    type: 'subscription_canceled',
    accessUntil: FIXTURE_SUB_CANCELLED_ENDS_AT,
  });
});

it('normalizes subscription_expired as the final terminal state with no accessUntil', async () => {
  const event = await lemonSqueezyProvider.verifyWebhook(FIXTURE_SUB_EXPIRED_RAW, VALID_SIG);
  expect(event).toMatchObject({ type: 'subscription_canceled', accessUntil: undefined });
});
```

- [ ] **Step 2: Implement**

`subscription_created`/`subscription_updated` → Fase 1's
`SubscriptionCreatedEvent`/`SubscriptionUpdatedEvent` with
`externalPriceId` from the variant relationship.
`subscription_cancelled` → `SubscriptionCanceledEvent` with
`accessUntil: subscription.attributes.ends_at`.
`subscription_expired` → `SubscriptionCanceledEvent` with no
`accessUntil` (access denied now — matches design spec section 10's
"`canceled` without future paid-through date: access denied"). This is the
one place in the whole provider matrix where a single provider event
concept ("the subscription is over") splits into two distinct Iroko
domain states depending on which raw event fired — document this mapping
with a code comment where it's easy to miss, since it is genuinely
non-obvious from the type signature alone.

- [ ] **Step 3: Verify and commit**

```bash
pnpm test -- src/lib/billing/providers/__tests__/lemonsqueezy.test.ts
pnpm typecheck && pnpm lint

git add src/lib/billing/providers/lemonsqueezy.ts
git commit -m "feat: normalize Lemon Squeezy subscription lifecycle preserving cancelled-vs-expired"
```

---

## Task 6: Normalize payment success/failed/recovered

**Files:**

- Modify: `src/lib/billing/providers/lemonsqueezy.ts`

- [ ] **Step 1: Test**

```ts
it('normalizes subscription_payment_success as invoice_paid');
it('normalizes subscription_payment_failed as invoice_payment_failed');
it('normalizes subscription_payment_recovered as payment_recovered');
```

- [ ] **Step 2: Implement** — map the three events to the Fase 1
      discriminated union types with the same field-population discipline as
      Stripe/Paddle (external invoice/payment IDs, amounts, currency — confirm
      exact field paths in the Lemon Squeezy payment event payload before
      implementing).

- [ ] **Step 3: Verify and commit**

```bash
pnpm test -- src/lib/billing/providers/__tests__/lemonsqueezy.test.ts
pnpm typecheck && pnpm lint

git add src/lib/billing/providers/lemonsqueezy.ts
git commit -m "feat: normalize Lemon Squeezy payment success/failed/recovered events"
```

---

## Task 7: Customer portal — fresh signed URL per call

**Files:**

- Modify: `src/lib/billing/providers/lemonsqueezy.ts` (`createPortalSession`)

- [ ] **Step 1: Test**

```ts
it('fetches the subscription fresh and returns its current signed portal url, never a cached one', async () => {
  fetchMock
    .mockResolvedValueOnce(
      subscriptionResponse({ urls: { customer_portal: 'https://...&signature=aaa' } }),
    )
    .mockResolvedValueOnce(
      subscriptionResponse({ urls: { customer_portal: 'https://...&signature=bbb' } }),
    );

  const first = await lemonSqueezyProvider.createPortalSession({
    externalCustomerId: 'sub_123',
    returnUrl: RETURN_URL,
  });
  const second = await lemonSqueezyProvider.createPortalSession({
    externalCustomerId: 'sub_123',
    returnUrl: RETURN_URL,
  });

  expect(first.url).not.toEqual(second.url);
});
```

- [ ] **Step 2: Implement**

Fetch the current subscription by ID, read `urls.customer_portal` from the
response — do not persist or reuse a previously-fetched URL anywhere
(design spec section 7.3, "Portal URLs are generated fresh on click; never
cache signed portal URLs"). Set `capabilities.customerPortal: true`.

- [ ] **Step 3: Verify and commit**

```bash
pnpm test -- src/lib/billing/providers/__tests__/lemonsqueezy.test.ts
pnpm typecheck && pnpm lint

git add src/lib/billing/providers/lemonsqueezy.ts
git commit -m "feat: fetch fresh Lemon Squeezy customer portal url per request"
```

---

## Task 8: Sandbox/test-mode E2E and PR gate

**Files:** none (manual verification + PR evidence)

- [ ] **Step 1: Confirm Lemon Squeezy test-mode credentials exist** — hard
      blocker if not.

- [ ] **Step 2: Run the full lifecycle**

Checkout → webhook → active subscription, correct plan → simulate a failed
payment → `payment_attempts` row → cancel → verify access remains through
`ends_at` (query entitlements, not just the raw subscription status) →
simulate `subscription_expired` firing at the end of that window → access
denied → webhook replay idempotent.

- [ ] **Step 3: Document event IDs/results in the PR.**

## Completion criteria for Phase 5

- `lemonSqueezyProvider` satisfies `PaymentProvider` with zero core
  reducer changes.
- `cancelled` correctly preserves access through `ends_at`;
  `expired` correctly denies it — verified by a test that checks the
  **entitlement layer**, not just that the right event type was emitted.
- Portal sessions are demonstrably fresh per call (test from Task 7 passes
  because two consecutive calls returned different signed URLs, not
  because the mock happened to return the same one twice).
- Sandbox E2E evidence recorded in the merged PR.
- `pnpm typecheck && pnpm lint`, relevant Vitest pass; do not run this
  suite's tests concurrently with Phase 4's on this machine.
