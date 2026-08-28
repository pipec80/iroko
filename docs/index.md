# Iroko Engineering Documentation

This directory is the versioned knowledge base for current status, architecture,
execution plans, runbooks, audits, and durable technical decisions.

## Start here

- [Current state](current-state.md) — product position, active work, verification
  boundary, and known documentation debt.
- [System overview](architecture/system-overview.md) — system context,
  architectural boundaries, and change map.
- [ADR index](adr/README.md) — durable decisions and their trade-offs.
- [Module catalog](modules/README.md) — current implementation guides and their
  verification boundary.
- [Operational evidence](quality/operational-evidence.md) — dated runtime,
  Cloud, and release evidence with validity rules.
- [Canonical design system](design-system/README.md) — visual authority,
  palette contract, generated/historical boundaries, and maintenance rules.
- [Active execution plans](exec-plans/active/) — pending bounded work and
  acceptance criteria.
- [Full platform audit — 2026-08-02](audits/2026-08-02-full-platform-audit.md)
- [Sentry browser observability audit — 2026-08-03](audits/2026-08-03-sentry-audit.md)
- [Definition of Done](quality/definition-of-done.md)
- [Testing strategy](quality/testing-strategy.md)
- [Local synchronization and Codex runbook](runbooks/local-sync-and-codex.md)
- [Email queue worker runbook](runbooks/email-queue.md)
- [Sentry tunnel Cloud smoke check runbook](runbooks/sentry-tunnel-smoke.md)
- [Codex remediation orchestrator](prompts/codex-remediation-orchestrator.md)
- [Codex follow-up operations prompt](prompts/codex-follow-up-operations.md)
- [Codex task template](prompts/codex-task-template.md)

## Authority when sources disagree

Use this order: executable code; tests and observed evidence; configuration and
database migrations; [current state](current-state.md); accepted ADRs and
current architecture; active execution plans; `ROADMAP.md`; then audits,
completed plans, and ignored/local notes as historical evidence.

This repository is currently an internal-first reusable SaaS foundation, not a
customer-ready installable product. Details and rationale are recorded in
[ADR 0001](adr/0001-documentation-authority-and-agent-contract.md).

## Completed stabilization plans

The original stabilization plans are closed. Treat them as evidence records;
create a new bounded plan if a regression or new audit finding appears.

| Order | Plan                                                                                          | Priority | Status                           |
| ----- | --------------------------------------------------------------------------------------------- | -------- | -------------------------------- |
| 1     | [Supabase migration drift](exec-plans/completed/001-supabase-migration-drift.md)              | P0       | Completed (2026-08-03, via #100) |
| 2     | [Email worker in Supabase Cloud](exec-plans/completed/002-email-worker-cloud.md)              | P0       | Completed (2026-08-10, via #110) |
| 3     | [Sentry browser observability](exec-plans/completed/003-sentry-observability.md)              | P0       | Completed (2026-08-04, via #91)  |
| 4     | [Next.js version alignment](exec-plans/completed/004-nextjs-version-alignment.md)             | P0       | Completed (2026-08-04)           |
| 5     | [Quality and operations hardening](exec-plans/completed/005-quality-hardening.md)             | P1       | Completed (2026-08-05)           |
| 6     | [PostHog product analytics](exec-plans/completed/006-posthog-integration.md)                  | P2       | Completed (2026-08-06, via #109) |
| 7     | [Cloud smoke check — Sentry tunnel](exec-plans/completed/007-cloud-smoke-sentry-tunnel.md)    | P1       | Completed (2026-08-11)           |
| 8     | [Email worker Cloud health check](exec-plans/completed/008-email-worker-cloud-smoke-check.md) | P1       | Completed (2026-08-11)           |
| 9     | [V1 closeout — RBAC, membership lifecycle, QA](exec-plans/completed/009-v1-closeout.md)       | P0       | Completed (2026-08-18, via #135) |

## Completed execution plans

| Order | Plan                                                                                                     | Priority | Status                                             |
| ----- | -------------------------------------------------------------------------------------------------------- | -------- | -------------------------------------------------- |
| 10    | [Tenant isolation + regression tests](exec-plans/completed/010-tenant-isolation-and-regression-tests.md) | P0       | Completed (2026-08-26, via #139, #140, #147, #149) |

## Active plans

The remaining work opened from the 2026-08-18/19 forensic audit is ordered as
Plan 011 (P0, behavior) before Plan 012 (P1, risk/debt) and Plan 013 (Fase D,
sellability) — see each plan's own ordering rationale.

| Order | Plan                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Priority | Status                            |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | --------------------------------- |
| 11    | [Billing Platform v2](exec-plans/active/011-billing-correctness.md) — Core → Mercado Pago → Stripe → Paddle → Lemon Squeezy → Reconciliation. Fase 1 cerrada vía [#152](https://github.com/pipec80/iroko/pull/152); Mercado Pago es la referencia de lanzamiento LATAM. Spec: [architecture/billing-platform-v2-design.md](architecture/billing-platform-v2-design.md). Task-by-task per phase: [1](exec-plans/active/011-phase1-core-v2-tasks.md) · [2](exec-plans/active/011-phase2-mercadopago-tasks.md) · [3](exec-plans/active/011-phase3-stripe-certification-tasks.md) · [4](exec-plans/active/011-phase4-paddle-tasks.md) · [5](exec-plans/active/011-phase5-lemon-squeezy-tasks.md) · [6](exec-plans/active/011-phase6-reconciliation-tasks.md) | P0       | Active                            |
| 12    | [Security hardening + pricing source of truth](exec-plans/active/012-security-hardening-and-pricing-truth.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | P1       | Active                            |
| 13    | [Launch readiness roadmap (Fase D)](exec-plans/active/013-launch-readiness-roadmap.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | P2       | Roadmap — not yet broken into PRs |

## Directory policy

Versioned and safe to publish:

- `current-state.md`
- `audits/`
- `exec-plans/`
- `runbooks/`
- `quality/`
- `modules/`
- `prompts/`
- `architecture/`
- `adr/`
- `design-system/` — canonical Poppy/Cobalt/Geist specification plus explicitly
  classified generated and historical references; see
  [ADR 0002](adr/0002-canonical-design-system-authority.md).
- `screenshots/` — local/manual-QA evidence unless an image is deliberately
  allowlisted and reviewed for version control.

Intentionally local and ignored by Git:

- `local/` — everything that isn't durable project documentation: audit
  history, forensic-audit archives, superseded plan drafts, database working
  notes, and vendored third-party reference docs (e.g. Next.js). Reordered
  2026-08-19 to consolidate what used to be nine separate top-level ignored
  folders (`audit/`, `codx-docs/`, `database/`, `intercon/`, `nextjs/`,
  `plans/`, `superpowers/`) into one bucket — see `local/*/` subfolders.
- `private/`
- `drafts/`
- `generated/`
- `exports/`
- files ending in `.local.md`, `.private.md`, `.draft.md` or `.pdf`

At the repository root, `AGENTS.md` is the shared tool-neutral contract and
`CLAUDE.md` is a thin versioned adapter. Permissions, machine preferences, and
tool-specific runtime material remain local and ignored. See
[ADR 0001](adr/0001-documentation-authority-and-agent-contract.md).

Do not place credentials, database connection strings, service-role keys, customer data, signed URLs or private incident material in versioned documentation.

## Lifecycle

1. Record a finding in the audit matrix when an audit is the source.
2. Create or update an execution plan with acceptance criteria.
3. Update `current-state.md` when priority, status, product position, or a
   material architecture boundary changes.
4. Implement one bounded plan per branch and pull request.
5. Attach exact validation evidence.
6. Update the audit status when applicable.
7. Move the plan to `exec-plans/completed/` only when the Definition of Done is
   satisfied.
8. Keep placeholders, historical prompts, and runtime claims out of the current
   status path; unresolved external evidence is `[NO VERIFICADO]`.
