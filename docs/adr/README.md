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

Filename convention: `NNNN-short-title.md`, numbered sequentially.

- [0005 — Replicable SaaS MVP and bounded acceptance](0005-replicable-saas-mvp-and-bounded-acceptance.md)
  — **Accepted**,2026-10-28. Core replication before optional verticals;
  editor runner off critical path; scope exclusion and runtime acceptance pending.

- [0003 — Mercado Pago reliability boundaries](0003-mercadopago-reliability-boundaries.md)
  — **Accepted**, 2026-09-09. Durable checkout coordination and recovery through
  the existing billing reducer; not implementation or runtime evidence.

- [0004 - CSP nonce and rendering boundary](0004-csp-nonce-and-rendering-boundary.md)
  - **Accepted**, 2026-10-15. The rendering baseline and bounded local/Cloud
    acceptance were completed under Plan 012.4; the
    [closure record](../audits/2026-10-19-plan-012-4-cloud-closure.md) preserves
    the nonfatal Zod probe, inline-style and other acceptance limits.

Use `Proposed`, `Accepted`, `Superseded`, or `Deprecated` as the status. Do not
rewrite an accepted decision to hide a change in direction: add a new ADR and
link both records. Update this index whenever an ADR is added or changes
status.
