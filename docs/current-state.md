# Current State

Last static verification: **2026-08-20** (documentation audit)
Last runtime verification: **2026-09-10** (Mercado Pago sandbox circuit, see
[Runtime verification update](#runtime-verification-update--2026-09-10))
Repository baseline inspected: `main` @ `9757ad7`

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
  Billing Platform v2 remains active work: its provider-neutral Core v2 closed
  through PR #152 on 2026-08-27; Mercado Pago (Phase 2) has its checkout →
  active → paid → cancel circuit **verified against production on 2026-09-10**
  (PRs #153, #161, #171–175, #179), but formal certification evidence, the
  reconciliation/recovery worker schedule (Phase 6), and Stripe / Paddle /
  Lemon Squeezy (Phases 3–5) are not done. The program is not a completed
  capability.

## Active work and order

Plan 011 is the remaining P0 behavior plan. Its internal dependency order is
authoritative; coordinate overlapping database, authorization, and billing
changes before implementation.

| Order | Work                                                                                                  | Priority | Current meaning                                                                                                                                                     |
| ----- | ----------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 011   | [Billing Platform v2](exec-plans/active/011-billing-correctness.md)                                   | P0       | Fase 1 (Core v2) closed. Fase 2 (Mercado Pago) circuit verified in prod, certification + Phase 6 worker open. Fases 3–5 (Stripe/Paddle/Lemon) planned, not started. |
| 012   | [Security hardening and pricing truth](exec-plans/active/012-security-hardening-and-pricing-truth.md) | P1       | Not started. Public landing/`/pricing` still uses hard-coded tiers that diverge from `billing.plans`; grants/SSRF/rate-limit/CSP sweep pending.                     |
| 013   | [Launch-readiness roadmap](exec-plans/active/013-launch-readiness-roadmap.md)                         | P2       | Commercial-readiness roadmap; not yet decomposed into implementation PRs. Gated on Plan 011.                                                                        |

Plan 010 closed on 2026-08-26 through PRs #139, #140, #147, #149 and #150
(the last being the independent toolchain repair). It is filed under
`exec-plans/completed/`. This is implementation and disposable-preview
evidence, not a fresh certification of every external provider or Cloud
runtime.

Plans 001–009 are filed as completed evidence records. Their historical status
was not re-certified against a live runtime or cloud environment during this
documentation pass.

## Verification boundary

### Runtime verification update — 2026-09-10

A Mercado Pago **sandbox** lifecycle was exercised against the production
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

Still **[NO VERIFICADO]** / not done after this run: formal certification
evidence captured in a PR; the reconciliation/recovery worker
(`/api/internal/billing/worker` exists but no secret, Vault entries, firewall
rule or cron schedule — `private.billing_worker_health` is empty); a
`past_due` / dunning state for Mercado Pago; consolidation of the two Mercado
Pago sandbox applications currently in play. See
[`011-phase2-mercadopago-tasks.md`](exec-plans/active/011-phase2-mercadopago-tasks.md)
and [`011-phase6-reconciliation-tasks.md`](exec-plans/active/011-phase6-reconciliation-tasks.md).

Merged to `main` since PR #152: #153, #159, #161, #171–180 (Mercado Pago
reliability slice, dependency updates, the QA fix and its documentation).
No Stripe / Paddle / Lemon Squeezy adapter work has started.

### Mercado Pago planning update — 2026-09-09

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
The accepted design is approved for sequential local implementation; rollout
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

## Maturity and the path from 7/10 to 10/10

The earlier **7/10** was a qualitative assessment of documentation structure
and onboarding, not a product-release score. Once reviewed and versioned, this
alignment pass fixes the central contract and the main truth conflicts,
bringing that documentation layer closer to **8/10**. No numeric score is a
release gate.

A trustworthy 10/10 documentation and handoff system requires all of these
outcomes:

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
closing Plan 011 (Plan 010 closed 2026-08-26), stabilizing the complete
test/runtime path, resolving Plan 012 (pricing source of truth, security
sweep), and—if commercialization is chosen—finishing installation, licensing,
upgrade, support and buyer-onboarding work from Plan 013.

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
