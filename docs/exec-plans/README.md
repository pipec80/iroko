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

Entrada vigente2026-11-04: el [padre017](completed/017-freeze-remediation.md)
completó sus dos lotes acotados; siguiente014-T2/T3, después015/016. Se conservan
los hijos técnicos para resultados históricos, alcances diferidos y recepción
en016. No se promueven sus pendientes por el movimiento del padre ni se cierra
el MVP o Cloud exhaustivo. Véase la [evidencia](../audits/2026-10-20-017-p1-execution.md#cierre-acotado-del-017--2026-11-04).

Direction 2026-10-28: [ADR0005](../adr/0005-replicable-saas-mvp-and-bounded-acceptance.md).
The base must be replicable before a Robot/client vertical. Current entry,2026-11-02:
triage017.1-T9/017.2-T6 →014-T2/T3 →remaining offered017 →015 reuse proof
→016-T2/T3 final acceptance. The exclusion prerequisite of015-T1 passed locally;
012 is completed by its approved deliveries. Editor017.4 is deferred, with preserved tests
and no runtime acceptance. Its development runner is not a freeze prerequisite.
Keep deferred child scope identifiable; do not move its failed checks to completed.

Plan012 está cerrado por entregables2026-11-02; [disposición de seguimientos](../audits/2026-11-02-plan-012-integration-and-disposition.md). No acepta todo el MVP.

Active product plans are:

- [Plan 014 — reference-surface correctness](active/014-reference-surface-correctness.md)
- [Plan 015 — reusable-foundation acceptance](active/015-reusable-foundation-acceptance.md)
- [Plan 016 — Next.js and Supabase code review](active/016-nextjs-supabase-code-review.md)

Completed bounded remediation:

- [Plan 017 — freeze remediation](completed/017-freeze-remediation.md) — sólo el padre y su contrato acotado; hijos técnicos/diferidos y pendientes016 conservados.

The [central disposition register](active/freeze-remediation-register.csv)
preserves all historical IDs, partial splits, aliases and follow-ups. Detailed
[012.5](completed/012-5-pricing-truth.md) is completed locally2026-11-02 under Plan012, after the P1
remediation phase. Final 016 validation follows the final changes from 015,
using the [candidate runbook](../runbooks/freeze-candidate-validation.md).

Read the root roadmap for the single ordered queue. Maintenance records that
change documentation structure live with completed plans after their own
validation contract passes.

For 017, start with its parent execution contract and then the selected child
task and CSV rows. Local repair acceptance permits the next roadmap phase;
integrated acceptance remains after 015 under 016. 017 may close its bounded remediation independently under the November2
contract;016 owns the transferred final evidence and integrated acceptance. Evidence belongs in the existing dated audit
for its subsystem; a rerun alone does not require another plan or audit file.

Plan 016 T1 has an
[operational task breakdown](active/016-t1-security-integrity-critical-flows.md)
for security, integrity and critical flows. It preserves the parent plan's full
inventory and lifecycle; its task map records planning, not completed review.

Plan 012 PR4 has a [completed bounded execution record](completed/012-4-csp-and-secrets.md)
and [Cloud closure evidence](../audits/2026-10-19-plan-012-4-cloud-closure.md).
The implementation merged through PR #229; actual provider/browser acceptance
and cleanup retain the audit's explicit exceptions. That historical012.4 closure
did not close pricing or its parent; both subsequently closed within the bounded
012 integration recorded above. The earlier [static inventory](../audits/2026-10-14-plan-012-4-readiness.md)
is historical evidence, not a fresh runtime check.

## Deferred and completed records

- [Plan 011 billing family](deferred/011-billing/README.md)
- [Plan 013 — commercial preparation](deferred/013-launch-readiness-roadmap.md)
- [Documentation freeze reorganization](completed/documentation-freeze-reorganization.md)
- [Completed plans](completed/)

Reactivate deferred work only through an explicit product decision and matching
roadmap/current-state update. Preserve scenario-specific evidence and its date
when changing lifecycle.
