# Execution Plan Lifecycle

Execution plans translate approved scope into bounded work and acceptance
criteria. Their directory records lifecycle; it does not by itself authorize
execution or prove a result.

## Lifecycle

- **Active** — bounded work in the current MVP freeze. The
  [roadmap](../../ROADMAP.md) owns its execution order.
- **Deferred** — preserved work outside the freeze or waiting for an explicit
  product decision, provider condition, credential or operational window.
  Deferred does not mean completed or rejected.
- **Completed** — the plan's Definition of Done and acceptance criteria were
  satisfied with recorded evidence. A directory move alone cannot establish
  completion.

The [current state](../current-state.md) owns verified implementation and
operational status. Plans may describe intended work and historical evidence,
but they do not override newer executable code, tests, configuration,
migrations or dated observations.

## Current freeze

Active product plans are:

- [Plan 012 — security hardening and pricing truth](active/012-security-hardening-and-pricing-truth.md)
- [Plan 014 — reference-surface correctness](active/014-reference-surface-correctness.md)
- [Plan 015 — reusable-foundation acceptance](active/015-reusable-foundation-acceptance.md)
- [Plan 016 — Next.js and Supabase code review](active/016-nextjs-supabase-code-review.md)

The documentation-freeze maintenance plan remains active only while this
reorganization is being executed. Read the root roadmap for the single ordered
queue.

## Deferred and completed records

- [Plan 011 billing family](deferred/011-billing/README.md)
- [Plan 013 — commercial preparation](deferred/013-launch-readiness-roadmap.md)
- [Completed plans](completed/)

Reactivate deferred work only through an explicit product decision and matching
roadmap/current-state update. Preserve scenario-specific evidence and its date
when changing lifecycle.
