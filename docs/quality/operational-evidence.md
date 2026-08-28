# Operational Evidence Register

Last updated: **2026-08-27**

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
- **Change-bound:** migration parity and provider certification remain current
  only until a relevant migration, adapter, secret contract, or configuration
  changes.
- **Time-bound:** production smoke, email-worker health, and scheduled database
  monitoring expire after 48 hours.

## Current register

| Capability                | Environment                                                        | Latest inspected evidence                                                                                                                                                                                                                                  | Verified at (UTC) | Validity     | Status                                                       |
| ------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ------------ | ------------------------------------------------------------ |
| Documentation checker     | Local worktree based on `fe4b90ae59acf1105569b2edf6bfd705b548e6fe` | `node --test scripts/__tests__/check-docs.test.mjs`: 4/4; repository check recorded in current-state                                                                                                                                                       | 2026-08-20        | Commit-bound | CURRENT for this worktree only                               |
| Production smoke          | Vercel production                                                  | Latest `Nightly Monitoring / Production Smoke Tests` run not inspected in this pass                                                                                                                                                                        | —                 | 48 hours     | **[NO VERIFICADO]**                                          |
| Email worker              | Linked Supabase                                                    | Latest `Nightly Monitoring / Email Worker Health` result not inspected in this pass                                                                                                                                                                        | —                 | 48 hours     | **[NO VERIFICADO]**                                          |
| Database advisors         | CI local database rebuilt from migrations                          | Latest `Nightly Monitoring / Database Advisors` result not inspected in this pass                                                                                                                                                                          | —                 | 48 hours     | **[NO VERIFICADO]**                                          |
| Migration parity          | Local ↔ linked Supabase                                            | Current local and linked migration lists were not compared after the latest migrations                                                                                                                                                                     | —                 | Change-bound | **[NO VERIFICADO]**                                          |
| Full CI and preview build | GitHub Actions + Vercel Preview                                    | [PR #152](https://github.com/pipec80/iroko/pull/152) head `b396aa4` passed Quality, CodeQL, Documentation, Security, Gitleaks, Unit, Database Types/Tests, Edge Function, Chromium/WebKit E2E, Build and Vercel Preview; it was squash-merged as `4a0a3d4` | 2026-08-27        | Commit-bound | CURRENT for PR head; separate `main` run **[NO VERIFICADO]** |
| Billing providers         | Mercado Pago reference; Stripe, Paddle, Lemon Squeezy              | Core v2 is merged, but no provider sandbox lifecycle has been certified. Mercado Pago Fase 2 is the next gate.                                                                                                                                             | —                 | Change-bound | **[NO VERIFICADO]**                                          |

## Historical evidence

Historical results remain useful for diagnosis but cannot satisfy the current
register after they expire:

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
