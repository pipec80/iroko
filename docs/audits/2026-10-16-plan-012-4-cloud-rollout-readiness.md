# Plan 012.4 — Cloud rollout readiness

Date: 2026-10-16. Local implementation: `3ee98bd`; local closure status:
`800e439`. This is preparation evidence, not authorization or Cloud acceptance.

## Verified preparation

The [database preflight](2026-10-16-plan-012-4-cloud-db-preflight.md) renewed
the Supabase project `rgrxlygtmvavqzkjyywg` (`iroko`, `ACTIVE_HEALTHY`, Free).
Its 166 version/name pairs match local history; exactly three migrations are
pending. The coordinator verified their file hashes and ran the installed CLI's
linked dry-run, exit 0, selecting only:

1. `20261015185348_impersonation_expiry_contract.sql`.
2. `20261015185953_navigation_link_contract.sql`.
3. `20261016015800_legacy_webhook_comment_truth.sql`.

No roles or seed were included and no migration was applied. The observed
announcements, notifications and open impersonation counts were all zero. No
backfill or directed session closure is needed for that snapshot; these counts
must be refreshed immediately before any authorized mutation.

## Execution order and stop conditions

1. Renew target identity, ledger, migration hashes and data/session gates.
   Stop if the pending migration set differs, sessions are open or links need
   classification. The existing navigation backfill script is local-only.
2. Confirm the exact Vercel project, deployment source and secret-name presence.
   A secret name does not establish a valid value. Provision a dedicated random
   32-byte/64-hex impersonation key before compatible code is deployed. Validate
   the mock key against the same strong format, preserving an existing valid
   dedicated key; replacement must be explicitly included in the authorization.
   Transfer secrets without values in Git, reports, argv or screenshots.
   Repeat the affected-session gate immediately before key invalidation and
   deployment; stop and use directed owner-authorized recovery if rows appear.
3. Apply only the three selected migrations after authorization; verify ledger
   169, the intended function/constraint changes and preserved ACL. Compare
   security/performance advisor identities against the preflight baseline rather
   than judging only aggregate counts. Do not widen backend RPC grants.
4. Deploy a sealed candidate with source-map uploads off. Candidate source must
   be compared with the actual deployed baseline: the earlier 012.3 candidate
   was selective, so current Git ancestry alone does not establish Cloud parity.
   Do not add unrelated Robot work, new resources, paid capacity or dependencies.
5. Run the authorized real-browser acceptance on that exact candidate. Require
   CSP/nonce behavior, real Turnstile and MFA/impersonation, mock opt-in, worker
   controls and fixture cleanup. Observe one browser-SDK Sentry event and one
   consented PostHog event in their providers, with sanitized correlation IDs and
   at most three attempts per receipt test. A tunnel HTTP 200 alone is insufficient.
6. Record actual results and limitations. Push/PR, merge and stable-domain
   promotion remain distinct actions requiring their concrete authorization.
   Update Plan 012 and move 012.4 to completed only after its acceptance gates pass.

## Rollback boundary

Keep the dedicated key and a deployment compatible with that key and the new
authorization contract. Do not roll back to signing return cookies with the
Supabase server key. Any SQL reversal is a reviewed forward migration, not a
history repair or a dropped CHECK used to force acceptance. Stop a failed
candidate before promotion; retain the failed attempt as evidence. Never disable
Bot Protection, broaden WAF or weaken CSP to make acceptance pass.

## Candidate and receipt access

The [deployment preflight](2026-10-16-plan-012-4-deployment-preflight.md) confirms
the stable alias targets `dpl_5uU8Fr1qKw4d2nRyKgyk32vpgCUN`, READY production,
Git metadata SHA `58a00b7` on main. The candidate is the exact tracked export of
`800e439`: 1080 files, 81 changed paths, SHA-256
`56eecf27c4ee80c312003982d61ea976f0ff56279229a92aecef890613c4a0c7`.
It preserves the deployed Next security update and adds only the Plan 012.4
delta. Its product implementation is the tested `3ee98bd`; `800e439` adds docs.
The ignored source archive was extracted into the fixed local candidate
directory and all 1080 files verified against their exact Git blob hashes.
The installed Vercel 59.15.1 local collector selected 1078 files / 13,641,350
bytes; only `.gitignore` and `supabase/.gitignore` were excluded. Every selected
path, size and SHA-256 matched the sealed source. Its network/child-process
calls were blocked during inventory. No file was uploaded and no deployment was
created; the local manifests retain source and collector hashes.

Vercel metadata with decrypt=false shows IMPERSONATION_COOKIE_SECRET absent in
preview and production. Mock, CAPTCHA, Sentry and PostHog variables are present
by name; values/formats have not been read. Upload opt-in is absent and defaults
off; the candidate proposal explicitly sets it false. Current WAF readback and
remote CI state remain **[NO VERIFICADO]**, with tool errors recorded separately.

The [acceptance protocol](2026-10-16-plan-012-4-cloud-acceptance-protocol.md)
defines real browser SDK triggers, provider correlation and bounded retries.
Sentry issue lookup and PostHog record queries now work with existing access,
using deliberately absent markers/UUIDs and without emitting events. Candidate
DSN/token correspondence, quotas, Turnstile hostname permission, protected
browser access and real receipts remain acceptance preconditions. Readable
provider queries do not establish those facts.

## Concrete mutation selection for separate approval

- Supabase target `rgrxlygtmvavqzkjyywg`: apply exactly the three named/hash-checked
  migrations after renewing empty data/session gates. No seed, roles, resets,
  Vault value changes or ACL broadening.
- Vercel project `prj_gEe5cFBOgMxmCCNisaRzZW2xZBiL`, team
  `team_WnEm7dz6VjfsNDl8jFd5VBke`: provision the dedicated cookie key in preview,
  validate the existing mock key privately, and set preview uploads false. A
  nonconforming mock key, hostname mismatch or need for other provider changes
  stops this selection for review; replacement is not silently authorized.
- Deploy the sealed candidate as preview and run bounded acceptance with real
  CAPTCHA/MFA, authorized test fixtures/cleanup and at most three receipt
  attempts per provider. No stable-domain promotion, production-secret changes,
  push or merge is included in this selection. Promotion requires extending the
  dedicated key configuration to the approved production scope first.

The source directory and upload selection are already prepared locally;
mutations await approval and their remaining operational gates still require
verification. Approval does not waive those gates. Recheck source/upload manifests immediately
before execution. Any further change to product source requires a new seal and
proportional validation. Subsequent documentation-only commits do not enter the
sealed candidate implicitly.

The local Vault incident remains recorded in the
[local execution audit](2026-10-15-plan-012-4-local-hardening.md). The Cloud
inspection selected names and ACL metadata only; it did not read or change Vault
values or establish equality with reconstructed local values.
