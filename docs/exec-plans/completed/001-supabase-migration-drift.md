# Plan 001 — Resolve Supabase Migration Drift

- Priority: P0
- Status: Completed (2026-08-03)
- Blocked: plans 002, 005 and 006 where linked schema confidence is required — now unblocked
- Production write: not authorized by this plan; none was performed

## Closure note (2026-08-03)

Resolved without executing this plan's recovery procedure: both migrations already landed on `main` via PR #100, merged after this plan was written but before it was picked up. Revalidated by comparing `git ls-files supabase/migrations/*.sql` on `main` (119 files) against `mcp__supabase__list_migrations` on the linked Cloud project (119 migrations) — exact parity, same last version `20260729014653_relocate_pg_net_extension`. See `docs/audits/2026-08-02-full-platform-audit.md` (AUD-001) for full evidence.

## Problem

Supabase Cloud tracks two migrations that were not present in the inspected `main` branch:

- `20260729014652_harden_webhook_rpcs_and_subscription_lookup`
- `20260729014653_relocate_pg_net_extension`

The repository is therefore not a complete reconstruction source for production.

## Desired outcome

Git contains the exact Cloud migration SQL under the exact tracked versions, local and linked migration histories agree, and a clean database can be reconstructed and tested without reapplying existing production DDL.

## Constraints

- Do not invent or approximate migration content.
- Do not run `supabase db push --linked` while drift exists.
- Do not edit the Cloud migration history table manually.
- Do not apply new DDL to production as part of recovery.
- Redact secrets and connection strings from logs and documentation.

## Execution

1. Confirm branch, commit and clean working tree.
2. Run the current Supabase CLI `--help` and version commands.
3. Compare local and linked migration lists.
4. Retrieve the exact SQL from an authorized source, in this preference order:
   - original local branch/commit or developer workstation;
   - Supabase migration artifact/history export;
   - exact schema diff corroborated by commit/operation records.
5. Verify file names and SQL correspond to the Cloud versions.
6. Add both files to `supabase/migrations/` without applying them remotely.
7. Start/reset a disposable local Supabase environment from migrations.
8. Run pgTAP and generate database types.
9. Compare generated types with committed types.
10. Re-run local/linked migration comparison and confirm no pending replay of these versions.
11. Document checksums or another reproducible equivalence signal.

## Acceptance criteria

- Both exact migration files are versioned.
- Local migration list contains every Cloud version in the same order.
- A clean local reset succeeds from Git alone.
- pgTAP passes.
- generated TypeScript types are current.
- no production schema mutation occurred.
- the audit matrix records the PR and validation evidence.

## Required evidence

```text
git status
supabase --version
supabase migration list --local
supabase migration list --linked
local reset output
pgTAP summary
database type diff
checksums of recovered files
```

## Rollback

Revert the pull request. Do not alter Cloud migration tracking. If recovered SQL cannot be proven exact, stop and keep the plan open.
