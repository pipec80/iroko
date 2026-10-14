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

Read the root roadmap for the single ordered queue. Maintenance records that
change documentation structure live with completed plans after their own
validation contract passes.

Plan 016 T1 has an
[operational task breakdown](active/016-t1-security-integrity-critical-flows.md)
for security, integrity and critical flows. It preserves the parent plan's full
inventory and lifecycle; its task map records planning, not completed review.

Plan 012 PR4 has a [proposed execution breakdown](active/012-4-csp-and-secrets.md)
and [dated static inventory](../audits/2026-10-14-plan-012-4-readiness.md).
These refine existing freeze scope; their presence is not implementation or
authorization for Cloud changes.

## Deferred and completed records

- [Plan 011 billing family](deferred/011-billing/README.md)
- [Plan 013 — commercial preparation](deferred/013-launch-readiness-roadmap.md)
- [Documentation freeze reorganization](completed/documentation-freeze-reorganization.md)
- [Completed plans](completed/)

Reactivate deferred work only through an explicit product decision and matching
roadmap/current-state update. Preserve scenario-specific evidence and its date
when changing lifecycle.
