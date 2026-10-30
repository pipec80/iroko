# Codex Task Template

Use this template after the master reconnaissance has selected and a human has approved one execution plan.

For Plan 017, use its [shared execution contract](../exec-plans/active/017-freeze-remediation.md)
and the selected child task instead of the generic process/checklist below.
Its outcome, scope, focused validation, batch gates and stop conditions apply
regardless of model. Do not install dependencies, create a PR, rerun every gate
or ask for renewed approval merely because this generic template lists them;
follow the actual task authorization and repository rules.

````md
# Task: <bounded title>

## Context

Repository: `pipec80/iroko`
Plan: `docs/exec-plans/active/<plan>.md`
Audit finding IDs: `<AUD-...>`

Read the versioned root `AGENTS.md` (required; if absent, report the missing repository contract), the plan, the audit and the Definition of Done before acting.

## Goal

<One measurable result.>

## Current evidence

<Files, commands, errors, PRs or environment observations that prove the problem. Revalidate them.>

## Scope

- <allowed change>
- <allowed change>

## Non-goals

- <explicitly excluded work>
- do not start another execution plan;
- do not modify production without separate approval.

## Constraints

- preserve tenant isolation, RLS, MFA, CSP and auditability;
- no secrets or personal data in Git/logs;
- no direct push to `main`;
- no weakening checks to make CI pass;
- follow all stop conditions in the versioned root `AGENTS.md`.

## Required process

1. Inspect and revalidate before writing.
2. Report proposed files, risks and tests.
3. Implement the smallest coherent change.
4. Add regression/security tests.
5. Run all applicable checks.
6. Review the complete diff and scan for secrets.
7. Update the plan and audit evidence.
8. Prepare a PR; do not merge.
9. Stop.

## Acceptance criteria

- [ ] <criterion>
- [ ] <criterion>
- [ ] all applicable Definition of Done checks pass;
- [ ] rollback is documented;
- [ ] remaining risks are explicit.

## Required validation

Discover exact commands from `package.json` and current tool help. Include:

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm format:check
pnpm knip
pnpm test
pnpm build
```
````

Add database, Playwright, provider, security and preview checks as applicable.

## Output format

### Before implementation

- revalidated root cause;
- planned files;
- security/privacy impact;
- test plan;
- external approvals needed.

### After implementation

- summary and root cause;
- files/migrations changed;
- exact commands and results;
- manual verification pending;
- rollback;
- remaining risks;
- PR details;
- updated audit/plan status.

```

```
