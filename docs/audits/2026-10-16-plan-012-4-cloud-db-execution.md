# Plan 012.4 — Cloud DB execution record

Status: **APLICADAS — postflight de catálogo PASS; aceptación runtime pendiente**.
Scope: read-only pre/postflight owned by the DB reviewer. The coordinator owns
all Cloud mutations. The coordinator reported the authorized CLI application
completed with exit 0 at approximately 2026-10-17 00:01 UTC (2026-10-16 21:01
Chile). Fresh authenticated read-only inspection below independently verifies
the applied ledger and bounded catalog parity. It does not establish runtime
acceptance or full-platform schema parity.

## Applied selection and postflight

The coordinator used the installed CLI with the linked identity and accepted
file hashes checked, repeating the exact-selection dry-run before
`supabase db push --linked --yes`. The inspected application log lists only:

1. `20261015185348_impersonation_expiry_contract.sql`.
2. `20261015185953_navigation_link_contract.sql`.
3. `20261016015800_legacy_webhook_comment_truth.sql`.

The final structured log record has `message: Finished supabase db push.`,
`dryRun:false`, and empty `seeds`/`roles` arrays. No reset was included.
Application exit 0 is the coordinator's recorded result; this reviewer
performed no Cloud mutation.

MCP renewed `iroko` / `rgrxlygtmvavqzkjyywg`, `ACTIVE_HEALTHY`, PostgreSQL
`17.6.1.141`. Read-only catalog snapshot at
**2026-10-17T00:01:50.237867Z** and ACL snapshot at
**2026-10-17T00:02:18.416767Z** establish:

- Ledger **169**, latest `20261016015800`. MCP version/name pairs match all
  **169** repository migration filenames: zero differences or Cloud-only entries.
- All four functions in the reference table below match local accepted
  **definition MD5, body MD5, ACL and COMMENT**. All pin empty search_path;
  the validator is SECURITY INVOKER, the other three SECURITY DEFINER.
- Both navigation CHECKs have the exact expected definition and are validated.
- End-session and publish keep authenticated EXECUTE; anon and service_role
  remain denied. No backend grant was widened. The validator permits
  authenticated/service_role, denies anon, and has no PUBLIC EXECUTE.
- The legacy helper retains its before-change definition/body/ACL; only its
  reviewed COMMENT changed and now equals the accepted local description.
- Announcements **0**, notifications **0**, open impersonation rows **0**.
- Vault role ACL equals the earlier matrix: anon/authenticated have no USAGE or
  direct read/write access; service_role keeps USAGE, encrypted/decrypted SELECT
  and encrypted DELETE, with direct INSERT/UPDATE denied. No values were read.

These are catalog/data observations. No impersonation RPC, constraint-rejection
fixture, worker invocation, Auth fixture or DML acceptance was run by this
reviewer; those runtime gates remain **[NO VERIFICADO]** here.

## Fresh advisors after application

Security observed **2026-10-17T00:01:58.704Z**: **59 WARN / 6 INFO**.
Performance observed **2026-10-17T00:01:58.776Z**: **40 INFO**. Group counts equal
the earlier documented preflight; no aggregate increase was observed.

| Group                                              | Postflight count |
| -------------------------------------------------- | ---------------- |
| rls_enabled_no_policy                              | INFO 6           |
| function_search_path_mutable                       | WARN 1           |
| anon_security_definer_function_executable          | WARN 2           |
| authenticated_security_definer_function_executable | WARN 55          |
| auth_leaked_password_protection                    | WARN 1           |
| no_primary_key                                     | INFO 1           |
| unused_index                                       | INFO 39          |

Sanitized after-state SHA-256 identity fingerprints:

- Security: `f4ef11dd53c544c4cf50167cd9f432b7da28cf1b448a5db7adcc259efe5dc69e`.
- Performance: `6f605d01006c659104020a0ff7a23bacbbbc9dc2b464d1ee3d23af739c0905fc`.

Reproduction: project each lint to `{name, level, findings}`; findings are its
metadata objects, sorted lexically by their original JSON strings; sort lint
groups lexically by name; recursively sort object keys; serialize compact JSON
and SHA-256 its UTF-8 bytes. Exclude volatile timestamps, prose, remediation URLs
and counts (array membership retains actual finding identity). These are fresh
after-state references, not proof of exact before/after identity equality.
The unavailable complete before-state prevents that comparison, which remains
**[NO VERIFICADO]**. Existing classifications and remediation references remain
in the [preflight](2026-10-16-plan-012-4-cloud-db-preflight.md#advisors-baseline).

## Before-change observation

Authenticated Supabase MCP SQL, `BEGIN READ ONLY` and 15-second statement timeout,
observed at **2026-10-16T23:31:24.140994Z**, project
`rgrxlygtmvavqzkjyywg`. Git HEAD inspected:
`c1c716fc8d596fc7b580b1c1bc6867265d7c8c32`.

Ledger: **166**, latest `20261014012941`. Announcements **0**, notifications
**0**, impersonation rows with `ended_at IS NULL` **0**. Navigation validator and
both navigation CHECK constraints absent. No data, function, role or secret was
mutated by this reviewer. SQL inspection paused when the coordinator announced
application to avoid mixing baseline and postflight observations.

| Function                                         | Before definition MD5              | Before source MD5                  |
| ------------------------------------------------ | ---------------------------------- | ---------------------------------- |
| public.end_impersonation_session(uuid,text)      | `5fa8d30288f4b4614bcdf03a4e137cbc` | `25888a5aed20ec527f1a48dad065250c` |
| public.publish_announcement(text,text,text,text) | `9be52edc30a08755469b95398be016c1` | `4e7f69c3cbc3595481a8ffdb58f3bc87` |
| private.send_webhook_delivery(uuid)              | `3cc4ef84972ab59e73212af31e9c5a43` | `2fb75d4774ec37ada747a282ca557b54` |

MD5 here is a compact equality fingerprint of catalog definitions, not a security
signature. All three functions are SECURITY DEFINER with empty search_path.
End-session/publish ACL: postgres and authenticated EXECUTE, no anon or
service_role EXECUTE. The legacy helper permits postgres only. Its pending
migration changes only COMMENT, so definition/source hashes must remain equal.

## Accepted local reference and postflight method

Official local read-only catalog reference completed at
**2026-10-16T23:34:03.469173Z**, ledger **169**, through
`docker exec supabase_db_saas-boilerplate psql ...` (exit 0). Expected definition
fingerprints:

| Function                                         | Local accepted definition MD5      | Local accepted source MD5          |
| ------------------------------------------------ | ---------------------------------- | ---------------------------------- |
| public.end_impersonation_session(uuid,text)      | `0585b26d10a579ec90cb0fe7e3cc0c58` | `cde5bfcb6906225688714deb87e8d7f5` |
| private.is_safe_navigation_link(text)            | `4ed3333a6c210760a0a0a4f879396739` | `3c240867172cf79a5739a4e34683004b` |
| public.publish_announcement(text,text,text,text) | `00de06a0a1bf2c3b4fe10707277057fe` | `059bed3d4e11227c8f30f9161e01fb10` |
| private.send_webhook_delivery(uuid)              | `3cc4ef84972ab59e73212af31e9c5a43` | `2fb75d4774ec37ada747a282ca557b54` |

Local constraints both report `CHECK (private.is_safe_navigation_link(link))`
and `convalidated=true`. Cloud now matches both at the dated postflight above.

The read-only postflight checked the following selection:

1. Ledger **169** and the exact three expected version/name additions from the
   [preflight](2026-10-16-plan-012-4-cloud-db-preflight.md), with no extra entries.
2. Compare end-session, publish and navigation-validator source/definition
   fingerprints with the official local accepted database or exact accepted SQL
   source; confirm SECURITY DEFINER/INVOKER modes and empty search_path.
3. Both named navigation CHECK constraints present and `convalidated=true`,
   targeting the intended helper. Validator invoker ACL permits authenticated
   and service_role, denies PUBLIC/anon; end-session/publish ACL stays unchanged.
4. Legacy helper behavior and ACL unchanged; only its reviewed COMMENT differs.
5. Recheck announcement/notification/open-impersonation counts and Vault ACL
   metadata. No fixture or DML acceptance is included in this read-only step.
6. Capture security and performance advisors and compare available baselines.

The earlier preflight documented security **59 WARN / 6 INFO** and performance
**40 INFO**. Its complete raw advisor findings are unavailable in this tool
session; exact before/after advisor-fingerprint equality is **[NO VERIFICADO]**.
Aggregate equality alone cannot establish identity equality. Preserve a sanitized
postflight identity baseline for future comparison; do not claim the unavailable
comparison passed.

Bounded source/constraint parity, ACL preservation and applied ledger passed as
dated above. Runtime MFA/impersonation behavior, worker health, real browser
acceptance and provider receipts remain **[NO VERIFICADO]** in this record.
No fixture acceptance or provider receipt is inferred from catalog parity.
