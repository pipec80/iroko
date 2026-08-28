# Phase 3 (PR-5) — Stripe certification: task-by-task implementation plan

> For agentic workers: REQUIRED SUB-SKILL: use `superpowers:subagent-driven-development`
> (recommended) or `superpowers:executing-plans` to implement this plan
> task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> Detailed breakdown of **Phase 3** from
> [`011-billing-correctness.md`](011-billing-correctness.md). Corresponds
> to PR-5 in that plan's PR slicing table. It is scheduled after the Mercado
> Pago reference certification (Fase 2), and technically depends on merged
> Fase 1 (`011-phase1-core-v2-tasks.md`). This plan assumes `events.ts`,
> `capabilities.ts`, `catalog.ts`, `reducer.ts`, `service.ts`, and the
> `billing.provider_prices`/`billing.payment_attempts` schema already exist.

**Goal:** Certify Stripe as a subsequent provider implementation of the
Billing Core v2 contract — real customer/price resolution, no invented plan
defaults, real Customer Portal, and full lifecycle (checkout → active → paid
invoice → failed/recovered payment → cancellation → webhook replay) verified
against Stripe test mode. It is not the launch reference or a gate for the
Mercado Pago LATAM path.

**Spec:** [`docs/architecture/billing-platform-v2-design.md`](../../architecture/billing-platform-v2-design.md),
section 7.1. **Re-open before implementing** (APIs evolve; last checked
2026-08-18):

- Subscription webhooks and payment failures: https://docs.stripe.com/billing/subscriptions/webhooks
- Create Customer Portal Session: https://docs.stripe.com/api/customer_portal/sessions/create
- Checkout subscriptions: https://docs.stripe.com/payments/checkout/build-subscriptions

## Global Constraints

Same as Phase 1 (`011-phase1-core-v2-tasks.md`) — SOLID/DRY/KISS/YAGNI,
early returns, no `any`/`console.log`, manual migrations mirrored in
`supabase/schemas/*.sql`, `(select auth.uid())`, `SECURITY DEFINER` +
`search_path=''` + explicit grants, `pnpm typecheck && pnpm lint` before
every commit, squash merge, fix bugs found in-branch.

## Contexto — bugs confirmados en el adapter actual (verificados 2026-08-19)

- `createPortalSession()` (`stripe.ts:103-108`) pasa `customer:
params.accountId` (UUID interno de Iroko) en vez de un Customer ID real de
  Stripe (`cus_...`) — falla 400 en el 100% de los casos reales.
- `fromSubscriptionEvent()` (`stripe.ts:31-52`) nunca setea un campo de
  precio/plan en el evento — no hace ningún reverse-lookup del
  `price.id` de la suscripción.
- `fromInvoiceEvent()` (`stripe.ts:54-75`) no puebla
  `hostedUrl`/`pdfUrl`/`externalInvoiceId` pese a que Stripe los expone
  (`invoice.hosted_invoice_url`, `invoice.invoice_pdf`, `invoice.id`).
- `verifyWebhook()` (`stripe.ts:119-142`) solo normaliza
  `customer.subscription.created/updated/deleted` e `invoice.paid` — no
  hay manejo de `invoice.payment_failed` ni `invoice.payment_action_required`.
- API pineada: `2025-03-31.basil` (comentario en `stripe.ts:38`) — el
  período de facturación vive en `sub.items.data[0]`, no en la
  suscripción — mantener ese patrón, no revertirlo.

---

## File map

**Modified**

- `src/lib/billing/providers/stripe.ts` — reescritura completa sobre el
  contrato de Fase 1.
- `src/lib/billing/providers/__tests__/stripe.test.ts`,
  `stripe.contract.test.ts` (crear si no existe — MercadoPago ya tiene el
  patrón en `mercadopago.contract.test.ts`, replicar la estructura).
- `src/app/[locale]/dashboard/billing/actions.ts` — solo si `BillingService`
  (Fase 1) necesita un hook específico de Stripe para portal.

**No se toca:** `billing.provider_prices`/`payment_attempts` (ya existen
desde Fase 1) — este plan solo llena filas y usa las tablas.

---

## Task 1: Lock Stripe-specific regressions with tests

**Files:**

- Modify: `src/lib/billing/providers/__tests__/stripe.test.ts`

**Interfaces:**

- Consumes: `stripeProvider` actual.
- Produces: expectativas de regresión que las tasks siguientes deben
  satisfacer.

- [ ] **Step 1: Test que el Portal usa el customer ID real, no el UUID de Iroko**

```ts
it('creates a portal session with the persisted Stripe customer id, not the account UUID', async () => {
  const billingPortalCreate = vi.spyOn(getStripeMock().billingPortal.sessions, 'create');
  getCustomerExternalId.mockResolvedValue('cus_real123');

  await stripeProvider.createPortalSession({
    externalCustomerId: 'cus_real123',
    returnUrl: 'https://iroko.app/dashboard/billing',
  });

  expect(billingPortalCreate).toHaveBeenCalledWith(
    expect.objectContaining({ customer: 'cus_real123' }),
  );
  expect(billingPortalCreate).not.toHaveBeenCalledWith(
    expect.objectContaining({ customer: ACCOUNT_ID }),
  );
});
```

- [ ] **Step 2: Test que un evento de suscripción sin price mapeable no crea `NormalizedBillingEvent` con plan inventado**

```ts
it('returns externalPriceId for the reducer to resolve, never a plan slug', async () => {
  const event = await stripeProvider.verifyWebhook(FIXTURE_SUBSCRIPTION_CREATED, VALID_SIG);

  expect(event).toMatchObject({ type: 'subscription_created', externalPriceId: 'price_pro_month' });
  expect(event).not.toHaveProperty('planSlug');
});
```

- [ ] **Step 3: Test que `invoice.paid` puebla identidad externa completa**

```ts
it('normalizes invoice.paid with external invoice id and hosted/pdf urls', async () => {
  const event = await stripeProvider.verifyWebhook(FIXTURE_INVOICE_PAID, VALID_SIG);

  expect(event).toMatchObject({
    type: 'invoice_paid',
    externalInvoiceId: expect.stringMatching(/^in_/),
    hostedUrl: expect.stringContaining('https://'),
    pdfUrl: expect.stringContaining('https://'),
  });
});
```

- [ ] **Step 4: Run and verify failures**

```bash
pnpm test -- src/lib/billing/providers/__tests__/stripe.test.ts
```

Expected: fails — current adapter doesn't expose `externalPriceId`,
`hostedUrl`, `pdfUrl`, and `createPortalSession` still takes an account ID
shaped param, not `externalCustomerId`.

---

## Task 2: Stripe customer resolution — create or reuse, persist `cus_*`

**Files:**

- Modify: `src/lib/billing/providers/stripe.ts`
- Create: `src/lib/billing/providers/__tests__/stripe-customer.test.ts`

**Interfaces:**

- Consumes: `billing.customers` via the narrow persistence boundary from
  Fase 1 (not raw SQL from the adapter — adapters don't mutate DB directly,
  design spec section 3, Boundary rule).
- Produces: `resolveOrCreateStripeCustomer(accountId: string, email: string): Promise<string>`
  (returns `cus_*`).

- [ ] **Step 1: Write the test first**

```ts
it('reuses an existing Stripe customer id for the account', async () => {
  getCustomerExternalId.mockResolvedValue('cus_existing');
  const id = await resolveOrCreateStripeCustomer(ACCOUNT_ID, 'a@iroko.app');
  expect(getStripeMock().customers.create).not.toHaveBeenCalled();
  expect(id).toBe('cus_existing');
});

it('creates a Stripe customer and persists it when none exists', async () => {
  getCustomerExternalId.mockResolvedValue(null);
  getStripeMock().customers.create.mockResolvedValue({ id: 'cus_new' });

  const id = await resolveOrCreateStripeCustomer(ACCOUNT_ID, 'a@iroko.app');

  expect(getStripeMock().customers.create).toHaveBeenCalledWith(
    expect.objectContaining({ email: 'a@iroko.app', metadata: { accountId: ACCOUNT_ID } }),
  );
  expect(persistCustomerExternalId).toHaveBeenCalledWith(ACCOUNT_ID, 'stripe', 'cus_new');
  expect(id).toBe('cus_new');
});
```

- [ ] **Step 2: Implement**

`resolveOrCreateStripeCustomer` calls the Fase 1 catalog/persistence
functions for `billing.customers` (the `(account_id, provider)` unique
lookup from Fase 1, Task 3) — never a raw `supabase.from('billing.customers')`
call inside the adapter, per the boundary rule.

- [ ] **Step 3: Verify**

```bash
pnpm test -- src/lib/billing/providers/__tests__/stripe-customer.test.ts
pnpm typecheck && pnpm lint
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/billing/providers/stripe.ts src/lib/billing/providers/__tests__/stripe-customer.test.ts
git commit -m "feat: resolve or create Stripe customer through billing.customers"
```

---

## Task 3: Checkout uses catalog price resolution + real customer

**Files:**

- Modify: `src/lib/billing/providers/stripe.ts` (`createCheckout`)

- [ ] **Step 1: Test**

```ts
it('creates a subscription checkout session with the resolved customer and price', async () => {
  getProviderPrice.mockResolvedValue({ externalPriceId: 'price_pro_month' /* ... */ });
  resolveOrCreateStripeCustomer.mockResolvedValue('cus_real123');

  await stripeProvider.createCheckout({
    accountId: ACCOUNT_ID,
    customerEmail: 'a@iroko.app',
    planSlug: 'pro',
    interval: 'month',
    successUrl: SUCCESS_URL,
    cancelUrl: CANCEL_URL,
  });

  expect(getStripeMock().checkout.sessions.create).toHaveBeenCalledWith(
    expect.objectContaining({
      mode: 'subscription',
      customer: 'cus_real123',
      line_items: [{ price: 'price_pro_month', quantity: 1 }],
      subscription_data: { metadata: { accountId: ACCOUNT_ID } },
    }),
  );
});

it('throws plan_provider_price_not_configured before calling Stripe when no mapping exists', async () => {
  getProviderPrice.mockRejectedValue(new Error('plan_provider_price_not_configured'));

  await expect(
    stripeProvider.createCheckout({ /* ... */ planSlug: 'unmapped', interval: 'month' }),
  ).rejects.toThrow('plan_provider_price_not_configured');
  expect(getStripeMock().checkout.sessions.create).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Implement**

Replace the direct `supabase.rpc('get_plan_provider_id', ...)` call
(current `stripe.ts:84-89`) with `getProviderPrice()` from the Fase 1
catalog (`src/lib/billing/catalog.ts`) — this is the same abstraction
Mercado Pago uses in Fase 2, keeping both adapters on one lookup path.
Pass `customer: cus_real123` from Task 2's resolver, not left implicit.

- [ ] **Step 3: Verify and commit**

```bash
pnpm test -- src/lib/billing/providers/__tests__/stripe.test.ts
pnpm typecheck && pnpm lint

git add src/lib/billing/providers/stripe.ts
git commit -m "fix: resolve Stripe checkout price and customer through billing core v2"
```

---

## Task 4: Reverse-map subscription events through the catalog

**Files:**

- Modify: `src/lib/billing/providers/stripe.ts` (`fromSubscriptionEvent`)

- [ ] **Step 1: Test (already written in Task 1, Step 2 — extend for updated/deleted)**

```ts
it('normalizes customer.subscription.updated with externalPriceId from the first item', async () => {
  const event = await stripeProvider.verifyWebhook(FIXTURE_SUBSCRIPTION_UPDATED, VALID_SIG);
  expect(event).toMatchObject({
    type: 'subscription_updated',
    externalPriceId: 'price_scale_year',
  });
});

it('normalizes customer.subscription.deleted without requiring externalPriceId', async () => {
  const event = await stripeProvider.verifyWebhook(FIXTURE_SUBSCRIPTION_DELETED, VALID_SIG);
  expect(event).toMatchObject({ type: 'subscription_canceled' });
});
```

- [ ] **Step 2: Implement**

`fromSubscriptionEvent` reads `sub.items.data[0].price.id` and sets it as
`externalPriceId` on the returned `SubscriptionCreatedEvent`/
`SubscriptionUpdatedEvent` (Fase 1 discriminated union — the reducer, not
this adapter, resolves `externalPriceId` to an Iroko plan; per the
boundary rule the adapter only translates, it does not query
`provider_prices` itself). `customer.subscription.deleted` maps to
`SubscriptionCanceledEvent`, which has no `externalPriceId` field by type
design.

- [ ] **Step 3: Verify and commit**

```bash
pnpm test -- src/lib/billing/providers/__tests__/stripe.test.ts
pnpm typecheck && pnpm lint

git add src/lib/billing/providers/stripe.ts
git commit -m "feat: expose externalPriceId on Stripe subscription events"
```

---

## Task 5: Normalize invoice events — paid, payment_failed, action_required

**Files:**

- Modify: `src/lib/billing/providers/stripe.ts` (`fromInvoiceEvent` + new
  `fromInvoicePaymentFailedEvent`)

- [ ] **Step 1: Test (invoice.paid already in Task 1 Step 3 — add failed)**

```ts
it('normalizes invoice.payment_failed with failure code/message', async () => {
  const event = await stripeProvider.verifyWebhook(FIXTURE_INVOICE_PAYMENT_FAILED, VALID_SIG);

  expect(event).toMatchObject({
    type: 'invoice_payment_failed',
    externalInvoiceId: expect.stringMatching(/^in_/),
    failureCode: expect.any(String),
    attemptedAt: expect.any(String),
  });
});
```

- [ ] **Step 2: Implement**

`fromInvoiceEvent` (paid) sets `externalInvoiceId: invoice.id`,
`hostedUrl: invoice.hosted_invoice_url`, `pdfUrl: invoice.invoice_pdf` —
**verify these exact field names against the Stripe API version pinned in
this adapter (`2025-03-31.basil`) before implementing**, per the design
spec's instruction to re-check official docs (Stripe's invoice object
shape has changed across API versions before). Add
`case 'invoice.payment_failed'` and
`case 'invoice.payment_action_required'` to the `switch` in `verifyWebhook`
(`stripe.ts:130-141`), both returning `InvoicePaymentFailedEvent` with
`failureCode`/`failureMessage` from
`invoice.last_finalization_error` or the relevant PaymentIntent's
`last_payment_error` (confirm exact path against live API response, not
assumed).

- [ ] **Step 3: Verify and commit**

```bash
pnpm test -- src/lib/billing/providers/__tests__/stripe.test.ts
pnpm typecheck && pnpm lint

git add src/lib/billing/providers/stripe.ts
git commit -m "feat: normalize Stripe invoice paid/failed events with full identity"
```

---

## Task 6: Fix Customer Portal — real Stripe customer ID

**Files:**

- Modify: `src/lib/billing/providers/stripe.ts` (`createPortalSession`)

- [ ] **Step 1: Test already written in Task 1, Step 1**

- [ ] **Step 2: Implement**

```ts
async createPortalSession(params: PortalParams): Promise<{ url: string }> {
  const session = await getStripe().billingPortal.sessions.create({
    customer: params.externalCustomerId, // never params.accountId
    return_url: params.returnUrl,
  });
  return { url: session.url };
}
```

`PortalParams.externalCustomerId` comes from Fase 1's `PortalParams` shape
(design spec section 4) — the caller (`BillingService`) resolves it from
`billing.customers` before invoking this, same as Task 2's checkout path.

- [ ] **Step 3: Verify and commit**

```bash
pnpm test -- src/lib/billing/providers/__tests__/stripe.test.ts
pnpm typecheck && pnpm lint

git add src/lib/billing/providers/stripe.ts
git commit -m "fix: pass real Stripe customer id to Customer Portal session"
```

---

## Task 7: Verify cancellation semantics unchanged and covered

**Files:**

- Modify: `src/lib/billing/providers/__tests__/stripe.test.ts`

- [ ] **Step 1: Test**

```ts
it('cancels immediately via subscriptions.cancel', async () => {
  await stripeProvider.cancelSubscription({
    externalSubscriptionId: 'sub_123',
    timing: 'immediate',
  });
  expect(getStripeMock().subscriptions.cancel).toHaveBeenCalledWith('sub_123');
});

it('schedules end-of-period cancellation via cancel_at_period_end', async () => {
  await stripeProvider.cancelSubscription({
    externalSubscriptionId: 'sub_123',
    timing: 'period_end',
  });
  expect(getStripeMock().subscriptions.update).toHaveBeenCalledWith('sub_123', {
    cancel_at_period_end: true,
  });
});
```

This is a compile/contract check against Fase 1's `CancelSubscriptionParams`
shape (`{ externalSubscriptionId, timing }`) — the current implementation
(`stripe.ts:111-117`) already has correct logic, only the parameter shape
changes (from `(externalId, atPeriodEnd)` positional args).

- [ ] **Step 2: Adjust signature, verify, commit**

```bash
pnpm test -- src/lib/billing/providers/__tests__/stripe.test.ts
pnpm typecheck && pnpm lint

git add src/lib/billing/providers/stripe.ts src/lib/billing/providers/__tests__/stripe.test.ts
git commit -m "refactor: adapt Stripe cancellation to CancelSubscriptionParams"
```

---

## Task 8: Contract tests with real Stripe signature generation

**Files:**

- Create/extend: `src/lib/billing/providers/__tests__/stripe.contract.test.ts`

- [ ] **Step 1: Confirm the existing pattern**

The project already has this pattern for the general webhook contract
(referenced in the earlier audit as "contract tests that use the Stripe
SDK to generate/verify real HMAC signatures"). Locate it, follow the same
structure — do not reinvent signature generation.

- [ ] **Step 2: Add fixtures covering the full lifecycle**

Real (sanitized) Stripe test-mode payload shapes for: subscription
created/updated/deleted, invoice paid/payment_failed, monthly/yearly plan,
plan switch. **Fixtures must be the raw provider JSON, never a
hand-constructed `NormalizedBillingEvent`** — this is the exact testing
gap that let BILL-001/BILL-002 ship originally (see Plan 011 Contexto).

- [ ] **Step 3: Verify and commit**

```bash
pnpm test -- src/lib/billing/providers/__tests__/stripe.contract.test.ts
pnpm typecheck && pnpm lint

git add src/lib/billing/providers/__tests__/stripe.contract.test.ts
git commit -m "test: add Stripe contract tests with realistic webhook fixtures"
```

---

## Task 9: Real Stripe test-mode E2E — the release gate

**Files:** none (manual verification + PR evidence, per design spec
section 14 release gates)

- [ ] **Step 1: Confirm Stripe test-mode credentials exist**

If not, this is a hard blocker for this task specifically (not for Tasks
1-8, which are fixture-based) — flag back before proceeding.

- [ ] **Step 2: Run the full lifecycle manually against Stripe test mode**

Checkout → webhook received → `billing.subscriptions` row correct
(`plan_id` matches purchase, not Free) → simulate an invoice payment
failure in the Stripe dashboard/CLI → `billing.payment_attempts` row
written → cancel at period end → `cancel_at_period_end = true` persisted
→ replay the same webhook event ID → `duplicate`, no second row.

- [ ] **Step 3: Document in the PR**

Per design spec section 14: PR description must include the Stripe test
mode event IDs used and the resulting row states — not just "tested
manually", actual evidence.

## Completion criteria for Phase 3

- `createPortalSession` never receives an Iroko UUID.
- Every subscription/invoice webhook resolves `externalPriceId`/
  `externalInvoiceId` — no field is silently absent when Stripe provides it.
- `invoice.payment_failed` and `invoice.payment_action_required` are
  normalized and reach `billing.payment_attempts` (Fase 1 schema) via the
  reducer.
- Full lifecycle verified against Stripe test mode with event IDs recorded
  in the merged PR.
- `pnpm typecheck && pnpm lint`, relevant Vitest, and the Fase 1 pgTAP
  suite still pass.

This gate certifies Stripe as an additional provider. Mercado Pago Fase 2 is
the reference shape for the current launch path; Fases 4/5 (Paddle, Lemon
Squeezy) must start from the provider-neutral Core v2 contract, not copy
provider-specific assumptions from either adapter.
