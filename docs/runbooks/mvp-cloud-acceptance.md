# Iroko MVP: Cloud acceptance target

MVP scope update2026-10-28: [ADR0005](../adr/0005-replicable-saas-mvp-and-bounded-acceptance.md).
The target below remains; accept the deployed replicable-core configuration,
including effective deferred-module exclusion, not a mandatory Robot/editor
vertical. This documentation grants no new provider-write or deploy authority.

Updated: 2026-10-19. Explicit owner decision.

Iroko is under construction. Preview and production are treated as the same
MVP/test environment; operational separation is not required at this stage.
All real Cloud acceptance tests use the fixed URL
**https://project-a89lv.vercel.app/**, including Plan 012.4. Do not create or
require a separate preview hostname solely because Vercel calls this environment
production. Reuse the existing integrations and the official local Supabase stack.

The owner confirms that preview and production currently have the same values.
This is user-confirmed configuration context, not an independent comparison of
secret contents. Do not retrieve or rotate secrets merely to prove equality.
The older preview-only records describe dated operations, not today's required
environment separation.

## Plan 012.4 execution order

1. Renew the Vercel project/deployment identity for the fixed hostname. Compare
   its deployed revision with the tested 012.4 implementation and confirm the
   required configuration using metadata/private validation. A READY preview
   does not establish that the fixed domain already serves the new code.
2. Use the existing GitHub/Vercel delivery flow: consolidate the branch, open
   the PR, pass the required CI checks, merge when authorized, and wait for
   Vercel's Git integration to deploy that merged revision to the fixed domain.
   Verify READY and the exact merged SHA before Cloud acceptance. Do not create
   another manual CLI deployment as the default delivery path. Preview checks
   may run automatically but are not a separate mandatory MVP test environment.
   The production label alone is not a reason to repeat an authorization request
   or demand preview acceptance first. Push/PR/merge action authorizations still
   apply; this describes the delivery order, not an executed merge.
3. Verify actual access. The earlier preview returned Vercel Security Checkpoint
   429/code 21 before Iroko. Separately, the owner reported Turnstile permits
   `project-a89lv.vercel.app`, `localhost` and an older preview hostname. This
   reported allowlist is not evidence of a successful challenge or a resolution
   of Vercel's checkpoint. Diagnose any remaining provider block on this fixed
   target without changing WAF/CAPTCHA protections implicitly.
4. Run the pending real-browser CSP/navigation, Turnstile/login/MFA,
   impersonation, mock/worker controls, consent and fixture-cleanup checks.
   Confirm a real browser SDK receipt in Sentry and a consented event in PostHog
   using the existing bounded-attempt protocol.
5. Record the actual revision, results, limitations and cleanup; consolidate
   Plan 012.4 and its parent. Do not mark unexecuted gates complete.

Approved MVP work may reset project test data where needed; preserve pending
sources, credentials and unrelated projects. This environment decision does not
authorize unrelated provider changes, paid resources, weakening protections,
or Git push/merge. Keep those action-specific boundaries without imposing a
customer-production continuity process on this construction-stage project.

## Plan 012.4 result - 2026-10-19

PR #229 merged source `1a8474968e6c861c985f45b48d552a44adbfd98d` after green
CI. The Git integration produced READY `dpl_3ySKYADzZGhWWvcJABoTjiEYcytb` and
automatically assigned the fixed domain; no manual deployment/promotion was
needed. Post-merge CI also passed. Real provider receipts, owner Firefox
Turnstile/login/MFA/impersonation, recovery retries and fixture cleanup are
recorded in the [closure audit](../audits/2026-10-19-plan-012-4-cloud-closure.md).
The following initial inspection/candidate entries are historical, preceding
that merge and deployment. Future releases still renew identity/configuration;
this dated observation is not a blanket provider-health guarantee.

## Evidence at the decision

Recorded on 2026-10-16 Chile: Cloud migrations reached ledger 169 with SQL
postflight passed. Following explicit mock-key recovery approval, preview
deployment `dpl_7jRQgrvKsBrraSEA94BdcAWfuyfp`, source `800e439`, completed with
CLI exit 0 and MCP READY at 2026-10-17T00:23:54.212Z. Its browser probe then
received Vercel Security Checkpoint 429. No real-browser acceptance fixtures or
synthetic receipt events were created. These are recorded results, not fresh
provider verification on 2026-10-19. The current fixed-domain revision and
acceptance remain **[NO VERIFICADO]** until renewed.

## Delivery flow inspection — 2026-10-19

The repository's `.github/workflows/ci.yml` runs on PRs targeting main and
non-documentation pushes to main, plus manual dispatch. It validates quality,
security/secrets, unit tests, database types/tests, Edge Functions, E2E and build.
It has no Vercel deployment command; its Supabase migration steps use `--local`.
Do not treat that CI job as a linked Cloud database migration or proof of Sentry
event reception. Its Sentry source-map upload flag is explicitly false.

Authenticated Vercel MCP inspection confirms the fixed domain currently resolves
to READY production deployment `dpl_5uU8Fr1qKw4d2nRyKgyk32vpgCUN`, source `git`,
repository `pipec80/iroko`, ref `main`, SHA
`58a00b7799669b20e35ecbaa8303d6205f64aebd`. Thus the stable domain still serves
the prior revision, not the tested 012.4 branch. This establishes Git deployment
provenance, not that Vercel waits for every GitHub check before deployment.
Provider promotion/check settings and the Supabase/Sentry connector behavior
were not independently verified in this inspection. Existing connectors do not
by themselves establish migrations, builds or event receipts succeeded.
