# Phase 1 (PR-1/2/3) — Billing Core v2: task-by-task implementation plan

> For agentic workers: REQUIRED SUB-SKILL: use `superpowers:subagent-driven-development`
> (recommended) or `superpowers:executing-plans` to implement this plan
> task-by-task. Steps use checkbox syntax: `- [ ]` pending and `- [x]`
> completed.
>
> This is the detailed breakdown of **Phase 1** from
> [`011-billing-correctness.md`](011-billing-correctness.md) — read that
> file first for the full program (Phases 0-6, all 4 providers,
> reconciliation) and the verified evidence backing every invariant here.
> Corresponds to PR-1/PR-2/PR-3 in that plan's PR slicing table.

**Goal:** Replace Iroko's unsafe broad billing event/RPC model with a
provider-neutral, provider-scoped, mutation-safe billing core that can
support Stripe, Paddle, Lemon Squeezy, and Mercado Pago.

**Architecture:** Provider adapters only call provider APIs, verify
signatures, normalize typed events, and expose capabilities.
`BillingService` orchestrates checkout/customer/cancellation operations. A
deterministic reducer applies discriminated events to provider-scoped
billing tables without invented defaults.

**Tech Stack:** Next.js 16.3.1, React 19.2.8, TypeScript 6.0.3,
Supabase/Postgres, Vitest 4.1.10, pgTAP/Supabase DB tests, Sentry, PostHog,
pino logger.

**Spec:** [`docs/architecture/billing-platform-v2-design.md`](../../architecture/billing-platform-v2-design.md)
— the plan argues from the spec; read both.

> **Closure record (2026-08-27):** Tasks 1–10 are complete through
> [PR #152](https://github.com/pipec80/iroko/pull/152), whose head `b396aa4`
> passed the complete GitHub Actions and Vercel Preview gate before the
> squash merge `4a0a3d4`. Applying the migrations to linked Supabase Cloud is
> not part of this merged-code closure and remains `[NO VERIFICADO]` until
> separately authorized and evidenced. Provider certification remains in its
> dedicated later phases.

## Global Constraints

- Follow SOLID/DRY/KISS/YAGNI; use early returns and small functions.
- No `any` and no `console.log`; use the project logger.
- Do not run heavy builds/processes in parallel; local machine has
  constrained RAM and Docker Desktop runs Supabase.
- `supabase db diff` is broken in this Windows workflow. Write migrations
  manually under `supabase/migrations/` and mirror schema changes in
  `supabase/schemas/*.sql` in the same commit.
- RLS/authorization SQL uses `(select auth.uid())`, never naked `auth.uid()`.
- Every `SECURITY DEFINER` function uses `SET search_path = ''`, is
  revoked from `PUBLIC`, and is explicitly granted only to required roles.
- Before every commit, run `pnpm typecheck && pnpm lint`.
- Run the relevant Vitest/pgTAP suite before the commit that changes its
  behavior.
- Conventional commits only.
- Merge PRs with `gh pr merge --squash --delete-branch`.
- If a bug is discovered in this branch, fix it in this branch.

---

## File map

**New TypeScript modules**

- `src/lib/billing/events.ts` — discriminated normalized event types and
  type guards.
- `src/lib/billing/capabilities.ts` — provider capability shape and helper
  assertions.
- `src/lib/billing/catalog.ts` — outbound/reverse provider price
  resolution.
- `src/lib/billing/service.ts` — provider-neutral checkout/cancellation
  orchestration.
- `src/lib/billing/reducer.ts` — dispatch normalized events to narrow
  persistence operations.

**Modified TypeScript modules**

- `src/lib/billing/types.ts` — checkout/provider interface; remove broad
  event definition.
- `src/lib/billing/registry.ts` — typed provider names and capabilities.
- `src/lib/billing/webhook-handler.ts` — verification + reducer invocation
  only; no defaults.
- `src/lib/billing/providers/mock.ts` — adapt to new contract.
- `src/lib/billing/providers/stripe.ts` — compile against new contract;
  provider certification is a later plan.
- `src/lib/billing/providers/mercadopago.ts` — compile against new
  contract; unsafe deferred cancellation removed in its provider plan.
- `src/app/[locale]/dashboard/billing/actions.ts` — delegate orchestration
  to `BillingService`.
- `src/components/dashboard/org/billing-tab.tsx` — consume capabilities and
  block invalid actions.
- `src/env.ts` — provider configuration shape + production fail-closed
  guard (Task 9, extended — see note there).
- `.env.example` — remove misleading literal mock provider credentials.
- `src/types/database.ts` — regenerated Supabase types.

**New/modified database files**

- Create `supabase/migrations/20260818230000_billing_core_v2.sql` manually.
- Modify mirror `supabase/schemas/billing.sql` in the same commit.
- Modify `supabase/tests/database/11_billing.test.sql`.

**New/modified tests**

- Create `src/lib/billing/__tests__/catalog.test.ts`.
- Create `src/lib/billing/__tests__/reducer.test.ts`.
- Create `src/lib/billing/__tests__/service.test.ts`.
- Modify `src/lib/billing/__tests__/webhook-handler.test.ts`.
- Modify `src/env.test.ts` (Task 9, extended) — production fail-closed
  behavior.
- Modify provider unit tests only enough to compile against the new
  contract; provider behavior is certified in later provider plans.

---

## Task 1: Lock the dangerous webhook regressions with tests

**Files:**

- Modify: `src/lib/billing/__tests__/webhook-handler.test.ts`
- Create: `src/lib/billing/__tests__/reducer.test.ts`

**Interfaces:**

- Consumes: current `handleProviderWebhook()` behavior.
- Produces: regression expectations that later tasks must satisfy.

- [x] **Step 1: Add a regression test proving a subscription event may not default to Free**

Use a provider mock whose verified event has no resolvable external price
ID. The expected result after the refactor is an internal processing
failure and no call that writes `plan_slug = 'free'`.

```ts
it('never invents the free plan when a subscription price cannot be resolved', async () => {
  verifyWebhook.mockResolvedValue({
    provider: 'stripe',
    externalEventId: 'evt_missing_price',
    type: 'subscription_created',
    accountId: ACCOUNT_ID,
    externalSubscriptionId: 'sub_123',
    externalPriceId: 'price_unknown',
    status: 'active',
    cancelAtPeriodEnd: false,
    raw: {},
  });

  resolvePlanByExternalPrice.mockResolvedValue(null);

  const result = await handleProviderWebhook('stripe', '{}', 'sig');

  expect(result.status).toBe(500);
  expect(applySubscriptionCreated).not.toHaveBeenCalled();
});
```

- [x] **Step 2: Add a regression test proving invoice events cannot mutate subscription plan/period/status**

```ts
it('routes invoice_paid only to invoice and payment persistence', async () => {
  const event: InvoicePaidEvent = {
    provider: 'stripe',
    externalEventId: 'evt_invoice_paid',
    type: 'invoice_paid',
    accountId: ACCOUNT_ID,
    externalSubscriptionId: 'sub_123',
    externalInvoiceId: 'in_123',
    externalPaymentId: 'pi_123',
    amountPaid: 2500,
    currency: 'USD',
    paidAt: '2026-08-18T20:00:00.000Z',
    raw: {},
  };

  await reduceBillingEvent(event);

  expect(applyInvoicePaid).toHaveBeenCalledWith(event);
  expect(applySubscriptionCreated).not.toHaveBeenCalled();
  expect(applySubscriptionUpdated).not.toHaveBeenCalled();
});
```

This is the test for the `invoice.paid`-corrupts-subscription bug found
independently while verifying this program (not in the original three
source documents) — see `011-billing-correctness.md` Contexto section.

- [x] **Step 3: Run focused tests and verify they fail for the intended architectural reason**

Run sequentially:

```bash
pnpm test -- src/lib/billing/__tests__/webhook-handler.test.ts
pnpm test -- src/lib/billing/__tests__/reducer.test.ts
```

Expected: failures because typed event/reducer/catalog interfaces do not
exist yet or current handler applies unsafe defaults.

Do not commit a permanently red state. Continue through Task 2/3 until the
behavior is green.

---

## Task 2: Introduce provider names, capabilities, and discriminated events

**Files:**

- Create: `src/lib/billing/events.ts`
- Create: `src/lib/billing/capabilities.ts`
- Modify: `src/lib/billing/types.ts`
- Modify: `src/lib/billing/registry.ts`
- Modify: provider implementations enough to satisfy the interface

**Interfaces:**

- Produces: `ProviderName`, `ProviderCapabilities`, `NormalizedBillingEvent`,
  `CheckoutParams`, `CheckoutResult`, `CancelSubscriptionParams`.
- Consumed by: all later tasks.

- [x] **Step 1: Move normalized event types into `events.ts`**

Define the exact union from the design spec (section 5). No optional
`planSlug` exists on provider events. Subscription plan resolution uses
`externalPriceId` or existing local subscription state.

- [x] **Step 2: Define provider capabilities**

```ts
export interface ProviderCapabilities {
  customerPortal: boolean;
  cancelImmediately: boolean;
  cancelAtPeriodEnd: boolean;
  updatePaymentMethod: boolean;
  changePlan: boolean;
  pauseSubscription: boolean;
}

export function assertProviderCapability(
  capabilities: ProviderCapabilities,
  capability: keyof ProviderCapabilities,
): void {
  if (capabilities[capability]) return;
  throw new Error(`billing_capability_not_supported:${capability}`);
}
```

- [x] **Step 3: Narrow `PaymentProvider`**

```ts
export interface PaymentProvider {
  readonly name: ProviderName;
  readonly capabilities: ProviderCapabilities;
  createCheckout(params: CheckoutParams): Promise<CheckoutResult>;
  createPortalSession?(params: PortalParams): Promise<{ url: string }>;
  cancelSubscription?(params: CancelSubscriptionParams): Promise<void>;
  verifyWebhook(rawBody: string, signature: string): Promise<NormalizedBillingEvent | null>;
}
```

`PortalParams` must carry the provider customer ID required by providers
with portals:

```ts
export interface PortalParams {
  externalCustomerId: string;
  returnUrl: string;
}
```

- [x] **Step 4: Make every existing provider compile without adding new behavior**

Unsupported operations remain absent from the adapter; do not keep fake
no-op methods. `BillingService` must assert both capability and optional
method presence.

For Mercado Pago set MVP capabilities truthfully:

```ts
capabilities: {
  customerPortal: false,
  cancelImmediately: true,
  cancelAtPeriodEnd: false,
  updatePaymentMethod: false,
  changePlan: false,
  pauseSubscription: true,
}
```

For Stripe expose only semantics already implemented correctly; portal
behavior is repaired in the Stripe plan.

- [x] **Step 5: Run validation**

```bash
pnpm typecheck
pnpm lint
pnpm test -- src/lib/billing
```

Expected: typecheck/lint green; tests may remain red only where later
persistence/catalog work is intentionally not implemented yet. Do not
commit until all tests touched by this task are green.

---

## Task 3: Migrate provider-scoped billing identity and price catalog

**Files:**

- Create: `supabase/migrations/20260818230000_billing_core_v2.sql`
- Modify: `supabase/schemas/billing.sql`
- Modify: `supabase/tests/database/11_billing.test.sql`

**Interfaces:**

- Produces tables/constraints consumed by `catalog.ts` and reducer
  persistence.

- [x] **Step 1: Extend pgTAP first**

Add tests asserting:

```sql
-- one Iroko account may have multiple provider customer rows
-- same account/provider pair is rejected
-- same provider/external customer ID is rejected
-- same external event ID is accepted for different providers
-- same provider/external event ID is rejected
-- same provider/external subscription ID is rejected
-- provider price reverse lookup is unique
```

Use deterministic UUIDs and existing pgTAP conventions already present in
`11_billing.test.sql`.

- [x] **Step 2: Run DB tests and verify expected failures**

```bash
pnpm supa:test
```

Expected: new tests fail against the old constraints.

- [x] **Step 3: Write the manual migration**

The migration must, in one transaction where practical:

```sql
alter table billing.customers
  drop constraint if exists customers_account_id_key;

alter table billing.customers
  add constraint customers_account_provider_key unique (account_id, provider);

alter table billing.events
  drop constraint if exists events_external_event_id_key;

do $$
begin
  if exists (select 1 from billing.events where external_event_id is null) then
    raise exception 'billing_event_external_id_backfill_required';
  end if;
end;
$$;

alter table billing.events
  alter column external_event_id set not null;

alter table billing.events
  add constraint events_provider_external_event_key unique (provider, external_event_id);

create unique index subscriptions_provider_external_id_unique
  on billing.subscriptions(provider, external_subscription_id)
  where external_subscription_id is not null;

alter table billing.invoices
  add column provider text;

update billing.invoices i
set provider = s.provider
from billing.subscriptions s
where i.subscription_id = s.id
  and i.provider is null;

update billing.invoices i
set provider = c.provider
from billing.customers c
where i.customer_id = c.id
  and i.provider is null;

do $$
begin
  if exists (select 1 from billing.invoices where provider is null) then
    raise exception 'billing_invoice_provider_backfill_failed';
  end if;
end;
$$;

alter table billing.invoices
  alter column provider set not null;

create unique index invoices_provider_external_id_unique
  on billing.invoices(provider, external_invoice_id)
  where external_invoice_id is not null;
```

Because the audited live billing tables were empty (verified in vivo
2026-08-19 — see `011-billing-correctness.md`), no production billing-row
backfill ambiguity exists today. Still keep SQL valid for non-empty
local/test databases.

Create `billing.provider_prices` and `billing.payment_attempts` exactly as
defined in the design spec (sections 6.1, 6.6), including indexes and
`updated_at` trigger for provider prices.

**Added (2026-08-19, resolves the design spec's open question on
`provider_prices.amount`):** enforce that a provider price's `amount`
matches `billing.plans.price` for the base currency — no free-floating
divergence without a demonstrated reason:

```sql
CREATE OR REPLACE FUNCTION billing.assert_provider_price_matches_plan()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_plan_price integer;
BEGIN
  SELECT price INTO v_plan_price FROM billing.plans WHERE id = NEW.plan_id;
  IF NEW.currency = 'USD' AND NEW.amount <> v_plan_price THEN
    RAISE EXCEPTION 'provider_price_amount_mismatch: plan price is %, provider price is %',
      v_plan_price, NEW.amount;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER provider_prices_amount_coherence
  BEFORE INSERT OR UPDATE ON billing.provider_prices
  FOR EACH ROW EXECUTE FUNCTION billing.assert_provider_price_matches_plan();
```

Scoped to `currency = 'USD'` (today's only base currency, per the live
Cloud query — all 5 plan rows are `USD`) so a future non-USD provider price
(e.g. MercadoPago in CLP) isn't blocked by this check; revisit the scope
if/when a second base currency is actually introduced, not preemptively.

- [x] **Step 4: Mirror the final schema manually**

Update `supabase/schemas/billing.sql` so a fresh reset produces the same
tables, constraints, indexes, and triggers as the migration result. Do not
call `supabase db diff`.

- [x] **Step 5: Run database verification**

Sequentially:

```bash
pnpm supa:reset
pnpm supa:test
pnpm supa:lint
```

Expected: reset succeeds, pgTAP green, DB lint has no new billing errors.

- [x] **Step 6: Regenerate TypeScript DB types**

```bash
pnpm supa:gen:types
pnpm typecheck
pnpm lint
```

- [x] **Step 7: Commit schema work**

```bash
git add supabase/migrations/20260818230000_billing_core_v2.sql \
  supabase/schemas/billing.sql \
  supabase/tests/database/11_billing.test.sql \
  src/types/database.ts

git commit -m "feat: normalize billing provider identity"
```

Precondition: `pnpm typecheck && pnpm lint` has just passed in this
working tree.

---

## Task 4: Add provider price catalog with forward and reverse lookup

**Files:**

- Create: `src/lib/billing/catalog.ts`
- Create: `src/lib/billing/__tests__/catalog.test.ts`
- Modify: provider checkout implementations to call the catalog only after
  Task 4 tests pass

**Interfaces:**

```ts
export interface ProviderPrice {
  id: string;
  planId: string;
  planSlug: string;
  interval: PlanInterval;
  provider: ProviderName;
  externalPriceId: string | null;
  amount: number;
  currency: string;
}

export async function getProviderPrice(input: {
  planSlug: string;
  interval: PlanInterval;
  provider: ProviderName;
  currency: string;
}): Promise<ProviderPrice>;

export async function resolvePlanByExternalPrice(input: {
  provider: ProviderName;
  externalPriceId: string;
}): Promise<{ planId: string; planSlug: string; interval: PlanInterval }>;
```

- [x] **Step 1: Write catalog unit tests**

```ts
it('resolves an outbound provider price');
it('reverse maps an external price to one Iroko plan');
it('throws plan_provider_price_not_configured when no mapping exists');
it('throws provider_price_mapping_not_found for unknown inbound price');
```

- [x] **Step 2: Implement `catalog.ts` with early returns**

Use server-side Supabase/admin boundaries already used by billing. Keep raw
query code inside this module; adapters consume typed catalog functions.

- [x] **Step 3: Remove direct runtime dependence on `plans.provider_ids` from adapters**

Stripe and Mercado Pago should compile through the catalog abstraction.
Mercado Pago may read amount/currency with `externalPriceId = null` in its
later provider plan.

- [x] **Step 4: Run focused verification**

```bash
pnpm test -- src/lib/billing/__tests__/catalog.test.ts
pnpm typecheck
pnpm lint
```

- [x] **Step 5: Commit**

```bash
git add src/lib/billing/catalog.ts \
  src/lib/billing/__tests__/catalog.test.ts \
  src/lib/billing/providers

git commit -m "feat: add billing provider price catalog"
```

---

## Task 5: Implement mutation-safe billing reducer

**Files:**

- Create/complete: `src/lib/billing/reducer.ts`
- Modify: `src/lib/billing/__tests__/reducer.test.ts`
- Modify: SQL RPCs/functions used for persistence in the same
  migration/schema pair if additional narrow RPCs are required

**Interfaces:**

```ts
export type BillingReductionResult = { status: 'applied' } | { status: 'duplicate' };

export async function reduceBillingEvent(
  event: NormalizedBillingEvent,
): Promise<BillingReductionResult>;
```

- [x] **Step 1: Add reducer tests per event type**

Subscription created:

```ts
it('requires reverse price mapping before creating a subscription');
it('does not substitute free when mapping is missing');
```

Subscription updated:

```ts
it('keeps existing plan when update has no external price id');
it('changes plan only when a supplied external price id resolves');
```

Invoice/payment:

```ts
it('invoice_paid never updates subscription plan or period');
it('payment failure writes a failed payment attempt');
it('payment recovery upserts recovery without duplicate attempts');
```

Idempotency:

```ts
it('replay from same provider is duplicate');
it('same external event id from a different provider is independent');
```

- [x] **Step 2: Split persistence by mutation responsibility**

```
applySubscriptionCreated(event, resolvedPlan)
applySubscriptionUpdated(event, resolvedPlanOrNull)
applySubscriptionCanceled(event)
applyInvoicePaid(event)
applyInvoicePaymentFailed(event)
applyPaymentRecovered(event)
```

Do not keep a single SQL function whose optional parameters permit
unrelated fields to be overwritten (this is the exact shape of the
`apply_subscription_event` bug being replaced — see
`011-billing-correctness.md` Design decision 4).

- [x] **Step 3: Ensure atomic idempotency**

The transaction/RPC that applies an event must reserve
`(provider, external_event_id)` before domain mutation and return
`duplicate` on conflict. Do not perform side effects before the DB
transition commits.

- [x] **Step 4: Verify**

```bash
pnpm test -- src/lib/billing/__tests__/reducer.test.ts
pnpm supa:test
pnpm typecheck
pnpm lint
```

- [x] **Step 5: Commit**

```bash
git add src/lib/billing/reducer.ts \
  src/lib/billing/__tests__/reducer.test.ts \
  supabase/migrations \
  supabase/schemas/billing.sql \
  supabase/tests/database/11_billing.test.sql

git commit -m "refactor: make billing event reduction mutation safe"
```

If SQL changed after Task 3, add a new manual timestamped migration rather
than rewriting a migration already merged/shared. If still in the same
unshared PR and project policy permits migration edits, keep migration
history clean and mirror exactly.

---

## Task 6: Rewrite webhook handler without invented defaults

**Files:**

- Modify: `src/lib/billing/webhook-handler.ts`
- Modify: `src/lib/billing/__tests__/webhook-handler.test.ts`

**Interfaces:**

- Consumes: `PaymentProvider.verifyWebhook`, `reduceBillingEvent`.

- [x] **Step 1: Change handler to verification + reduction only**

Target shape:

```ts
export async function handleProviderWebhook(
  providerName: ProviderName,
  rawBody: string,
  signature: string,
): Promise<{ status: number; body: object }> {
  let provider: PaymentProvider;
  try {
    provider = getPaymentProvider(providerName);
  } catch {
    // getPaymentProvider throws provider_not_configured synchronously
    // (registry.ts) — caught here explicitly so an unconfigured provider
    // returns a proper HTTP response instead of an uncaught exception.
    // This gap exists in the current code too; closing it here rather
    // than leaving it as a residual issue.
    return { status: 404, body: { error: 'provider_not_configured' } };
  }

  const event = await provider.verifyWebhook(rawBody, signature);
  if (!event) return { status: 400, body: { error: 'invalid_signature' } };

  try {
    const result = await reduceBillingEvent(event);
    if (result.status === 'duplicate') {
      return { status: 200, body: { result: 'duplicate' } };
    }

    await emitBillingSideEffects(event);
    return { status: 200, body: { result: 'applied' } };
  } catch (error: unknown) {
    captureBillingException(error, event);
    logger.error(
      { action: 'billing.webhook', provider: providerName, eventType: event.type },
      error instanceof Error ? error.message : 'Unknown billing webhook error',
    );
    return { status: 500, body: { error: 'internal_error' } };
  }
}
```

There must be no fallback `free`, `active`, `month`, or generated mock
subscription ID.

- [x] **Step 2: Add explicit Sentry capture helper**

Reuse the project's Sentry integration pattern. Tags are low cardinality:

```ts
{
  billing_provider: event.provider,
  billing_event_type: event.type,
  billing_operation: 'webhook_reduce',
}
```

External IDs may go in context/extras. Never include signature, API
secret, card data, or full PII payload.

- [x] **Step 3: Keep analytics/notifications after committed non-duplicate state only**

Existing `subscription_activated` behavior may remain, but derive
`planSlug` from committed/resolved domain state rather than defaulting to
Free. Add normalized payment failure/recovery analytics hooks for later
provider events.

- [x] **Step 4: Verify**

```bash
pnpm test -- src/lib/billing/__tests__/webhook-handler.test.ts
pnpm test -- src/lib/billing/__tests__/reducer.test.ts
pnpm typecheck
pnpm lint
```

- [x] **Step 5: Commit**

```bash
git add src/lib/billing/webhook-handler.ts \
  src/lib/billing/__tests__/webhook-handler.test.ts

git commit -m "fix: remove unsafe billing webhook defaults"
```

---

## Task 7: Add BillingService and prevent duplicate paid checkouts

**Files:**

- Create: `src/lib/billing/service.ts`
- Create: `src/lib/billing/__tests__/service.test.ts`
- Modify: `src/app/[locale]/dashboard/billing/actions.ts`

**Interfaces:**

```ts
export async function startBillingCheckout(input: {
  accountId: string;
  customerEmail: string;
  planSlug: string;
  interval: PlanInterval;
  provider?: ProviderName;
  successUrl: string;
  cancelUrl: string;
}): Promise<CheckoutResult>;

export async function cancelBillingSubscription(input: {
  accountId: string;
  timing: CancellationTiming;
}): Promise<void>;
```

- [x] **Step 1: Write service tests**

```ts
it('rejects checkout when the caller is not admin/owner of the account');
it('rejects checkout when an active paid subscription already exists');
it('rejects checkout when a trialing paid subscription already exists');
it('rejects checkout when a past_due paid subscription already exists');
it('allows checkout from free with no paid subscription');
it('checks provider capability before cancellation');
```

- [x] **Step 2: Implement the guard before provider API calls**

**Decided (2026-08-19), resolves the Plan 010/011 integration question:**
`startBillingCheckout` calls Plan 010's `requireAccountRole` directly as
its authorization step — it does not build a second, parallel live-DB
check. Plan 010 exists specifically to establish "JWT is UI-only, DB is
authority" as the one canonical pattern project-wide; `BillingService`
reusing it (instead of reinventing an equivalent check) is what makes that
true in practice, not just in Plan 010's own files. Concretely:

```ts
import { requireAccountRole } from '@/lib/active-account'; // Plan 010

const BLOCKING_STATUSES: SubscriptionStatus[] = ['trialing', 'active', 'past_due'];

export async function startBillingCheckout(input: StartCheckoutInput): Promise<CheckoutResult> {
  await requireAccountRole(input.accountId, ADMIN_ROLES); // throws not_authorized

  const overview = await getBillingOverview(input.accountId);
  if (overview.subscription && BLOCKING_STATUSES.includes(overview.subscription.status)) {
    throw new Error('active_paid_subscription_exists');
  }
  // ...
}
```

Also ensure the existing plan is actually paid; Free must not block paid
checkout. **Sequencing:** Plan 010 is closed and
`requireAccountRole(accountId, allowedRoles): Promise<void>` is available in
`main`; import it directly and do not build a throwaway local copy of the
same check "for now".

- [x] **Step 3: Move provider orchestration out of server action**

Server action keeps input validation only — authorization now lives inside
`BillingService` (Step 2 above), not duplicated in the action. Calls
`BillingService`. The service owns provider/catalog/customer orchestration.

- [x] **Step 4: Verify**

```bash
pnpm test -- src/lib/billing/__tests__/service.test.ts
pnpm typecheck
pnpm lint
```

- [x] **Step 5: Commit**

```bash
git add src/lib/billing/service.ts \
  src/lib/billing/__tests__/service.test.ts \
  src/app/[locale]/dashboard/billing/actions.ts

git commit -m "fix: prevent duplicate paid subscription checkout"
```

---

## Task 8: Make billing UI capability-aware

**Files:**

- Modify: `src/components/dashboard/org/billing-tab.tsx`
- Add/modify component tests where the repo's existing dashboard test
  pattern belongs

**Interfaces:**

- Consumes: provider capabilities exposed in billing overview/action data.

- [x] **Step 1: Add UI behavior tests**

```ts
it('does not offer subscribe when another paid subscription is active');
it('hides portal action when customerPortal is false');
it('hides end-period cancellation when cancelAtPeriodEnd is false');
it('shows immediate cancellation only when cancelImmediately is true');
```

- [x] **Step 2: Render actions from capabilities, not provider-name checks**

No JSX branch should look like `provider === 'mercadopago'` for generic
billing capability decisions.

- [x] **Step 3: Verify**

```bash
pnpm test -- src/components/dashboard/org
pnpm typecheck
pnpm lint
```

If no existing component test target exists at that path, run the exact
new test file instead of inventing a new broad test command.

- [x] **Step 4: Commit**

```bash
git add src/components/dashboard/org/billing-tab.tsx src/components/dashboard/org

git commit -m "feat: render billing actions from provider capabilities"
```

---

## Task 9: Harden configuration — remove misleading mock credentials AND fail closed in production

**Files:**

- Modify: `src/env.ts`
- Modify: `.env.example`
- Modify: `src/lib/billing/registry.ts`
- Create/modify: `src/env.test.ts`

**Interfaces:**

- Provider registration must occur only for intentional, valid-looking
  configuration.

> **This task is extended beyond the three source documents.** All three
> (design spec, roadmap, this implementation plan as originally drafted)
> clean up `.env.example` and test that mock stays available for local
> dev, but none of them close the actual risk: nothing stops
> `NODE_ENV=production` + `BILLING_DEFAULT_PROVIDER=mock` (the
> `.env.example` default) from silently granting paid entitlements without
> charging anyone in a real deployment. Step 2 below is the fix; it did not
> exist in the original task list.

- [x] **Step 1: Replace literal provider credentials in `.env.example`**

Use empty/commented placeholders instead of values that make registry
checks think a provider is configured:

```
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
MERCADOPAGO_ACCESS_TOKEN=
MERCADOPAGO_WEBHOOK_SECRET=
BILLING_DEFAULT_PROVIDER=mock
```

- [x] **Step 2 (added): Fail closed when `mock` is selected in production**

```ts
// src/env.ts
BILLING_DEFAULT_PROVIDER: z
  .string()
  .default('mock')
  .refine(
    (val) =>
      process.env.NODE_ENV !== 'production' ||
      val !== 'mock' ||
      process.env.ALLOW_MOCK_BILLING === 'true',
    {
      message:
        'BILLING_DEFAULT_PROVIDER=mock in production requires ALLOW_MOCK_BILLING=true as an explicit opt-in. ' +
        'This is almost always a missing STRIPE_SECRET_KEY/MERCADOPAGO_ACCESS_TOKEN, not an intentional choice.',
    },
  ),
```

This must be a startup-time Zod validation failure (the app fails to boot),
not a runtime warning — matches how the rest of `env.ts` already fails
closed on missing required values.

- [x] **Step 3: Add the regression test**

```ts
// src/env.test.ts
it('refuses to boot with mock billing in production without explicit opt-in', () => {
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubEnv('BILLING_DEFAULT_PROVIDER', 'mock');
  vi.stubEnv('ALLOW_MOCK_BILLING', undefined);

  expect(() => loadEnv()).toThrow(/ALLOW_MOCK_BILLING/);
});

it('boots with mock billing in production when explicitly allowed', () => {
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubEnv('BILLING_DEFAULT_PROVIDER', 'mock');
  vi.stubEnv('ALLOW_MOCK_BILLING', 'true');

  expect(() => loadEnv()).not.toThrow();
});
```

(Adapt to however `env.ts` is actually invoked/tested today — this
project's existing `env.test.ts`, if one exists, sets the pattern to
follow; check before inventing a new one.)

- [x] **Step 4: Keep strict server-only env validation**

No provider secret may be prefixed `NEXT_PUBLIC_`.

- [x] **Step 5: Verify registry behavior**

Tests should prove missing credentials do not register real providers and
mock remains explicit/default for local development.

- [x] **Step 6: Verify and commit**

```bash
pnpm test -- src/lib/billing
pnpm test -- src/env.test.ts
pnpm typecheck
pnpm lint

git add src/env.ts src/env.test.ts .env.example src/lib/billing/registry.ts src/lib/billing

git commit -m "chore: harden billing provider configuration and fail closed on mock in production"
```

---

## Task 10: Final core verification and PR gate

**Files:** No production code unless a failing verification exposes a bug;
if it does, fix it in this branch.

- [x] **Step 1: Run the lightweight/static gates first**

```bash
pnpm typecheck
pnpm lint
pnpm format:check
```

- [x] **Step 2: Run unit tests**

```bash
pnpm test
```

- [x] **Step 3: Run Supabase DB verification sequentially**

```bash
pnpm supa:test
pnpm supa:lint
pnpm supa:gen:types:check
```

- [x] **Step 4: Do not start a production build in parallel with DB/test commands**

If the repository's PR policy requires build/E2E for this branch, run them
sequentially after the prior commands finish:

```bash
pnpm build
pnpm test:e2e
```

- [x] **Step 5: Inspect the diff for forbidden patterns**

```bash
git diff --check
git grep -n "console\.log" -- src || true
git grep -n "auth\.uid()" -- supabase || true
```

Review every `auth.uid()` match manually; valid project SQL must use
`(select auth.uid())`.

- [x] **Step 6: Final commit only if needed**

Before any final fixup commit, rerun `pnpm typecheck && pnpm lint`. Use an
appropriate conventional commit message for the actual fix; do not create
an empty ceremonial commit.

- [x] **Step 7: Open PR with evidence**

PR description must include: schema changes and migration filename;
invariants now enforced; tests added; commands run and results; explicit
note that Stripe/MP provider certification is not yet complete unless
those provider plans were also executed; no production PSP credentials or
sensitive payloads.

After review/CI approval, merge using:

```bash
gh pr merge --squash --delete-branch
```

---

## Completion criteria for Billing Core v2

The core plan is complete only when all statements are true:

- no webhook code defaults a missing plan to Free;
- invoice/payment events cannot modify plan/period through their type or
  persistence API;
- provider event idempotency is `(provider, external_event_id)`;
- provider subscription identity is unique by
  `(provider, external_subscription_id)`;
- one account may have customer identities in multiple providers;
- provider prices support outbound and reverse lookup;
- payment failures can be persisted as attempts;
- a second paid checkout is blocked;
- UI derives actions from provider capabilities;
- billing webhook processing captures unexpected failures in Sentry;
- **`NODE_ENV=production` with `BILLING_DEFAULT_PROVIDER=mock` refuses to
  boot without `ALLOW_MOCK_BILLING=true` (added — not in the original
  three documents);**
- all touched Supabase schema changes have migration + schema mirror;
- typecheck, lint, relevant Vitest, pgTAP, and DB lint pass.

This gate is closed. Phase 2 (Mercado Pago reference certification) is the
next implementation phase.
