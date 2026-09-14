# Operational Evidence Register

Last updated: **2026-09-11** (documentation/code inspection; no fresh Cloud run)

This register prevents historical green checks from being read as present-day
operational truth. GitHub Actions and provider consoles remain the primary live
evidence; this file records the latest result that was actually inspected and
the rule that determines when it expires.

## Status vocabulary

- **CURRENT** — inspected evidence satisfies its validity rule.
- **FAILED** — the latest inspected evidence failed; link the run or incident.
- **[NO VERIFICADO]** — evidence is missing, inaccessible, expired, or does not
  cover the current revision. It does not mean the capability failed.

## Validity rules

- **Commit-bound:** static checks, tests, and builds apply only to the exact
  commit or explicitly identified worktree that produced them.
- **Change-bound:** migration parity and internal provider acceptance remain current
  only until a relevant migration, adapter, secret contract, or configuration
  changes.
- **Time-bound:** production smoke, email-worker health, and scheduled database
  monitoring expire after 48 hours.

## Current register

| Capability                       | Environment                                    | Latest inspected evidence                                                                                                                                                                                                                                  | Verified at (UTC)     | Validity                         | Status                                                               |
| -------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | -------------------------------- | -------------------------------------------------------------------- |
| Documentation checker            | Documentation worktree based on `66bc9b2`      | `pnpm docs:check`: 82 Markdown files; `pnpm test:docs-check`: 4/4. Run with process-local `pnpm_config_verify_deps_before_run=false` and outside sandbox after Git/Node spawn EPERM.                                                                       | 2026-09-11            | Commit/worktree-bound            | CURRENT for this documentary surface only                            |
| Production smoke                 | Vercel production                              | Latest `Nightly Monitoring / Production Smoke Tests` run not inspected in this pass                                                                                                                                                                        | —                     | 48 hours                         | **[NO VERIFICADO]**                                                  |
| Email worker                     | Linked Supabase                                | Latest `Nightly Monitoring / Email Worker Health` result not inspected in this pass                                                                                                                                                                        | —                     | 48 hours                         | **[NO VERIFICADO]**                                                  |
| Database advisors                | CI local database rebuilt from migrations      | Latest `Nightly Monitoring / Database Advisors` result not inspected in this pass                                                                                                                                                                          | —                     | 48 hours                         | **[NO VERIFICADO]**                                                  |
| Migration parity                 | Local ↔ linked Supabase                        | Historical 2026-09-10 record: four `20260909*` billing migrations applied after finding them missing; CI/CD does not push migrations. No linked query in the 2026-09-11 pass.                                                                              | 2026-09-10 (recorded) | Change-bound                     | Historical parity only; current **[NO VERIFICADO]**                  |
| Full CI and preview build        | GitHub Actions + Vercel Preview                | [PR #152](https://github.com/pipec80/iroko/pull/152) head `b396aa4` passed Quality, CodeQL, Documentation, Security, Gitleaks, Unit, Database Types/Tests, Edge Function, Chromium/WebKit E2E, Build and Vercel Preview; it was squash-merged as `4a0a3d4` | 2026-08-27            | Commit-bound                     | CURRENT for PR head; separate `main` run **[NO VERIFICADO]**         |
| Mercado Pago basic circuit       | Test-seller sandbox via production deployment  | Historical informal 2026-09-10 record: checkout → active → first invoice paid → cancel, with adapter fix #179. Formal sanitized evidence is still pending; this is not real-money production acceptance.                                                   | 2026-09-10 (recorded) | Change-bound                     | Historical partial provider observation; current **[NO VERIFICADO]** |
| Mercado Pago v1 Chile acceptance | Monthly CLP, hosted pending/no associated plan | [MP-01–15 matrix](../exec-plans/active/011-mercadopago-v1-chile-acceptance.md): renewal, failure/recovery, cancellation access, partial refunds, abandoned/unknown checkout and complete invoice discovery remain open.                                    | —                     | Scenario + change-bound          | Internal certification pending; **[NO VERIFICADO]**                  |
| Billing workers                  | Supabase scheduler/Vault → Vercel Node         | Route, RPCs, recovery/anomalies and CAS implemented at `66bc9b2`; last record 2026-09-10 reports no secret/Vault/firewall/cron and empty health. No current runtime inspection.                                                                            | 2026-09-10 (recorded) | 48 hours + configuration changes | Pending operational rollout; current **[NO VERIFICADO]**             |
| Other billing providers          | Stripe, Paddle, Lemon Squeezy                  | Independent adapter/catalogue/events/capabilities/reconciliation/test acceptance still required; MP acceptance does not cover them.                                                                                                                        | —                     | Provider + change-bound          | **[NO VERIFICADO]**                                                  |

## Mercado Pago closeout evidence contract — 2026-09-11

The [v1 Chile matrix](../exec-plans/active/011-mercadopago-v1-chile-acceptance.md)
owns row-level requirements. Product scope is own use, Chile, monthly CLP,
hosted checkout without associated plan, unchanged prices/slugs. Trials,
upgrade/downgrade, pause from Iroko and in-app card management are outside v1.
Use **internal certification**; no official Mercado Pago certification is
recorded. Historical local tests, implementation and provider observation are
separate evidence classes, never completion percentages.

For each acceptance row record revision/deployment, UTC date, provider and app
environment, scenario, expected/observed outcome, sanitized correlated resource
aliases, command/run evidence and reviewer. A successful initial invoice does
not prove renewal; cancellation does not prove paid-through access. Worker
health requires actual HTTP results and ledger/job effects across batches,
failures and repeated/concurrent runs, not cron success alone.

The 2026-09-10 configuration changes and lifecycle remain historical reports;
this pass did not inspect primary Cloud/provider evidence. The reported use of
two sandbox applications must be resolved by verifying application, seller,
credentials and webhook coherence for each environment under authorized work.
No secrets, signed URLs, raw payloads or personal data belong in this register.

### MP-08 abandoned checkout operator record

Create one sanitized record for each authorized provider review. It is evidence
of that case only and does not certify the provider, Cloud environment, or
future checkout behavior.

| Field                        | Record                                                                           |
| ---------------------------- | -------------------------------------------------------------------------------- |
| UTC observation time         | `<YYYY-MM-DDTHH:MM:SSZ>`                                                         |
| Target environment           | `<authorized-environment-alias>`                                                 |
| Revision or deployment       | `<sanitized-revision-or-deployment-alias>`                                       |
| Scenario                     | `MP-08 abandoned or ambiguous checkout`                                          |
| Correlation                  | `account=<alias>; intent=<alias>; remote=<absent-or-alias>`                      |
| Provider observation         | `<sanitized absence, terminal, or attached-and-converged finding>`               |
| Decision and local result    | `<attach-and-converge, failed, canceled, or retained-needs_review>`              |
| Resolution code, if resolved | `remote_absent_after_provider_review` or `remote_terminal_after_provider_review` |
| Operator and reviewer        | `<sanitized operator/case alias>; <sanitized reviewer alias>`                    |
| Evidence location            | `<authorized incident or run reference>`                                         |

Never include tokens, email addresses, checkout URLs, raw provider resource
IDs, or full provider payloads. A remote subscription ID that is found must be
attached and converged through the existing service/reducer path before any
local resolution. A `needs_review` result documents escalation; it does not
release a reservation or authorize another provider POST.

Before v1 real users, additionally verify Plan 012 hardening/pricing, production
smoke, auth/tenant isolation, email delivery, observability/alerts, migration
parity and operational recovery. Commercial analytics/onboarding/distribution
in Plan 013 can follow later; necessary security and operation cannot.

## Local documentation validation — 2026-09-11

Results: documentation checker passed for 82 Markdown files; checker tests
passed 4/4; Prettier passed on all 12 changed Markdown files; `git diff --check`
passed. These results cover the documentation worktree only.

Commands: `pnpm docs:check`, `pnpm test:docs-check`,
`pnpm exec prettier --ignore-path <empty temporary ignore file> --write <modified Markdown files>`,
`pnpm exec prettier --ignore-path <empty temporary ignore file> --check <modified Markdown files>` and `git diff --check`.
The temporary empty ignore file makes Prettier actually inspect `docs/`,
which the repository's normal `.prettierignore` excludes. The explicit file
list contains only the 12 Markdown documents in this delivery.
For this run pnpm uses `$env:pnpm_config_verify_deps_before_run = 'false'`
only in the invoking process: its default pre-script dependency sync aborted
with `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`. The next sandboxed attempt
hit `spawnSync git EPERM` / `spawn EPERM`; the documentation scripts passed
outside the sandbox. No dependency install was completed, and no dependency
or package-manager configuration is changed by this documentation delivery.
Application tests, build and Cloud checks are not part of this validation.

## Historical evidence

Historical results remain useful for diagnosis but cannot satisfy the current
register after they expire:

- The 2026-08-20 documentation checker record applied to worktree
  `fe4b90ae59acf1105569b2edf6bfd705b548e6fe`: 4/4 checker tests; it is superseded
  for this delivery by the current documentation row above.
- [Plan 007](../exec-plans/completed/007-cloud-smoke-sentry-tunnel.md) records
  the original Cloud smoke and Sentry tunnel closure.
- [Plan 008](../exec-plans/completed/008-email-worker-cloud-smoke-check.md)
  records the original email-worker Cloud verification.
- [Email queue runbook](../runbooks/email-queue.md) defines the current manual
  health and migration-parity checks.

## Update procedure

1. Inspect the primary evidence and record the exact commit, environment, UTC
   timestamp, command or workflow job, result, and stable run URL when one
   exists.
2. Replace the row; do not append daily success noise or copy secrets and raw
   customer data into this file.
3. Mark an expired or inaccessible result **[NO VERIFICADO]**. Mark an observed
   failure **FAILED** and link its remediation plan or incident.
4. Update [Current state](../current-state.md) in the same change when the new
   evidence alters a product, release, or operational claim.
