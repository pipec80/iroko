# Iroko Engineering Documentation

This directory is the versioned source of truth for engineering audits, execution plans, runbooks and durable technical decisions.

## Start here

- [Full platform audit — 2026-08-02](audits/2026-08-02-full-platform-audit.md)
- [Sentry browser observability audit — 2026-08-03](audits/2026-08-03-sentry-audit.md)
- [Definition of Done](quality/definition-of-done.md)
- [Testing strategy](quality/testing-strategy.md)
- [Local synchronization and Codex runbook](runbooks/local-sync-and-codex.md)
- [Email queue worker runbook](runbooks/email-queue.md)
- [Codex remediation orchestrator](prompts/codex-remediation-orchestrator.md)
- [Codex follow-up operations prompt](prompts/codex-follow-up-operations.md)
- [Codex task template](prompts/codex-task-template.md)

## Completed stabilization plans

The original stabilization plans are closed. Treat them as evidence records;
create a new bounded plan if a regression or new audit finding appears.

| Order | Plan                                                                              | Priority | Status                                   |
| ----- | --------------------------------------------------------------------------------- | -------- | ---------------------------------------- |
| 1     | [Supabase migration drift](exec-plans/completed/001-supabase-migration-drift.md)  | P0       | Completed (2026-08-03, via #100)         |
| 2     | [Email worker in Supabase Cloud](exec-plans/completed/002-email-worker-cloud.md)  | P0       | Completed (2026-08-10, via #110)         |
| 3     | [Sentry browser observability](exec-plans/completed/003-sentry-observability.md)  | P0       | Completed (2026-08-04, via #91)          |
| 4     | [Next.js version alignment](exec-plans/completed/004-nextjs-version-alignment.md) | P0       | Completed (2026-08-04)                   |
| 5     | [Quality and operations hardening](exec-plans/completed/005-quality-hardening.md) | P1       | Completed (2026-08-05)                   |
| 6     | [PostHog product analytics](exec-plans/completed/006-posthog-integration.md)      | P2       | Completed (2026-08-06, via #109)         |

## Directory policy

Versioned and safe to publish:

- `audits/`
- `exec-plans/`
- `runbooks/`
- `quality/`
- `prompts/`
- `architecture/`
- `adr/`

Intentionally local and ignored by Git:

- `local/`
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
