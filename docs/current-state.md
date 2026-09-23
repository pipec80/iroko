# Current State

Last static verification: **2026-09-23** (Plan 011 Mercado Pago acceptance:
first real reconciliation scans, sandbox drills and measured provider
behaviors; platform-wide audit remains 2026-08-20)
Last recorded runtime observation: **2026-09-23** (reconciliation discovery
against the live subscription and a Cloud lease drill, see
[Runtime update](#runtime-update--2026-09-23); recovery and reconciliation
workers in Supabase Cloud, see
[Worker rollout update](#worker-rollout-update--2026-09-22); real Mercado Pago
checkout/cancellation circuit, see MP-01/02/05/07 in the
[v1 Chile matrix](exec-plans/active/011-mercadopago-v1-chile-acceptance.md))
Repository baseline inspected: `e4b9d45b88c2c18f246a4bd065cb52638ac4ce72`
(main; Cloud worker health inspected separately from provider acceptance)

This is the operational entry point for humans and coding agents. It answers
what Iroko is today, which work is active, and which claims have actually been
verified. It does not replace execution plans, architecture documents, or
their evidence.

## Product position

Iroko is currently an **internal-first, reusable SaaS foundation**. It is being
built to a quality level that may later support a commercial boilerplate or
market kit, but it is not yet an installable, supported, customer-ready
product. Commercialization remains an option, not a present-tense claim.

## Current technical baseline

- Next.js 16 App Router, React 19, strict TypeScript and React Compiler.
- Locale-prefixed routes for `es`, `en`, `pt`, and `fr`; `es` is the default.
- Supabase provides authentication, PostgreSQL, RLS, migrations, and Edge
  Functions.
- Vitest covers unit/component tests and Playwright covers end-to-end flows.
- Sentry, Pino, and PostHog provide the current observability foundations.
- Plan 010 tenant-isolation remediation is completed with regression evidence.
  Billing Core v2 closed through PR #152. Mercado Pago checkout coordination,
  known-payment recovery, persistent anomalies and Node worker are implemented.
  The basic Cloud rollout is now observed for both worker modes; historical
  local test results and HTTP 200 alone do not certify the full lifecycle.
  The 2026-09-10 **sandbox circuit against the production deployment** (checkout,
  first charge, provider cancellation with paid-through access preserved) is
  now confirmed with correlated database evidence, closing MP-01/02/05/07/15;
  it is not real-money production acceptance. Rejection and its dashboard alert
  (MP-06), both cancellation directions (MP-07) and a genuine recovery repair
  (MP-11) were later closed with real correlated evidence. Local code covers
  refund ingress and missed-invoice discovery, including local migration
  `20260911140000_billing_financial_anomaly_ingress`. Still open in the
  [v1 Chile matrix](exec-plans/active/011-mercadopago-v1-chile-acceptance.md):
  renewal (a real charge due 2026-10-22), provider refunds (blocked for test
  accounts), a completed provider missed-invoice discovery scan, concurrent
  checkout and the volume scenarios of the worker drills.

## V1 product decision — 2026-09-11

Own use in Chile, monthly CLP, hosted checkout with pending preapproval and no
associated plan. Keep prices CLP 0 / 19.990 / 102.990, Free / Plus / Pro labels
and durable `free` / `pro` / `scale` slugs during MP closeout. Trial,
upgrade/downgrade, Iroko-initiated pause and in-app card management are outside
v1, as are annual MP checkout and additional countries. `scale → teams` stays
separate from this closeout.

Internal Mercado Pago acceptance is independent of the full four-provider
program and future commercial distribution. No official provider certification
is claimed. Security, smoke, observability and operational recovery remain
required before real users; they are not deferred to selling the boilerplate.

## Active work and order

Plan 011 is the remaining P0 behavior plan. Its internal dependency order is
authoritative; coordinate overlapping database, authorization, and billing
changes before implementation.

| Order | Work                                                                                         | Priority | Current meaning                                                                                                                                                                                                                                                                                                                                                                                                        |
| ----- | -------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 011   | [Billing Platform v2](exec-plans/active/011-billing-correctness.md)                          | P0       | Core v2 closed; MP Phase 2/6 code is implemented/tested locally, the basic 011e worker rollout is verified in Cloud, and MP-01/02/05/06/07/11/13/15 are closed with real correlated evidence; MP-04, 08 and 14 are partial. Renewal (2026-10-22), refunds (needs a productive account), a completed discovery scan (MP-12) and volume drills remain pending. Other providers remain independent future certifications. |
| 012   | [Hardening and pricing truth](exec-plans/active/012-security-hardening-and-pricing-truth.md) | P1       | Pending v1 gates after MP acceptance; public pricing drift and security sweep. Slug rename separated from MP closeout.                                                                                                                                                                                                                                                                                                 |
| 013   | [Commercial preparation](exec-plans/active/013-launch-readiness-roadmap.md)                  | P2       | After own-use v1, when selling is chosen. Essential smoke, security and observability remain v1 gates.                                                                                                                                                                                                                                                                                                                 |

Execution order: complete the remaining internal MP acceptance and explicit
worker failure/multi-batch drills after the basic 011e rollout → Plan 012 and
operational v1 checks →
independent Stripe/Paddle/Lemon Squeezy certifications → Plan 013 distribution.
The last two steps do not block a v1 limited to own-use Chile/Mercado Pago.

Plan 010 closed on 2026-08-26 through PRs #139, #140, #147, #149 and #150
(the last being the independent toolchain repair). It is filed under
`exec-plans/completed/`. This is implementation and disposable-preview
evidence, not a fresh certification of every external provider or Cloud
runtime.

Plans 001–009 are filed as completed evidence records. Their historical status
was not re-certified against a live runtime or cloud environment during this
documentation pass.

## Verification boundary

### Runtime update — 2026-09-23

First real run of the missed-invoice discovery, plus sandbox drills, against the
linked Supabase project and the test seller. No real-money operation and no
migration change (the latest migration is still
`20260911140000_billing_financial_anomaly_ingress`; Cloud parity was last
inspected on 2026-09-22).

- **Reconciliation discovery had never worked in Cloud.** The only live
  subscription failed every hourly scan while the worker kept answering HTTP 200.
  Two defects were found in sequence: Mercado Pago rejects `limit` above 15 on
  `/authorized_payments/search` (fixed in #205, deployed), and discovered
  invoices carried the checkout id as account, which the reducer rejects
  (`reducer_failed` at the 22:00 UTC scan; fixed in #208). At 22:12 UTC the row
  still showed `failure_count=10` (the cap) and an empty `last_completed_at`:
  a completed scan is **[NO VERIFICADO]** until #208 is deployed and an hourly
  run finishes. Unit tests with mocked providers could not see either defect;
  see the provider-contract note in the
  [testing strategy](quality/testing-strategy.md#contract-tests).
- **Lease drill (MP-14, part).** Against the real candidate: a lapsed lease is
  reclaimed, completing with a lapsed lease is rejected, and a live lease is
  respected. This covers database semantics only, not a killed Node process, more
  than 20 candidates or an intermediate invoice cursor.
- **Measured provider behaviors** now live in the
  [reliability design](architecture/mercadopago-reliability-design.md#verified-provider-behaviors-2026-09-23):
  `X-Idempotency-Key` is ignored, `payer_email` is required, the search does not
  filter by `external_reference`, and the test seller's credentials cannot create
  refunds (MP-09/10 need a productive account).
- **Dashboard.** A canceled subscription with paid access remaining now reads as
  canceled (access-until date, no cancel button, a distinct badge) and a rejected
  payment explains its reason; both were reviewed on production (#198–#203).
- **CI.** Builds no longer download Google Fonts (#207) after four transient
  failures in one day.

Merged since the previous update: #190–#207 (acceptance workflow, evidence
records, the canceled-plan and rejection-reason UI, discovery page size, webhook
rejection naming and locale-aware return URL, vendored fonts).

### Worker rollout update — 2026-09-22

The authorized 011e rollout now has current Cloud evidence for the deployed
Node route, Vault/scheduler circuit, and both worker modes running unattended.
`cron.job_run_details` shows the 5-minute recovery job (14) at 1493/1493
`succeeded` from 2026-09-17 14:35 UTC through 2026-09-22 18:55 UTC, and the
hourly reconciliation job (15) at 22/22 `succeeded` from 2026-09-21 21:00 UTC
through 2026-09-22 18:00 UTC — zero non-succeeded rows for either job across
that window. `private.billing_worker_health` correlates both modes' latest row
to `last_status_code=200` at the same timestamp as the latest cron run. This
verifies sustained basic operation only, and confirms Cloud migration parity
(159/159 versions match `main`).

The evidence does not identify a provider resource, prove a recovery repair,
show a fully omitted provider invoice, or exercise multi-batch progress,
injected provider failure, process interruption, lease reclaim, or replay in
Cloud. Those requirements remain **[NO VERIFICADO]** and are owned by 011e/011f
until recorded with sanitized scenario evidence.

### Runtime verification update — 2026-09-10

The historical record reports that a Mercado Pago **sandbox** lifecycle was exercised against the production
deployment (`project-a89lv.vercel.app`, the canonical domain — not
`iroko-pipec80-labs.vercel.app`). What this run actually verified:

- Checkout → `billing.subscriptions` `active`, `checkout_intents` `confirmed`,
  invoice `paid`, events `invoice_paid` + `subscription_updated`.
- Cancellation → `canceled` with `canceled_at` and a `subscription_canceled`
  event. This required fixing an adapter bug (Mercado Pago returns the
  cancelled preapproval as `cancelled`; the code only matched `canceled`, so
  cancellations previously landed on `incomplete`) — PR #179.
- The four Phase 2/6 billing migrations (`20260909*`) were missing from linked
  Cloud and were applied manually with `supabase db push` — **CI/CD does not
  apply migrations to Cloud**; check `supabase migration list --linked` after
  every merge that touches `supabase/migrations/`.
- Deployment protection was moved to "Standard" (production public, previews
  still behind Vercel Auth) and a firewall rule exempts `/api/webhooks/` from
  Bot Protection so provider callbacks reach the endpoint.

After that run, formal internal acceptance evidence and worker activation
remained pending (secret, Vault entries, firewall rule, schedules and actual
health/results). Two sandbox applications were reported; environment coherence
needs verification. Payment failures already persist separately from the
subscription lifecycle; the missing requirement is visible payment health,
not inventing a Mercado Pago `past_due` transition. Current runtime, Cloud,
provider configuration and migration parity were not re-inspected on
2026-09-11: **[NO VERIFICADO]**. The
[matrix](exec-plans/active/011-mercadopago-v1-chile-acceptance.md) owns all closure
gates, including renewal, paid-through access and recovery.

Merged to `main` since PR #152: #153, #159, #161, #171–181, #187, #188 and
PRs #190–#207 (Mercado Pago reliability slice, dependency updates, the QA fix
and its documentation, the v1 local gap closure, the Cloud acceptance workflow,
evidence records and the 2026-09-22/23 follow-up fixes).
No Stripe / Paddle / Lemon Squeezy adapter work has started.

### Historical Mercado Pago planning update — 2026-09-09

The [reliability roadmap](exec-plans/active/011-mercadopago-reliability-roadmap.md)
defines bounded follow-up work inside Plan 011, with a
[design supplement](architecture/mercadopago-reliability-design.md) and
[Accepted ADR 0003](adr/0003-mercadopago-reliability-boundaries.md).
Agreed product scope: no Mercado Pago trial for now; persistent financial
anomalies with alerts, without automatic access revocation. Prices and plan
slugs are unchanged.

This planning pass refreshed and inspected `origin/main` at `954e5d5`. It does
not refresh the platform-wide verification date
above. Current CI, Cloud, deployment and sandbox health are **[NO VERIFICADO]**.
No application code or Cloud resources were changed in this documentation pass.
The accepted design was approved for sequential local implementation; its
coordination/recovery/anomaly foundation is now present at `66bc9b2`. Rollout
and provider operations remain separately authorized work.

### Earlier verification boundary

This document was checked against the repository tree, configuration, and
versioned plans. The commit-bound CI and Vercel Preview evidence for PR #152 is
recorded in the operational evidence register. The application runtime, linked
Supabase project, payment-provider sandbox, Sentry, PostHog, email delivery,
and a separate post-merge `main` run were not revalidated in this documentation
update. Treat them as **[NO VERIFICADO]** until a plan or runbook records fresh
evidence.

A passing focused test proves only the exercised scope. It does not close a
plan, certify a provider, or establish launch readiness by itself.

### Evidence from the 2026-08-20 documentation audit

| Check                                                     | Result                                         | Meaning                                                                                     |
| --------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `pnpm typecheck`                                          | Pass                                           | Current TypeScript tree type-checks                                                         |
| `pnpm lint`                                               | Pass                                           | Current ESLint rules pass                                                                   |
| Full `pnpm test`                                          | Not green in this run: 766 passed, 1 timed out | The timed-out billing test passed 7/7 in isolation; full-suite stability remains unverified |
| Versioned/new Markdown internal links                     | Pass: 0 broken links detected                  | Does not validate external URLs or runtime behavior                                         |
| Documentation checker unit tests                          | Pass: 4/4                                      | Covers internal targets, URL-encoded paths and forbidden stale references                   |
| Build, E2E, pgTAP, linked Supabase and external providers | Not run                                        | **[NO VERIFICADO]**                                                                         |

## Documentation maturity and release gates

The earlier numeric documentation assessments were qualitative historical
opinions, not completion percentages or release gates. Current status uses
implemented, tested locally, verified at provider, pending operations and
outside v1, with evidence bounded to its revision and scenario. The following
platform documentation audit inventory remains historical (2026-08-20):

| Area                       | Current position                                                                         | Remaining gate                                                                       |
| -------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Shared entry point         | `AGENTS.md`, thin `CLAUDE.md`, this file and `docs/index.md` are prepared in this change | Commit/merge them and keep them synchronized                                         |
| Status authority           | Priority and evidence order declared                                                     | Prevent stale secondary status files from being treated as current                   |
| Architecture and decisions | Overview and ADR process exist                                                           | Add ADRs only for material decisions and keep architecture coverage current          |
| Plans and evidence         | Active/completed split exists                                                            | Remove placeholders and require exact closure evidence                               |
| Module documentation       | Eight guides curated and prepared for version control                                    | Keep them synchronized with module contracts and refresh runtime evidence separately |
| Design system              | Poppy/Cobalt/Geist root accepted; generated and historical material classified           | Keep specification/runtime parity and add fresh visual evidence per material change  |
| Documentation automation   | Dedicated checker and workflow prepared in this change                                   | Merge it and require the `Documentation` check on protected branches                 |
| Operational truth          | Dated evidence register exists; current Cloud rows are unverified                        | Re-run runtime/Cloud checks before making current claims                             |

Product or commercial readiness is a separate gate. It additionally requires
closing the Mercado Pago v1 Chile matrix (Phases 2/6), stabilizing the complete
test/runtime path and resolving Plan 012 hardening/pricing plus operational
checks. The full Plan 011 remains required for a four-provider claim.
Commercial distribution additionally needs Plan 013 installation, licensing,
upgrade, support and buyer onboarding when selling is chosen.

## Known documentation and tooling debt

- `ROADMAP.md` contains product direction and historical execution detail;
  active plans and accepted ADRs take precedence for current work.
- `docs/estado-fases.md` is local/ignored and stale; it is not authoritative.
- The canonical design-system root is accepted in ADR 0002. The generated
  handoff and historical previews remain intentionally preserved; full PDF
  visual inspection and per-screen production parity are **[NO VERIFICADO]**.
- The eight guides in `docs/modules/` are current at static-code level as of
  2026-08-20; their runtime and Cloud behavior remains **[NO VERIFICADO]**.
- In the platform-wide audit table, initial data is cross-account, but filters
  and `Cargar más` still call `getAccountAuditLogs`; remediation is not yet
  planned.
- The documentation workflow exists in this worktree but is not enforced until
  it is merged and selected as a required branch-protection check.

Fresh operational status and expiry rules live in the
[operational evidence register](quality/operational-evidence.md).

## How this file stays current

Update this file in the same pull request when any of these change:

- product position or supported deployment model;
- active-plan priority, status, or dependency order;
- a material architecture boundary;
- the verification status of a previously unverified capability.

Do not copy task-level checklists here. Link to the bounded execution plan and
put exact commands and evidence there.
