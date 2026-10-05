# Iroko Engineering Documentation

This directory is the versioned knowledge base for current status, architecture,
execution plans, evidence, runbooks and durable technical decisions.

## Start here

1. [Current state](current-state.md) — implemented behavior, dated evidence,
   operational gaps and verification boundaries.
2. [MVP freeze roadmap](../ROADMAP.md) — allowed work, the single execution
   order, exit gates and deferred scope.
3. [Capability inventory](capabilities.md) — the declared SaaS surface and the
   evidence boundary for each capability.
4. [Execution-plan lifecycle](exec-plans/README.md) — active, deferred and
   completed plan locations and their meaning.
5. [Documentation history](history/README.md) — superseded versioned material,
   including the exact pre-freeze roadmap; non-authoritative.

## Product and architecture

- [Product strategy](architecture/product-strategy.md) — target promise,
  minimal complete integrations, adaptation boundaries and evidence required
  before making product claims.
- [System overview](architecture/system-overview.md) — system context,
  architectural boundaries and change map.
- [ADR index](adr/README.md) — accepted decisions and trade-offs.
- [Module catalog](modules/README.md) — detailed implementation guides and
  their verification boundaries.
- [Canonical design system](design-system/README.md) — Poppy, Cobalt, Geist,
  tokens and generated/historical boundaries.
- [Proposed IoT pilot](architecture/iot-vertical-pilot.md) — a deferred
  vertical reference used to reason about core/extension boundaries; runtime
  and Cloud integration remain **[NO VERIFICADO]**.

## Evidence and operations

- [Operational evidence](quality/operational-evidence.md) — dated runtime,
  Cloud and release observations with validity rules.
- [Reusable SaaS investigation — 2026-09-24](audits/2026-09-24-reusable-saas-readiness.md)
- [SaaS template competitive landscape — 2026-10-05](audits/2026-10-05-saas-template-competitive-landscape.md)
- [Full platform audit — 2026-08-02](audits/2026-08-02-full-platform-audit.md)
- [Sentry browser observability audit — 2026-08-03](audits/2026-08-03-sentry-audit.md)
- [Definition of Done](quality/definition-of-done.md)
- [Testing strategy](quality/testing-strategy.md)
- [Local synchronization and Codex runbook](runbooks/local-sync-and-codex.md)
- [Billing recovery and reconciliation runbook](runbooks/billing-reconciliation.md)
- [Email queue worker runbook](runbooks/email-queue.md)
- [Sentry tunnel Cloud smoke check runbook](runbooks/sentry-tunnel-smoke.md)

## Execution support

- [Codex remediation orchestrator](prompts/codex-remediation-orchestrator.md)
- [Codex follow-up operations prompt](prompts/codex-follow-up-operations.md)
- [Codex task template](prompts/codex-task-template.md)

## Authority when sources disagree

Use this order: executable code; tests and observed evidence; configuration and
database migrations; [current state](current-state.md); accepted ADRs and
current architecture; active execution plans; the root roadmap; then audits,
completed plans and ignored/local notes as historical evidence.

Iroko is currently an internal-first reusable SaaS foundation, not a
customer-ready installable product. [ADR 0001](adr/0001-documentation-authority-and-agent-contract.md)
defines the authority model and [AGENTS.md](../AGENTS.md) defines repository
working rules.

## Directory policy

Versioned, maintained documentation:

- `architecture/` and `adr/` — durable boundaries and decisions;
- `audits/` — dated investigations, not implementation authorization;
- `exec-plans/active/` — bounded work in the current freeze;
- `exec-plans/deferred/` — preserved work outside the freeze or waiting for an
  explicit condition;
- `exec-plans/completed/` — plans whose acceptance criteria have recorded
  evidence;
- `history/` — superseded versioned material, never current authority;
- `modules/`, `quality/`, `runbooks/` and `prompts/` — implementation guides,
  evidence rules, operational procedures and execution support;
- `design-system/` — the canonical visual specification plus explicitly
  classified generated and historical references.

Intentionally local and ignored:

- `local/` — working history, plan archives, database notes and vendored
  reference material;
- `private/`, `drafts/`, `generated/` and `exports/`;
- local/private/draft Markdown suffixes, PDFs and non-allowlisted screenshots.

Do not place credentials, connection strings, service-role keys, customer
data, signed URLs or private incident material in versioned documentation.

Directory placement does not authorize execution or prove completion. Update
current state when verified behavior changes, update the roadmap when scope or
order changes, and move a plan only under the lifecycle rules in the
[execution-plan index](exec-plans/README.md).
