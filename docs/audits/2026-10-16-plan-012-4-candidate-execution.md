# Plan 012.4 — candidate execution ledger

## Preparation and ownership

The owner authorized the separately scoped Cloud stage: three reviewed
migrations, preview secret/configuration, sealed `800e439` deployment and bounded
acceptance. This ledger records read-only preparation by the deployment
preflight worker. The coordinating agent owns all mutations and records their
actual results. Authorization and preparation do not establish execution.

Source selection supplied by the coordinator: immutable candidate at
`.superpowers/sdd/012-4-csp-and-secrets/candidate-800e439`, with 1080 verified
tracked Git blobs. Its installed first-party file collector selected 1078 files,
13,641,350 bytes, excluding two `.gitignore` files. These counts were supplied
by the coordinator, not independently rerun by this worker.

## Renewed read-only identity

Authenticated Vercel `get_project` readback again confirms `iroko`, project
`prj_gEe5cFBOgMxmCCNisaRzZW2xZBiL`, account
`team_WnEm7dz6VjfsNDl8jFd5VBke`, and enabled preview SSO deployment protection.
The earlier exact deployment/alias/environment presence readback is recorded in
[deployment preflight](2026-10-16-plan-012-4-deployment-preflight.md). This renewal
did not re-read secret values or establish application health.

Current Free plan/quota balances remain **[NO VERIFICADO]**: the structured team
readback inspected previously exposed identity, not billing/usage fields.
Preserve the user-declared Free/card-free boundary; stop on a capacity restriction
without adding paid services or changing billing.

## Protected access and deployment gates

The installed Vercel access-protection skill recommends authenticated
`vercel curl` for HTTP and origin-scoped browser request headers using the
short-lived local development OIDC token:
`x-vercel-trusted-oidc-idp-token`. Do not substitute `x-vercel-oidc-token`.
Default same-project development-to-preview access is described by the skill;
actual candidate access remains **[NO VERIFICADO]** until observed. A protection
page or environment mismatch is a failed access gate, not permission to disable
SSO, modify Trusted Sources or broaden WAF.

The CLI references show the exact-target smoke form:

```powershell
vercel curl /es/ --deployment <exact-candidate-url> --scope team_WnEm7dz6VjfsNDl8jFd5VBke
```

Installed CLI source inspection adds an important restriction: its HTTP helper
resolves or creates an automation protection bypass and passes that value to
the spawned curl process in an HTTP-header argument. Therefore the documented
command is not accepted as a strictly read-only, secret-free-argv access path
for this stage. Do not run it automatically or use debug logging. Use an
authorized RAM-only browser/HTTP authentication path instead; creating a new
protection bypass requires separate explicit authorization.

The installed `vercel curl --help` attempt emitted its beta banner and
`Worker timed out after 10 seconds`; help did not complete normally. No candidate
request or successful protection bypass is claimed here. Browser acquisition
must keep any OIDC token in RAM, scope injection to the exact preview origin and
exclude tokens from argv, traces, HAR, screenshots, persisted storage and logs.
Avoid pulling full decrypted environment files merely to obtain browser access.
The subsequent coordinator execution below records dedicated OIDC issuance
and RAM-only header injection; application access remains a separate gate.

Deployment must use the reviewed immutable directory, explicit project/team and
`--target preview --non-interactive --force`. The coordinator confirmed from
installed CLI 59.15.1 source that `--skip-domain` with preview is rejected before
link resolution or deployment creation. The earlier proposed combination was
incorrect and has been removed. Preview aliases may still be assigned; do not
assign the stable alias. The corrected invocation shape is:

```powershell
vercel deploy .superpowers/sdd/012-4-csp-and-secrets/candidate-800e439 --target preview --project prj_gEe5cFBOgMxmCCNisaRzZW2xZBiL --scope team_WnEm7dz6VjfsNDl8jFd5VBke --non-interactive --force --meta githubCommitSha=800e439ac07bcdb6c0d2016edcc7044fbbce228f
```

Capture complete CLI output privately in RAM and emit only allowlisted deployment
ID, URL, state and sanitized error categories; deployment JSON/build logs must
not be printed wholesale.

Before starting, inspect inherited environment names and remove local validation
and irrelevant GitHub test context from the child process. Do not supply
`LOCAL_VALIDATION` or `NEXT_PUBLIC_LOCAL_VALIDATION` to the deployed application.
Keep Sentry source-map upload explicitly false at build/runtime. Let Vercel set
its actual preview context; do not fake `VERCEL_ENV`. Provider secret metadata
presence does not prove its contents satisfy the required 64-hex format.

## Execution and acceptance

Coordinator update, 2026-10-16: two initial CLI attempts exited 1 without a
deployment URL. A deployment-list read after the first returned zero deployments
for that attempt; do not claim a provider deployment was created. Local link
requirements and the incompatible preview/`--skip-domain` combination were
identified. Only approved public `.vercel/project.json` identity metadata was
added to the candidate's local context; it remains excluded from upload. The
source guard retained rejection of extra runtime files, `.env.local` and wrong
project identity; five coordinator tests passed. These execution observations
are supplied by the coordinator, not rerun by this read-only worker.

Coordinator execution update, completed **2026-10-17T00:16:02.188Z**
(2026-10-16 in Chile): the corrected attempt created preview deployment
`dpl_28u87ioWbhRRUdPgqxhXS69Bn5qk` at
`https://iroko-mfg7w1hf7-pipec80-labs.vercel.app`, then failed its build on
environment validation for `MOCK_BILLING_SECRET`; CLI exit 1. The coordinator
is validating the exact sanitized build-log evidence. This is a created, failed
candidate, not a READY deployment or acceptance result.

The coordinator reports the authorized dedicated preview impersonation cookie
key was created and source-map uploads set explicitly false. No secret values
were read or printed by this worker. Existing mock-secret metadata presence
did not establish conformity with the new validation contract. The approved
selection initially excluded replacement of that existing mock secret. The
owner subsequently explicitly authorized the bounded preview recovery recorded
below; this does not authorize a production mock-secret replacement.

## Authorized preview recovery and second candidate

Coordinator update, **2026-10-17T00:21:40.294Z**: the owner explicitly approved
the [preview mock-key recovery](2026-10-16-plan-012-4-preview-mock-key-recovery.md),
which is now recorded as approved and executed. Existing environment entry
`HYk8QmCdjTnbEpzc` was narrowed to production only through a target-only PATCH,
with value omitted and non-target metadata preserved. A new preview-only
sensitive entry `SqIVNgzkUkxD2u4p` was created using 32 random bytes and CLI stdin;
exit 0. Neither secret value is included in this record.

The same sealed `800e439` source was redeployed as
`dpl_7jRQgrvKsBrraSEA94BdcAWfuyfp`, URL
`https://iroko-mpmaopfxk-pipec80-labs.vercel.app`. MCP confirmed **READY** and
the CLI completed exit 0 at **2026-10-17T00:23:54.212Z**. This confirms the
candidate build/deployment, not application or browser acceptance.

The coordinating helper obtained a dedicated development OIDC token for the
project and verified project/team/environment/expiry claims in RAM. Its headed
Chromium instance injected `x-vercel-trusted-oidc-idp-token` only for the exact
candidate origin. No automation bypass secret or provider protection-setting
change was created. An initial connection to the owned CDP endpoint failed
with sandbox EACCES; the escalated diagnostic connected successfully.

At **2026-10-17T00:26:44–00:26:49Z**, actual GET `/es/` returned HTTP **429**,
title **Vercel Security Checkpoint**. The diagnostic observed no application
heading, application nonce, `/ingest` or Sentry tunnel traffic. Its command exit
0 means the diagnostic ran; it is not application/CSP acceptance. No test events
or fixtures were created. Manual interaction with the visible checkpoint window
was requested from the owner and remains pending in this record. Preserve the
checkpoint and existing WAF/protection configuration.

The stable alias `project-a89lv.vercel.app` was confirmed by the coordinator to
remain on `dpl_5uU8Fr1qKw4d2nRyKgyk32vpgCUN`; no promotion is recorded.
These execution and alias observations were supplied by the coordinator and
were not independently rerun by this read-only worker.

The fresh alias readback still confirms the previous stable deployment.
Actual application HTTP/browser acceptance, real Turnstile, MFA impersonation,
cleanup, Sentry receipt, PostHog receipt and a compatible rollback candidate
remain **[NO VERIFICADO]** in this worker's record. DB migration acceptance is
recorded separately by its owner. No deployment, provider mutation, secret
retrieval, push, merge, commit or event was performed by this worker.
