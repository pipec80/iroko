# Iroko Engineering Documentation

This directory is the versioned source of truth for engineering audits, execution plans, runbooks and durable technical decisions.

## Start here

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
| 9     | V1 closeout — RBAC, membership lifecycle, QA                                                  | P0       | Completed (2026-08-18, via #135) |

## Active plans

Opened from the 2026-08-18/19 forensic audit (tenant isolation + billing
correctness). Priority order: 010 and 011 (P0, behavior) before 012 (P1,
risk/debt) before 013 (Fase D, sellability) — see each plan's own ordering
rationale.

| Order | Plan                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Priority | Status                            |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | --------------------------------- |
| 10    | [Tenant isolation + regression tests](exec-plans/active/010-tenant-isolation-and-regression-tests.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | P0       | Active                            |
| 11    | [Billing Platform v2](exec-plans/active/011-billing-correctness.md) — Core → Stripe → Paddle → Lemon Squeezy → MercadoPago → Reconciliation. Spec: [architecture/billing-platform-v2-design.md](architecture/billing-platform-v2-design.md). Task-by-task per phase: [1](exec-plans/active/011-phase1-core-v2-tasks.md) · [2](exec-plans/active/011-phase2-stripe-certification-tasks.md) · [3](exec-plans/active/011-phase3-paddle-tasks.md) · [4](exec-plans/active/011-phase4-lemon-squeezy-tasks.md) · [5](exec-plans/active/011-phase5-mercadopago-redesign-tasks.md) · [6](exec-plans/active/011-phase6-reconciliation-tasks.md) | P0       | Active                            |
| 12    | [Security hardening + pricing source of truth](exec-plans/active/012-security-hardening-and-pricing-truth.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | P1       | Active                            |
| 13    | [Launch readiness roadmap (Fase D)](exec-plans/active/013-launch-readiness-roadmap.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | P2       | Roadmap — not yet broken into PRs |

## Directory policy

Versioned and safe to publish:

- `audits/`
- `exec-plans/`
- `runbooks/`
- `quality/`
- `prompts/`
- `architecture/`
- `adr/`
- `design-system/` — canonical HTML/CSS pattern reference; the official
  pattern to follow before building any new screen. Versioned deliberately
  (2026-08-19) so it survives a fresh clone, not just this machine.
- `screenshots/` — small manual-QA reference images, already tracked.

Intentionally local and ignored by Git:

- `local/` — everything that isn't durable project documentation: audit
  history, forensic-audit archives, superseded plan drafts, database working
  notes, and vendored third-party reference docs (e.g. Next.js). Reordered
  2026-08-19 to consolidate what used to be nine separate top-level ignored
  folders (`audit/`, `codx-docs/`, `database/`, `intercon/`, `nextjs/`,
  `plans/`, `superpowers/`) into one bucket — see `local/*/` subfolders.
- `modules/` — per-module reference docs; kept as its own ignored category
  rather than folded into `local/` since it has a distinct purpose.
- `private/`
- `drafts/`
- `generated/`
- `exports/`
- files ending in `.local.md`, `.private.md`, `.draft.md` or `.pdf`

At the repository root, `AGENTS.md` and `CLAUDE.md` are also intentionally local and ignored by Git (decided in #97): each developer/agent keeps their own copy, and their content is not the same across machines. Do not re-add either to version control as part of documentation work.

Do not place credentials, database connection strings, service-role keys, customer data, signed URLs or private incident material in versioned documentation.

## Lifecycle

1. Record a finding in the audit matrix.
2. Create or update an execution plan with acceptance criteria.
3. Implement one bounded plan per branch and pull request.
4. Attach exact validation evidence.
5. Update the audit status.
6. Move the plan to `exec-plans/completed/` only when the Definition of Done is satisfied.
