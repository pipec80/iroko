# Plan 012.4 — Preview mock key recovery proposal

Date: 2026-10-16 (America/Santiago). Updated: 2026-10-19. Status: explicitly
authorized recovery executed; second candidate READY, browser acceptance blocked.

The owner decision of 2026-10-19 treats preview and production as one MVP/test
environment and directs all Cloud acceptance to `https://project-a89lv.vercel.app/`.
The owner reports equal current values across both scopes; no independent secret
comparison was performed. The scoped operation below remains a historical record
of the approved recovery, not a requirement to keep environments separate today.
Follow the [MVP delivery and acceptance runbook](../runbooks/mvp-cloud-acceptance.md)
for the remaining work; the owner has now authorized push, PR, merge and the
existing automatic deployment to complete 012.4. No such action is established
by this recovery record.

## Observed blocker

The authorized preview candidate `800e439`, deployment
`dpl_28u87ioWbhRRUdPgqxhXS69Bn5qk`, failed its build at
2026-10-17T00:16:02.188Z. Vercel reports ERROR / invalid_env_var; the captured CLI
output and MCP build events identify `MOCK_BILLING_SECRET`. The candidate's
`src/env.ts` requires 64 hexadecimal characters. The value was not recovered,
printed or stored locally. Its sensitive metadata is readable, not its value.

Renewed metadata identifies existing variable `HYk8QmCdjTnbEpzc` in project
`prj_gEe5cFBOgMxmCCNisaRzZW2xZBiL`, team
`team_WnEm7dz6VjfsNDl8jFd5VBke`, shared by preview and production. Blindly
upserting a preview replacement could affect the existing shared configuration;
the operation below explicitly separates scopes.

## Concrete operation — subsequently approved and executed

1. Renew the exact project, variable ID/type, targets exactly `[preview,
production]`, stable alias and absence of concurrent changes. Require no
   branch or custom-environment override. Abort on drift; preserve all non-target
   metadata in the original record.
2. PATCH only the existing variable's target to `[production]`, omitting its
   value, key and type. Preserve the existing production value and variable ID.
   Verify the resulting metadata before creating another variable. A transport
   error requires readback, not an automatic retry.
3. Generate a fresh cryptographically random 32-byte/64-hex mock key in RAM and
   create a sensitive `MOCK_BILLING_SECRET` for preview only through the installed
   first-party CLI's stdin. No secret in arguments, local env files, Git, reports
   or raw output. Clear the byte buffer and discard captured output on completion.
4. Verify two disjoint metadata records: original production-only ID and new
   preview-only ID. Keep the dedicated preview impersonation key and source-map
   uploads false. Preserve all other variables and protections.
5. Revalidate the sealed candidate/upload manifest and redeploy the same
   `800e439` preview. Continue the already authorized bounded browser/provider
   acceptance only after READY and successful protected access.

This invalidates mock checkout/event signatures made with the old preview key.
No real payment-provider credentials or production value were rotated by this
operation. Existing deployments keep their own environment snapshots. Its
original authorization did not include a production deploy, stable promotion,
push, merge, billing change or protection bypass. The later delivery authorization
above supersedes the Git/deployment boundary for pending 012.4 work only.

If creation fails after target separation, inspect metadata first. Recovery can
restore the original record's preview target without recovering its sensitive
value, provided no conflicting preview record exists. If a new record exists,
removing that exact new record and restoring the original targets must be
recorded as a controlled rollback explicitly included in this approval.
Never delete the original variable or perform a broad env reset. Restoring the
old preview key restores the known build blocker; it does not establish acceptance.

## Acceptance boundary

The user subsequently explicitly approved the preview correction and redeploy,
including the bounded rollback. Renewed metadata confirmed the exact original
targets and absence of branch/custom-environment overrides. Target-only PATCH
then readback preserved the original ID and non-target metadata. No production
value was supplied or replaced. Sensitive values cannot be read back; value
equality is supported by the value-omitting PATCH, not a plaintext comparison.

At 2026-10-17T00:21:40.294Z the CLI created the fresh preview key via stdin,
exit 0. Metadata confirms new sensitive preview-only ID `SqIVNgzkUkxD2u4p`
and original production-only ID `HYk8QmCdjTnbEpzc`. The cookie key and uploads
false remained preview-only. No rollback was needed. A manifest-verified
redeploy created `https://iroko-mpmaopfxk-pipec80-labs.vercel.app`, deployment
`dpl_7jRQgrvKsBrraSEA94BdcAWfuyfp`. MCP confirmed READY and CLI exit 0 at
2026-10-17T00:23:54.212Z. No secret was printed or persisted locally. The
[candidate execution record](2026-10-16-plan-012-4-candidate-execution.md)
documents the subsequent browser probe: Vercel Security Checkpoint HTTP 429,
before application execution. The owner later confirmed code 21; successful
application/browser acceptance is not established.

The original Cloud mutation selection explicitly stopped on a nonconforming
mock key and excluded silent replacement. This operation followed the additional
approval of the concrete proposal rather than assuming that earlier general
permission covered the newly observed replacement.

SQL postflight is independently complete in the
[DB execution record](2026-10-16-plan-012-4-cloud-db-execution.md). The failed
first preview and READY second preview do not establish CSP, real Turnstile/MFA
or Sentry/PostHog receipts; those remain **[NO VERIFICADO]**. There were no browser acceptance fixtures or
synthetic receipt events from this deployment attempt, so none require cleanup.
