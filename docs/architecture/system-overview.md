# System Overview

Status: current architectural map with explicitly marked planned areas
Last reviewed: 2026-08-20

## Purpose and boundary

Iroko is an internal-first SaaS foundation built as a modular monolith. The web
application owns presentation and application orchestration; Supabase owns
identity, persistent data, row-level authorization, migrations, and background
Edge Functions. External services provide delivery, analytics, observability,
and payments.

This overview describes stable boundaries. Detailed implementation work belongs
in [active execution plans](../exec-plans/active/), while decision rationale
belongs in [ADRs](../adr/).

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
- Sentry handles error reporting; Pino handles structured server logging.
- PostHog handles product analytics.
- Billing Platform v2 defines a provider-neutral core and staged provider
  certification. Stripe, Paddle, Lemon Squeezy, and Mercado Pago support must
  be described according to [Plan 011](../exec-plans/active/011-billing-correctness.md),
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

| If changing                              | Read first                                                                                                                  |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Tenant membership, authorization, or RLS | [Completed Plan 010](../exec-plans/completed/010-tenant-isolation-and-regression-tests.md) and relevant migrations/tests       |
| Billing contracts or providers           | [Billing Platform v2 design](billing-platform-v2-design.md) and [Plan 011](../exec-plans/active/011-billing-correctness.md) |
| Security or pricing truth                | [Plan 012](../exec-plans/active/012-security-hardening-and-pricing-truth.md)                                                |
| Commercial readiness                     | [Plan 013](../exec-plans/active/013-launch-readiness-roadmap.md)                                                            |
| Completion claims                        | [Definition of Done](../quality/definition-of-done.md) and the plan's acceptance evidence                                   |

## Deliberate non-claims

- This is not a microservice architecture.
- A configured integration is not necessarily certified in production.
- A completed historical plan is not automatically fresh runtime evidence.
- Commercial packaging, installation, support, licensing, and upgrade guarantees
  are not yet product capabilities.
