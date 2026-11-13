# Architecture Decision Records

One file per significant, hard-to-reverse technical decision — what was
decided, what alternatives were considered, and why. Write one when a
decision would otherwise only live in a PR description or a chat transcript
and be lost to future sessions.

## Index

| ADR                                                        | Decision                                           | Status   | Date       |
| ---------------------------------------------------------- | -------------------------------------------------- | -------- | ---------- |
| [0001](0001-documentation-authority-and-agent-contract.md) | Documentation authority and shared agent contract  | Accepted | 2026-08-20 |
| [0002](0002-canonical-design-system-authority.md)          | Canonical design-system authority and preservation | Accepted | 2026-08-20 |
| [0003](0003-mercadopago-reliability-boundaries.md)         | Mercado Pago reliability boundaries                | Accepted | 2026-09-09 |
| [0004](0004-csp-nonce-and-rendering-boundary.md)           | CSP nonce and rendering boundary                   | Accepted | 2026-10-15 |
| [0005](0005-replicable-saas-mvp-and-bounded-acceptance.md) | Replicable SaaS MVP and bounded acceptance         | Accepted | 2026-10-28 |

Filename convention: `NNNN-short-title.md`, numbered sequentially.

Execution status2026-11-10: ADR0005 remains the accepted scope decision.
[015 local reuse evidence](../quality/reusable-foundation-evidence.md) closes the bounded local drill;
[016](../exec-plans/active/016-nextjs-supabase-code-review.md) owns integrated acceptance.
No new architecture decision is introduced by reorganizing its execution tasks.
Accepted ADR text retains its decision date and rationale; neither its status nor
this index proves current runtime or Cloud health. ADR0004's bounded acceptance
and limitations remain in its [closure record](../audits/2026-10-19-plan-012-4-cloud-closure.md).

Use `Proposed`, `Accepted`, `Superseded`, or `Deprecated` as the status. Do not
rewrite an accepted decision to hide a change in direction: add a new ADR and
link both records. Update this index whenever an ADR is added or changes
status.
