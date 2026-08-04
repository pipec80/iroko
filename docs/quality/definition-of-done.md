# Definition of Done

A task is not complete because code was written or CI appears green. It is complete only when all applicable sections below are satisfied and evidence is attached to the pull request.

## Scope and design

- problem and root cause are stated;
- acceptance criteria are explicit;
- non-goals prevent scope creep;
- security, privacy, multi-tenant and operational impact are reviewed;
- the implementation uses existing platform capabilities before adding dependencies;
- production actions and required approvals are identified.

## Code quality

- TypeScript remains strict and no new unjustified suppressions are added;
- input/output boundaries are validated;
- errors are handled without swallowing actionable failures;
- logs are structured and contain no secrets or sensitive payloads;
- dead code and unused dependencies are removed;
- documentation/comments explain why, not merely what.

## Database and authorization

When applicable:

- migration is versioned and reversible or has a documented forward-only strategy;
- a clean local reset works;
- RLS and direct grants are reviewed;
- `SECURITY DEFINER` functions have a safe `search_path`, explicit authorization and narrow `EXECUTE` grants;
- cross-tenant access is tested;
- pgTAP covers unauthenticated and role-specific behavior;
- generated database types are current;
- linked migration drift is absent;
- no production mutation was performed without approval.

## Testing

- unit tests cover logic and edge cases;
- integration/contract tests cover module and provider boundaries;
- regression test reproduces every fixed bug where practical;
- relevant E2E critical flow passes;
- security and authorization negative cases pass;
- accessibility and browser coverage are included for UI changes;
- skipped tests are explained and tracked, not silently ignored.

## Required checks

Use exact current scripts from `package.json`. Normally include:

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm format:check
pnpm knip
pnpm test
pnpm build
```

Add Supabase, pgTAP, Playwright, security audit and provider-specific checks as applicable.

For every check record one of:

- passed with summary;
- failed with exact failure;
- not applicable with reason;
- not executed because of environment limitation, with remaining risk.

Never label an unexecuted check as passed.

## Security and privacy

- no secrets, personal data, tokens, signed URLs or production records are committed;
- CSP and external endpoints are reviewed;
- telemetry uses minimum necessary data;
- consent behavior is tested for optional analytics;
- authentication/session/impersonation transitions clear stale identity state;
- dependency changes are audited and lockfile is committed;
- threat or abuse cases introduced by the change are documented.

## Operations

- deploy/configuration steps are reproducible;
- monitoring detects actual completion, not only enqueue/dispatch;
- retry, timeout and idempotency behavior is defined;
- rollback is concrete and safe;
- preview or disposable environment validation is complete;
- required runbook is updated;
- migrations, cron jobs and external secrets have owners.

## Documentation and traceability

- active execution plan is updated;
- audit matrix references the issue/PR and evidence;
- README/env examples are updated when interfaces change;
- durable architectural trade-offs have an ADR when appropriate;
- completed plan is moved to `exec-plans/completed/` only after verification;
- remaining risks and follow-up work are explicit.

## Human approval gates

The task remains incomplete until a human approves any required:

- production migration or deployment;
- new paid/external service;
- secret creation/rotation;
- privacy/data-retention decision;
- destructive data action;
- merge to `main`.
