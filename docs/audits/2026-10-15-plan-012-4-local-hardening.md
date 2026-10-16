# Plan 012.4 — local hardening execution, 2026-10-15

Status: local implementation, runtime acceptance and final checks **passed** on
`chore/012-4-csp-and-secrets`. No Cloud writes, provider changes, deployment,
push or merge are established by this record. The
[task 1 record](2026-10-15-plan-012-4-task-1-local.md) retains its earlier dated
attempts; this update supersedes its statement that tasks 2–5 are unimplemented.

## Implemented local surface

- Impersonation uses the dedicated secret, strict session-bound v2 return
  cookie, verified admin restoration before owner closure and compensation for
  failed starts. Expiry closes only through SQL authorization and removes local
  impersonated identity even on backend failure. Auxiliary cookies or a signed
  impersonation marker are required for cleanup: a top-level GET cannot log out
  an unrelated normal session. The recovery and rotation contract is in the
  [module/runbook](../modules/impersonation.md).
- Mock signing is bounded, canonical UTF-8/base64url with exactly two segments
  and hex64 HMAC verification through WebCrypto. Checkout and the six normalized
  event variants have separate strict schemas. The common production opt-in
  applies independently of the default provider, including direct provider,
  registry, page, confirmation and cancellation consumers.
- Navigation links normalize through one TS contract before actions and notify
  persist or schedule email. Inbox/email fail closed for historical invalid
  links while retaining message content. SQL migration/helper/constraints and
  the separate preflight/backfill script preserve valid normalizable links;
  SQL rejection alone must not turn a link into NULL.
- CSP generates a 16-byte nonce, overwrites incoming nonce/CSP and forwards the
  request policy while preserving locale overrides and auth cookies. Root
  rendering is explicitly dynamic. The nonce provider, theme and late CAPTCHA
  consumers retain the live document nonce across RSC updates. Production
  scripts omit inline/eval permissions; inline styles remain an exception.
  Reporting is DSN-derived and absent for local validation, missing/malformed
  DSNs and synthetic loopback DSNs.
- Global proxy coverage includes prefetch and unknown dot paths. Infrastructure
  and the inventoried public assets pass through without locale redirects;
  a unit inventory checks every actual public file, including ignored PNGs.
  Infrastructure document requests also receive private/no-store controls.

These descriptions concern the changed local sources, not deployed behavior.

## Evidence ledger and snapshot limits

Commands use installed executables directly because the earlier pnpm invocation
attempted implicit installation. No dependency update is claimed or required.

| Evidence | Observed result and boundary |
| --- | --- |
| Task 1 isolated build baseline | Semantic baseline passed: 43 dynamic routes, zero forbidden Node events and zero public maps. This precedes the CSP changes; runner cleanup remained separate work. It is not a final post-change build or E2E result. |
| Final isolated production build | `node scripts/run-plan-0124-local.mjs --build`: exit 0, 43 dynamic routes, 3,780,660 static asset bytes, zero public maps, zero forbidden Node attempts and zero synthetic build-sink requests. Cleanup encountered EPERM once, then the bounded retry passed with no scratch build left. |
| Final full Vitest and coverage | Fresh serial `node node_modules/vitest/vitest.mjs run --coverage --maxWorkers=1`: 122 files / 1452 tests passed, exit 0, including logout-CSRF regressions. Coverage: statements 91.33%, branches 84.46%, functions 96.18%, lines 93.8%, original thresholds unchanged. The preceding overlapping run was interrupted under measured resource pressure and is not acceptance evidence. |
| Task 2 final focused unit tests | `node node_modules/vitest/vitest.mjs run impersonation-cookie impersonation-actions api/impersonation/expire --maxWorkers=1`: 3 files / 57 tests passed. RED/GREEN covers claim binding, refreshed cookie chunks, normal-session GET preservation and signed malformed-marker cleanup. No real-browser MFA result is implied. |
| Task 3 focused Vitest | `node node_modules/vitest/vitest.mjs run billing/__tests__/signing billing/providers/__tests__/mock billing/__tests__/registry billing/__tests__/mock-policy billing/__tests__/mock-schemas dashboard/billing/__tests__/actions mock-checkout/__tests__/page`: 7 files / 84 tests passed at delivery. |
| Task 4 focused Vitest | Navigation/schema/announcement/notify/email/inbox and preserved notification/announcement hooks: 9 files / 113 tests passed at delivery. |
| Task 5 focused Vitest | `node node_modules/vitest/vitest.mjs run src/proxy.test.ts components/providers/csp-nonce-provider.test components/providers/theme-provider.test components/auth/captcha-field.test sentry-build-policy local-sentry`: 6 files / 69 tests passed at delivery. |
| TypeScript | Fresh final `node node_modules/typescript/bin/tsc --noEmit`: exit 0, as confirmed by the coordinator. |
| Final lint and formatting | Serial `node node_modules/eslint/bin/eslint.js .`: exit 0, 0 errors / 16 warnings. Warnings include existing navigation/Cloud-test warnings and non-null assertions in tests. Focused formatting passed for the changed supported files. |
| Vault consumer boundary | Local database test 52: 17 assertions passed, as reported by the coordinator. Backend SQL-body permission tests do not broaden shipped ACL. |
| Deno email tests | Cached-only run: 10 tests passed, as reported by the coordinator. No dependency installation or real Resend request is implied. |
| Navigation backfill drill | Generated SQL exercised Unicode normalization and drift detection with rollback; passed as reported by the coordinator. This is not a persistent Cloud backfill or a clean reset. |
| Coverage first attempt | 122 files / 1449 tests total: 1448 passed and one real-SDK import exceeded its 5-second timeout. Diagnostic investigation found fixture/env cleanup racing an unfinished import. |
| Coverage correction | Stable fixtures and a bounded 120-second timeout only for the real environment/SDK integration tests; its two focused tests passed in about 12 seconds, and the full 122-file coverage run subsequently passed. No production timeout or coverage threshold was relaxed. |
| Runner and backfill regressions | `node --test scripts/run-plan-0124-local.test.mjs scripts/normalize-navigation-links-local.test.mjs`: latest combined run 35 passed / 0 failed / 0 skipped. Includes official local Auth origin attestation, occupied-port/build-sink rejection, confinement of scratch external rewrites and bounded cleanup of only the runner's live Chromium PID on Windows. The cleanup regression was RED before the correction; the native browser probe passed with zero guard events. |
| Clean local reset and SQL | Latest `supabase db reset --local` through the credential-preservation helper at 16:18:38 UTC: exit 0, ledger 169, with two reconstructed local Vault values and API credentials preserved by RAM comparison. It does not prove preservation from the first failed attempt. Fresh post-reset `supabase test db --local`: exit 0, 52 files / 1067 assertions, PASS. The verified official local container baseline contains zero E2E users, accounts, ownerless accounts and impersonation sessions. Migration 169 corrects a legacy webhook comment without changing its body or ACL. |
| Final production Chromium and cleanup | `node scripts/run-plan-0124-local.mjs --e2e`: exit 0, 22 passed / 0 skipped / 0 failed / 0 flaky; start 2026-10-16T16:26:27.232Z, duration 245443.778 ms. Zero forbidden Node egress/child attempts through server teardown, zero scratch build directories. Post-run official local identity verification and counts confirmed zero E2E users, accounts, ownerless accounts and impersonation sessions. |
| Knip | Fresh serial `node node_modules/knip/bin/knip.js`: exit 0, six existing configuration hints; no unused-code error. |
| Documentation | `node scripts/check-docs.mjs`: 151 Markdown files passed. |

Independent review of Task 2 found two actionable failures: expiry cleanup only
considered incoming auth-cookie names, and post-OTP start checked target identity
without checking the minted impersonation claims. The coordinator reproduced and
corrected both before the 54-test focused result. SQL static review found the
lock/claim/expiry conjunction and existing ACL coherent; static review is not a
database or browser acceptance result. A fresh whole-candidate static review
also identified logout CSRF in expiry and the missing loopback sink assertion
in build acceptance; both were corrected. The reviewer found no remaining
static blocker, without claiming browser or Cloud acceptance.

### Browser runner corrections and evidence boundaries

An earlier Chromium run passed 21/22 cases, with the signup analytics timeout
masked by cleanup using a closed request context. Inspection of the local
confirmation flow established that GoTrue generated a `localhost` email link
while the runner used `127.0.0.1`; switching hosts lost the session cookie on the
confirmation redirect. The runner now attests the running official local Auth
project and its actual origin, and aligns browser base URL and `SITE_URL` with
that origin. No Cloud configuration or private environment file was changed.

A later signup attempt returned 504 during overlapping verification with CPU at
100% and about 977 MB available RAM. Acceptance commands subsequently run serially;
the scratch-only Next configuration uses the installed supported two-CPU option.
The product Next configuration was not changed for this resource adjustment.

An earlier 22-case browser pass was invalidated by runtime guard presence.
The exact event from that run cannot be reconstructed. A
separate probe reproduced installed Playwright's Windows cleanup fallback using
a denied shell-based `taskkill`; it does not identify the lost event conclusively.
The correction permits a shell-free rewrite only for a live Chromium process
owned by the guard, with its PID and absolute executable previously captured.
Node regressions passed 33/33 at that snapshot and the real native-browser cleanup probe recorded
zero guard events. Durable enum-only diagnostics and the final guard check after
server teardown are now included.

A subsequent guarded run recorded three socket denials from external Next
`/ingest` rewrites. The scratch-only `localizeExternalRewrites` helper now directs
HTTP, HTTPS and protocol-relative destinations to the local synthetic sink.
The product configuration and runtime guard remain intact. The confined repeat
passed all 22 tests with runner exit 0 and zero guard events through server
teardown; the expanded Node regression suite passed 35/35.

Post-run cleanup inspection found zero E2E users but 50 accumulated ownerless
accounts from MFA fixtures deleting Auth users before their accounts. Teardown
now deletes accounts before Auth users in one SQL transaction using validated
UUIDs; static review found no blocker. The official local database was reset
again at 16:18:38 UTC to ledger 169, preserving current keys and both reconstructed
Vault values. Fresh pgTAP passed 52 files / 1067 assertions; the verified official
local baseline contains zero E2E users, accounts, ownerless accounts and
impersonation sessions. The final E2E run verified the corrected cleanup:
it started at 16:26:27.232 UTC and passed all 22 cases with
runner exit 0, no skipped/flaky cases, zero forbidden Node egress/child attempts
through server teardown and zero scratch build directories. Verified post-run
counts in the official local project were zero E2E users, accounts, ownerless
accounts and impersonation sessions: the observed cleanup regression went from
50 ownerless accounts to zero after correction, clean reset and the full repeat.
This is local runtime evidence, without provider receipts. No pre-change HTTP
RED trace was recorded; such provenance is not claimed retroactively.

## Failed local reset and credential-preservation limitation

The official local reset failed before seed completion. Observed migration ledger
at that failure: **167**; Vault row count: **0**. This is a failed reset, never a
clean-rebuild PASS. The preservation helper retained two prior Vault values only
in RAM, then attempted an UPDATE against a missing row; that operation was a
no-op. The process ended and those exact two values were not preserved.

Pending source changes and `.env` credentials remain intact. That does not prove
preservation of the lost Vault rows or justify saying that all credentials were
preserved. Recovery subsequently recreated the two named local values from the
public local seed and existing local Edge configuration, without modifying
credential files or printing values. Exact equality with the first lost values
remains **[NO VERIFICADO]**.

The reset failure was reproduced as `LOCK TABLE can only be used in transaction
blocks`. Migration 168 now keeps lock, preflight and both constraints inside the
same atomic `DO`, so reset does not depend on an enclosing CLI transaction.
The corrected preservation helper creates missing named rows and verifies their
values in RAM rather than accepting a missing-row UPDATE as restoration.
The latest clean reset passed with ledger **169**, equal before/after API,
anon and service credentials, and two equal reconstructed Vault values.
Fresh pgTAP after the 16:18:38 UTC reset passed **52 files / 1067 assertions**.
This repaired local replay;
it did not modify Cloud or recover evidence that was lost in the first attempt.

## Remaining acceptance and authorization gates

- Final delta Node regressions passed 35/35, full ESLint passed with zero errors
  and 16 warnings, Knip passed with six configuration hints, focused format and
  documentation checks passed. TypeScript also passed in the isolated build.
  Local integration uses the reviewed explicit 81-file manifest and enabled
  typecheck/lint-staged/commitlint hooks; the branch history records the commit.
- Cloud migrations/configuration, real Turnstile, Sentry/PostHog provider receipts,
  deployment, push and merge require their separate authorization and evidence.
- Mock checkout TTL/jti/one-time use is not implemented. Inline style permission
  remains explicit debt. Passing focused tests does not close either limitation.

Local build, SQL, browser runtime and fixture cleanup passed. Plan 012.4 remains
active because Cloud acceptance remains **[NO VERIFICADO]** and requires
separate authorization. No push, merge or deployment is part of local integration.

## Closure status — 2026-10-16

Local implementation is committed as `3ee98bd` on
`chore/012-4-csp-and-secrets`. Typecheck, lint-staged and commitlint hooks passed;
post-commit documentation check passed for 151 Markdown files and the working
tree was clean. This status refresh inspected Git and existing evidence; it did
not rerun the full suites or inspect live Cloud state. ADR 0004 is accepted;
no additional ADR is currently required by the approved design.

| Closure gate | Status | Next action / user involvement |
| --- | --- | --- |
| Tasks 1–5 and local part of task 6 | Passed, with recorded Vault-loss and missing HTTP RED trace exceptions | No manual implementation or local test action required from the user. |
| Cloud preflight and exact change selection | Pending | Agent prepares a reviewable selection: target identity/access, migration parity, link normalization counts, Vault ACL/consumer metadata, secret presence and affected active impersonation sessions. No secret values in reports. |
| Cloud SQL and secret configuration | Not authorized or executed | Separate explicit authorization for the verified Supabase/Vercel targets, three named migrations and dedicated secret configuration. Close affected impersonation sessions before invalidating old cookies; normalize links before constraints where necessary. |
| Candidate deployment and acceptance | Not authorized or executed | Separate deployment/test authorization. Observe real Turnstile, MFA/impersonation, mock opt-in, workers, cleanup and advisor deltas; confirm one consented PostHog event and one browser Sentry event in their providers. At most three attempts per receipt test. |
| Git publication and integration | Local commit only | Push/PR and merge require their own authorization. Any domain promotion also requires an exact target and authorization. |
| Documentary closure | Pending Cloud evidence | Record candidate/provider evidence and exceptions, update task 6 and parent Plan 012, then move 012.4 to completed only after its acceptance gates pass. |

The migration selection is `20261015185348_impersonation_expiry_contract.sql`,
`20261015185953_navigation_link_contract.sql` and
`20261016015800_legacy_webhook_comment_truth.sql`. Expected targets remain the
plan's reference Supabase project `rgrxlygtmvavqzkjyywg` and Vercel Iroko project
`prj_gEe5cFBOgMxmCCNisaRzZW2xZBiL`; live identity and migration parity are
**[NO VERIFICADO]** in this status refresh. These references are not permission
to mutate those targets. No paid resources, provider upgrades or installs are
included. User involvement is authorization and, only if required by actual
access or a non-automatable challenge, completing that login/MFA/Turnstile step.
