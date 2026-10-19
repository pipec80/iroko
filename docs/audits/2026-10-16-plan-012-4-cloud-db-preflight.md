# Plan 012.4 — Supabase Cloud DB preflight

Date: 2026-10-16. Scope: authenticated read-only Cloud inspection and local
migration-ledger comparison. Branch `chore/012-4-csp-and-secrets`, inspected HEAD
`800e439ac07bcdb6c0d2016edcc7044fbbce228f` (implementation `3ee98bd`).

**Verdict:** database preparation is concrete and the current data snapshot has
no navigation backfill or open-impersonation rows. Cloud remains three migrations
behind local. This report authorizes no SQL writes, secrets changes, deployment,
push or merge and does not establish Plan 012.4 Cloud acceptance.

## Method and identity

Read the repository contract, index/current state, ADR 0004, active Plan 012.4,
Supabase skill, three pending migration sources, schema mirrors and the actual
TypeScript navigation normalizer/local-only backfill script. Metadata was obtained
through the authenticated Supabase MCP, followed by `execute_sql` transactions
using `BEGIN READ ONLY` and bounded statements. Returned data was limited to
counts, catalog metadata, known secret-name presence and ACLs. No secret value,
encrypted payload, link, user identifier or cron command was selected.

Fresh project metadata: `rgrxlygtmvavqzkjyywg`, name `iroko`, organization
`woekmxaaezehxymnhsdv` (`pipec80labs`), region `us-east-2`, status
`ACTIVE_HEALTHY`, PostgreSQL `17.6.1.141`, release channel `ga`. Organization
metadata reports `plan=free`, `tier=tier_free`; this does not audit cards or all
quotas. SQL snapshot times: 21:19:50–21:20:49 UTC. Project identity was renewed
again during that inspection.

`Get-Command supabase -All` and `where.exe supabase` resolve the installed Scoop
shim. `supabase --version` initially failed on its user-profile telemetry file
under the sandbox; its approved retry returned **2.110.0**. Docker inspection
initially hit pipe permissions; approved read-only `docker exec ... psql` then
returned the official local ledger. No CLI, dependency or resource was installed.
The skill's changelog fetch failed with unsupported `text/markdown`; no schema
implementation or new platform API assumption was made in this preflight.

## Exact ledger selection

MCP `list_migrations`: Cloud **166**. Local official container
`supabase_db_saas-boilerplate`, read-only `supabase_migrations.schema_migrations`:
**169**. Comparison of every version/name pair found **zero Cloud-only versions
and zero name mismatches**. The complete local-only set, in application order:

| Version        | Name                          | Static effect                                                                  | SHA-256 of inspected file                                          |
| -------------- | ----------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| 20261015185348 | impersonation_expiry_contract | Replace end-session authorization/locking contract; preserve signature and ACL | `43aee9408eb30d2e50809e44b022e81849099b8eb9f2b9c35985afa4091a8576` |
| 20261015185953 | navigation_link_contract      | Validator, atomic data gate/CHECKs and publish RPC validation                  | `df48304a69652bd6729a8f650bc810750d435016a649f16e3df9b54d0ea359ca` |
| 20261016015800 | legacy_webhook_comment_truth  | COMMENT only on existing legacy helper                                         | `10e981937ae9e4a752a0e30ce106bf8db7e8d4d7e787c88abd84391f77166c18` |

Cloud's last version is `20261014012941_account_api_summary_columns`. The new
navigation validator and both navigation constraints are absent. Ledger parity
checks version/name history, **not historical SQL-body equality**; full schema
source parity remains **[NO VERIFICADO]**. The coordinator subsequently ran
`supabase db push --linked --dry-run`, exit 0, after checking the linked project
reference. At 21:57 UTC its output selected exactly the three files above and
explicitly stated that migrations would not be pushed. Neither include-roles
nor include-seed was requested. No migration was applied.

## Data gates and normalization sequence

| Table                | Rows | Canonical | Normalizable | Invalid |
| -------------------- | ---: | --------: | -----------: | ------: |
| public.announcements |    0 |         0 |            0 |       0 |
| public.notifications |    0 |         0 |            0 |       0 |

All category counts are exactly zero because both tables are empty. No historical
link was retrieved and no substitute SQL classifier was used. Open impersonation
sessions: **0**, comprising **0** expired and **0** unexpired open sessions.
These are point-in-time facts; concurrent writes can invalidate them.

Before authorized application, renew project identity, exact ledger selection,
file hashes, navigation counts and open-session counts. If navigation remains
empty, skip backfill. The migration locks both tables and checks data in the same
atomic DO statement as CHECK installation; a dirty concurrent insertion causes
the gate to abort rather than silently discard data.

If rows appear, stop the application selection. The current
`scripts/normalize-navigation-links-local.mjs` intentionally supports only the
official local Docker stack and must not be pointed at Cloud. A separately
reviewed, explicitly authorized Cloud adapter would need to run the existing
`normalizeNavigationLink` over an in-memory complete id/link snapshot without
logging it; expose only canonical/normalizable/invalid/update counts; obtain
approval for any invalid-link-to-NULL changes; lock both tables with bounded
timeouts; compare the complete snapshot including inserts/deletes; then apply
only changed values atomically. Drift must abort. Repeat counts and apply the
constraint migration immediately under controlled writes. The current empty
snapshot requires none of those data mutations.

## Vault matrix and consumers

Vault has **6** entries. The six expected names are present: `project_url`,
`email_worker_secret`, `billing_worker_url`, `billing_reconciliation_secret`,
`webhook_worker_url`, `webhook_worker_secret`. Endpoint-secret count is **0**;
other-name count is **0**. Presence does not prove values, target correctness,
strength, worker equality or operational delivery: these remain **[NO VERIFICADO]**.
Application cookie/mock secrets belong to hosting configuration; this Vault
inventory does not establish their presence or validity.

| Role          | Vault USAGE | secrets SELECT | INSERT | UPDATE | DELETE | decrypted_secrets SELECT | create_secret / update_secret EXECUTE |
| ------------- | ----------- | -------------- | ------ | ------ | ------ | ------------------------ | ------------------------------------- |
| anon          | false       | false          | false  | false  | false  | false                    | false / false                         |
| authenticated | false       | false          | false  | false  | false  | false                    | false / false                         |
| service_role  | true        | true           | false  | false  | true   | true                     | true / true                           |

Backend Vault capabilities exist deliberately and must be preserved; blanket
revocation would break established consumers. Catalog inspection identifies
`private.project_url`, `private.email_worker_secret`,
`private.invoke_billing_worker`, `private.process_webhook_deliveries`,
`public.claim_webhook_deliveries`, `public.create_webhook_endpoint_validated` and
`public.delete_webhook_endpoint` as direct Vault references. All inspected
consumers pin an empty search_path. Private helpers permit postgres execution;
claim permits service_role; endpoint create/delete permit authenticated execution
with their existing internal authorization contracts. This catalog inspection
does not re-prove those bodies or exercise those contracts.

Cron metadata counts show one active email consumer, two active billing consumers
and one active webhook consumer, selected by helper references without returning
commands. Scheduling presence is not execution/delivery health.
`end_impersonation_session(uuid,text)` currently permits authenticated execution,
denies anon and denies service_role; the pending migration preserves that ACL
and does not activate its reserved backend branch.

## Advisors baseline

Fresh security advisors: **59 WARN / 6 INFO**, matching the aggregate recorded
post-012.3 baseline. This is a new before-change baseline, not a claim that all
findings were remediated or every historic fingerprint is identical.

| Advisor                                  | Level / count | Classification                                                                                                                                                    |
| ---------------------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RLS enabled without policies             | INFO / 6      | private account/IP admissions and webhook validation; public api_keys, webhook deliveries/endpoints. Preserve deliberate RPC-only access; no policy changes here. |
| Mutable search_path                      | WARN / 1      | billing.assert_provider_price_matches_plan; inherited item requiring separate review.                                                                             |
| anon SECURITY DEFINER execution          | WARN / 2      | check_request, get_active_plans; inspect intended API contracts rather than blindly revoke.                                                                       |
| authenticated SECURITY DEFINER execution | WARN / 55     | Existing RPC surface; caller checks must be reviewed per function.                                                                                                |
| Leaked-password protection disabled      | WARN / 1      | Existing Auth configuration; no paid upgrade or configuration mutation authorized.                                                                                |

Performance advisors: **40 INFO** (one missing primary key on private.rate_limits,
39 unused indexes). No index deletion is proposed from this observation.
Advisor remediation references: [RLS](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy),
[search_path](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable),
[anon definer](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable),
[authenticated definer](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable),
[password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Authorization and rollback constraints

The concrete DB write selection is precisely the three files above on the
renewed project, after a linked dry-run confirms no extra migrations, seeds or
roles. Authorization must name that target and selection; this preflight grants
none. Secret provisioning, session closure/recovery, candidate deployment,
observable provider receipts and Git publication/integration remain separate
actions with their own explicit authorization and acceptance criteria.

Provision the dedicated valid cookie secret before deploying code that requires
it. Recheck and close affected sessions through an authorized, identity-verified
path before invalidating old cookies; zero current rows does not authorize
skipping the later check. Never infer closure rights from a cookie UUID or call
the denied service_role RPC branch as if it were enabled.

Rollback must retain a deployment compatible with the dedicated secret and the
new authorization contract; never restore Supabase-key cookie signing. Do not
delete/repair migration history or drop CHECK constraints to force a rollback.
Any SQL rollback is a reviewed forward migration with renewed identity and
authorization. If a normalization ever occurs, reverse only from a securely
retained snapshot after drift validation; invalid/unsafe links cannot be restored
under the new constraints. No normalization occurred here.

No DB blocker is demonstrated in the current data snapshot. Remaining blockers
to Cloud closure are authorization for the selected writes and the separate
candidate/runtime acceptance gates, including real MFA impersonation, Turnstile,
workers/cleanup and actual Sentry/PostHog receipts. All remain **[NO VERIFICADO]**
for 012.4 in this read-only report.
