# Operational Evidence Register

Last updated: **2026-09-22** (Plan 011e worker rollout evidence and current
Cloud health inspection; provider acceptance remains separate)

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

| Capability                       | Environment                                    | Latest inspected evidence                                                                                                                                                                                                                                                                                                                                                                          | Verified at (UTC)     | Validity                         | Status                                                                                                                 |
| -------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Documentation checker            | 011e documentation worktree                    | `pnpm docs:check`: 89 Markdown files passed; `pnpm test:docs-check`: 4/4; `pnpm exec prettier --ignore-path .prettierignore-docs --check` passed on 79 tracked Markdown files (design-system dashboard/public/handoff mirrors and `CHANGELOG.md` excluded, matching CI); `git diff --check` passed.                                                                                                | 2026-09-22            | Commit/worktree-bound            | CURRENT for this documentary surface only                                                                              |
| Production smoke                 | Vercel production                              | Latest `Nightly Monitoring / Production Smoke Tests` run not inspected in this pass                                                                                                                                                                                                                                                                                                                | —                     | 48 hours                         | **[NO VERIFICADO]**                                                                                                    |
| Email worker                     | Linked Supabase                                | Latest `Nightly Monitoring / Email Worker Health` result not inspected in this pass                                                                                                                                                                                                                                                                                                                | —                     | 48 hours                         | **[NO VERIFICADO]**                                                                                                    |
| Database advisors                | CI local database rebuilt from migrations      | Latest `Nightly Monitoring / Database Advisors` result not inspected in this pass                                                                                                                                                                                                                                                                                                                  | —                     | 48 hours                         | **[NO VERIFICADO]**                                                                                                    |
| Migration parity                 | Local ↔ linked Supabase                        | `mcp__supabase__list_migrations` against `iroko` (`rgrxlygtmvavqzkjyywg`) returned 159 versions, an exact match (same 159 version/name pairs, including `20260911140000_billing_financial_anomaly_ingress`) against the local `supabase/migrations/*.sql` inventory on `main` at `f2ab4d4`.                                                                                                        | 2026-09-22            | Change-bound                     | **CURRENT**                                                                                                            |
| Full CI and preview build        | GitHub Actions + Vercel Preview                | [PR #152](https://github.com/pipec80/iroko/pull/152) head `b396aa4` passed Quality, CodeQL, Documentation, Security, Gitleaks, Unit, Database Types/Tests, Edge Function, Chromium/WebKit E2E, Build and Vercel Preview; it was squash-merged as `4a0a3d4`                                                                                                                                         | 2026-08-27            | Commit-bound                     | CURRENT for PR head; separate `main` run **[NO VERIFICADO]**                                                           |
| Mercado Pago basic circuit       | Test-seller sandbox via production deployment  | Historical informal 2026-09-10 record: checkout → active → first invoice paid → cancel, with adapter fix #179. Formal sanitized evidence is still pending; this is not real-money production acceptance.                                                                                                                                                                                           | 2026-09-10 (recorded) | Change-bound                     | Historical partial provider observation; current **[NO VERIFICADO]**                                                   |
| Mercado Pago v1 Chile acceptance | Monthly CLP, hosted pending/no associated plan | [MP-01–15 matrix](../exec-plans/active/011-mercadopago-v1-chile-acceptance.md): renewal, failure/recovery, cancellation access, partial refunds, abandoned/unknown checkout and complete invoice discovery remain open.                                                                                                                                                                            | —                     | Scenario + change-bound          | Internal certification pending; **[NO VERIFICADO]**                                                                    |
| Billing workers                  | Supabase scheduler/Vault → Vercel Node         | `cron.job_run_details` for job 14 (`billing-recovery-worker`, every 5 min): 1493/1493 `succeeded`, 2026-09-17 14:35 UTC through 2026-09-22 18:55 UTC. Job 15 (`billing-reconciliation-worker`, hourly): 22/22 `succeeded`, 2026-09-21 21:00 UTC through 2026-09-22 18:00 UTC. `private.billing_worker_health` shows both modes at `last_status_code=200`, timestamps matching the latest cron run. | 2026-09-22 18:58 UTC  | 48 hours + configuration changes | **CURRENT** for sustained basic operation; provider recovery and failure/multi-batch drills remain **[NO VERIFICADO]** |
| Other billing providers          | Stripe, Paddle, Lemon Squeezy                  | Independent adapter/catalogue/events/capabilities/reconciliation/test acceptance still required; MP acceptance does not cover them.                                                                                                                                                                                                                                                                | —                     | Provider + change-bound          | **[NO VERIFICADO]**                                                                                                    |

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

## Plan 011e worker rollout — 2026-09-22

This section supersedes the historical preflight as evidence for basic worker
operation. It records only sanitized Cloud observations; it does not certify
Mercado Pago or authorize provider-side mutations.

| Check                                 | Observation                                                                                                                                                                                                                                                                                                                                                                                       | Status and limit                                                                                                                                                                                                                                                                                                             |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Worker route and shared configuration | The authorized Vercel/Supabase rollout was completed with the scoped worker route, paired secret contract, Vault dispatcher and scheduler. The Vercel firewall diff was empty after publishing the narrow authenticated worker allowance.                                                                                                                                                         | Configuration was inspected during rollout; values and raw route credentials are intentionally absent.                                                                                                                                                                                                                       |
| Recovery                              | Manual results were observed during rollout. The `cron.job` schedule (job 14, `*/5 * * * *`) then ran unattended: `cron.job_run_details` shows 1493/1493 `succeeded` from 2026-09-17 14:35 UTC through 2026-09-22 18:55 UTC, with zero non-succeeded rows. `private.billing_worker_health` for mode `recovery` correlates its latest row (`last_status_code=200`) to that same last cron run.     | **CURRENT** for sustained invocation/transport. Every observed `last_summary` shows `claimed=0`; a provider-known payment actually repaired by recovery is **[NO VERIFICADO]** because no anomalous payment has existed to repair during this observation window.                                                            |
| Reconciliation                        | Two manual results were observed during rollout. The `cron.job` schedule (job 15, `0 * * * *`) then ran unattended: `cron.job_run_details` shows 22/22 `succeeded` from 2026-09-21 21:00 UTC through 2026-09-22 18:00 UTC, with zero non-succeeded rows. `private.billing_worker_health` for mode `reconciliation` correlates its latest row (`last_status_code=200`) to that same last cron run. | **CURRENT** for sustained scheduled invocation. Every observed `last_summary` shows `scanned=0`; provider-missed invoice discovery, multi-batch progress, induced failure, interruption/lease reclaim and replay are **[NO VERIFICADO]** because no subscription has needed a discovery scan during this observation window. |
| Durable effects                       | The current health responses provide transport and completion evidence only.                                                                                                                                                                                                                                                                                                                      | Do not infer a ledger repair, reconciliation convergence, or absence of anomalies from HTTP 200. Each requires its own sanitized correlated scenario.                                                                                                                                                                        |

The rollout closes the activation prerequisite in 011e. It does not close MP-11,
MP-12, MP-14, or the internal provider certification matrix. If the worker
configuration, release candidate, migrations or provider contract changes,
repeat the relevant rollout checks before relying on this record.

## Superseded billing-worker rollout preflight — 2026-09-16

This historical read-only preflight for Plan 011e Task 1 was recorded before
Plan 011g closed its local refund-ingress work. Its local candidate
`83feceb0724aaf06cc12b7ffce17278874cf43bf` and migration inventory through
`20260911130000_billing_reconciliation_state` are superseded by the current
release candidate `611684f2905645f5165d7f0d3a98d6526e442793`, which includes
Plan 011g and local migration
`20260911140000_billing_financial_anomaly_ingress`. It records historical
observations only; it does not authorize a rollout, establish current
production behavior, or replace the correlated evidence required by Tasks 2–5.
No secret values, provider payloads, customer data, signed URLs, or raw Cloud
output are retained here.

| Preflight area               | Observed result                                                                                                                                                                                          | Operational meaning                                                                                                                                                                 |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Local checkout               | Clean `feat/mercadopago-v1-implementation` at `83feceb0724aaf06cc12b7ffce17278874cf43bf`, committed `2026-09-16T16:36:39-03:00`.                                                                         | Historical only. It does not identify the current release candidate or establish deployed source identity.                                                                          |
| Local tooling                | Supabase CLI `2.110.0` and Vercel CLI `59.15.1` are installed. Vercel CLI was authenticated as the sanitized account alias `pipec80`.                                                                    | Installation and Vercel authentication do not establish Supabase linkage or authorization to mutate either platform.                                                                |
| Authorized-target candidates | Supabase project listing found exactly one active project: `iroko`, ref `rgrxlygtmvavqzkjyywg`, region `us-east-2`; the CLI reported `linked=false`. Vercel target is team/project `pipec80-labs/iroko`. | These are the only proposed rollout targets. Listing does not establish Supabase migration parity, Vercel deployment source identity, or authorization to mutate either target.     |
| Stable alias                 | `project-a89lv.vercel.app` resolved to production deployment `dpl_EE7N9eropjg64w4MDYdqx7QSZ93A`, `READY`, with the worker-route artifact present.                                                        | Historical only. The deployed source SHA was not established and must be inspected again for the current release candidate.                                                         |
| Migration comparison         | Local migration inventory then reached `20260911130000_billing_reconciliation_state`. `supabase migration list --linked` stopped with `LegacyProjectNotLinkedError`.                                     | Superseded. The next comparison must include local migration `20260911140000_billing_financial_anomaly_ingress`; linked parity for `rgrxlygtmvavqzkjyywg` is **[NO VERIFICADO]**.   |
| Vercel environment names     | Scoped `vercel env ls` showed `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET`, and `MERCADOPAGO_WEBHOOK_URL` in Production and Preview. `BILLING_RECONCILIATION_SECRET` was absent.             | Variable presence says nothing about values, application/seller coherence, deployment ingestion, or webhook behavior. The worker cannot be accepted without a paired shared secret. |
| Vault, cron and health       | Vault secret names/values, `cron.job`, `private.billing_worker_health`, worker URL, and configuration values were not inspected.                                                                         | **[NO VERIFICADO]**. No schedule, net request, health row, ledger/job effect, or worker progress evidence exists from this preflight.                                               |
| Stable-route preflight       | The unauthenticated `POST {"mode":"recovery"}` was deliberately not sent. Automatic safety review rejected it because a misconfigured route could execute a worker.                                      | Route reachability and its expected `401` remain **[NO VERIFICADO]**. Do not use a blind unauthenticated invocation to fill this gap.                                               |

### Required fresh preflight and authorization boundary

No rollout authorization is granted by this historical record or by the local
coding approval. Before any mutation, repeat the read-only preflight against
the current release candidate
`611684f2905645f5165d7f0d3a98d6526e442793` (or a reviewed descendant that
contains all Plan 011g changes) and record a new dated result. It must inspect
the stable deployment source SHA and compare the exact local migration
inventory through `20260911140000_billing_financial_anomaly_ingress` with
Supabase `iroko` (`rgrxlygtmvavqzkjyywg`).

Only after that new preflight may a new explicit authorization name **both**
Vercel `pipec80-labs/iroko` and Supabase `iroko`
(`rgrxlygtmvavqzkjyywg`, `us-east-2`). That authorization must permit only the
following ordered work:

1. Inspect those exact targets read-only: reconcile the Supabase migration
   inventory and establish the stable deployment's source SHA.
2. If `project-a89lv.vercel.app` cannot be shown to contain the current release
   candidate SHA (or a reviewed descendant containing Plan 011g), deploy that
   verified candidate to `pipec80-labs/iroko`, then re-establish the stable
   alias and source identity.
3. After parity review, apply only the reviewed missing migrations to
   `rgrxlygtmvavqzkjyywg`; re-inspect parity before any worker configuration.
4. Create (not rotate) Vercel `BILLING_RECONCILIATION_SECRET` through a
   secret-safe interface. Inspect the Vault secret name first; only then create
   or rotate the paired Vault reconciliation secret as its presence requires.
5. After the preceding secret and parity checks, configure Vault
   `billing_worker_url` for the verified stable URL and verify the Vercel
   deployment receives the paired secret.
6. Add an allowance for exactly `/api/internal/billing/worker` only if that
   verified route is otherwise blocked; preserve protection for every other
   route.
7. After two correlated manual recovery results, create and observe the
   recovery schedule; only then create and observe the reconciliation schedule.

Each subsequent stage must retain its own sanitized HTTP, health and durable
ledger/job or reconciliation-state evidence. A successful cron record alone is
not acceptance evidence. If any identity, secret-pair, route, migration or
durable-effect check disagrees, stop before scheduling and preserve the durable
state for investigation.

## Local documentation validation — 2026-09-22

Results: documentation checker passed for 89 Markdown files; checker tests
passed 4/4; Prettier passed for all 79 tracked Markdown files outside the
excluded design-system dashboard/public/handoff mirrors and `CHANGELOG.md`
(matching the CI `Documentation` job's file selection); `git diff --check`
passed. These results cover the current documentation worktree only. The
2026-09-16 run (three changed Markdown files checked with Prettier) is
superseded by this full-tree check.

Commands: `pnpm docs:check`, `pnpm test:docs-check`,
`pnpm exec prettier --ignore-path .prettierignore-docs --check <79 tracked Markdown files>`,
and `git diff --check`. `pnpm docs:check` ran a `pnpm install` first (this
worktree's `node_modules` was stale); it produced no `package.json` or
`pnpm-lock.yaml` change. Application tests, build and Cloud checks are not
part of this validation.

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
