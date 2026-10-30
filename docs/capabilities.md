# Iroko Capability Inventory

Offered MVP boundary, 2026-10-28: [ADR0005](adr/0005-replicable-saas-mvp-and-bounded-acceptance.md).
The inventory below describes implementation/evidence, not a promise to ship every
reference module. Robot and advanced document editor are deferred consumers;
015-T1 must verify their effective exclusion before offering the MVP configuration.
Auth/data/RLS, bounded Storage/Realtime/Edge-email and subscriptions as offered
remain core. Independent brand/configuration, extension and update proof belongs
to015, without building a Robot vertical. As of2026-10-29, exclusion guards and
unit regressions are implemented; browser exclusion and independent reuse remain
unverified. See [bounded evidence](audits/2026-10-20-017-p1-execution.md).

Consolidation: **2026-10-20**, using the [directed revalidation](audits/2026-10-19-freeze-code-and-documentation-revalidation.md) and [disposition register](exec-plans/active/freeze-remediation-register.csv). This updates bounded statuses and ownership, not all runtime evidence.

Original static inventory refreshed: **2026-10-01**, repository baseline
`f82d2fbe381014c80a090ba3c36c99e4778111c3` plus the current documentation
worktree. This inspection reviewed executable code, schemas, migrations,
configuration and tests. It did not re-run the application, local Supabase or
Cloud services; runtime claims retain their own dates in the
[operational evidence register](quality/operational-evidence.md).

## Purpose and MVP freeze

Iroko is an internal-first reusable SaaS foundation built with Next.js as the
application layer and Supabase as the backend. Its first objective is to make
the common platform work reusable so a derived product can focus on its own
domain.

The current freeze does not try to use every product Supabase may offer. It
requires **every capability Iroko declares as supported** to have a minimal
useful example, an explicit security boundary, test evidence, configuration
guidance and a known failure mode. During the freeze, add no new provider,
vertical or product module. The [root roadmap](../ROADMAP.md) owns the allowed
repair, verification, configuration and documentation boundary.

Allowed work during the freeze:

- fix a reproducible defect or security boundary;
- complete or test an existing example;
- make an existing integration optional and coherently configurable;
- document how to install, operate or extend an implemented capability;
- remove unsupported or misleading surface area;
- renew expired operational evidence.

Deferred work includes new payment providers, new verticals, commercial
packaging, additional pricing models and features added only to broaden the
catalogue.

## Status vocabulary

- **Implemented** — executable code or schema is present at the inspected
  baseline.
- **Locally covered** — focused automated tests exist; this inventory did not
  re-run them.
- **Partial** — useful implementation exists with a confirmed gap or an
  incomplete configuration boundary.
- **Optional** — the capability is an integration or module that a derived
  product may disable.
- **[NO VERIFICADO]** — current runtime, Cloud or provider behavior was not
  observed in this inspection, or its dated evidence expired.
- **Deferred** — deliberately outside the current MVP freeze.

Implementation and tests outrank this document if they disagree. A static
implementation entry is not a claim that the corresponding Cloud service is
healthy today.

## SaaS foundation capabilities

| Capability              | What exists                                                                                                                                                                                | Principal evidence                                                                                                     | Current boundary                                                                                                                                                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Authentication          | Email/password signup and login, email confirmation, logout, OAuth callback, password recovery/reset and safe redirects                                                                    | `src/app/[locale]/(auth)/`, `src/app/[locale]/auth/`, `src/test/e2e/auth.spec.ts`                                      | **Implemented, locally covered**; provider, SMTP and redirect configuration are deployment-specific **[NO VERIFICADO]**                                                                                                         |
| Account security        | Change email/password, reset request, list/revoke sessions, sign out other sessions, TOTP MFA and recovery codes                                                                           | `dashboard/account/`, `public.list_my_sessions`, `revoke_my_session`, recovery-code RPCs                               | **Implemented, locally covered**; live Auth configuration must be verified per deployment                                                                                                                                       |
| CAPTCHA                 | Optional Cloudflare Turnstile on authentication forms, paired with Supabase Auth CAPTCHA configuration                                                                                     | `src/components/auth/captcha-field.tsx`, `src/env.ts`, `supabase/config.toml`                                          | **Optional**; only Turnstile is claimed, not a general Cloudflare platform integration                                                                                                                                          |
| Profiles                | Profile creation on signup, personal details, locale, timezone, phone, avatar and soft deletion                                                                                            | `public.profiles`, private signup triggers, `dashboard/account/actions.ts`                                             | **Implemented, locally covered**                                                                                                                                                                                                |
| Accounts                | Personal accounts and team accounts, active-account selection, account profile, logo and metadata                                                                                          | `public.accounts`, `get_my_accounts`, `create_team`, `switch_account`                                                  | **Implemented, locally covered**                                                                                                                                                                                                |
| Memberships             | Invite, accept invitation, list members, change role, remove member, leave team and transfer ownership                                                                                     | `public.accounts_memberships`, `public.invitations`, team actions, SQL tests 23/28/30/31                               | **Implemented, locally covered**                                                                                                                                                                                                |
| Tenant RBAC             | `owner`, `admin`, `member` and `viewer`; live membership/role helpers are used by RLS and sensitive actions                                                                                | `public.membership_role`, `private.get_user_role`, `private.user_is_member`, SQL tests 29/32 and `rbac-matrix.spec.ts` | **Implemented, locally covered**; Robot route/action/SQL guards incorporated in 014-T1 with dated local acceptance. New candidate and Robot-specific Cloud functional acceptance remain separate; D-06 is assigned to 017.2-T5. |
| Tenant isolation        | Database, Storage and checkout authorization revalidate current membership instead of trusting stale JWT claims                                                                            | Plan 010 migrations and regression tests, SQL test 32                                                                  | **Implemented with regression evidence** for the scoped surfaces; not a universal proof for future modules                                                                                                                      |
| Platform administration | Global administrator whitelist separated from tenant roles; account listing, global audit, announcements and alert broadcast require platform-admin authorization and AAL2 where specified | `public.platform_admins`, `private.assert_platform_admin`, SQL test 19, `dashboard/admin/`                             | **Implemented, locally covered**; current runtime **[NO VERIFICADO]**                                                                                                                                                           |
| Impersonation           | Platform administrator can create bounded impersonation sessions with banner, expiry and audit attribution                                                                                 | `public.impersonation_sessions`, admin account actions, SQL test 20 and E2E impersonation spec                         | **Implemented with bounded 012.4 acceptance** (2026-10-19); dedicated secret/recovery present. Cloud elapsed TTL was not exercised; N-24/S-07 are corrected in the original contract.                                           |
| Onboarding              | Post-signup onboarding and creation of a real team account                                                                                                                                 | onboarding routes/actions, SQL test 21 and E2E onboarding spec                                                         | **Implemented, locally covered**; coherent disabled-module configuration belongs to Plan 015                                                                                                                                    |
| Projects and documents  | Small tenant-scoped reference domain with CRUD and document records                                                                                                                        | `public.projects`, `public.documents`, `src/lib/projects.ts`, `src/lib/project-documents.ts`                           | **Implemented reference; deferred from offered MVP under ADR0005.** Editor browser acceptance is pending; effective route/action exclusion by015-T1 is not implemented. Existing data/SQL evidence is retained.                 |
| Storage                 | Public avatars, organization assets, private documents and signed Robot configuration downloads                                                                                            | account/org actions, Storage migrations, SQL tests 16/32 and storage E2E                                               | **Partial**; Robot RBAC incorporated, image-origin defect remains 014-T2. Storage positive/negative fixture correction belongs to 017.5-T11.                                                                                    |
| Notifications           | Per-user notifications, mark-as-read RPC and Realtime delivery                                                                                                                             | `public.notifications`, `src/lib/notifications/`, `use-notifications.ts`                                               | **Implemented, locally covered**; current Realtime deployment **[NO VERIFICADO]**                                                                                                                                               |
| Presence                | Account-scoped Realtime presence for team members                                                                                                                                          | `supabase/schemas/presence.sql`, `use-presence.ts`, SQL test 18 and storage/realtime E2E                               | **Implemented, locally covered**; it is a reference pattern, not a collaboration suite                                                                                                                                          |
| Announcements           | Platform-wide announcement publication and Realtime broadcast                                                                                                                              | `public.announcements`, `publish_announcement`, SQL test 22                                                            | **Implemented, locally covered**; publication is intentionally append-only in v1                                                                                                                                                |
| Feature flags           | Static product/module configuration plus database-backed flags and account overrides                                                                                                       | `src/config/app.config.ts`, `public.feature_flags`, `public.feature_flag_overrides`, `is_flag_enabled`                 | **Partial**; visibility, application availability and authorization remain distinct, and Plan 015 owns coherent minimal configurations                                                                                          |
| Audit trail             | Tenant audit log and cross-account platform audit with cursor pagination and impersonator attribution                                                                                      | `audit.logs`, account/platform RPCs, SQL test 8/19                                                                     | **Partial**; platform filters and load-more lose global scope, owned by Plan 014 T3                                                                                                                                             |
| API keys                | Account-admin creation, listing, revocation and server-side verification through gated RPCs                                                                                                | `supabase/schemas/api-keys.sql`, `src/lib/api-keys/`, SQL test 9                                                       | **Implemented, locally covered**; bounded public-route limiting accepted under 012.3. Last-slot creation quota still needs 017.2-T1; limiter admission and key-count quota are distinct.                                        |
| Outbound webhooks       | Account endpoints, event catalogue, signed deliveries, retry state, delivery history and Vault-backed secrets                                                                              | `supabase/schemas/webhooks.sql`, org settings actions, SQL test 10                                                     | **Implemented with bounded 012.2 acceptance**; Node transport validates DNS and pins IP. Webhook creation quota is serialized; unrelated triggers/provider acceptance not inferred.                                             |
| Application email       | React email templates, Mailpit transport for local development and Resend transport for configured deployments                                                                             | `src/lib/email/`, email unit tests                                                                                     | **Implemented**; Resend delivery outside its sandbox and current provider configuration are **[NO VERIFICADO]**                                                                                                                 |
| Durable email jobs      | PGMQ queue, Edge Function consumer, retry/archive behavior, cron invocation through `pg_net`, Vault secret and health RPC                                                                  | `process-email-queue`, email migrations, SQL test 14, Edge Function tests and runbook                                  | **Implemented, locally covered**; dated Cloud health evidence has expired and must be refreshed                                                                                                                                 |
| GDPR lifecycle          | User data export, deletion request, delayed purge and related UI                                                                                                                           | `supabase/schemas/gdpr.sql`, account actions, SQL test 24, module guide                                                | **Implemented, locally covered**; legal adequacy and Cloud execution are separate review boundaries                                                                                                                             |
| Legal and consent       | Legal pages, versioned cookie choices and consent-gated analytics                                                                                                                          | public legal routes, cookie-consent code and E2E spec                                                                  | **Implemented, locally covered**; final legal text requires product-specific review                                                                                                                                             |
| Billing core            | Provider registry, catalogue, plans, entitlements, subscriptions, invoices, events, checkout coordination, recovery and reconciliation                                                     | `src/lib/billing/`, `billing` schema, SQL tests 11–13 and 33–42                                                        | **Implemented**; billing-disabled configuration remains incomplete and is owned by Plan 015                                                                                                                                     |
| Mercado Pago            | Hosted monthly CLP checkout and first charge demonstrated with correlated sandbox evidence; recovery and reconciliation code exist                                                         | Plan 011 acceptance matrix and operational register                                                                    | Current own-use objective **satisfied**; advanced scenarios are **Deferred/[NO VERIFICADO]** during this freeze                                                                                                                 |
| Mock billing            | Local/test provider and mock checkout                                                                                                                                                      | billing provider registry and tests                                                                                    | **Implemented with 012.4 policy/secret hardening**; bearer TTL/jti/one-use remains a separate disposition in 017.3-T3.                                                                                                          |
| Stripe adapter          | Provider adapter and contract tests                                                                                                                                                        | `src/lib/billing/providers/stripe.ts` and tests                                                                        | **Deferred**; code presence is not provider certification                                                                                                                                                                       |
| Product analytics       | Typed PostHog event taxonomy, client/server capture, sanitization and consent gating                                                                                                       | `src/lib/analytics/`, analytics tests and E2E                                                                          | **Optional, partial**; bounded consented PostHog receipt recorded in 012.4. URL privacy/import-revocation/identity attribution repairs remain 017.1; server flag is 015-T1.                                                     |
| Error monitoring        | Sentry server/client integration, tunnel, filters and smoke-test workflow                                                                                                                  | Sentry configuration, filters, E2E and runbook                                                                         | **Optional, implemented**; bounded Sentry receipt and browser observation recorded in 012.4 on 2026-10-19. No fresh provider check in this consolidation.                                                                       |
| Structured logging      | Pino server logger with typed context and sensitive-field redaction                                                                                                                        | `src/lib/logger.ts`                                                                                                    | **Implemented, partial privacy coverage**; email error recipient logging remains S-12 / 017.1-T6.                                                                                                                               |
| Internationalization    | Locale-prefixed routing and message catalogues for Spanish, English, Portuguese and French                                                                                                 | `src/i18n/`, `messages/`, locale routes                                                                                | **Implemented**; complete semantic translation review is separate from route support                                                                                                                                            |
| Product configuration   | Central product identity, locales, feature switches and theme-token references                                                                                                             | `src/config/app.config.ts`                                                                                             | **Partial**; navigation/home composition and minimal variants belong to Plan 015                                                                                                                                                |
| Security headers        | CSP and other security headers from the intentional Next.js proxy entry point                                                                                                              | `src/proxy.ts` and tests                                                                                               | **Implemented with bounded 012.4 acceptance**; nonce script CSP present. Inline styles and nonfatal blocked Zod probe remain documented exceptions.                                                                             |
| Quality pipeline        | TypeScript, ESLint, Prettier, Knip, Vitest, pgTAP, Edge Function tests, Playwright, CodeQL and Gitleaks                                                                                    | `package.json`, `.github/workflows/`                                                                                   | **Implemented**; 19/10 directed audit passed typecheck/lint and 122 files/1452 tests with threads. CI gating/fixture gaps remain 017.5; no full integrated acceptance inferred.                                                 |

## Supabase capability coverage

This table records how Iroko uses Supabase. It is not a commitment to adopt
every Supabase product.

| Supabase capability    | Iroko usage                                                                                                     | Minimal proof in the repository                        | Boundary                                                                                                                                     |
| ---------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth                   | Email/password, OAuth callback, verification, recovery, sessions, TOTP MFA, recovery codes and optional CAPTCHA | Auth routes/actions, account security UI and E2E       | Deployment-specific providers and SMTP remain configurable                                                                                   |
| PostgreSQL             | Core tenant model, modules, audit and billing                                                                   | Versioned schemas and migrations                       | Schema presence is not runtime health                                                                                                        |
| Row Level Security     | Tenant isolation, role matrices, Storage and Realtime policies                                                  | pgTAP coverage and Plan 010 regressions                | Every new module must add its own negative cross-tenant tests                                                                                |
| Database functions/RPC | Transactional membership, account, billing, audit and admin operations                                          | `public`, `private`, `billing` and `audit` functions   | Exposed functions require explicit grants and live-role checks                                                                               |
| Custom Auth hook       | Active account and role claims                                                                                  | `custom_access_token_hook`                             | Claims improve UX; sensitive authorization revalidates live membership                                                                       |
| Storage                | Avatars, organization assets, documents and private signed downloads                                            | Bucket migrations, actions and tests                   | **Partial**; Robot RBAC incorporated, image-origin defect remains 014-T2. Storage positive/negative fixture correction belongs to 017.5-T11. |
| Realtime               | Notifications, account presence and announcements                                                               | Realtime policies, hooks and E2E                       | No generic collaborative editing claim                                                                                                       |
| Edge Functions         | Durable email-queue consumer                                                                                    | `supabase/functions/process-email-queue/`              | Billing workers intentionally use a Next.js Node route                                                                                       |
| Queues                 | PGMQ email queue with retry/archive handling                                                                    | Queue migrations, handler and health checks            | Current Cloud queue health **[NO VERIFICADO]**                                                                                               |
| Cron                   | Email and billing worker schedules                                                                              | Versioned scheduling migrations                        | A successful cron row alone does not prove the durable effect                                                                                |
| `pg_net`               | Authenticated calls from database schedules to workers                                                          | Email/billing worker migrations                        | URL, secret and response health must be inspected together                                                                                   |
| Vault                  | Webhook signing secrets and worker URL/shared secrets                                                           | Vault-backed migrations                                | Secret values never belong in documentation                                                                                                  |
| Generated types        | TypeScript database contracts for exposed schemas                                                               | `src/types/database.ts`, CI type-generation comparison | Regenerate when exposed schema changes                                                                                                       |
| Local stack            | Auth, database, Storage, Realtime, Mailpit and Edge Function testing                                            | `supabase/config.toml`, scripts and CI                 | Docker/local success does not establish Cloud parity                                                                                         |
| Advisors and lint      | Schema lint plus security/performance advisors in nightly workflow                                              | `.github/workflows/nightly.yml`                        | Dated evidence expires according to the operational register                                                                                 |
| Vector extension       | Extension enabled by migration                                                                                  | advanced-extension migration                           | Extension availability only; no AI/RAG product capability is claimed                                                                         |

## External integrations

| Integration          | Role                                                             | MVP rule                                                                                         |
| -------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Resend               | Production application email transport                           | Optional when Mailpit/local transport is selected; provider delivery must be verified separately |
| Cloudflare Turnstile | Optional CAPTCHA for Auth forms                                  | Absence must not break Auth when CAPTCHA is disabled                                             |
| Sentry               | Error and performance telemetry                                  | Optional; absence must leave the application functional                                          |
| PostHog              | Consent-gated product analytics                                  | Optional; absence becomes a no-op, not an application failure                                    |
| Mercado Pago         | Demonstrated payment provider for the current Chile/CLP use case | Existing functional circuit is enough for the freeze; advanced certification is deferred         |
| Stripe               | Future payment option                                            | Adapter code does not make it supported; certification is deferred                               |
| Vercel               | Reference Next.js deployment and Node worker host                | Deployment evidence is provider-specific; core domain contracts stay in the repository           |

## MVP acceptance gates

The freeze is complete only when the final candidate demonstrates all of the
following without relying on historical prose alone:

1. A fresh documented local installation reaches a usable authenticated app.
2. Signup, login, confirmation, recovery, MFA and session management work in
   the supported configuration.
3. Personal/team accounts, invitations, membership lifecycle and the four-role
   RBAC matrix pass positive and negative tests.
4. Database, Storage and Realtime deny cross-tenant access in the demonstrated
   examples.
5. The app works coherently with billing disabled and with the selected billing
   provider enabled.
6. Mail has a local transport, a documented production transport and observable
   queue failures.
7. Optional analytics, monitoring and CAPTCHA integrations can be absent without
   breaking the core.
8. No confirmed P0/P1 security or integrity defect remains without an explicit
   owner and disposition.
9. A minimal derived domain can be installed, extended and upgraded without
   losing tenant data or customization.
10. Focused tests, full local gates and the production build pass on the exact
    final candidate; Cloud/provider claims are separately dated.

## Freeze work ownership

| Work     | Purpose in this inventory                                                                                               |
| -------- | ----------------------------------------------------------------------------------------------------------------------- |
| Plan 011 | Preserve the demonstrated Mercado Pago circuit; defer advanced provider scenarios and additional providers              |
| Plan 012 | Close excess grants, rate-limit uncertainty, webhook SSRF, CSP/secrets and pricing-source contradictions                |
| Plan 014 | Correct Robot availability/RBAC, image-origin validation and platform-audit interactions                                |
| Plan 015 | Prove coherent configuration, no-billing operation, extension recipes and independent install/upgrade                   |
| Plan 017 | Implement bounded repairs assigned by the revalidated audit; keep catalogue/reference/reuse ownership in 012.5/014/015  |
| Plan 016 | Produce exhaustive code/configuration coverage, validate the final candidate and reconcile this inventory with evidence |
| Plan 013 | Deferred commercial packaging; it is not an MVP gate for internal reuse                                                 |

## Maintenance contract

- Update the relevant row when code, schema, authorization, configuration or
  a supported integration changes.
- Link detailed procedures to module guides or runbooks instead of duplicating
  them here.
- Treat `src/env.ts` as the environment-variable inventory; do not copy secret
  names and values into this document beyond what is needed to explain a public
  integration boundary.
- Record live results and expiry in the operational evidence register.
- Add a new capability only when it has a minimal example, security contract,
  tests, documentation and an owner.
- During the MVP freeze, a new idea goes to the deferred roadmap unless it is
  necessary to repair or prove a capability already listed here.
