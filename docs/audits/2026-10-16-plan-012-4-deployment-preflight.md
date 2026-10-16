# Plan 012.4 — deployment preflight, 2026-10-16

## Verdict and boundary

Read-only preparation and the sealed source/upload selection are complete and
reviewable, with explicit execution gates below. Secret provisioning, candidate
hostname/browser protection and runtime acceptance remain pending separate
authorization and verification. No provider writes, deployment, push, merge, alias assignment or
secret-value retrieval was performed. This record does not close Plan 012.4.

Sources read: repository AGENTS contract, documentation index/current state,
accepted ADR 0004, active Plan 012.4, executable environment/CSP/upload gates,
CI workflows and Vercel CLI/deployment skills. Local acceptance counts in the
plan are historical evidence; this task did not rerun product tests.

## Current identity and deployment: observed authenticated metadata

- Project `iroko`: `prj_gEe5cFBOgMxmCCNisaRzZW2xZBiL`.
- Account/team: `team_WnEm7dz6VjfsNDl8jFd5VBke`, slug `pipec80-labs`.
- Alias `project-a89lv.vercel.app` currently resolves to
  `dpl_5uU8Fr1qKw4d2nRyKgyk32vpgCUN`.
- Deployment URL: `iroko-buiqzfuxp-pipec80-labs.vercel.app`; state `READY`;
  target `production` (the project remains MVP/test).
- Deployment metadata records repository `pipec80/iroko`, ref `main`, SHA
  `58a00b7799669b20e35ecbaa8303d6205f64aebd`.
- Project metadata reports preview SSO deployment protection enabled.

These observations came from authenticated MCP `get_project`, `get_alias`,
`get_deployment(withGitRepoInfo=true)` and `get_team`. The stable deployment
has advanced from the earlier selective 012.3 candidate. Its recorded Git SHA
matches the local `origin/main` baseline for the Next security update. This is
deployment provenance metadata, not an independent hash of deployed files or
an application/browser health check. Live provider plan and remaining quotas
were not independently established; preserve the user-declared Free baseline.

## Environment presence only

The `filter_project_envs` tool schema was inspected before calling it with
explicit `decrypt: "false"`. Values were never selected, printed or inspected.
Only key, target, type, branch and update metadata were retained for reporting.

| Key                               | Preview                     | Production                  | Meaning                                               |
| --------------------------------- | --------------------------- | --------------------------- | ----------------------------------------------------- |
| IMPERSONATION_COOKIE_SECRET       | Absent in returned metadata | Absent in returned metadata | Must provision before deploying code that requires it |
| MOCK_BILLING_SECRET               | Present                     | Present                     | Strength/format remains [NO VERIFICADO]               |
| ALLOW_MOCK_BILLING                | Present                     | Present                     | Opt-in value remains [NO VERIFICADO]                  |
| SENTRY_UPLOAD_SOURCE_MAPS         | Absent in returned metadata | Absent in returned metadata | New code fails closed for upload authorization        |
| SENTRY_AUTH_TOKEN                 | Present                     | Present                     | Presence does not authorize uploads                   |
| NEXT_PUBLIC_SENTRY_DSN            | Present                     | Present                     | Destination/receipt remains [NO VERIFICADO]           |
| NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN | Present                     | Present                     | Project identity/receipt remains [NO VERIFICADO]      |
| NEXT_PUBLIC_TURNSTILE_SITE_KEY    | Present                     | Present                     | Widget hostname allowance remains [NO VERIFICADO]     |
| SUPABASE_AUTH_CAPTCHA_SECRET      | Present                     | Present                     | Auth configuration/runtime remains [NO VERIFICADO]    |

`SITE_URL` has distinct preview and production entries. Their values and
compatibility with the eventual candidate origin were deliberately not read.
Metadata presence is not proof of a valid secret, configuration or runtime.

## Git source and CI boundary

Local branch: `chore/012-4-csp-and-secrets`; inspected HEAD
`800e439ac07bcdb6c0d2016edcc7044fbbce228f`. Local baseline
`58a00b7799669b20e35ecbaa8303d6205f64aebd` has exactly two subsequent commits:
implementation `3ee98bd` and closure-document clarification `800e439`.
The local name-only diff contains Plan 012.4 files, including three migrations,
environment/CI, CSP/rendering, impersonation, mock and navigation changes.
It has no Robot-specific delta relative to this baseline. The historical 012.3
selective manifest was not opened or executed. Reconstructing current production
from that older manifest would miss the later stable Next security update.

Prepare a new candidate from an exact tracked export of `800e439` (or a reviewed
successor), with a path/hash manifest and a delta manifest against `58a00b7`;
exclude ignored local files, credentials and transient acceptance fixtures.
An immutable export prevents concurrent workspace edits entering deployment.
The coordinator subsequently sealed the tracked export as
`candidate-800e439.tar`: 1080 tracked files, exactly 81 changed paths against the
live metadata baseline, SHA-256
`56eecf27c4ee80c312003982d61ea976f0ff56279229a92aecef890613c4a0c7`.
The ignored `cloud-candidate-manifest.json` records that selection. Private env,
dependency/build trees and database artifacts were rejected from tracked paths.
The coordinator extracted the archive into the checked local directory
`.superpowers/sdd/012-4-csp-and-secrets/candidate-800e439` and verified all 1080
Git blobs. The installed CLI 59.15.1 `inspectDeploymentFiles` local collector
selected 1078 files / 13,641,350 bytes, excluding only the two `.gitignore` files.
All upload paths/sizes/SHA-256 values match the source manifest. Network and child
execution were blocked during this inventory. CLI `--dry` is the supported dry
flag, but its wrapper may perform remote lookups; the local collector avoided
those lookups. No upload/deployment occurred; the future candidate hostname is
still pending.

Static CI: `.github/workflows/ci.yml` runs application checks for PRs to main,
main pushes and explicit dispatch. It explicitly disables Sentry uploads and
uses synthetic keys for local validation. `.github/workflows/docs.yml` runs for
all PRs to main. `vercel.json` disables Git deployments for Dependabot only;
publishing this working branch may therefore trigger a preview independently
of application CI. Do not push before resolving deployment prerequisites.

Remote branch existence and CI results for this HEAD remain [NO VERIFICADO].
`git ls-remote` failed in the sandbox with an MSYS permission error;
`gh run list` failed connecting to api.github.com. Their escalated read-only
retry was interrupted while approval was pending; no result is claimed.

## Tools and explicit gaps

`Get-Command vercel,gh -All`, `where.exe vercel`, `vercel --version` and
`gh --version` confirmed installed Vercel CLI 59.15.1 and gh 2.96.0. No installs
or upgrades were attempted. Existing `.vercel/project.json` matches the target.
`vercel project inspect --non-interactive` did not produce a completed identity
result in this task; authenticated MCP establishes identity instead.

MCP `get_firewall_config(configVersion=active)` returned HTTP 404
`Seawall Config not found`. Current WAF version/rules are [NO VERIFICADO]; do
not interpret this as absent protection or overwrite it. The historical three
rules/version 6 remain historical only. No WAF mutation is proposed.

`vercel deploy --help` confirms `--target`, `--project`, `--skip-domain`,
`--non-interactive`, `--meta` and `--force`. It also emitted a blocked npm
dist-tags network lookup after printing help. No deployment was attempted.

## Concrete proposed sequence, not execution authorization

1. Seal the candidate and review its manifests against the live metadata SHA.
   Renew alias/deployment identity immediately before any authorized operation.
2. Coordinate the separate DB preflight: affected impersonation sessions must
   be closed using the approved contract before invalidating their cookies.
   Apply only the reviewed three-migration selection after separate permission.
3. Provision a fresh, server-only 32-byte random hex impersonation key in the
   approved preview scope before building candidate code. Use a reviewed
   in-memory secret writer; never place its value in argv, stdout or files.
   Validate mock-key format privately using a boolean result if authorized;
   presence alone does not justify replacement. If replacement is approved,
   explicitly accept invalidation of old mock checkouts. Preserve all unrelated
   secrets, provider credentials and environment targets.
4. Set `SENTRY_UPLOAD_SOURCE_MAPS=false` in the approved preview scope and
   deployment build/runtime context. Leave real mock billing disabled unless
   that specific smoke test is opted in. Verify the chosen SITE_URL and actual
   Turnstile/Auth allowed candidate hostname before proceeding. A mismatch is
   a stop condition, not authority to change Cloudflare/Auth configuration.
5. Proposed deployment command after the preceding gates and authorization:

   ```powershell
   vercel deploy <sealed-candidate-directory> --target preview --project prj_gEe5cFBOgMxmCCNisaRzZW2xZBiL --scope team_WnEm7dz6VjfsNDl8jFd5VBke --non-interactive --force --meta githubCommitSha=800e439ac07bcdb6c0d2016edcc7044fbbce228f
   ```

   The placeholder must be replaced by the reviewed absolute sealed path.
   This creates a preview and may assign preview aliases. `--skip-domain`
   documents suppression of production promotion, not a guarantee of zero
   preview alias effects. No stable alias promotion is included in this scope.

6. Record resulting deployment ID/URL, source manifest and effective gates.
   Use protected access without disabling protection; a first CLI smoke is
   `vercel curl /es/ --deployment <candidate-url> --scope team_WnEm7dz6VjfsNDl8jFd5VBke`.
   The browser access mechanism must preserve existing protection; temporary
   share/bypass creation is not part of this read-only task.
7. Run candidate browser acceptance under real CSP: four locales, nonce/header
   coherence, hydration/theme, soft navigation/prefetch/server actions,
   error/not-found documents, late real Turnstile and login. Preserve the
   implemented allowlists (`challenges.cloudflare.com`, preview `vercel.live`,
   Vercel script/insight hosts, configured Supabase/Sentry; PostHog via same-origin
   `/ingest`). Do not relax CSP or global WAF to obtain a pass.
8. Verify real MFA impersonation/expiry/recovery, explicit mock opt-in, workers
   and cleanup with the approved bounded fixtures. Submit at most three browser
   SDK attempts each for Sentry and PostHog, latter after consent, and confirm
   provider-side sanitized receipts. Envelope 200 is insufficient evidence.

Rollback must retain a tested candidate compatible with the new dedicated key
and applied SQL contract. The current pre-012.4 stable deployment is a historical
reference, not an accepted security-compatible rollback target. Never restore
Supabase-key signing as rollback. No compatible fallback deployment has yet
been produced or tested: [NO VERIFICADO]. Stable promotion and any later rollback
must identify the exact deployment/alias and receive separate authorization.
