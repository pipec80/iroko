# Phase 6 (PR-8) — Reconciliation and production hardening: task-by-task implementation plan

> For agentic workers: REQUIRED SUB-SKILL: use `superpowers:subagent-driven-development`
> (recommended) or `superpowers:executing-plans` to implement this plan
> task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> Detailed breakdown of **Phase 6** from
> [`011-billing-correctness.md`](011-billing-correctness.md). Corresponds
> to PR-8 — depends on PR-4 (Mercado Pago contract implemented, the reference
> `getSubscriptionSnapshot` implementation), then extends to Stripe,
> Paddle and Lemon Squeezy as their own phases merge. It can start with
> Mercado Pago-only coverage and does not need to wait for all providers.

## Mercado Pago reliability slice (approved 2026-09-09)

**Implemented on inspected `main` at `66bc9b2` (2026-09-11):** durable
payment recovery, deduplicated financial anomalies, CAS-protected subscription
reconciliation, Node worker and operator runbook. Stripe, Paddle and Lemon
Squeezy do not block this slice. **Acceptance and operations remain open** in
[MP-08–14 of the v1 Chile matrix](011-mercadopago-v1-chile-acceptance.md).

For this slice, the scheduling decision is settled: `pg_cron` invokes a stable
internal Vercel route running on Node, authenticated by
`X-Billing-Worker-Secret`. Node owns Supabase admin access, the existing
reducer, Sentry, and PostHog; no reducer logic is copied to Deno. The approved schedule is recovery
every five minutes, reconciliation hourly, with batches of 20, a 45-second
invocation budget, at most five concurrent provider calls, and 10-second fetch
timeouts. Cron activation, Vault values, Cloud migrations, deployment, and
provider certification remain separately authorized rollout operations.

The implementation supersedes the original Edge Function/Vercel Cron choice
and illustrative interfaces below. Tasks 1–3/5/6 retain historical
steps as **planning examples, not a current missing-code list or observed
RED/GREEN record**. Use this status mapping before any implementation:

| Historical task  | Current replacement and acceptance boundary                                                                                                |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 1 Snapshot       | Implemented in `providers/mercadopago.ts`; HTTP 404 currently throws, unlike the old null-return example. Failure behavior remains MP-14.  |
| 2 Reconciliation | `reconciliation.ts`, reducer and migration `20260909190000`: CAS, batches of 20, groups of 5. Progress/failure isolation remain open.      |
| 3 Drift capture  | Persistent `financial_anomalies` and recovery alerts exist; the old blanket Sentry/PostHog claim does not prove every alert path.          |
| 4 Schedule       | Node route, Vault dispatcher and health RPC implemented; activation and actual results remain pending.                                     |
| 5 Idempotency    | Vitest recovery/reconciliation and SQL 37/38 cover leases, deduplication and CAS. Complete concurrent/multi-batch acceptance remains open. |
| 6 Runbook        | `docs/runbooks/billing-reconciliation.md` exists; incident/rollout acceptance remains operational work.                                    |

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
grants and proportional validation. Cloud, commit/push/merge and deployment
operations remain subject to explicit task authorization. The implemented
Mercado Pago runtime is `pg_cron` → `pg_net` → Node route. The old file map and
Tasks 1–3/5/6 are preserved historical design, not instructions to create an
additional worker.

---

## Historical file map — superseded for Mercado Pago

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
- Modify: `src/lib/billing/providers/mercadopago.ts` (reference implementation)
- Extend: `src/lib/billing/providers/__tests__/mercadopago.test.ts`

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

- **Historical step 1: Test (Mercado Pago as reference)**

```ts
it('fetches the current subscription state directly from Mercado Pago, not from local cache', async () => {
  fetchMock.mockResolvedValue({
    ok: true,
    json: async () => ({
      id: 'pa_123',
      status: 'authorized',
      next_payment_date: '2026-10-01T00:00:00.000-04:00',
    }),
  });

  const snapshot = await mercadopagoProvider.getSubscriptionSnapshot('pa_123');

  expect(fetchMock).toHaveBeenCalledWith(
    expect.stringContaining('/preapproval/pa_123'),
    expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer TEST-token' }),
    }),
  );
  expect(snapshot).toMatchObject({ status: 'active', cancelAtPeriodEnd: false });
});

it('returns null when the subscription no longer exists at the provider', async () => {
  fetchMock.mockResolvedValue({ ok: false, status: 404 });
  expect(await mercadopagoProvider.getSubscriptionSnapshot('pa_gone')).toBeNull();
});
```

- **Historical step 2: Implement for Mercado Pago**

```ts
async getSubscriptionSnapshot(externalSubscriptionId: string): Promise<SubscriptionSnapshot | null> {
  try {
    const preapproval = await fetchResource<MercadoPagoPreapproval>(
      `/preapproval/${externalSubscriptionId}`,
    );
    return {
      externalSubscriptionId: preapproval.id,
      // Mercado Pago's pending-preapproval flow has no reusable remote price;
      // the local provisional subscription owns the selected plan_id.
      status: mapPreapprovalStatus(preapproval.status),
      currentPeriodEnd: preapproval.next_payment_date,
      cancelAtPeriodEnd: false,
    };
  } catch (error) {
    if (error instanceof Error && error.message === 'mercadopago_fetch_failed_404') return null;
    throw error;
  }
}
```

- **Historical step 3: Verify and commit**

```bash
pnpm test -- src/lib/billing/providers/__tests__/mercadopago.test.ts
pnpm typecheck && pnpm lint

git add src/lib/billing/types.ts src/lib/billing/providers/mercadopago.ts
git commit -m "feat: add getSubscriptionSnapshot to the Mercado Pago provider"
```

Repeat for Stripe after Phase 3, then Paddle/Lemon Squeezy when Phases 4/5
land. Each addition is its own small
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

- **Historical step 1: Test**

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

- **Historical step 2: Implement — define "safe deterministic" precisely, don't
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

- **Historical step 3: Verify and commit**

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

- **Historical step 1: Test**

```ts
it('emits billing_reconciliation_drift to PostHog with provider and subscription id, no raw payloads', async () => {
  // as in Task 2's drift test — assert the exact event name and property
  // shape from design spec section 11 (Observability > PostHog)
});

it('captures ambiguous drift to Sentry with low-cardinality tags, no PII', async () => {
  // tags: { billing_provider, billing_operation: 'reconciliation_drift' }
});
```

- **Historical step 2: Implement using the existing `captureBillingException`
  helper from Phase 1 (Task 6)** — do not build a second Sentry
  integration path.

- **Historical step 3: Verify and commit**

```bash
pnpm test -- src/lib/billing/__tests__/reconciliation.test.ts
pnpm typecheck && pnpm lint
```

---

## Task 4: Scheduled execution

**Implementation status (2026-09-10): code shipped, NOT scheduled in Cloud.**

The worker was built as a **Vercel route**, not a Supabase Edge Function
(migration `20260909190000_billing_reconciliation_worker.sql`):

- `POST /api/internal/billing/worker` (`src/app/api/internal/billing/worker/route.ts`)
  — `runtime = 'nodejs'`, body `{ "mode": "recovery" | "reconciliation" }`,
  authenticated by header `x-billing-worker-secret` compared with
  `env.BILLING_RECONCILIATION_SECRET` via `timingSafeEqual`.
- `private.invoke_billing_worker(p_mode)` reads two Vault secrets
  (`billing_worker_url`, `billing_reconciliation_secret`) and `net.http_post`s
  to `<billing_worker_url>/api/internal/billing/worker`, recording the request
  id in `private.billing_worker_health`.
- `public.claim_billing_recovery_jobs` / `complete_billing_recovery_job` and
  `public.get_billing_reconciliation_candidates` / `apply_billing_reconciliation_snapshot`
  back the two modes.

The recorded QA run on 2026-09-10 observed the sandbox webhook/reducer
circuit but left the worker **off**, with pending `unlinked_payment` jobs.
Current queue/Cloud state is **[NO VERIFICADO]**. Later events may have linked
a particular payment, but this does not make all pending jobs cosmetic or
prove their outcome. Inspect each resource and demonstrate idempotent
resolution. A running worker still does not discover invoices whose IDs never
reached Iroko; see the additional gates below.

### Remaining activation checklist (Cloud / Vercel writes need explicit authorization)

Reinspect current configuration read-only before rollout; missing items below
are the 2026-09-10 observation, not a fresh inventory. Validate manual
invocation before enabling schedules, then check both scheduled modes.

- [ ] **Step 1: Generate a shared secret** (≥ 32 chars).
- [ ] **Step 2: Vercel** — set `BILLING_RECONCILIATION_SECRET` = the secret,
      Production scope, then redeploy production so the route picks it up.
- [ ] **Step 3: Supabase Vault** — create `billing_reconciliation_secret`
      (same value) and `billing_worker_url` (= the canonical production URL,
      currently `https://project-a89lv.vercel.app`).
- [ ] **Step 4: Vercel Firewall** — add a custom rule bypassing Bot Protection
      for `/api/internal/billing/` (path prefix → action `bypass`), like
      `allow-payment-webhooks` for `/api/webhooks/`. Required because
      `net.http_post` from Postgres is a non-browser client and the project's
      Bot Protection is in **Challenge** mode → a bare request gets a 429
      "Vercel Security Checkpoint". The email worker does not need this because
      it targets a Supabase Edge Function (`/functions/v1/…`), not a Vercel
      route.
- [ ] **Step 5: pg_cron** —
      `select cron.schedule('billing-recovery-worker', '*/5 * * * *', $$select private.invoke_billing_worker('recovery')$$);`
      and
      `select cron.schedule('billing-reconciliation-worker', '0 * * * *', $$select private.invoke_billing_worker('reconciliation')$$);`
      (cadence per `docs/runbooks/billing-reconciliation.md`).
- [ ] **Step 6: Smoke test** — one manual `invoke_billing_worker('recovery')`,
      and one reconciliation invocation, then inspect `private.billing_worker_health`
      joined with `net._http_response`. Confirm HTTP success and actual ledger/job
      outcomes, then scheduled executions of both modes. Include a failed
      invocation and recovery, multiple batches and replay without extra effects.
      Cron success or HTTP 200 alone does not close this gate.

---

## Task 5: Idempotency and concurrency tests

**Files:**

- Modify: `src/lib/billing/__tests__/reconciliation.test.ts`

- **Historical step 1: Test**

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

- **Historical step 2: Verify and commit**

```bash
pnpm test -- src/lib/billing/__tests__/reconciliation.test.ts
pnpm typecheck && pnpm lint
```

---

## Task 6: Operational runbook

**Files:**

- Create: `docs/runbooks/billing-reconciliation.md`

- **Historical step 1: Write, following the existing runbook format**
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

- **Historical step 2: Commit**

```bash
git add docs/runbooks/billing-reconciliation.md
git commit -m "docs: add billing reconciliation runbook"
```

## Additional v1 Chile code and acceptance gates

These remain in Phase 6, not a new plan. See MP-08–14 in the matrix for
requirement, official source, code, tests and evidence. MP-08 completed its
local code/runbook gate through `011b`: the immutable resolver and procedure
are present and locally tested. Provider inspection, target-environment
execution and internal acceptance remain pending.

Execute them through
[`011b`](011b-mercadopago-checkout-resolution.md),
[`011c`](011c-mercadopago-financial-anomalies.md),
[`011d`](011d-mercadopago-invoice-discovery-reconciliation.md), then the
authorized rollout [`011e`](011e-mercadopago-worker-rollout.md) and internal
acceptance [`011f`](011f-mercadopago-internal-acceptance.md).

- [x] **Wholly missed invoices (MP-12) — código y prueba local:** la
      discovery paginada y acotada por suscripción conserva cursor/ventana en
      `billing.reconciliation_state`, normaliza eventos para el reducer común
      y el replay local es idempotente. El gate fresco de 011d pasó pgTAP
      559/559 y billing Vitest 216/216 el 2026-09-16. La omisión real del
      proveedor y su evidencia sanitizada siguen **[NO VERIFICADO]** hasta
      011e/011f.
- [x] **Progress between batches (MP-14) — código y prueba local:** el claim
      durable ordena `next_scan_at,subscription_id`, limita a 20 y avanza cada
      resultado; pgTAP cubre 25 candidatos, cursor, lease vencido y una segunda
      sesión `SKIP LOCKED`. La ruta y el worker aíslan fallos por candidato,
      limitan grupos a cinco y mantienen el presupuesto de 45 segundos. El
      gate fresco de 011d pasó pgTAP 559/559, billing Vitest 216/216 y route
      7/7 el 2026-09-16. No constituye observación de múltiples invocaciones
      Cloud ni una interrupción de proceso real: ambas quedan **[NO
      VERIFICADO]** para 011e/011f.
- [x] **Failure isolation (MP-14) — código y prueba local:** una falla de
      proveedor se registra con código acotado y backoff sin abandonar los
      candidatos posteriores; el lease vencido vuelve a ser reclamable. El
      drill combinado local queda especificado en el
      [runbook](../../runbooks/billing-reconciliation.md#local-only-multi-batch-interruption-drill)
      pero su ejecución única con las 25 filas y sus aliases aún no está
      registrada; no atribuirle una ejecución hasta capturar su evidencia.
- [ ] **Ordering and paid-through access (MP-03/05/07):** CAS rejects a local
      race; it alone does not prove remote version ordering, cancellation
      timestamps or that `next_payment_date` represents a paid period. Verify
      late failed/paid events and cancellation/snapshot convergence.
- [ ] **Anomalies and abandonment (MP-08/09/10):** MP-08's local
      code/runbook gate is complete, but its provider-reviewed, authorized
      operator execution and internal acceptance remain open. Validate partial
      refunds separately from status-only classification, actionable alerts and
      manual resolution, plus safe handling of old/unknown checkouts. Preserve
      the no-automatic-access-cut policy.

## Completion criteria for Phase 6

- **Scheduling is one open gate, not the only remaining task.** Close the
  additional code/acceptance gates and verify both modes under authorized
  rollout. Empty health is historical evidence from 2026-09-10; current Cloud
  execution remains **[NO VERIFICADO]**.
- La detección local de una invoice sin webhook conocido y su replay ya tienen
  código y pruebas; observar una omisión real del proveedor y su convergencia
  sigue **[NO VERIFICADO]** hasta 011e/011f.
- Safe drift (status/period/cancel flag) repairs through the same reducer
  webhooks use — no parallel write path.
- Ambiguous drift (price/plan mismatch, subscription gone at provider)
  never guesses — always `billing_reconciliation_drift` + Sentry.
- Dos sesiones locales ya demuestran `SKIP LOCKED`; la demostración de varias
  invocaciones Cloud, interrupción de proceso y replay operacional de MP-14
  sigue **[NO VERIFICADO]** hasta 011e/011f. El drill local de 25 filas está
  definido en el runbook y debe ejecutarse con evidencia sanitizada antes de
  trasladar ese estado a operación.
- Runbook exists and a person unfamiliar with the code could follow it
  during an incident.
- `pnpm typecheck && pnpm lint`, relevant Vitest, pgTAP pass.

## Program-level Definition of Done (all 6 phases)

Closing only the Mercado Pago slice does not close the whole phase or
four-provider program. Each later provider needs its own adapter, catalogue,
events, capabilities, reconciliation and tests. Once all required provider
slices close, cross back to
[`011-billing-correctness.md`](011-billing-correctness.md)'s program-level
Definition of Done — comprar en cualquiera de los 4 providers converge al
mismo estado interno, cancelar converge correctamente, y reconciliation
puede detectar/reparar un webhook perdido sin doble cobro ni inventar
estado.
