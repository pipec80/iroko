# Mercado Pago v1 Chile internal acceptance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:executing-plans` to execute this acceptance plan sequentially.
> Steps use checkbox (`- [ ]`) syntax for tracking. Provider and Cloud mutations
> require the explicit authorization gates below.

**Goal:** Decide MP-01–MP-15 individually from sanitized provider, Cloud,
database and UI evidence for Iroko's own Chilean v1.

**Architecture:** Treat each scenario as an independent evidence chain joined
by opaque aliases: provider application/seller, preapproval, authorized
payment, payment, local account/subscription/invoice/attempt/event and visible
UI. Passing one scenario never substitutes for another.

**Tech Stack:** Mercado Pago test/sandbox tools and API, deployed Next.js app,
Supabase SQL, Vercel/Supabase diagnostics, Markdown evidence.

**Spec:**
[`docs/architecture/mercadopago-reliability-design.md`](../../architecture/mercadopago-reliability-design.md#delivery-i--rollout-and-internal-acceptance)

**Status note — 2026-09-23:** the authoritative state of each scenario is the
[v1 Chile matrix](011-mercadopago-v1-chile-acceptance.md), not the checkboxes
below, which were not maintained as steps ran. Where evidence stands: Steps for
MP-01, 02, 05, 06 (rejection and alert), 07, 11, 13 and 15 have real correlated
evidence; MP-04 is partial (resume observed; provider behaviors measured;
simultaneous requests pending); MP-14 is partial (Cloud lease drill and a real
failing scan); MP-03 waits for the real charge due 2026-10-22; MP-12 has no
completed scan yet after two defects found on first contact (#205, #208);
MP-09/10 cannot be exercised with test accounts (the API refuses refunds for
their credentials) and stay pending for a productive account. Do not check a
box from this note.

## Global Constraints

- Scope is own-use Chile, monthly CLP, hosted checkout and pending preapproval
  without an associated plan.
- Keep Free / Plus / Pro, CLP 0 / 19.990 / 102.990 and slugs
  `free` / `pro` / `scale`.
- No trial, upgrade/downgrade, Iroko-initiated pause, in-app card management or
  annual checkout is accepted or tested as v1 functionality.
- This is Iroko internal acceptance, not an official Mercado Pago
  certification.
- Every Mercado Pago or Cloudflare scenario uses the fixed official origin
  `https://project-a89lv.vercel.app`. A temporary Vercel deployment URL is not
  eligible because webhooks are configured for the stable origin.
- Record deployment revision, UTC timestamps and sanitized aliases. Never
  record credentials, payer email, card data, signatures or raw payloads.
- Every provider charge, refund, cancellation, test-user creation or Cloud
  mutation requires explicit authorization for the named environment and
  scenario.
- A scenario is `verified`, `failed` or `[NO VERIFICADO]`; partial evidence does
  not become a pass.

---

### Task 1: Freeze the acceptance candidate and evidence template

**Files:**

- Create: `docs/quality/mercadopago-v1-chile-acceptance-evidence.md`
- Modify: `docs/quality/operational-evidence.md`

**Interfaces:**

- Consumes: completed local gates 011a–011d and successful rollout 011e.
- Produces: immutable acceptance header and one evidence row per MP ID.

- [ ] **Step 1: Capture revision and runtime identity read-only**

Record Git SHA, deployment ID/stable URL, local/linked migration versions,
worker health for both modes, Mercado Pago credential environment type and
application/seller identifiers. Hash external identifiers with a documented
one-way local scheme and keep only 10-character aliases.

- [ ] **Step 2: Prove credential/application/seller coherence (MP-15)**

With the configured access token, read one known preapproval created by the
target deployment and verify its `application_id`/`collector_id` against the
approved environment inventory. Deliver one signed test notification to the
configured webhook and verify it resolves to the same deployment/account.
Record only boolean comparisons and aliases.

- [ ] **Step 3: Create the fixed evidence schema**

Use this table for every scenario:

```markdown
| Field                                      | Evidence                   |
| ------------------------------------------ | -------------------------- |
| MP requirement                             | MP-01                      |
| Result                                     | [NO VERIFICADO]            |
| Git SHA / deployment                       | recorded aliases           |
| UTC start / end                            | ISO-8601                   |
| Provider environment / app / seller        | sanitized aliases          |
| Account / subscription / invoice / payment | sanitized aliases          |
| Provider observation                       | bounded normalized fields  |
| Local DB observation                       | table/status/count summary |
| UI observation                             | exact visible state/copy   |
| Replay/recovery observation                | count and final state      |
| Reviewer                                   | repository identity        |
| Remaining gap                              | exact unmet assertion      |
```

Replace the example MP ID for each real row; do not leave example content in
the final evidence file.

- [ ] **Step 4: Request scenario authorization**

Present the exact environments, maximum number/value of test charges,
cancellations/refunds and test data to be created. Continue only after explicit
authorization; the worker rollout approval does not authorize financial
scenarios automatically.

- [ ] **Step 5: Commit the candidate and evidence template**

```bash
git add docs/quality/mercadopago-v1-chile-acceptance-evidence.md docs/quality/operational-evidence.md
git commit -m "docs: freeze Mercado Pago acceptance candidate"
```

### Task 2: Accept checkout, first charge, renewal and event ordering

**Files:**

- Modify: `docs/quality/mercadopago-v1-chile-acceptance-evidence.md`

**Interfaces:**

- Produces: independent MP-01–MP-05 decisions.

- [ ] **Step 1: Execute enrollment and authorization (MP-01)**

From an owner/admin account, choose Plus monthly. Verify one local reserved
intent precedes the provider POST, the hosted URL belongs to Mercado Pago, the
preapproval has no associated plan ID, currency is CLP, amount is 19.990 and
status begins pending. Complete authorization and verify the same local account
and selected `pro` plan become correlated; a member/non-admin attempt remains
rejected.

- [ ] **Step 2: Verify the first charge (MP-02)**

Correlate one authorized-payment invoice and nested payment. Verify distinct
external invoice/payment IDs, exact amount/currency, actual approval/debit time,
one local invoice, one payment attempt and one normalized event. Confirm the UI
shows the plan/invoice and no trial.

- [ ] **Step 3: Verify a later renewal (MP-03)**

Observe a later recurring authorized payment for the same preapproval. It must
have new invoice/payment aliases and extend the paid-through period once. A new
preapproval or manual replay of the first invoice is not renewal evidence. If
the provider test environment cannot accelerate renewal, keep MP-03
`[NO VERIFICADO]` until a real later quota occurs.

- [ ] **Step 4: Verify concurrency, resume and unknown outcome (MP-04)**

Issue two simultaneous checkout requests for one fresh account/plan and prove
only one remote preapproval exists. Revisit the flow and prove the known URL is
resumed without another POST. In the approved sandbox, interrupt the response
after remote creation and verify the intent becomes/resolves from
`needs_review` through provider lookup, never blind recreation.

- [ ] **Step 5: Verify signatures, replay, ordering and correlation (MP-05)**

Run each case separately:

1. invalid signature returns rejection and creates no event/job;
2. exact valid notification replay creates no second ledger effect;
3. payment notification before local correlation queues recovery and later
   converges to the correct account;
4. old failed delivery after a newer approved payment does not regress health,
   subscription or period;
5. webhook and snapshot race yields CAS stale/no duplicate effect;
6. a foreign account cannot claim the subscription/invoice/payment.

Record provider delivery ID aliases, HTTP statuses and before/after row counts.

- [ ] **Step 6: Commit MP-01–MP-05 evidence**

```bash
git add docs/quality/mercadopago-v1-chile-acceptance-evidence.md
git commit -m "docs: record Mercado Pago checkout evidence"
```

### Task 3: Accept rejection/recovery, cancellation and abandoned checkout

**Files:**

- Modify: `docs/quality/mercadopago-v1-chile-acceptance-evidence.md`

**Interfaces:**

- Produces: independent MP-06–MP-08 decisions.

- [ ] **Step 1: Verify rejected payment and recovery (MP-06)**

Cause a provider-supported test rejection, then inspect one failed local attempt
and `attention_required` UI while subscription status/access remain unchanged.
Allow the provider retry or approved recovery path and verify an equal-or-newer
paid/recovered attempt changes health to `healthy` without fabricating
`past_due`, a retry date or an access cutoff.

- [ ] **Step 2: Verify provider-confirmed cancellation and paid-through access (MP-07)**

Cancel from Iroko and require the Mercado Pago response to confirm terminal
status before local change. Verify future billing stops. Confirm access remains
through the invoice-backed `current_period_end` and falls to Free after that
boundary. Exercise a late cancellation webhook and snapshot replay; neither may
shorten the verified paid period or recreate access after expiry.

- [ ] **Step 3: Verify abandoned/ambiguous checkout procedure (MP-08)**

Abandon one known-URL checkout and prove it remains resumable. For a separate
unknown outcome, execute the runbook's read-only provider investigation. If no
remote resource exists, use the separately authorized private resolver and
verify its immutable audit fields; if one exists, attach/reduce it. Prove a
lease timeout alone never creates a new preapproval.

- [ ] **Step 4: Commit MP-06–MP-08 evidence**

```bash
git add docs/quality/mercadopago-v1-chile-acceptance-evidence.md
git commit -m "docs: record Mercado Pago lifecycle evidence"
```

### Task 4: Accept financial anomalies and recovery/discovery workers

**Files:**

- Modify: `docs/quality/mercadopago-v1-chile-acceptance-evidence.md`

**Interfaces:**

- Produces: independent MP-09–MP-14 decisions.

- [ ] **Step 1: Verify full refund, chargeback and mediation (MP-09)**

Exercise each provider-supported test state separately. Verify one deduplicated
open anomaly with correct type/resource alias and repeated observation count.
Confirm no subscription/access mutation. Execute manual resolution only after
provider review and record resolver/time/code. If the test environment cannot
produce chargeback or mediation, leave that sub-scenario `[NO VERIFICADO]` and
MP-09 open.

- [ ] **Step 2: Verify partial refund (MP-10)**

Refund an authorized subset of one payment. Verify original and affected CLP
amounts, type `partial_refund`, one deduplicated anomaly and unchanged access.
Confirm it is not recorded as a full refund. Do not treat a mocked local row as
provider acceptance.

- [ ] **Step 3: Verify known-payment recovery (MP-11)**

Create or retain a provider payment whose notification produces a durable known
payment job. Run recovery through the scheduled path, verify backoff/lease and
event correlation, then rerun to prove one ledger effect. Inspect the provider
resource before classifying any pending job as unrelated.

- [ ] **Step 4: Verify wholly omitted invoice discovery (MP-12)**

Suppress only Iroko's receipt of one authorized-payment webhook while allowing
the real provider invoice/payment to exist. Run reconciliation and verify
paginated discovery creates the missing normalized invoice/payment/event once.
Replay and confirm counts remain stable.

- [ ] **Step 5: Verify real worker execution (MP-13)**

Reference plan 011e evidence showing matching secret/URL/application inventory,
two manual and two scheduled invocations for each mode, HTTP 200 and correlated
health plus durable effects. Recheck current health because evidence expires
after 48 hours or any configuration change.

- [ ] **Step 6: Verify failure, progress and interruption recovery (MP-14)**

In the approved sandbox, process more than 20 due candidates with one provider
failure and one interrupted lease. Verify later candidates progress, the lease
is reclaimed, an intermediate invoice cursor resumes, watermark advances only
after completion and replay creates no duplicate ledger effects.

- [ ] **Step 7: Commit MP-09–MP-14 evidence**

```bash
git add docs/quality/mercadopago-v1-chile-acceptance-evidence.md
git commit -m "docs: record Mercado Pago recovery evidence"
```

### Task 5: Review and decide internal acceptance

**Files:**

- Modify: `docs/quality/mercadopago-v1-chile-acceptance-evidence.md`
- Modify: `docs/exec-plans/active/011-mercadopago-v1-chile-acceptance.md`
- Modify: `docs/exec-plans/active/011-phase2-mercadopago-tasks.md`
- Modify: `docs/exec-plans/active/011-phase6-reconciliation-tasks.md`
- Modify: `docs/exec-plans/active/011-billing-correctness.md`
- Modify: `docs/current-state.md`
- Modify: `docs/index.md`
- Modify: `docs/quality/operational-evidence.md`

**Interfaces:**

- Consumes: all evidence from Tasks 1–4.
- Produces: reviewed acceptance decision for the Mercado Pago v1 Chile slice.

- [ ] **Step 1: Perform a row-by-row evidence review**

For MP-01 through MP-15, require official reference, deployed code revision,
local test evidence, provider/runtime evidence, sanitized correlation and a
named reviewer. Mark a row verified only if its exact pending statement has
been satisfied. Renewal, failure/recovery, cancellation boundary, partial
refund and omitted invoice each require their own evidence.

- [ ] **Step 2: Separate code, operation and acceptance status**

Update each document using only `implementado`, `probado localmente`,
`verificado en proveedor`, `pendiente operacional` and `fuera de v1`. Keep
Plan 011 active for Stripe/Paddle/Lemon Squeezy even if the Mercado Pago slice
passes. Do not call the result an official provider certification or general
production readiness.

- [ ] **Step 3: Run fresh repository gates**

Run:

```bash
pnpm test src/lib/billing
pnpm test "dashboard/billing/__tests__/actions"
pnpm test src/app/api/internal/billing/worker/__tests__/route.test.ts
pnpm supa:test
pnpm typecheck
pnpm lint
pnpm docs:check
pnpm test:docs-check
git diff --check
```

Expected: every command exits 0. A green repository gate supports the code
revision but cannot replace provider evidence.

- [ ] **Step 4: Obtain independent internal review**

Have a reviewer compare every evidence row against the matrix and deployed
revision. Record `accepted`, `rejected` or `[NO VERIFICADO]` per row plus review
UTC timestamp. Any open required row keeps Mercado Pago acceptance pending.

- [ ] **Step 5: Commit the acceptance record**

```bash
git add docs/quality/mercadopago-v1-chile-acceptance-evidence.md docs/exec-plans/active/011-mercadopago-v1-chile-acceptance.md docs/exec-plans/active/011-phase2-mercadopago-tasks.md docs/exec-plans/active/011-phase6-reconciliation-tasks.md docs/exec-plans/active/011-billing-correctness.md docs/current-state.md docs/index.md docs/quality/operational-evidence.md
git commit -m "docs: record Mercado Pago v1 Chile acceptance"
```
