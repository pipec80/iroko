# Plan 011 — Mercado Pago reliability delivery roadmap

**Status:** Approved delivery roadmap; implementation active in sequential PRs.

**Goal:** Close the Mercado Pago correctness gaps without changing the hosted
subscription model or duplicating Plan 011's reconciliation work.

**Architecture:** Extend existing checkout services, PostgreSQL coordination
and the shared billing reducer. Keep webhook ingress in the existing runtime.

**Tech Stack:** Next.js, TypeScript, Supabase PostgreSQL, Vitest, pgTAP,
Playwright; no new dependency selected.

**Spec:** [Mercado Pago reliability design](../../architecture/mercadopago-reliability-design.md).

## Global constraints

- No Mercado Pago trial for now; no price or internal-slug changes.
- Financial anomalies are persisted and alerted; no automatic access cut.
- Follow AGENTS.md and read TESTING-PLAN.md before writing tests.
- Keep the existing provider/reducer boundary and Plan 011 ownership.
- Do not commit, push, merge, deploy or write to Cloud without authorization.
- Preserve local Reports API notes and existing branches/worktrees.

## Preparation gate

- [x] Review the design and ADR 0003 with the owner (approved 2026-09-09).
- [x] Verify live main, working-tree state and existing task plans before code
      work. The package was integrated from refreshed `origin/main` at
      `954e5d5`; the older documentation checkout remains preserved.
- [x] Integrate these documents without overwriting newer Phase 2/6 changes.
- [x] Resolve the Plan 012 pricing overlap explicitly: this delivery preserves
      slugs and only corrects the Mercado Pago trial promise.
- [x] Mark ADR 0003 Accepted after design approval.

## Delivery order and plan ownership

| Delivery | Existing owner | Independently reviewable outcome |
| --- | --- | --- |
| A: truthful checkout/dashboard | Phase 2 | No false trial, query errors remain errors, bounded account-correlated confirmation and loading UX |
| B: checkout coordination | Phase 2 | Concurrent creation is reserved before the API call; known pending checkout is reused; unknown outcomes cannot cause blind recreation |
| C: resource recovery/anomalies | Phase 6, Mercado Pago slice | Durable deferred work, shared-reducer repairs and deduplicated financial alerts with manual resolution |

Do not open a new top-level Plan 014 for the same billing work. Extend the
existing [Phase 2](011-phase2-mercadopago-tasks.md) and
[Phase 6](011-phase6-reconciliation-tasks.md) rather than maintaining competing
task lists. Preserve dated evidence and completed steps in those documents.

## Required task-plan handoff

The approved implementation plan supplies exact
file ownership, consumed/produced interfaces, runnable RED/GREEN regression
tests, implementation steps, verification commands and a review gate. Do not
execute this roadmap as though it contained the SQL or runtime contracts.

For A, inspect `src/app/[locale]/dashboard/billing/actions.ts`,
`src/components/dashboard/org/billing-tab.tsx` and their actual tests on the
execution baseline. Specify the error/empty/pending/confirmed result contract,
account-scoped cache behavior and translated messages.

For B, specify the checkout intent state machine and claim/resume operations
before creating migrations. Include remote-success/lost-response recovery and
compatibility with existing incomplete rows. A lease expiry cannot authorize
a fresh POST. Include SQL mirrors, generated types and concurrency/permission
tests; never invent an external-reference mapping independently of the adapter.

For C, extend the existing Phase 6 snapshot/reducer contract to cover deferred
payment correlation and persistent anomalies. Specify retry exhaustion,
claiming, version ordering and manual resolution. Settle worker runtime,
authentication, batch/time budget and scheduler cadence before enabling a
schedule; do not copy Next.js services directly into Deno without a reviewed
boundary. Update the Phase 6 operational runbook in that delivery.

## Review and acceptance matrix

| Scope | Required evidence |
| --- | --- |
| A | Trial suppression only for MP; RPC error is not an empty account; other-account return rejected; polling stops at 60 seconds; submit loader; four locales |
| B | Concurrent calls create one remote attempt; pending intent resumes; timeout remains unknown; account isolation; upgrade with existing incomplete rows |
| C | Duplicate/out-of-order delivery; deferred correlation succeeds or escalates; outage/retry bounds; refund/dispute anomaly persists with unchanged access; approved/cancellation timestamps use real evidence |
| Release | Sandbox provider state, local subscription/invoice/event and dashboard agree; duplicate replay has no extra effect; cancellation agrees with paid-through policy |

Run focused regression tests in RED then GREEN. Final code validation includes
`pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test` and `pnpm build`;
add relevant Playwright checks for A and `pnpm supa:test` plus generated-type
verification for SQL changes. A local reset requires a disposable local DB.
Cloud parity checks are read-only; migration application requires approval.

Update [operational evidence](../../quality/operational-evidence.md) with
sanitized, dated results only after execution. Passing delivery A does not
certify B/C or the full provider lifecycle. Do not move Plan 011 to completed
because Mercado Pago's first slice is done.

## Documentation validation

For this documentation package, run:

```powershell
pnpm docs:check
pnpm test:docs-check
git diff --check
```

Check formatting on only the touched Markdown files. No application tests or
Cloud writes are needed to claim that these proposal documents are prepared;
neither application behavior nor runtime health is certified by these checks.
