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

Direction 2026-10-28: [ADR0005](../adr/0005-replicable-saas-mvp-and-bounded-acceptance.md).
The base must be replicable before a Robot/client vertical. Immediate entry is
015-T1/RS-05 configuration/exclusion, then offered-core017,012.5/014, remaining015
reuse proof and final016 re-audit. Editor017.4 is deferred, with preserved tests
and no runtime acceptance. Its development runner is not a freeze prerequisite.
Keep deferred child scope identifiable; do not move its failed checks to completed.

Active product plans are:

- [Plan 012 — security hardening and pricing truth](active/012-security-hardening-and-pricing-truth.md)
- [Plan 014 — reference-surface correctness](active/014-reference-surface-correctness.md)
- [Plan 015 — reusable-foundation acceptance](active/015-reusable-foundation-acceptance.md)
- [Plan 016 — Next.js and Supabase code review](active/016-nextjs-supabase-code-review.md)
- [Plan 017 — freeze remediation](active/017-freeze-remediation.md) — five implementation children; initial planning and assignment are not execution evidence.

The [central disposition register](active/freeze-remediation-register.csv)
preserves all historical IDs, partial splits, aliases and follow-ups. Detailed
[012.5](active/012-5-pricing-truth.md) remains under Plan 012, after the P1
remediation phase. Final 016 validation follows the final changes from 015,
using the [candidate runbook](../runbooks/freeze-candidate-validation.md).

Read the root roadmap for the single ordered queue. Maintenance records that
change documentation structure live with completed plans after their own
validation contract passes.

For 017, start with its parent execution contract and then the selected child
task and CSV rows. Local repair acceptance permits the next roadmap phase;
integrated acceptance remains after 015 under 016. Keep 017 in active until its
remaining final obligations pass. Evidence belongs in the existing dated audit
for its subsystem; a rerun alone does not require another plan or audit file.

Plan 016 T1 has an
[operational task breakdown](active/016-t1-security-integrity-critical-flows.md)
for security, integrity and critical flows. It preserves the parent plan's full
inventory and lifecycle; its task map records planning, not completed review.

Plan 012 PR4 has a [completed bounded execution record](completed/012-4-csp-and-secrets.md)
and [Cloud closure evidence](../audits/2026-10-19-plan-012-4-cloud-closure.md).
The implementation merged through PR #229; actual provider/browser acceptance
and cleanup retain the audit's explicit exceptions. This closes neither pricing
nor the parent Plan 012. The earlier [static inventory](../audits/2026-10-14-plan-012-4-readiness.md)
is historical evidence, not a fresh runtime check.

## Deferred and completed records

- [Plan 011 billing family](deferred/011-billing/README.md)
- [Plan 013 — commercial preparation](deferred/013-launch-readiness-roadmap.md)
- [Documentation freeze reorganization](completed/documentation-freeze-reorganization.md)
- [Completed plans](completed/)

Reactivate deferred work only through an explicit product decision and matching
roadmap/current-state update. Preserve scenario-specific evidence and its date
when changing lifecycle.
