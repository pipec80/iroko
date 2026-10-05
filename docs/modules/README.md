# Module Catalog

Catalog cross-check: **2026-09-24**, baseline
`f82d2fbe381014c80a090ba3c36c99e4778111c3`. The eight detailed guides retain
their own 2026-08-20 verification boundaries; this catalog update does not
refresh their Cloud evidence.

These guides explain implemented product capabilities. They are versioned
because code, plans, CI comments, and roadmap records link to them. They are not
release certificates: a guide can be current at the code level while its live
runtime or provider behavior remains **[NO VERIFICADO]**.

The cross-cutting [capability inventory](../capabilities.md) answers what the
foundation provides as a product and how Supabase/external services are used.
This catalog remains the entry point for detailed module contracts.

## Foundation capability map

These are implementation entry points, not a list of certified deployments.
Paths are relative to the repository. See the
[reuse audit](../audits/2026-09-24-reusable-saas-readiness.md) for test paths,
observed checks and defects. Active
[Plan 015](../exec-plans/active/015-reusable-foundation-acceptance.md) supplies
the extension recipes and independent acceptance; no recipe execution is
claimed by this map.

| Capability                             | Code / schema entry point                                                             | Current boundary                                                                                                                 |
| -------------------------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Auth and recovery                      | `src/app/[locale]/(auth)/actions.ts`, `src/lib/supabase/middleware.ts`                | Auth flows exist; provider/SMTP/redirect configuration needs candidate-specific verification                                     |
| Accounts and RBAC                      | `src/lib/active-account.ts`, `src/lib/permissions.ts`, `supabase/schemas/public.sql`  | Live role checks and RLS; core Plan 010 closed, robot example has separate RS-01                                                 |
| Files                                  | `dashboard/account/actions.ts`, `src/lib/project-documents.ts`, `src/lib/storage.ts`  | Public avatars and private documents are different contracts; RS-02 origin check open                                            |
| Notifications and presence             | `src/hooks/use-notifications.ts`, `use-presence.ts`, notifications/presence SQL       | Realtime patterns present; not a generic collaboration platform                                                                  |
| Email and jobs                         | `src/lib/email/index.tsx`, `supabase/functions/process-email-queue/handler.ts`        | Inline mail, Auth SMTP and queued Edge mail differ; [worker runbook](../runbooks/email-queue.md)                                 |
| API keys and outbound webhooks         | `src/lib/api-keys/index.ts`, `src/app/api/v1/account/route.ts`, API keys/webhooks SQL | Example API and outbound delivery; Plan 012 owns rate limit/egress review                                                        |
| Feature flags and module configuration | `src/lib/flags/index.ts`, `src/config/app.config.ts`                                  | Product flags, menu visibility, availability and authorization are distinct                                                      |
| Billing and entitlements               | `src/lib/billing/`, `src/app/api/internal/billing/worker/`                            | [MP matrix](../exec-plans/deferred/011-billing/011-mercadopago-v1-chile-acceptance.md) owns acceptance; other providers not inferred from code |
| Observability                          | `src/lib/logger.ts`, `src/lib/analytics/`, Sentry and nightly workflow                | Telemetry code exists; [operational register](../quality/operational-evidence.md) bounds actual observations                     |
| Robot example                          | `src/lib/robot-config.ts`, `dashboard/robot/page.tsx`                                 | Hidden in navigation; that does not close route/actions/SQL. Active Plan 014 owns remediation                                    |
| Vector extension                       | `supabase/migrations/20260610120000_advanced_extensions.sql`                          | Extension enabled by migration; no complete AI vertical claimed                                                                  |

## Detailed module guides

| Module                                             | Implementation     | Static verification                                        | Runtime / Cloud     |
| -------------------------------------------------- | ------------------ | ---------------------------------------------------------- | ------------------- |
| [Admin alert email](admin-alerts.md)               | Merged via PR #62  | Current paths and schema present                           | **[NO VERIFICADO]** |
| [Product analytics](analytics.md)                  | Merged via PR #109 | Current analytics code and configuration present           | **[NO VERIFICADO]** |
| [Platform announcements](announcements.md)         | Merged via PR #73  | Current code, schema, and tests present                    | **[NO VERIFICADO]** |
| [GDPR export and deletion](gdpr.md)                | Merged via PR #75  | Current code, schema, and tests present                    | **[NO VERIFICADO]** |
| [Impersonation](impersonation.md)                  | Merged via PR #64  | Current code and E2E specification present                 | **[NO VERIFICADO]** |
| [Legal pages and cookie consent](legal-cookies.md) | Merged via PR #66  | Current pages, consent code, and tests present             | **[NO VERIFICADO]** |
| [Onboarding](onboarding.md)                        | Merged via PR #70  | Current flow, actions, and tests present                   | **[NO VERIFICADO]** |
| [Platform administration](platform-admin.md)       | Merged via PR #60  | Current code present; one known audit-table defect remains | **[NO VERIFICADO]** |

## Maintenance contract

- Executable code, tests, migrations, and configuration override prose when
  they disagree.
- Update the affected guide in the same pull request when a module contract,
  route, authorization boundary, schema, or operational procedure changes.
- Keep original PR measurements and incident narratives only when explicitly
  labelled historical.
- Record fresh runtime and Cloud results in
  [operational evidence](../quality/operational-evidence.md); do not turn a
  historical green check into a current claim.
- Move a removed module to an audit or completed-plan record instead of leaving
  a current-looking guide behind.
