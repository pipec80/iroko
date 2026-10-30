# System Overview

MVP direction accepted 2026-10-28: [ADR0005](../adr/0005-replicable-saas-mvp-and-bounded-acceptance.md).
The reusable SaaS core precedes any Robot/client vertical. Existing runtime
boundaries remain; no new architecture, provider or generic plugin engine is
introduced. Editor/Robot exclusion has configuration/authorization guards and
unit evidence under015-T1 (2026-10-29); browser acceptance remains blocked.
This map does not establish runtime acceptance.

Status: current architectural map with explicitly marked planned areas
Last reviewed: 2026-09-24 (product/reuse boundary and billing worker map;
not an exhaustive implementation or runtime audit)

## Purpose and boundary

Iroko is an internal-first SaaS foundation built as a modular monolith. The web
application owns presentation and application orchestration; Supabase owns
identity, persistent data, row-level authorization, migrations, and background
Edge Functions. External services provide delivery, analytics, observability,
and payments.

The [product strategy](product-strategy.md) defines the reusable foundation's
promise and minimal complete integrations. Supabase-first does not require
every application worker to execute in an Edge Function.

This overview describes stable boundaries. The
[execution-plan index](../exec-plans/README.md) explains active, deferred and
completed work, while decision rationale belongs in [ADRs](../adr/).

## System context

```text
Visitors / members / tenant administrators
                    |
                    v
          Next.js application (Vercel)
             |        |         |
             |        |         +--> Observability and analytics
             |        +------------> Payment providers
             v
       Supabase Auth + PostgreSQL + RLS
                    |
                    +---------------> Edge Functions / email worker
```

The deployment labels show the intended/current integration shape, not a fresh
cloud-health assertion. Live external behavior is **[NO VERIFICADO]** in this
documentation pass.

## Main building blocks

### Web application

- `src/app/[locale]/(public)`: public marketing routes.
- `src/app/[locale]/(auth)`: authentication and confirmation routes.
- `src/app/[locale]/dashboard`: protected product routes.
- `src/proxy.ts`: locale routing, CSP construction, and edge security headers.
  The project intentionally has no `middleware.ts`.
- `src/components`, `src/hooks`, and `src/lib`: shared UI, client behavior, and
  domain/application services.
- `src/env.ts`: validated environment-variable contract.

### Data and authorization

- `supabase/migrations`: executable, ordered database change history.
- `supabase/schemas`: human-readable mirrors of current schema intent while the
  documented Windows diff limitation remains.
- PostgreSQL RLS is the tenant-data authorization boundary. UI filtering and
  route guards improve UX but do not replace database authorization.
- Generated database types live in `src/types/database.ts`.

[Plan 010](../exec-plans/completed/010-tenant-isolation-and-regression-tests.md)
records the completed remediation for its Storage, checkout and invitation
tenant-isolation gaps, plus regression coverage. This evidence does not prove
that every tenant boundary outside that explicit scope is remediated.

### Background and external integrations

- Supabase Edge Functions include the email queue worker.
- Billing recovery/reconciliation run in the existing Node route, invoked by
  Supabase `pg_cron`/`pg_net`; PostgreSQL owns durable state. The reducer is not
  duplicated into Deno. See [ADR 0003](../adr/0003-mercadopago-reliability-boundaries.md).
- Sentry handles error reporting; Pino handles structured server logging.
- PostHog handles product analytics.
- Billing Platform v2 defines a provider-neutral core and staged provider
  certification. Stripe, Paddle, Lemon Squeezy, and Mercado Pago support must
  be described according to the
  [deferred Plan 011 evidence](../exec-plans/deferred/011-billing/README.md),
  not assumed from provider-specific code alone.

## Key runtime flows

1. `src/proxy.ts` establishes locale and security headers before route
   handling.
2. Server-side application code obtains the Supabase identity and executes
   typed operations.
3. PostgreSQL/RLS enforces the final data-access boundary.
4. Provider callbacks and asynchronous work enter through bounded server or
   Edge Function interfaces and must be idempotent where retries are possible.
5. Logs, errors, and product events are sent through their configured
   observability boundaries without exposing secrets or personal data.

## Change map

| If changing                                               | Read first                                                                                                                                                                                |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tenant membership, authorization, or RLS                  | [Completed Plan 010](../exec-plans/completed/010-tenant-isolation-and-regression-tests.md) and relevant migrations/tests                                                                  |
| Billing contracts or providers                            | [Billing Platform v2 design](billing-platform-v2-design.md) and [deferred Plan 011 evidence](../exec-plans/deferred/011-billing/README.md)                                                |
| Security or pricing truth                                 | [Plan 012](../exec-plans/active/012-security-hardening-and-pricing-truth.md)                                                                                                              |
| Commercial readiness                                      | [Deferred Plan 013](../exec-plans/deferred/013-launch-readiness-roadmap.md)                                                                                                               |
| Completion claims                                         | [Definition of Done](../quality/definition-of-done.md) and the plan's acceptance evidence                                                                                                 |
| Adaptation, module availability, installation or upgrades | [Product strategy](product-strategy.md), [reuse audit](../audits/2026-09-24-reusable-saas-readiness.md) and active [Plan 015](../exec-plans/active/015-reusable-foundation-acceptance.md) |

## Deliberate non-claims

- This is not a microservice architecture.
- A configured integration is not necessarily certified in production.
- A completed historical plan is not automatically fresh runtime evidence.
- Commercial packaging, installation, support, licensing, and upgrade guarantees
  are not yet product capabilities.
