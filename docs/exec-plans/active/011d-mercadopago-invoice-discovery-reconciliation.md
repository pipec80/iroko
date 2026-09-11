# Mercado Pago invoice discovery and fair reconciliation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:subagent-driven-development` (recommended) or
> `superpowers:executing-plans` to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Discover Mercado Pago invoices omitted by webhooks and reconcile all
due subscriptions with durable progress, bounded concurrency and per-candidate
failure isolation.

**Architecture:** Replace the stateless `updated_at LIMIT 20` scan with one
private reconciliation-state row per subscription. A lease-based claim/complete
protocol drives the existing Node worker; the provider adapter paginates
authorized payments by exact preapproval ID and emits only normalized events to
the shared reducer.

**Tech Stack:** PostgreSQL/Supabase migrations and pgTAP, strict TypeScript,
Mercado Pago REST API, Vitest, Next.js internal route.

**Spec:**
[`docs/architecture/mercadopago-reliability-design.md`](../../architecture/mercadopago-reliability-design.md#delivery-g--omitted-invoice-discovery)

## Global Constraints

- One provider-neutral `billing.reconciliation_state` row exists per
  subscription and is inaccessible to clients.
- Claims use `FOR UPDATE SKIP LOCKED`, at most 20 rows, ordered by
  `next_scan_at, subscription_id`.
- Provider calls run with at most five concurrent candidates and a 45-second
  invocation budget.
- Every candidate is completed as `completed`, `deferred`, `failed` or
  `skipped`; lease expiry recovers interrupted work.
- Invoice events always pass through `reduceBillingEvent`; duplicate provider
  event IDs do not create duplicate ledger effects.
- Mercado Pago's documented invoice search is offset/limit pagination. The
  cursor is local to one full scan and resets after completion; it is never a
  permanent provider offset.
- A watermark advances only after all pages in the current scan succeed.
- No linked Cloud mutation belongs to this implementation plan.

---

### Task 1: Build the durable reconciliation claim protocol

**Files:**

- Create: `supabase/migrations/20260911130000_billing_reconciliation_state.sql`
- Modify: `supabase/schemas/billing.sql`
- Modify: `supabase/schemas/public.sql`
- Test: `supabase/tests/database/42_billing_reconciliation_state.test.sql`
- Regenerate: `src/types/database.ts`

**Interfaces:**

- Produces:

```sql
public.claim_billing_reconciliation_candidates(
  p_batch_size integer,
  p_visibility_seconds integer,
  p_worker_id text
)
```

returning `subscription_id`, `account_id`, `provider`,
`external_subscription_id`, `subscription_updated_at`, `invoice_watermark` and
`scan_cursor`, plus `scan_watermark` accumulated within the active scan.

```sql
public.complete_billing_reconciliation_candidate(
  p_subscription_id uuid,
  p_worker_id text,
  p_outcome text,
  p_provider_watermark timestamptz,
  p_next_cursor text,
  p_error_code text
) RETURNS text
```

- [ ] **Step 1: Write failing pgTAP coverage**

Create 25 eligible subscriptions plus unsupported, terminal and missing-remote
fixtures. Assert:

- the state table and both RPCs exist;
- application roles cannot select or execute them;
- the first claim returns 20 unique due rows and the second concurrent claim
  returns the remaining 5;
- identical `next_scan_at` values are ordered by subscription UUID;
- completion moves unchanged/skipped rows forward so they do not starve later
  rows;
- `deferred` retains cursor and lease ownership rules;
- `failed` clears the lease, increments failure count and applies bounded
  exponential backoff;
- an expired lease is reclaimable and the old worker cannot complete it;
- only `completed` with `p_next_cursor IS NULL` advances the watermark and
  resets the cursor/failure count.

Use explicit assertions such as:

```sql
SELECT is(
  (SELECT count(*) FROM public.claim_billing_reconciliation_candidates(
    20, 900, 'worker-42-a')),
  20::bigint,
  'first worker claims one bounded page'
);
SELECT throws_like(
  $$ SELECT public.complete_billing_reconciliation_candidate(
    :'subscription_id', 'wrong-worker', 'completed', NULL, NULL, NULL) $$,
  '%billing_reconciliation_lease_not_owned%',
  'only the lease owner completes a candidate'
);
```

- [ ] **Step 2: Run test 42 and observe RED**

Run:
`supabase test db --local supabase/tests/database/42_billing_reconciliation_state.test.sql`

Expected: FAIL because the state table and claim/complete RPCs do not exist.

- [ ] **Step 3: Implement table creation and backfill**

Create `billing.reconciliation_state` with `subscription_id` as its primary
key/FK, `next_scan_at`, `lease_owner`, `lease_expires_at`,
`invoice_watermark`, `scan_cursor`, `failure_count CHECK BETWEEN 0 AND 10`,
`scan_watermark`, `last_error_code`, `last_completed_at` and timestamps. Add an index on
`(next_scan_at, subscription_id)`; the claim query evaluates lease expiry at
runtime because `now()` cannot appear in an immutable index predicate.

Backfill every subscription with a non-empty external subscription ID. Add an
`AFTER INSERT OR UPDATE OF external_subscription_id` trigger that inserts the
state row once. Never delete reconciliation history when a subscription becomes
terminal; completion schedules terminal rows far forward as `skipped`.

- [ ] **Step 4: Implement claim and completion semantics**

Claim validates batch `1..20`, visibility `30..1800` seconds and worker ID
length `1..100`, then uses a CTE with:

```sql
FOR UPDATE OF state SKIP LOCKED
LIMIT p_batch_size
```

Completion locks the state row, verifies the unexpired matching lease and
validates outcome. Use these delays: completed/unchanged one hour, skipped six
hours, deferred one minute, failed `LEAST(60, power(2, failure_count + 1))`
minutes. A deferred page stores the greatest of its `providerWatermark` and the
existing `scan_watermark`. Final completion advances `invoice_watermark` from
that accumulated value and clears both scan fields. Sanitize error codes to 100
characters. Drop the obsolete
`get_billing_reconciliation_candidates(integer)` function after all code callers
move in Task 3; until then keep it inside this migration only if the local reset
requires staged compatibility.

- [ ] **Step 5: Regenerate and observe GREEN**

Run:

```bash
pnpm supa:reset
pnpm supa:gen:types
supabase test db --local supabase/tests/database/42_billing_reconciliation_state.test.sql
supabase test db --local supabase/tests/database/38_billing_reconciliation_worker.test.sql
```

Expected: test 42 passes. Test 38 may remain RED only on its obsolete scan-RPC
assertion; update that assertion in Task 3 when the caller is replaced.

- [ ] **Step 6: Commit durable state**

```bash
git add supabase/migrations/20260911130000_billing_reconciliation_state.sql supabase/schemas/billing.sql supabase/schemas/public.sql supabase/tests/database/42_billing_reconciliation_state.test.sql src/types/database.ts
git commit -m "feat: add durable billing reconciliation claims"
```

### Task 2: Add paginated provider invoice discovery

**Files:**

- Modify: `src/lib/billing/types.ts`
- Modify: `src/lib/billing/providers/mercadopago.ts`
- Modify: `src/lib/billing/providers/__tests__/mercadopago.test.ts`

**Interfaces:**

- Produces:

```ts
export interface InvoiceDiscoveryInput {
  externalSubscriptionId: string;
  modifiedSince: string;
  pageSize: number;
  cursor?: string;
}

export interface InvoiceDiscoveryPage {
  events: NormalizedBillingEvent[];
  nextCursor: string | null;
  providerWatermark: string | null;
}
```

and optional
`PaymentProvider.discoverSubscriptionInvoices(input): Promise<InvoiceDiscoveryPage>`.

- [ ] **Step 1: Write failing pagination and identity tests**

Mock `/authorized_payments/search` pages and assert the request includes only
the exact encoded `preapproval_id`, bounded `limit` and parsed local `offset`.
Cover:

- two pages with 25 items and no duplicates;
- a page containing another preapproval ID, which is rejected rather than
  attributed;
- malformed paging totals/cursors;
- old items filtered from events by `modifiedSince` but still counted for page
  traversal;
- items without a valid `last_modified` emitted conservatively rather than
  skipped;
- approved, rejected and later approved invoices normalized through the same
  functions as webhooks;
- `providerWatermark` equals the greatest valid `last_modified` seen;
- final page returns `nextCursor: null`.

Use an opaque cursor format internal to the adapter:

```ts
type MercadoPagoInvoiceCursor = { offset: number };
```

Encode/decode it as base64url JSON and reject unknown keys, negative offsets or
offsets not divisible by the requested page size.

- [ ] **Step 2: Run provider tests and observe RED**

Run: `pnpm test src/lib/billing/providers/__tests__/mercadopago.test.ts`

Expected: FAIL because invoice discovery is absent.

- [ ] **Step 3: Implement bounded discovery**

Clamp `pageSize` to `1..20`. Build the request exactly from validated values:

```ts
const searchPath =
  `/authorized_payments/search?preapproval_id=${encodeURIComponent(input.externalSubscriptionId)}` +
  `&limit=${pageSize}&offset=${offset}`;
```

Validate `paging.offset`, `paging.limit`, `paging.total` and each result's exact
`preapproval_id`. Normalize each result using the existing authorized-payment
normalizer with deterministic external event IDs. Filter emitted events whose
valid `last_modified` is older than `modifiedSince`, while still advancing
pagination. Set `nextCursor` when `offset + resultCount < total`; use no
undocumented date/sort query parameter.

The official reference to recheck is
[Buscar en facturas](https://www.mercadopago.cl/developers/es/reference/online-payments/subscriptions/authorized-payment-search/get),
which documents `preapproval_id` and offset/limit paging.

- [ ] **Step 4: Run provider tests and observe GREEN**

Run:

```bash
pnpm test src/lib/billing/providers/__tests__/mercadopago.test.ts
pnpm typecheck
```

Expected: tests and typecheck pass.

- [ ] **Step 5: Commit provider discovery**

```bash
git add src/lib/billing/types.ts src/lib/billing/providers/mercadopago.ts src/lib/billing/providers/__tests__/mercadopago.test.ts
git commit -m "feat: discover Mercado Pago subscription invoices"
```

### Task 3: Make reconciliation fair and failure-isolated

**Files:**

- Modify: `src/lib/billing/reconciliation.ts`
- Modify: `src/lib/billing/__tests__/reconciliation.test.ts`
- Modify: `supabase/migrations/20260911130000_billing_reconciliation_state.sql`
- Modify: `supabase/schemas/public.sql`
- Modify: `supabase/tests/database/38_billing_reconciliation_worker.test.sql`
- Modify: `src/app/api/internal/billing/worker/__tests__/route.test.ts`

**Interfaces:**

- Consumes: claim/complete RPCs from Task 1 and provider invoice discovery from
  Task 2.
- Produces:

```ts
export interface ReconciliationSummary {
  scanned: number;
  repaired: number;
  stale: number;
  anomalous: number;
  skipped: number;
  failed: number;
  deferred: number;
}
```

- [ ] **Step 1: Write failing service cases**

Replace the candidate mock with claimed rows including `subscription_id`,
watermark and cursor. Assert:

- a stable snapshot is completed and does not occupy the next batch;
- one provider rejection increments `failed` while later candidates run;
- five candidates run concurrently, never six;
- budget exhaustion marks untouched claimed candidates `deferred` before
  returning;
- snapshot runs before invoice discovery for each candidate;
- every discovered event calls `reduceBillingEvent`;
- a duplicate reducer result still completes safely;
- an intermediate page stores its cursor as `deferred` and the next invocation
  resumes it;
- watermark advances only after the final page;
- identity mismatch creates an anomaly and completes without access mutation;
- completion-RPC failure surfaces as invocation failure because durable state is
  unknown.

- [ ] **Step 2: Run focused reconciliation tests and observe RED**

Run:

```bash
pnpm test src/lib/billing/__tests__/reconciliation.test.ts
pnpm test src/app/api/internal/billing/worker/__tests__/route.test.ts
```

Expected: FAIL because current `Promise.all` rejects the whole group and no
claim completion/cursor protocol exists.

- [ ] **Step 3: Implement one-candidate error boundaries**

Generate a worker ID with `crypto.randomUUID()`, claim up to 20 rows, and process
groups of five. Each candidate owns a `try/catch/finally` path that calls the
completion RPC exactly once. Map safe error codes with a closed union such as
`provider_timeout`, `provider_fetch_failed`, `reducer_failed` and
`anomaly_persistence_failed`; never store exception messages.

Run snapshot reconciliation first. Then call invoice discovery when supported,
passing the persisted watermark minus a 48-hour overlap (or epoch for the first
scan) and the current cursor. Apply every event sequentially for that
subscription to preserve provider ordering. Store an intermediate cursor as
`deferred`; complete only after `nextCursor === null`.

- [ ] **Step 4: Update SQL/route contracts and remove the old scan**

Update test 38 to assert the new service-only claim/complete RPCs and remove its
expectation for `get_billing_reconciliation_candidates`. Amend the migration
and schema mirror to drop the old RPC after the replacement exists. Extend the
route response tests to include `failed` and `deferred` counts and to retain the
same authenticated `mode: 'reconciliation'` contract.

- [ ] **Step 5: Run focused TypeScript and database GREEN**

Run:

```bash
pnpm test src/lib/billing/__tests__/reconciliation.test.ts
pnpm test src/app/api/internal/billing/worker/__tests__/route.test.ts
supabase test db --local supabase/tests/database/38_billing_reconciliation_worker.test.sql
supabase test db --local supabase/tests/database/42_billing_reconciliation_state.test.sql
pnpm typecheck
```

Expected: all commands pass.

- [ ] **Step 6: Commit worker resilience**

```bash
git add src/lib/billing/reconciliation.ts src/lib/billing/__tests__/reconciliation.test.ts src/app/api/internal/billing/worker/__tests__/route.test.ts supabase/tests/database/38_billing_reconciliation_worker.test.sql supabase/migrations/20260911130000_billing_reconciliation_state.sql supabase/schemas/public.sql
git commit -m "feat: make billing reconciliation resumable"
```

### Task 4: Prove multi-batch progress and synchronize Phase 6

**Files:**

- Modify: `docs/runbooks/billing-reconciliation.md`
- Modify: `docs/exec-plans/active/011-phase6-reconciliation-tasks.md`
- Modify: `docs/exec-plans/active/011-mercadopago-v1-chile-acceptance.md`

**Interfaces:**

- Consumes: Tasks 1–3.
- Produces: local code/test evidence for MP-12 and MP-14.

- [ ] **Step 1: Add the local interruption drill**

Document a disposable-local procedure that seeds 25 subscriptions, makes one
provider candidate fail, stops after a stored intermediate cursor, expires its
lease, invokes the worker again and verifies all 25 state rows move forward.
The evidence query must compare distinct local invoice/event/payment IDs before
and after replay.

- [ ] **Step 2: Run the complete local gate**

Run:

```bash
pnpm supa:stop
pnpm supa:start
pnpm supa:reset
pnpm supa:gen:types
pnpm supa:test
pnpm test src/lib/billing
pnpm test src/app/api/internal/billing/worker/__tests__/route.test.ts
pnpm typecheck
pnpm lint
pnpm docs:check
git diff --check
```

Expected: all commands exit 0 after a disposable reset/start. Record the exact
test counts and generated-type diff.

- [ ] **Step 3: Update Phase 6 and matrix status**

Mark the code portions of MP-12/14 implemented and locally tested only with the
fresh commands. Leave real provider omission, multi-invocation Cloud progress
and interruption recovery `[NO VERIFICADO]` for plans 011e/011f.

- [ ] **Step 4: Commit the verified handoff**

```bash
git add docs/runbooks/billing-reconciliation.md docs/exec-plans/active/011-phase6-reconciliation-tasks.md docs/exec-plans/active/011-mercadopago-v1-chile-acceptance.md
git commit -m "docs: record resumable reconciliation evidence"
```
