# Plan 006 — Integrate PostHog Product Analytics

- Priority: P2
- Status: Implemented (2026-08-06) — [PR #109](https://github.com/pipec80/iroko/pull/109)
  (`feat/posthog-integration`), not yet merged. See `docs/modules/analytics.md` for the
  architecture record. Production enablement (env vars in Vercel Production, not just Preview)
  remains a separate explicit approval per the acceptance criteria below.
- **Pending before merge:**
  - `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` as a GitHub Actions repo secret — without it the `E2E`
    CI job fails (5 of 7 `analytics.spec.ts` scenarios expect real capture traffic).
  - `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` in Vercel **Preview** env vars (not Production).
  - CI on this PR was blocked for hours by an unrelated GitHub Actions platform incident
    (2026-08-06, ~15:22–19:00+ UTC, see githubstatus.com) — workflow runs weren't starting at
    all (`pending` with zero jobs, and even `workflow_dispatch` returned HTTP 500 on the first
    attempt). Not a repo/code issue; re-check `gh run list --branch feat/posthog-integration`
    once GitHub confirms recovery.
- New external service and production configuration: requires human approval

## Objective

Add privacy-first, typed, multi-tenant product analytics that complements rather than duplicates Sentry and Vercel observability.

## Non-goals

- replacing Sentry error tracking;
- adding another authentication provider;
- collecting unrestricted autocapture or replay data;
- sending sensitive user/customer content;
- using analytics as an authorization, billing or audit source of truth.

## Prerequisites

- Supabase migrations are fully versioned.
- email and webhook asynchronous paths have trustworthy completion signals.
- Sentry browser events work.
- Next.js dependency state is coherent.
- the analytics consent behavior is defined for PostHog and existing Vercel Analytics/Speed Insights.
- privacy policy and data-processing decisions have an owner.

## Architecture decisions

Document before installing packages:

1. PostHog Cloud region or self-hosting decision.
2. direct ingest versus first-party reverse proxy.
3. EU/US data residency and retention.
4. consent model and revocation behavior.
5. event/property taxonomy ownership.
6. identity lifecycle across anonymous, authenticated and impersonated sessions.
7. Session Replay decision; default is disabled.
8. autocapture decision; default is restricted/disabled initially.
9. feature flag ownership if PostHog flags are used alongside database flags.
10. deletion/export procedures for privacy requests.

## Privacy baseline

- analytics is opt-out by default until explicit analytics consent;
- initialize without capture or delay loading until consent;
- call the appropriate opt-in method after consent;
- opt out and clear local state when consent is revoked;
- use Supabase user UUID as the primary authenticated identity, never email;
- use account UUID for group analytics;
- reset on logout, account/security transitions and impersonation start/end;
- never capture passwords, OTPs, recovery codes, auth tokens, API keys, webhook secrets, document contents, signed URLs, payment details, email bodies or unrestricted form values;
- keep an explicit property allowlist;
- avoid placing PII in event names, paths or URLs.

## Initial typed event taxonomy

Candidate events, subject to product review:

```text
signup_started
signup_completed
login_completed
mfa_challenge_completed
onboarding_step_completed
onboarding_completed
account_created
account_switched
invitation_sent
invitation_accepted
project_created
document_uploaded
plan_viewed
checkout_started
subscription_activated
subscription_cancel_requested
api_key_created
webhook_created
feature_limit_reached
```

For every event define:

- business question answered;
- trigger location;
- allowed properties and types;
- identity/group requirements;
- consent requirement;
- owner;
- retention and expected volume;
- unit/integration/E2E validation.

## Implementation approach

1. Add a small analytics abstraction owned by the application, not scattered direct SDK calls.
2. Define event names/properties as TypeScript types or schemas.
3. Add a consent-aware client provider below the existing application providers.
4. Implement identification/grouping in one session synchronization component.
5. Implement reset behavior and tests.
6. Add server-side capture only for events that require trusted completion; never duplicate a client event without a deterministic deduplication key.
7. update CSP and proxy matcher from environment-derived configuration.
8. start with autocapture and replay disabled.
9. instrument a minimal funnel first: signup → onboarding → first project.
10. verify events in a non-production PostHog project/environment.
11. add privacy/export/deletion runbook updates.
12. deploy behind a feature/config toggle and monitor volume.

## Testing requirements

- no SDK request before analytics consent;
- capture begins after consent;
- revocation stops capture and clears identity;
- logout resets identity;
- impersonation never attributes target actions to the admin or leaks identity across sessions;
- account switching updates group context;
- event schemas reject unknown/sensitive properties;
- browser navigation does not double-count;
- server/client duplicate prevention works;
- CSP/proxy allows ingest without locale redirects;
- E2E validates the first funnel using a test project or mocked transport.

## Acceptance criteria

- architecture/privacy decision is documented;
- taxonomy is reviewed and versioned;
- integration is consent-aware and opt-out by default;
- identities use UUIDs and account groups;
- Session Replay remains disabled unless separately approved;
- sensitive fields are demonstrably excluded;
- all tests pass;
- non-production event inspection confirms expected payloads and no PII;
- privacy documentation and deletion/export procedure are updated;
- production enablement is a separate explicit approval.

## Rollback

Disable capture through configuration/feature toggle, remove the provider from the layout and preserve the application analytics abstraction. Revoke/rotate the PostHog key if exposure is suspected.
