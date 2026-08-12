# Testing Strategy

## Principle

Iroko uses a test pyramid with cross-cutting quality dimensions. Edge cases and regression are not separate levels after E2E; they belong throughout unit, integration, database and E2E testing.

## Layers

### Unit tests

Fast, deterministic tests for isolated logic:

- Zod schemas and boundary validation;
- authorization helpers and role calculations;
- billing calculations, dates, quotas and plan limits;
- event taxonomy and analytics property filtering;
- webhook payload/signature helpers;
- error normalization and retry decisions;
- pure transformations and formatting.

Use Vitest. Mock only true boundaries; do not mock the implementation under test.

### Component tests

Test interactive UI behavior without a full browser flow:

- forms and validation feedback;
- dialogs, menus and focus management;
- consent banner behavior;
- loading, empty and error states;
- accessible names, keyboard behavior and ARIA relationships.

Use Testing Library and automated accessibility assertions where practical.

### Integration tests

Exercise collaboration between modules:

- Server Actions with Supabase local;
- auth/session/provider interactions;
- onboarding and account switching;
- billing provider adapters;
- queue producers/consumers;
- storage upload metadata and database records;
- Sentry/PostHog transport wrappers using test transports.

Prefer realistic local services over deep mocks for security-sensitive behavior.

### Database and authorization tests

Use pgTAP for:

- RLS tenant isolation;
- direct grants and denied table access;
- `SECURITY DEFINER` RPC authorization;
- triggers and invariant enforcement;
- ownership/admin/platform-admin roles;
- anonymous/authenticated/service-role separation;
- migrations, constraints, indexes and plan limits;
- idempotent billing/webhook processing.

Every privileged RPC should test negative cases before the allowed case.

### Contract tests

Pin the shape and interpretation of external integrations:

- Stripe;
- Mercado Pago;
- Resend;
- Supabase Edge Functions;
- Sentry;
- PostHog;
- Vercel callbacks/configuration where applicable.

Use fixtures derived from official schemas/examples, validate signatures and cover unknown/missing fields. Do not put real secrets or customer payloads in fixtures.

### E2E tests

Keep a focused set of critical user journeys in Playwright:

- registration → confirmation → onboarding → dashboard;
- login → MFA → dashboard;
- invitation → acceptance → account access;
- account switching and tenant isolation;
- checkout → trusted subscription activation;
- create project → upload document;
- admin → impersonate → expire/end impersonation;
- GDPR export/deletion request;
- cookie/analytics consent transitions.

Run Chromium for broad coverage and WebKit for critical Safari/iOS-sensitive flows. Add Firefox when defects or support requirements justify it.

## Cross-cutting dimensions

Apply across layers:

- edge cases: null/empty/max values, dates, time zones, retries and concurrency;
- regression: each fixed bug receives a reproducing test where practical;
- security: IDOR/BOLA, cross-tenant access, SSRF, injection, auth/session transitions;
- accessibility: keyboard, focus, semantic HTML, Axe and screen-reader-relevant state;
- performance: query plans, payload sizes, Lighthouse budgets and high-value load tests;
- resilience: provider timeout/non-2xx, duplicate events, partial failure and retry exhaustion;
- privacy: no optional analytics before consent and no sensitive telemetry properties.

## Environments

- Unit/component: local process.
- Database/integration: disposable Supabase local environment.
- E2E: local full stack with deterministic fixtures.
- Preview smoke: Vercel preview plus safe test provider/project.
- Production smoke: non-destructive health checks only, explicitly approved.

Never run destructive tests against production data.

## Test data

- create deterministic test users/accounts;
- use unique identifiers per run;
- keep platform-admin/MFA fixtures explicit and isolated;
- clean up safely or use disposable databases;
- never reuse real customer email, payment or document data;
- freeze time where date-sensitive behavior matters.

## CI policy

A required test must not be hidden with `continue-on-error`. A skipped test requires a linked plan/issue and a reason. Flaky tests are defects: quarantine only temporarily with ownership and an expiry condition.

### Known local environment characteristic: full-suite E2E flake rate

Do not confuse this with a flaky test. On a resource-constrained local machine, three
consecutive full local runs of `pnpm validate:full` (2026-08-11) each produced exactly
one failing E2E spec out of 48 — a different spec each time (`onboarding.spec.ts`,
`team.spec.ts`, `billing.spec.ts`), always a generic timeout. Every failing spec passed
cleanly when re-run in isolation immediately after (`playwright test --workers=1
<spec>`), including with `--workers=1` matching CI. No spec reproduced its failure twice.

This points to resource contention during a long sequential 48-spec run on this specific
machine (tight RAM margins already known to affect local Supabase/Docker usage), not a
defect in any individual test or in the app under test. CI has not shown this pattern
across the corresponding PRs.

If a full local run fails a single spec, re-run that spec in isolation before treating it
as a regression. If it passes in isolation, it is this known characteristic, not a defect
— do not open a quarantine for it and do not blindly re-run the full suite hoping for a
clean pass.

## Coverage

Coverage thresholds are a guardrail, not a substitute for risk analysis. Prioritize authorization, billing, asynchronous processing, consent, migrations and error paths over trivial rendering coverage.
