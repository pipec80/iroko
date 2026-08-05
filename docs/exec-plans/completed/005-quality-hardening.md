# Plan 005 — Quality and Operations Hardening

- Priority: P1
- Status: Completed (2026-08-05) — A/B/C/D/E (agreed scope)/F all closed
- Scope: multiple small PRs are preferred over one large implementation

## Objective

Close the quality, caching, documentation and CI gaps found during the platform audit without weakening current protections or increasing unnecessary infrastructure.

## Progress (2026-08-05)

> **Merged 2026-08-05:** workstream E closed via PR #105 (`c023ff2`), squash-merged
> to `main` with all CI gates green (Quality, Security, Gitleaks, Unit Tests,
> DB Types/Tests, Edge Function Tests, E2E chromium + WebKit, CodeQL, Build).
> Post-merge check: `supabase migration list --linked` shows 119/119 migrations
> in parity (no local-only, no Cloud-only) — this PR touched no schema, so no
> drift was expected or introduced. Local and remote branches deleted.

- **A — Versioned documentation:** Completed. README's "Documentación" section no
  longer points at gitignored local paths; the 14 files under versioned `docs/`
  scanned clean for secrets.
- **B — Cache correctness:** Completed (AUD-008). `updateSession()` no longer
  forces `private, no-store` on anonymous requests with nothing to refresh.
- **C — CI immutability:** Completed (AUD-009/010/011). Knip blocking, Gitleaks
  required, `db-types` fails on drift instead of committing.
- **D — Build artifacts:** Completed (AUD-012). Removed the dead
  `.next/standalone` upload — nothing consumed it and standalone output was
  never enabled.
- **E — Testing maturity:** Completed for the agreed scope (AUD-013/014,
  contract tests, coverage include). Impersonation E2E fixture with a real
  TOTP-enrolled aal2 session; WebKit `@smoke` coverage + automated Axe checks
  (found and fixed 4 real WCAG issues); `process-email-queue` split into a
  testable handler with 8 Deno tests; contract tests against the real Stripe
  SDK and an independently-computed MercadoPago HMAC vector; coverage include
  widened to route handlers and `proxy.ts`. Found and fixed AUD-020 (CSP
  blocking local Supabase during E2E) along the way; documented AUD-021
  (`notFound()` returning 200) as a deferred, non-blocking finding. Cloud
  smoke tests for async workers/observability tunnels remain open — not part
  of the scope agreed for this pass.
- **F — Documentation/config consistency:** Completed (AUD-015, AUD-018).
  Node/pnpm versions, Vercel org, and Google OAuth env vars fixed; `vercel.live`
  allowlisted in CSP for previews only. Central application URLs/support
  addresses closed: `appConfig.supportEmail` pointed at a `vercel.app` address
  that cannot receive mail (Vercel doesn't provision mailboxes on its shared
  domain) — replaced with a real inbox. `appConfig.urls.{docs,github,twitter,support}`
  were dead config (zero consumers anywhere in the app, confirmed by grep) and
  removed rather than fixed — `urls.docs` pointed at a `/docs` route that
  doesn't exist. `urls.site` was also unused; the app's real canonical URL is
  `env.SITE_URL`, already environment-driven. The email templates' own
  preview-only defaults (`pnpm email:dev`) were updated to a generic
  `support@example.com` rather than a real address, since the production path
  already derives from `appConfig.supportEmail` and a boilerplate's template
  source shouldn't hardcode a real person's contact info. A broader
  repo-wide grep also caught 8 hardcoded occurrences of the same broken
  address in the Terms/Privacy legal copy across all 4 locale files
  (`messages/{en,es,fr,pt}.json`) — updated to the same real inbox.

## Workstreams

### A. Versioned documentation

- keep public engineering documentation under `docs/`;
- keep `docs/local/`, `docs/private/`, drafts and generated exports ignored;
- scan new docs for secrets and personal information;
- update README links so every referenced versioned document exists;
- `AGENTS.md` is intentionally local and untracked (decided in #97, same as `CLAUDE.md`); do not re-add it to Git as part of this workstream.

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

- ~~create a platform-admin fixture with enrolled MFA/AAL2 for impersonation E2E~~ — done, real TOTP enrollment + UI MFA challenge reaches a genuine aal2 session;
- ~~enable the currently skipped impersonation security flow~~ — done;
- ~~add WebKit coverage for critical paths~~ — done, `@smoke` subset only (see AUD-014);
- ~~add automated Axe checks to selected pages/components~~ — done, found and fixed 4 real WCAG issues;
- ~~add contract tests for Stripe, Mercado Pago, Resend, Supabase Functions, Sentry~~ — done (PostHog payloads deferred until PostHog itself is integrated — Plan 006);
- add regression tests whenever a production bug is fixed — ongoing practice, not a one-time task;
- add controlled Cloud smoke tests for asynchronous workers and observability tunnels — still open, not part of this pass's agreed scope.

### F. Documentation/config consistency

Align:

- Node and pnpm requirements in README, package metadata, CI and Vercel;
- `.env.example` with enabled local integrations such as OAuth providers;
- central application URLs and support addresses with the intended deployment/domain strategy;
- CSP/reporting endpoints with environment configuration rather than clone-specific hardcoding where practical;
- CSP `script-src` for preview-only origins (AUD-018): `vercel.live` is blocked on every Vercel preview deployment, generating a CSP report per page load. Decide whether to allowlist it for `VERCEL_ENV === 'preview'` only, or accept the feedback widget staying disabled and filter the report out of Sentry's error quota.

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
