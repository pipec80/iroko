# Iroko Agent Guide

This file defines the operating rules for Codex and other coding agents working in this repository.

## Read before changing anything

Read these files in order:

1. `README.md`
2. `ARCHITECTURE.md`
3. `SECURITY.md`
4. `ROADMAP.md`
5. `docs/index.md`
6. `docs/audits/2026-08-02-full-platform-audit.md`
7. The relevant plan under `docs/exec-plans/active/`
8. `docs/quality/definition-of-done.md`

Treat the current branch, lockfile, migrations and executable configuration as the source of truth. Audit documents are evidence and planning material; revalidate them when the repository changes.

## Non-negotiable rules

- Never push directly to `main`.
- Never merge a pull request without explicit human approval.
- Never modify Supabase Cloud production, Vercel production, Sentry or external providers without explicit approval.
- Never invent missing migrations or reconstruct their SQL approximately.
- Do not run `supabase db push --linked` while migration drift is unresolved.
- Never expose service-role keys, database URLs, tokens, credentials, signed URLs or personal data.
- Preserve tenant isolation, RLS, MFA, CSP, rate limiting and auditability.
- Do not weaken tests, lint rules or security controls merely to obtain a green pipeline.
- Do not add a dependency when the existing stack already provides the capability.
- Do not add PostHog while any P0 stabilization plan remains open.
- Do not add Clerk, Pinecone or Upstash without a documented and measured requirement.
- Do not delete indexes solely because an advisor reports them as unused.
- Keep `docs/local/`, `docs/private/`, generated exports and local credentials out of Git.

## Branch and pull-request policy

Use one branch and one pull request per bounded problem.

Recommended prefixes:

- `fix/`
- `feat/`
- `chore/`
- `docs/`
- `test/`

Every pull request must explain:

- the problem and root cause;
- the intended scope and explicit non-goals;
- files and migrations changed;
- security, privacy and multi-tenant impact;
- validation performed and exact results;
- manual checks still required;
- rollback procedure;
- remaining risks.

## Required validation

Run the checks that exist in `package.json`; do not guess command names. At minimum, application changes normally require:

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm format:check
pnpm knip
pnpm test
pnpm build
```

Database changes additionally require the repository's Supabase startup and pgTAP commands, regenerated database types, migration-list comparison and relevant security advisors.

Run relevant Playwright tests for every affected critical flow. Never report a skipped command as passed.

## Database-specific rules

- Create migration files with the Supabase CLI convention used by the repository.
- Keep local migration versions aligned with Supabase Cloud tracking.
- Review all `SECURITY DEFINER` functions for explicit authorization, immutable `search_path` and narrow `EXECUTE` grants.
- Add pgTAP tests for unauthenticated, cross-tenant, member, account-admin and platform-admin cases as applicable.
- Verify changes in a disposable/local environment before considering production.

## Documentation workflow

- Update the relevant active execution plan while implementing.
- Move completed plans from `docs/exec-plans/active/` to `docs/exec-plans/completed/` only after all acceptance criteria are met.
- Update the audit matrix with the PR, verification evidence and completion date.
- Record durable architectural decisions under `docs/adr/` when a trade-off affects future work.

## Stop conditions

Stop and request human approval when:

- a production write is required;
- a secret must be created, rotated or supplied;
- a migration cannot be recovered exactly;
- a destructive action or data rewrite is proposed;
- the requested scope conflicts with these rules;
- a P0 dependency is unresolved;
- verification cannot be completed with the available environment.
