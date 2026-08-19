# Phase 6 (PR-8) — Reconciliation and production hardening: task-by-task implementation plan

> For agentic workers: REQUIRED SUB-SKILL: use `superpowers:subagent-driven-development`
> (recommended) or `superpowers:executing-plans` to implement this plan
> task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> Detailed breakdown of **Phase 6** from
> [`011-billing-correctness.md`](011-billing-correctness.md). Corresponds
> to PR-8 — depends on PR-4 (Stripe certified, the reference
> `getSubscriptionSnapshot` implementation), extends to cover each later
> provider (Paddle/Lemon Squeezy/MercadoPago) as their own phases merge.
> Can start with Stripe-only coverage and grow — it does not need to wait
> for all 4 providers to be done.

**Goal:** Webhooks are the primary source of truth; this phase adds the
safety net for when they are delayed, duplicated, or missed entirely — a
scheduled worker that compares PSP state against Iroko state and either
repairs safe deterministic differences through the same reducer used by
webhooks, or flags ambiguous drift for a human instead of guessing.

**Spec:** [`docs/architecture/billing-platform-v2-design.md`](../../architecture/billing-platform-v2-design.md),
section 12.

## Global Constraints

Same as Phase 1 — SOLID/DRY/KISS/YAGNI, early returns, no
`any`/`console.log`, manual migrations mirrored in `supabase/schemas/*.sql`,
`(select auth.uid())`, `SECURITY DEFINER` + `search_path=''` + explicit
grants, `pnpm typecheck && pnpm lint` before every commit, squash merge,
fix bugs found in-branch. Existing cron pattern in this project uses
`pg_cron` + Edge Functions (see `process-email-queue`) — follow that
precedent rather than introducing Vercel Cron unless there's a specific
reason Vercel Cron fits this job better (this task defaults to the
project's existing pattern; switch only with a documented reason).

---

## File map

**New**

- `src/lib/billing/reconciliation.ts` — the bounded worker.
- `src/lib/billing/__tests__/reconciliation.test.ts`
- `supabase/functions/billing-reconciliation/` (Edge Function, if
  following the existing `pg_cron` + Edge Function pattern) OR
  `src/app/api/cron/billing-reconciliation/route.ts` (if using Vercel
  Cron — pick one, document why in the PR).
- `supabase/migrations/<timestamp>_billing_reconciliation.sql` — adds
  whatever tracking columns/table the chosen approach needs (e.g. last
  reconciled timestamp per subscription) + mirror in
  `supabase/schemas/billing.sql`.
- `docs/runbooks/billing-reconciliation.md` — the operational runbook
  (Task 8; this repo already has a `docs/runbooks/` convention — see
  `email-queue.md`, `local-sync-and-codex.md` for the format to match).

**Modified**

- Each provider adapter (`stripe.ts`, `mercadopago.ts`, and later
  `paddle.ts`/`lemonsqueezy.ts` as they land) — add
  `getSubscriptionSnapshot()`.
- `src/lib/billing/types.ts` — add `getSubscriptionSnapshot` as an
  optional `PaymentProvider` method (optional because a provider without
  it just doesn't get reconciled yet — the worker skips it, it doesn't
  fail).

---

## Task 1: Define `getSubscriptionSnapshot()` and lock its contract with a test

**Files:**

- Modify: `src/lib/billing/types.ts`
- Modify: `src/lib/billing/providers/stripe.ts` (reference implementation)
- Create: `src/lib/billing/providers/__tests__/stripe.test.ts` additions

**Interfaces:**

```ts
export interface SubscriptionSnapshot {
  externalSubscriptionId: string;
  externalCustomerId?: string;
  externalPriceId?: string;
  status: SubscriptionStatus;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
}

// Added to PaymentProvider (types.ts) as optional:
getSubscriptionSnapshot?(externalSubscriptionId: string): Promise<SubscriptionSnapshot | null>;
```

- [ ] **Step 1: Test (Stripe as reference)**

```ts
it('fetches the current subscription state directly from Stripe, not from local cache', async () => {
  getStripeMock().subscriptions.retrieve.mockResolvedValue(FIXTURE_ACTIVE_SUBSCRIPTION);

  const snapshot = await stripeProvider.getSubscriptionSnapshot('sub_123');

  expect(getStripeMock().subscriptions.retrieve).toHaveBeenCalledWith('sub_123');
  expect(snapshot).toMatchObject({ status: 'active', cancelAtPeriodEnd: false });
});

it('returns null when the subscription no longer exists at the provider', async () => {
  getStripeMock().subscriptions.retrieve.mockRejectedValue({ code: 'resource_missing' });
  expect(await stripeProvider.getSubscriptionSnapshot('sub_gone')).toBeNull();
});
```

- [ ] **Step 2: Implement for Stripe**

```ts
async getSubscriptionSnapshot(externalSubscriptionId: string): Promise<SubscriptionSnapshot | null> {
  try {
    const sub = await getStripe().subscriptions.retrieve(externalSubscriptionId);
    const item = sub.items.data[0];
    return {
      externalSubscriptionId: sub.id,
      externalCustomerId: typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
      externalPriceId: item?.price.id,
      status: mapStatus(sub.status),
      currentPeriodEnd: item ? new Date(item.current_period_end * 1000).toISOString() : undefined,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    };
  } catch (error) {
    if (isStripeNotFoundError(error)) return null;
    throw error;
  }
}
```

- [ ] **Step 3: Verify and commit**

```bash
pnpm test -- src/lib/billing/providers/__tests__/stripe.test.ts
pnpm typecheck && pnpm lint

git add src/lib/billing/types.ts src/lib/billing/providers/stripe.ts
git commit -m "feat: add getSubscriptionSnapshot to the Stripe provider"
```

Repeat for MercadoPago (fetch `/preapproval/{id}`) once Phase 5 is merged;
Paddle/Lemon Squeezy when Phases 3/4 land. Each addition is its own small
commit against this same task shape — do not block this phase on every
provider having a snapshot method before shipping the worker with partial
coverage.

---

## Task 2: Bounded reconciliation service

**Files:**

- Create: `src/lib/billing/reconciliation.ts`
- Create: `src/lib/billing/__tests__/reconciliation.test.ts`

**Interfaces:**

```ts
export interface ReconciliationResult {
  scanned: number;
  repaired: number;
  drifted: number; // ambiguous, sent to Sentry/PostHog instead of repaired
  skipped: number; // provider has no getSubscriptionSnapshot yet
}

export async function reconcileNonTerminalSubscriptions(input: {
  batchSize: number;
}): Promise<ReconciliationResult>;
```

- [ ] **Step 1: Test**

```ts
it('scans only non-terminal subscriptions, bounded by batchSize', async () => {
  await reconcileNonTerminalSubscriptions({ batchSize: 50 });
  expect(queryNonTerminalSubscriptions).toHaveBeenCalledWith(
    expect.objectContaining({ limit: 50 }),
  );
});

it('repairs a safe deterministic drift (status changed) through the reducer', async () => {
  listNonTerminalSubscriptions.mockResolvedValue([LOCAL_ROW_STATUS_ACTIVE]);
  getSubscriptionSnapshotFor.mockResolvedValue({ ...SNAPSHOT, status: 'canceled' });

  const result = await reconcileNonTerminalSubscriptions({ batchSize: 50 });

  expect(reduceBillingEvent).toHaveBeenCalledWith(
    expect.objectContaining({ type: 'subscription_canceled' }),
  );
  expect(result.repaired).toBe(1);
});

it('does not repair a plan/price mismatch — flags drift instead of guessing', async () => {
  listNonTerminalSubscriptions.mockResolvedValue([LOCAL_ROW_PLAN_PRO]);
  getSubscriptionSnapshotFor.mockResolvedValue({
    ...SNAPSHOT,
    externalPriceId: 'price_unknown_to_iroko',
  });

  const result = await reconcileNonTerminalSubscriptions({ batchSize: 50 });

  expect(reduceBillingEvent).not.toHaveBeenCalled();
  expect(captureBillingReconciliationDrift).toHaveBeenCalled();
  expect(result.drifted).toBe(1);
});

it('skips subscriptions whose provider has no getSubscriptionSnapshot yet, without failing the batch', async () => {
  listNonTerminalSubscriptions.mockResolvedValue([LOCAL_ROW_PADDLE_BEFORE_SNAPSHOT_SUPPORT]);
  const result = await reconcileNonTerminalSubscriptions({ batchSize: 50 });
  expect(result.skipped).toBe(1);
});
```

- [ ] **Step 2: Implement — define "safe deterministic" precisely, don't
      leave it to judgment at call time**

Safe to repair via the reducer (design spec section 12): `status`
mismatch, `current_period_end` mismatch, `cancel_at_period_end` mismatch —
these map directly onto fields the reducer already knows how to apply from
a normal webhook event, so a drift repair is just "synthesize the event
the missed webhook would have sent" and pass it through
`reduceBillingEvent` (Fase 1) — same code path as a real webhook, not a
parallel one.

**Not safe, always flagged as drift, never guessed:** `externalPriceId`
mismatch (which Iroko plan is correct is not decidable from the snapshot
alone), a subscription that exists locally but the provider reports fully
gone (could mean deleted-and-recreated, could mean a data integrity bug —
a human should look), or any snapshot field the reducer has no defined
transition for.

- [ ] **Step 3: Verify and commit**

```bash
pnpm test -- src/lib/billing/__tests__/reconciliation.test.ts
pnpm typecheck && pnpm lint

git add src/lib/billing/reconciliation.ts src/lib/billing/__tests__/reconciliation.test.ts
git commit -m "feat: add bounded billing reconciliation service"
```

---

## Task 3: Ambiguous drift capture — Sentry + PostHog, never silent

**Files:**

- Modify: `src/lib/billing/reconciliation.ts`

- [ ] **Step 1: Test**

```ts
it('emits billing_reconciliation_drift to PostHog with provider and subscription id, no raw payloads', async () => {
  // as in Task 2's drift test — assert the exact event name and property
  // shape from design spec section 11 (Observability > PostHog)
});

it('captures ambiguous drift to Sentry with low-cardinality tags, no PII', async () => {
  // tags: { billing_provider, billing_operation: 'reconciliation_drift' }
});
```

- [ ] **Step 2: Implement using the existing `captureBillingException`
      helper from Phase 1 (Task 6)** — do not build a second Sentry
      integration path.

- [ ] **Step 3: Verify and commit**

```bash
pnpm test -- src/lib/billing/__tests__/reconciliation.test.ts
pnpm typecheck && pnpm lint
```

---

## Task 4: Scheduled execution

**Files:**

- Create: `supabase/functions/billing-reconciliation/` (Edge Function) +
  `supabase/migrations/<timestamp>_billing_reconciliation_cron.sql`
  (`pg_cron` schedule calling it, same pattern as
  `process-email-queue`/`cancel-mercadopago-subscriptions` from Phase 5)

- [ ] **Step 1: Confirm the existing cron+Edge-Function auth pattern**
      (service role, whatever header convention `process-email-queue` already
      established) before writing a new one.

- [ ] **Step 2: Implement the scheduled entrypoint calling
      `reconcileNonTerminalSubscriptions`**

- [ ] **Step 3: If choosing Vercel Cron instead** (only with a documented
      reason — e.g. needing Vercel's execution environment for a provider SDK
      that doesn't run well in Supabase's Edge runtime): protect the endpoint
      with `Authorization: Bearer ${CRON_SECRET}`, production only, and
      **verify the actual Vercel plan/cadence before relying on sub-daily
      scheduling** (design spec section 12 — Vercel Cron frequency limits
      differ by plan, confirm current limits rather than assuming).

- [ ] **Step 4: Verify and commit**

```bash
pnpm supa:reset
pnpm supa:test
pnpm typecheck && pnpm lint

git add supabase/migrations supabase/schemas/billing.sql supabase/functions/billing-reconciliation
git commit -m "feat: schedule billing reconciliation"
```

---

## Task 5: Idempotency and concurrency tests

**Files:**

- Modify: `src/lib/billing/__tests__/reconciliation.test.ts`

- [ ] **Step 1: Test**

```ts
it('running reconciliation twice on the same unchanged state repairs nothing the second time');
it('two concurrent reconciliation runs do not double-apply the same repair', async () => {
  // same idempotency guarantee the webhook path already has —
  // reduceBillingEvent's (provider, external_event_id) reservation
  // (Fase 1) is what actually prevents the double-apply here; this test
  // proves reconciliation's synthesized events go through that same gate,
  // not around it.
});
```

- [ ] **Step 2: Verify and commit**

```bash
pnpm test -- src/lib/billing/__tests__/reconciliation.test.ts
pnpm typecheck && pnpm lint
```

---

## Task 6: Operational runbook

**Files:**

- Create: `docs/runbooks/billing-reconciliation.md`

- [ ] **Step 1: Write, following the existing runbook format**
      (`docs/runbooks/email-queue.md` is the closest precedent — a scheduled
      worker with failure modes to diagnose). Cover: provider outage (what
      reconciliation does when a PSP API is down — does not crash the batch,
      logs and continues to the next subscription), webhook replay (how to
      manually re-trigger a specific missed webhook if reconciliation flags
      drift but can't safely repair it), failed reconciliation run (where to
      look — Sentry tag `billing_operation: reconciliation_drift`), manual
      inspection query (a copy-pasteable SQL query against
      `billing.subscriptions` joined with the provider to spot-check one
      account).

- [ ] **Step 2: Commit**

```bash
git add docs/runbooks/billing-reconciliation.md
git commit -m "docs: add billing reconciliation runbook"
```

## Completion criteria for Phase 6

- A missed webhook (simulated by manually diverging a test subscription's
  local status from its provider state) is detected by the next
  reconciliation run.
- Safe drift (status/period/cancel flag) repairs through the same reducer
  webhooks use — no parallel write path.
- Ambiguous drift (price/plan mismatch, subscription gone at provider)
  never guesses — always `billing_reconciliation_drift` + Sentry.
- Two concurrent runs cannot double-charge or double-repair — proven by
  the Task 5 concurrency test, not just asserted.
- Runbook exists and a person unfamiliar with the code could follow it
  during an incident.
- `pnpm typecheck && pnpm lint`, relevant Vitest, pgTAP pass.

## Program-level Definition of Done (all 6 phases)

Once Phase 6 closes, cross back to
[`011-billing-correctness.md`](011-billing-correctness.md)'s program-level
Definition of Done — comprar en cualquiera de los 4 providers converge al
mismo estado interno, cancelar converge correctamente, y reconciliation
puede detectar/reparar un webhook perdido sin doble cobro ni inventar
estado.
