# Plan 005 — Quality and Operations Hardening

- Priority: P1
- Status: Blocked until P0 findings are stable
- Scope: multiple small PRs are preferred over one large implementation

## Objective

Close the quality, caching, documentation and CI gaps found during the platform audit without weakening current protections or increasing unnecessary infrastructure.

## Workstreams

### A. Versioned documentation

- keep public engineering documentation under `docs/`;
- keep `docs/local/`, `docs/private/`, drafts and generated exports ignored;
- scan new docs for secrets and personal information;
- update README links so every referenced versioned document exists;
- use `AGENTS.md` as a short navigation/rules file, not a duplicate handbook.

### B. Cache correctness

Investigate whether `Cache-Control: private, no-store` is being applied to anonymous public pages through broad proxy/session middleware coverage.

Requirements:

- protected/authenticated responses remain private and non-cacheable;
- token refresh responses remain non-cacheable;
- anonymous marketing pages regain safe framework/CDN caching where possible;
- tests cover both cookie-free and authenticated requests;
- no private content may be cached publicly.

### C. CI immutability and required gates

- make actionable Knip findings fail CI;
- add Gitleaks as a required check using repository-safe configuration;
- change Supabase type generation to generate and fail on diff rather than commit/push from CI;
- keep lockfile installs frozen;
- verify Dependabot changes run the same required checks;
- avoid granting write permissions to jobs that only need read/test access.

### D. Build artifacts

Resolve the mismatch between CI upload of `.next/standalone` and the absence of intentional standalone output.

Choose one:

- remove the standalone artifact and publish only meaningful reports; or
- enable `output: 'standalone'`, document the deployment use case and test the artifact by starting it.

Do not enable standalone merely to silence an upload step.

### E. Testing maturity

- create a platform-admin fixture with enrolled MFA/AAL2 for impersonation E2E;
- enable the currently skipped impersonation security flow;
- add WebKit coverage for critical paths;
- add automated Axe checks to selected pages/components;
- add contract tests for Stripe, Mercado Pago, Resend, Supabase Functions, Sentry and future PostHog payloads;
- add regression tests whenever a production bug is fixed;
- add controlled Cloud smoke tests for asynchronous workers and observability tunnels.

### F. Documentation/config consistency

Align:

- Node and pnpm requirements in README, package metadata, CI and Vercel;
- `.env.example` with enabled local integrations such as OAuth providers;
- central application URLs and support addresses with the intended deployment/domain strategy;
- CSP/reporting endpoints with environment configuration rather than clone-specific hardcoding where practical.

## Execution model

Split this plan into bounded issues/PRs, for example:

1. docs and README consistency;
2. cache-scope correction;
3. Knip/Gitleaks/type-drift CI gates;
4. artifact cleanup;
5. impersonation fixture/E2E;
6. WebKit/Axe/contract tests;
7. environment and central URL cleanup.

## Acceptance criteria

- all versioned documentation is discoverable and safe for a public repository;
- anonymous and authenticated cache behavior is tested and correct;
- CI does not silently ignore Knip or secret scanning;
- CI does not author commits for generated types;
- every uploaded artifact has a consumer and validation purpose;
- impersonation E2E runs instead of being skipped;
- critical flows have Chromium and WebKit coverage;
- selected UI flows have automated accessibility checks;
- README, env examples and runtime configuration agree;
- no P0 issue is reopened by hardening changes.

## Rollback

Each workstream must be independently revertible. Never bundle cache, authentication and CI permission changes into one irreversible commit.
